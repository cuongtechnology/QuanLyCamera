import express from 'express';
import { query } from '../utils/database.js';
import streamService from '../services/streamService.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/stream/start/:cameraId
 * Start HLS stream for a camera
 */
router.post('/start/:cameraId', async (req, res) => {
  try {
    const { cameraId } = req.params;
    const options = req.body || {};

    // Get camera from database
    const result = await query(
      'SELECT * FROM cameras WHERE id = $1 AND enabled = true',
      [cameraId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Camera not found or disabled'
      });
    }

    const camera = result.rows[0];

    // Check if RTSP URL exists
    if (!camera.rtsp_url) {
      return res.status(400).json({
        success: false,
        error: 'Camera does not have RTSP URL configured'
      });
    }

    // Start HLS stream
    const streamResult = await streamService.startHlsStream(
      camera.code,
      camera.rtsp_url,
      options
    );

    // Update stream in database
    await query(
      `INSERT INTO streams (camera_id, stream_url, hls_url, status, stream_type)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (camera_id) 
       DO UPDATE SET hls_url = $3, status = $4, updated_at = NOW()`,
      [
        camera.id,
        camera.rtsp_url,
        streamResult.hlsUrl,
        'streaming',
        'main'
      ]
    );

    // Update camera status
    await query(
      'UPDATE cameras SET status = $1, updated_at = NOW() WHERE id = $2',
      ['streaming', camera.id]
    );

    logger.info(`Started stream for camera ${camera.code}`);

    res.json({
      success: true,
      hlsUrl: streamResult.hlsUrl,
      cameraCode: camera.code
    });
  } catch (error) {
    logger.error('Error starting stream:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/stream/stop/:cameraId
 * Stop HLS stream for a camera
 */
router.post('/stop/:cameraId', async (req, res) => {
  try {
    const { cameraId } = req.params;

    const result = await query(
      'SELECT code FROM cameras WHERE id = $1',
      [cameraId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Camera not found'
      });
    }

    const camera = result.rows[0];

    // Stop stream
    streamService.stopHlsStream(camera.code);

    // Update database
    await query(
      'UPDATE streams SET status = $1, updated_at = NOW() WHERE camera_id = $2',
      ['stopped', cameraId]
    );

    await query(
      'UPDATE cameras SET status = $1, updated_at = NOW() WHERE id = $2',
      ['offline', cameraId]
    );

    logger.info(`Stopped stream for camera ${camera.code}`);

    res.json({
      success: true,
      message: 'Stream stopped successfully'
    });
  } catch (error) {
    logger.error('Error stopping stream:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/stream/status
 * Get all active streams
 */
router.get('/status', async (req, res) => {
  try {
    const activeStreams = streamService.getActiveStreams();
    
    res.json({
      success: true,
      activeStreams,
      count: activeStreams.length
    });
  } catch (error) {
    logger.error('Error getting stream status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/stream/start-all
 * Start streams for all enabled cameras
 */
router.post('/start-all', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM cameras WHERE enabled = true AND rtsp_url IS NOT NULL'
    );

    const cameras = result.rows;
    const results = [];

    for (const camera of cameras) {
      try {
        await streamService.startHlsStream(camera.code, camera.rtsp_url);
        results.push({
          cameraCode: camera.code,
          success: true
        });
      } catch (error) {
        results.push({
          cameraCode: camera.code,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Started ${results.filter(r => r.success).length}/${cameras.length} streams`,
      results
    });
  } catch (error) {
    logger.error('Error starting all streams:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/stream/stop-all
 * Stop all active streams
 */
router.post('/stop-all', async (req, res) => {
  try {
    streamService.stopAllStreams();

    await query(
      'UPDATE streams SET status = $1, updated_at = NOW() WHERE status = $2',
      ['stopped', 'streaming']
    );

    await query(
      'UPDATE cameras SET status = $1, updated_at = NOW() WHERE status = $2',
      ['offline', 'streaming']
    );

    res.json({
      success: true,
      message: 'All streams stopped'
    });
  } catch (error) {
    logger.error('Error stopping all streams:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
