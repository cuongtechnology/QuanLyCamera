import express from 'express';
import { query } from '../utils/database.js';
import onvifService from '../services/onvifService.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/ptz/move/:cameraId
 * Move PTZ camera
 */
router.post('/move/:cameraId', async (req, res) => {
  try {
    const { cameraId } = req.params;
    const { direction, speed = 0.5 } = req.body;

    const result = await query(
      'SELECT * FROM cameras WHERE id = $1',
      [cameraId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Camera not found' });
    }

    const camera = result.rows[0];
    const device = onvifService.getDevice(camera.ip_address, camera.port);

    if (!device) {
      const connection = await onvifService.connectCamera({
        ip: camera.ip_address,
        port: camera.port,
        username: camera.username,
        password: camera.password
      });
      device = connection.device;
    }

    await onvifService.ptzMove(device, direction, speed);

    res.json({ success: true, message: `PTZ moved ${direction}` });
  } catch (error) {
    logger.error('PTZ move error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/ptz/stop/:cameraId
 * Stop PTZ movement
 */
router.post('/stop/:cameraId', async (req, res) => {
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
    const device = onvifService.getDevice(camera.ip_address, camera.port);

    if (!device) {
      return res.status(400).json({ success: false, error: 'Camera not connected' });
    }

    await onvifService.ptzStop(device);

    res.json({ success: true, message: 'PTZ stopped' });
  } catch (error) {
    logger.error('PTZ stop error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ptz/presets/:cameraId
 * Get PTZ presets
 */
router.get('/presets/:cameraId', async (req, res) => {
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
    let device = onvifService.getDevice(camera.ip_address, camera.port);

    if (!device) {
      const connection = await onvifService.connectCamera({
        ip: camera.ip_address,
        port: camera.port,
        username: camera.username,
        password: camera.password
      });
      device = connection.device;
    }

    const presets = await onvifService.getPtzPresets(device);

    res.json({ success: true, presets });
  } catch (error) {
    logger.error('Get presets error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/ptz/goto-preset/:cameraId
 * Go to PTZ preset
 */
router.post('/goto-preset/:cameraId', async (req, res) => {
  try {
    const { cameraId } = req.params;
    const { presetToken } = req.body;

    const result = await query(
      'SELECT * FROM cameras WHERE id = $1',
      [cameraId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Camera not found' });
    }

    const camera = result.rows[0];
    const device = onvifService.getDevice(camera.ip_address, camera.port);

    if (!device) {
      return res.status(400).json({ success: false, error: 'Camera not connected' });
    }

    await onvifService.ptzGotoPreset(device, presetToken);

    res.json({ success: true, message: 'Moved to preset' });
  } catch (error) {
    logger.error('Goto preset error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;