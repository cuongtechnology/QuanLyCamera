import { Cam } from 'onvif';
import logger from '../utils/logger.js';

class OnvifService {
  constructor() {
    this.devices = new Map(); // Store connected ONVIF devices
  }

  /**
   * Discover ONVIF cameras on the network
   */
  async discoverCameras(timeout = 5000) {
    logger.info('Starting ONVIF camera discovery...');
    
    return new Promise((resolve) => {
      const discoveredCameras = [];

      // Note: Discovery requires network scanning capability
      // For now, return empty array - users should add cameras manually
      logger.warn('ONVIF discovery requires network scanning. Please add cameras manually via API.');
      
      setTimeout(() => {
        resolve(discoveredCameras);
      }, 1000);
    });
  }

  /**
   * Connect to an ONVIF camera
   */
  async connectCamera(config) {
    const { ip, port = 80, username, password } = config;
    const deviceKey = `${ip}:${port}`;

    logger.info(`Connecting to ONVIF camera at ${deviceKey}...`);

    try {
      const device = new Cam({
        hostname: ip,
        username: username,
        password: password,
        port: port,
        timeout: 10000
      }, (err) => {
        if (err) {
          logger.error(`Failed to connect to camera ${deviceKey}:`, err);
          throw err;
        }
      });

      // Wait for connection
      await new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (device.capabilities) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('Connection timeout'));
        }, 10000);
      });
      
      this.devices.set(deviceKey, device);
      logger.info(`Successfully connected to camera ${deviceKey}`);

      return {
        success: true,
        device,
        deviceInfo: await this.getDeviceInformation(device),
        capabilities: await this.getCapabilities(device)
      };
    } catch (error) {
      logger.error(`Failed to connect to camera ${deviceKey}:`, error);
      throw error;
    }
  }

  /**
   * Get device information
   */
  async getDeviceInformation(device) {
    try {
      return new Promise((resolve, reject) => {
        device.getDeviceInformation((err, info) => {
          if (err) {
            logger.error('Error getting device information:', err);
            resolve(null);
          } else {
            resolve({
              manufacturer: info.manufacturer || 'Unknown',
              model: info.model || 'Unknown',
              firmwareVersion: info.firmwareVersion || 'Unknown',
              serialNumber: info.serialNumber || 'Unknown',
              hardwareId: info.hardwareId || 'Unknown'
            });
          }
        });
      });
    } catch (error) {
      logger.error('Error getting device information:', error);
      return null;
    }
  }

  /**
   * Get device capabilities
   */
  async getCapabilities(device) {
    try {
      return {
        ptz: !!device.capabilities?.PTZ,
        imaging: !!device.capabilities?.imaging,
        analytics: !!device.capabilities?.analytics,
        events: !!device.capabilities?.events
      };
    } catch (error) {
      logger.error('Error getting capabilities:', error);
      return {};
    }
  }

  /**
   * Get RTSP stream URLs
   */
  async getStreamUrls(device) {
    try {
      return new Promise((resolve, reject) => {
        device.getStreamUri({ protocol: 'RTSP' }, (err, stream) => {
          if (err) {
            logger.error('Error getting stream URLs:', err);
            reject(err);
          } else {
            const streamUrls = [{
              profileToken: 'main',
              profileName: 'Main Stream',
              url: stream.uri,
              resolution: 'unknown',
              encoding: 'H264',
              fps: 25,
              bitrate: 2000
            }];
            resolve(streamUrls);
          }
        });
      });
    } catch (error) {
      logger.error('Error getting stream URLs:', error);
      throw error;
    }
  }

  /**
   * PTZ Control - Continuous Move
   */
  async ptzMove(device, direction, speed = 0.5) {
    try {
      const velocity = {
        x: 0,
        y: 0,
        zoom: 0
      };

      switch (direction) {
        case 'left':
          velocity.x = -speed;
          break;
        case 'right':
          velocity.x = speed;
          break;
        case 'up':
          velocity.y = speed;
          break;
        case 'down':
          velocity.y = -speed;
          break;
        case 'zoom-in':
          velocity.zoom = speed;
          break;
        case 'zoom-out':
          velocity.zoom = -speed;
          break;
      }

      return new Promise((resolve, reject) => {
        device.continuousMove(velocity, (err) => {
          if (err) {
            logger.error('PTZ move error:', err);
            reject(err);
          } else {
            logger.debug(`PTZ move ${direction} with speed ${speed}`);
            resolve({ success: true });
          }
        });
      });
    } catch (error) {
      logger.error('PTZ move error:', error);
      throw error;
    }
  }

  /**
   * PTZ Control - Stop
   */
  async ptzStop(device) {
    try {
      return new Promise((resolve, reject) => {
        device.stop((err) => {
          if (err) {
            logger.error('PTZ stop error:', err);
            reject(err);
          } else {
            logger.debug('PTZ stop');
            resolve({ success: true });
          }
        });
      });
    } catch (error) {
      logger.error('PTZ stop error:', error);
      throw error;
    }
  }

  /**
   * PTZ Control - Go to Preset
   */
  async ptzGotoPreset(device, presetToken) {
    try {
      return new Promise((resolve, reject) => {
        device.gotoPreset({ preset: presetToken }, (err) => {
          if (err) {
            logger.error('PTZ goto preset error:', err);
            reject(err);
          } else {
            logger.debug(`PTZ goto preset ${presetToken}`);
            resolve({ success: true });
          }
        });
      });
    } catch (error) {
      logger.error('PTZ goto preset error:', error);
      throw error;
    }
  }

  /**
   * Get PTZ Presets
   */
  async getPtzPresets(device) {
    try {
      return new Promise((resolve) => {
        device.getPresets((err, presets) => {
          if (err) {
            logger.error('Error getting PTZ presets:', err);
            resolve([]);
          } else {
            resolve(presets || []);
          }
        });
      });
    } catch (error) {
      logger.error('Error getting PTZ presets:', error);
      return [];
    }
  }

  /**
   * Get device by IP:Port
   */
  getDevice(ip, port = 80) {
    const deviceKey = `${ip}:${port}`;
    return this.devices.get(deviceKey);
  }

  /**
   * Disconnect device
   */
  disconnectDevice(ip, port = 80) {
    const deviceKey = `${ip}:${port}`;
    this.devices.delete(deviceKey);
    logger.info(`Disconnected device ${deviceKey}`);
  }
}

export default new OnvifService();
