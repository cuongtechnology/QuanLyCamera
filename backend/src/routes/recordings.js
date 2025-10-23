import express from 'express';
import { query } from '../utils/database.js';
import streamService from '../services/streamService.js';
import logger from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

/**
 * GET /api/recordings
 * Get all recordings
 */
router.get('/', async (req, res) => {
  try {
    const { cameraId, startDate, endDate, limit = 100 } = req.query;
    
    let queryText = 'SELECT r.*, c.code as camera_code, c.name as camera_name FROM recordings r JOIN cameras c ON r.camera_id = c.id WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (cameraId) {
      queryText += ` AND r.camera_id = $${paramIndex}`;
      params.push(cameraId);
      paramIndex++;
    }

    if (startDate) {
      queryText += ` AND r.start_time >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      queryText += ` AND r.start_time <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    queryText += ` ORDER BY r.start_time DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await query(queryText, params);
    
    res.json({
      success: true,
      recordings: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    logger.error('Error fetching recordings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/recordings/start/:cameraId
 * Start recording
 */
router.post('/start/:cameraId', async (req, res) => {
  try {
    const { cameraId } = req.params;

    const result = await query(
      'SELECT * FROM cameras WHERE id = $1',
      [cameraId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Camera not found' });
    }

    const camera = result.rows[0];

    if (!camera.rtsp_url) {
      return res.status(400).json({
        success: false,
        error: 'Camera does not have RTSP URL'
      });
    }

    const recording = await streamService.startRecording(
      camera.code,
      camera.rtsp_url
    );

    // Save to database
    await query(
      `INSERT INTO recordings (camera_id, file_path, start_time, recording_type)
       VALUES ($1, $2, NOW(), $3)`,
      [camera.id, recording.outputPath, 'manual']
    );

    res.json({
      success: true,
      message: 'Recording started',
      filename: recording.filename
    });
  } catch (error) {
    logger.error('Error starting recording:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/recordings/stop/:cameraId
 * Stop recording
 */
router.post('/stop/:cameraId', async (req, res) => {
  try {
    const { cameraId } = req.params;

    const result = await query(
      'SELECT code FROM cameras WHERE id = $1',
      [cameraId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Camera not found' });
    }

    const camera = result.rows[0];
    const recording = streamService.stopRecording(camera.code);

    // Update database
    await query(
      `UPDATE recordings 
       SET end_time = NOW(), duration = $1, file_size = $2
       WHERE camera_id = $3 AND end_time IS NULL`,
      [recording.duration, 0, cameraId] // File size will be calculated later
    );

    res.json({
      success: true,
      message: 'Recording stopped',
      duration: recording.duration
    });
  } catch (error) {
    logger.error('Error stopping recording:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/recordings/:id
 * Delete recording
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'SELECT file_path FROM recordings WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Recording not found' });
    }

    const filePath = result.rows[0].file_path;

    // Delete file if exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`Deleted recording file: ${filePath}`);
    }

    // Delete from database
    await query('DELETE FROM recordings WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Recording deleted'
    });
  } catch (error) {
    logger.error('Error deleting recording:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;