import express from 'express';
import onvifService from '../services/onvifService.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/discovery/scan
 * Discover ONVIF cameras on the network
 */
router.post('/scan', async (req, res) => {
  try {
    const { timeout = 5000 } = req.body;
    
    logger.info('Starting ONVIF camera discovery...');
    const cameras = await onvifService.discoverCameras(timeout);
    
    res.json({
      success: true,
      cameras,
      count: cameras.length,
      message: `Discovered ${cameras.length} camera(s)`
    });
  } catch (error) {
    logger.error('Discovery error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;