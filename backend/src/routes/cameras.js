import express from 'express';
import { query } from '../utils/database.js';
import onvifService from '../services/onvifService.js';
import streamService from '../services/streamService.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/cameras
 * Get all cameras
 */
router.get('/', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM cameras ORDER BY created_at DESC'
    );
    res.json({
      success: true,
      cameras: result.rows
    });
  } catch (error) {
    logger.error('Error fetching cameras:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/cameras/:id
 * Get camera by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM cameras WHERE id = $1',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Camera not found' });
    }
    
    res.json({
      success: true,
      camera: result.rows[0]
    });
  } catch (error) {
    logger.error('Error fetching camera:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/cameras
 * Add a new camera
 */
router.post('/', async (req, res) => {
  try {
    const {
      code,
      name,
      ip_address,
      port = 80,
      username,
      password,
      enabled = true
    } = req.body;

    // Validate required fields
    if (!code || !name || !ip_address) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: code, name, ip_address'
      });
    }

    // Try to connect to the camera
    let deviceInfo = {};
    let rtspUrl = '';

    try {
      const connection = await onvifService.connectCamera({
        ip: ip_address,
        port,
        username,
        password
      });

      deviceInfo = connection.deviceInfo || {};
      
      // Get RTSP URLs
      const streamUrls = await onvifService.getStreamUrls(connection.device);
      if (streamUrls.length > 0) {
        rtspUrl = streamUrls[0].url;
        logger.info(`Got RTSP URL: ${rtspUrl}`);
      }

    } catch (error) {
      logger.warn('Could not connect to camera via ONVIF:', error.message);
      // Continue anyway, camera might not support ONVIF fully
    }

    // Insert camera into database
    const result = await query(
      `INSERT INTO cameras 
       (code, name, ip_address, port, username, password, 
        manufacturer, model, firmware_version, rtsp_url, status, enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        code,
        name,
        ip_address,
        port,
        username,
        password,
        deviceInfo.manufacturer || 'Unknown',
        deviceInfo.model || 'Unknown',
        deviceInfo.firmwareVersion || 'Unknown',
        rtspUrl,
        rtspUrl ? 'online' : 'offline',
        enabled
      ]
    );

    logger.info(`Camera ${code} added successfully`);

    res.status(201).json({
      success: true,
      camera: result.rows[0]
    });
  } catch (error) {
    logger.error('Error adding camera:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/cameras/:id
 * Update camera
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const fields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE cameras SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Camera not found' });
    }

    res.json({
      success: true,
      camera: result.rows[0]
    });
  } catch (error) {
    logger.error('Error updating camera:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/cameras/:id
 * Delete camera
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get camera info first
    const cameraResult = await query(
      'SELECT code FROM cameras WHERE id = $1',
      [id]
    );

    if (cameraResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Camera not found' });
    }

    const cameraCode = cameraResult.rows[0].code;

    // Stop any active streams
    if (streamService.isStreamActive(cameraCode)) {
      streamService.stopHlsStream(cameraCode);
    }

    // Delete from database
    await query('DELETE FROM cameras WHERE id = $1', [id]);

    logger.info(`Camera ${cameraCode} deleted`);

    res.json({
      success: true,
      message: 'Camera deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting camera:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/cameras/:id/test
 * Test camera connection
 */
router.post('/:id/test', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM cameras WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Camera not found' });
    }

    const camera = result.rows[0];

    const connection = await onvifService.connectCamera({
      ip: camera.ip_address,
      port: camera.port,
      username: camera.username,
      password: camera.password
    });

    res.json({
      success: true,
      message: 'Camera connection successful',
      deviceInfo: connection.deviceInfo,
      capabilities: connection.capabilities
    });
  } catch (error) {
    logger.error('Camera test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Camera connection failed: ' + error.message
    });
  }
});

export default router;
