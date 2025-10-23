import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class StreamService {
  constructor() {
    this.activeStreams = new Map(); // Store active FFmpeg processes
    this.hlsPath = process.env.HLS_PATH || '/tmp/hls';
    this.recordingPath = process.env.RECORDING_PATH || '/tmp/recordings';
    
    // Ensure directories exist
    this.ensureDirectories();
  }

  ensureDirectories() {
    [this.hlsPath, this.recordingPath].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`Created directory: ${dir}`);
      }
    });
  }

  /**
   * Start HLS stream from RTSP
   */
  async startHlsStream(cameraCode, rtspUrl, options = {}) {
    const streamKey = cameraCode;

    // Check if stream already exists
    if (this.activeStreams.has(streamKey)) {
      logger.warn(`Stream ${streamKey} is already running`);
      return { success: true, message: 'Stream already running' };
    }

    const hlsDir = path.join(this.hlsPath, cameraCode);
    if (!fs.existsSync(hlsDir)) {
      fs.mkdirSync(hlsDir, { recursive: true });
    }

    const playlistPath = path.join(hlsDir, 'index.m3u8');
    const segmentPattern = path.join(hlsDir, 'segment_%03d.ts');

    logger.info(`Starting HLS stream for camera ${cameraCode}`);
    logger.debug(`RTSP URL: ${rtspUrl}`);
    logger.debug(`HLS output: ${playlistPath}`);

    return new Promise((resolve, reject) => {
      const command = ffmpeg(rtspUrl)
        .inputOptions([
          '-rtsp_transport', 'tcp',
          '-analyzeduration', '5000000',
          '-probesize', '5000000',
          '-fflags', 'nobuffer'
        ])
        .outputOptions([
          '-c:v', options.codec || 'libx264',
          '-preset', options.preset || 'ultrafast',
          '-tune', 'zerolatency',
          '-g', '30',
          '-sc_threshold', '0',
          '-b:v', options.bitrate || '2M',
          '-maxrate', options.maxrate || '2M',
          '-bufsize', '4M',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-ar', '44100',
          '-f', 'hls',
          '-hls_time', process.env.FFMPEG_HLS_TIME || '2',
          '-hls_list_size', process.env.FFMPEG_HLS_LIST_SIZE || '5',
          '-hls_flags', 'delete_segments+append_list',
          '-hls_segment_filename', segmentPattern
        ])
        .output(playlistPath)
        .on('start', (commandLine) => {
          logger.debug('FFmpeg command:', commandLine);
        })
        .on('error', (err, stdout, stderr) => {
          logger.error(`FFmpeg error for ${streamKey}:`, err.message);
          logger.debug('FFmpeg stderr:', stderr);
          this.activeStreams.delete(streamKey);
          
          // Broadcast error via WebSocket
          this.broadcastStreamStatus(cameraCode, 'error', err.message);
          
          reject(err);
        })
        .on('end', () => {
          logger.info(`FFmpeg process ended for ${streamKey}`);
          this.activeStreams.delete(streamKey);
          this.broadcastStreamStatus(cameraCode, 'stopped');
        });

      // Store the command object
      this.activeStreams.set(streamKey, command);

      // Start the stream
      command.run();

      // Wait a bit to ensure stream starts
      setTimeout(() => {
        if (fs.existsSync(playlistPath)) {
          logger.info(`HLS stream started successfully for ${cameraCode}`);
          this.broadcastStreamStatus(cameraCode, 'streaming');
          resolve({
            success: true,
            hlsUrl: `${process.env.HLS_BASE_URL}/${cameraCode}/index.m3u8`,
            playlistPath
          });
        } else {
          logger.warn(`Playlist not found for ${cameraCode}, but stream may still be starting...`);
          resolve({
            success: true,
            hlsUrl: `${process.env.HLS_BASE_URL}/${cameraCode}/index.m3u8`,
            playlistPath
          });
        }
      }, 3000);
    });
  }

  /**
   * Stop HLS stream
   */
  stopHlsStream(cameraCode) {
    const streamKey = cameraCode;
    const command = this.activeStreams.get(streamKey);

    if (!command) {
      logger.warn(`No active stream found for ${streamKey}`);
      return { success: false, message: 'Stream not found' };
    }

    try {
      command.kill('SIGKILL');
      this.activeStreams.delete(streamKey);
      
      // Clean up HLS files
      const hlsDir = path.join(this.hlsPath, cameraCode);
      if (fs.existsSync(hlsDir)) {
        fs.rmSync(hlsDir, { recursive: true, force: true });
        logger.debug(`Cleaned up HLS directory for ${cameraCode}`);
      }

      this.broadcastStreamStatus(cameraCode, 'stopped');
      logger.info(`Stopped HLS stream for ${cameraCode}`);
      
      return { success: true, message: 'Stream stopped' };
    } catch (error) {
      logger.error(`Error stopping stream ${streamKey}:`, error);
      throw error;
    }
  }

  /**
   * Start recording
   */
  async startRecording(cameraCode, rtspUrl, options = {}) {
    const recordingKey = `${cameraCode}_recording`;

    if (this.activeStreams.has(recordingKey)) {
      logger.warn(`Recording for ${cameraCode} is already running`);
      return { success: false, message: 'Recording already active' };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${cameraCode}_${timestamp}.mp4`;
    const outputPath = path.join(this.recordingPath, filename);

    logger.info(`Starting recording for camera ${cameraCode}`);

    return new Promise((resolve, reject) => {
      const command = ffmpeg(rtspUrl)
        .inputOptions([
          '-rtsp_transport', 'tcp',
          '-analyzeduration', '5000000',
          '-probesize', '5000000'
        ])
        .outputOptions([
          '-c:v', 'copy',
          '-c:a', 'aac',
          '-movflags', '+faststart'
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          logger.debug('Recording FFmpeg command:', commandLine);
        })
        .on('error', (err) => {
          logger.error(`Recording error for ${cameraCode}:`, err.message);
          this.activeStreams.delete(recordingKey);
          reject(err);
        })
        .on('end', () => {
          logger.info(`Recording ended for ${cameraCode}`);
          this.activeStreams.delete(recordingKey);
        });

      this.activeStreams.set(recordingKey, {
        command,
        outputPath,
        startTime: new Date()
      });

      command.run();

      resolve({
        success: true,
        outputPath,
        filename
      });
    });
  }

  /**
   * Stop recording
   */
  stopRecording(cameraCode) {
    const recordingKey = `${cameraCode}_recording`;
    const recording = this.activeStreams.get(recordingKey);

    if (!recording) {
      logger.warn(`No active recording found for ${cameraCode}`);
      return { success: false, message: 'Recording not found' };
    }

    try {
      recording.command.kill('SIGINT'); // Graceful stop for recording
      this.activeStreams.delete(recordingKey);

      const duration = Date.now() - recording.startTime.getTime();
      logger.info(`Stopped recording for ${cameraCode}, duration: ${duration}ms`);

      return {
        success: true,
        outputPath: recording.outputPath,
        duration: Math.floor(duration / 1000)
      };
    } catch (error) {
      logger.error(`Error stopping recording for ${cameraCode}:`, error);
      throw error;
    }
  }

  /**
   * Get active streams
   */
  getActiveStreams() {
    const streams = [];
    for (const [key, value] of this.activeStreams.entries()) {
      streams.push({
        key,
        type: key.includes('_recording') ? 'recording' : 'streaming'
      });
    }
    return streams;
  }

  /**
   * Check if stream is active
   */
  isStreamActive(cameraCode) {
    return this.activeStreams.has(cameraCode);
  }

  /**
   * Broadcast stream status via WebSocket
   */
  broadcastStreamStatus(cameraCode, status, error = null) {
    if (global.wss) {
      const message = JSON.stringify({
        type: 'stream_status',
        cameraCode,
        status,
        error,
        timestamp: new Date().toISOString()
      });

      global.wss.clients.forEach(client => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(message);
        }
      });
    }
  }

  /**
   * Stop all streams
   */
  stopAllStreams() {
    logger.info('Stopping all active streams...');
    for (const [key] of this.activeStreams) {
      if (key.includes('_recording')) {
        this.stopRecording(key.replace('_recording', ''));
      } else {
        this.stopHlsStream(key);
      }
    }
  }
}

export default new StreamService();
