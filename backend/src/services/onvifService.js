import onvif from 'node-onvif';
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
    
    return new Promise((resolve, reject) => {
      const discoveredCameras = [];

      onvif.startProbe().then((deviceList) => {
        logger.info(`Discovered ${deviceList.length} ONVIF devices`);
        
        const cameras = deviceList.map(device => ({
          ip: device.address,
          port: device.port || 80,
          name: device.name,
          hardware: device.hardware,
          location: device.location,
          types: device.types,
          xaddrs: device.xaddrs,
          scopes: device.scopes,
          urn: device.urn
        }));

        resolve(cameras);
      }).catch((error) => {
        logger.error('ONVIF discovery error:', error);
        reject(error);
      });

      // Timeout fallback
      setTimeout(() => {
        resolve([]);
      }, timeout);
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
      const device = new onvif.OnvifDevice({
        xaddr: `http://${ip}:${port}/onvif/device_service`,
        user: username,
        pass: password
      });

      await device.init();
      
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
      const info = await device.getDeviceInformation();
      return {
        manufacturer: info.data.GetDeviceInformationResponse.Manufacturer,
        model: info.data.GetDeviceInformationResponse.Model,
        firmwareVersion: info.data.GetDeviceInformationResponse.FirmwareVersion,
        serialNumber: info.data.GetDeviceInformationResponse.SerialNumber,
        hardwareId: info.data.GetDeviceInformationResponse.HardwareId
      };
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
      const capabilities = await device.getCapabilities();
      return {
        ptz: !!capabilities.data.Capabilities.PTZ,
        imaging: !!capabilities.data.Capabilities.Imaging,
        analytics: !!capabilities.data.Capabilities.Analytics,
        events: !!capabilities.data.Capabilities.Events
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
      const profiles = await device.getProfiles();
      const streamUrls = [];

      for (const profile of profiles.data.Profiles) {
        try {
          const streamUri = await device.getStreamUri({
            protocol: 'RTSP',
            profileToken: profile.$.token
          });

          streamUrls.push({
            profileToken: profile.$.token,
            profileName: profile.Name,
            url: streamUri.data.MediaUri.Uri,
            resolution: profile.VideoEncoderConfiguration?.Resolution 
              ? `${profile.VideoEncoderConfiguration.Resolution.Width}x${profile.VideoEncoderConfiguration.Resolution.Height}`
              : 'unknown',
            encoding: profile.VideoEncoderConfiguration?.Encoding || 'unknown',
            fps: profile.VideoEncoderConfiguration?.RateControl?.FrameRateLimit || 0,
            bitrate: profile.VideoEncoderConfiguration?.RateControl?.BitrateLimit || 0
          });
        } catch (err) {
          logger.warn('Failed to get stream URI for profile:', profile.$.token);
        }
      }

      return streamUrls;
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

      await device.ptzMove(velocity);
      logger.debug(`PTZ move ${direction} with speed ${speed}`);
      return { success: true };
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
      await device.ptzStop();
      logger.debug('PTZ stop');
      return { success: true };
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
      await device.ptzGotoPreset({ presetToken });
      logger.debug(`PTZ goto preset ${presetToken}`);
      return { success: true };
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
      const presets = await device.getPresets();
      return presets.data.Presets || [];
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
