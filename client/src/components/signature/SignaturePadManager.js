/**
 * SignaturePadManager - Unified interface for both software and hardware signature pads
 * Supports multiple hardware signature pad vendors (Topaz, Wacom, etc.)
 */

class SignaturePadManager {
  constructor() {
    this.eventListeners = new Map();
    this.connectedPads = new Map();
    this.isInitialized = false;

    // Initialize hardware detection
    this.initializeHardwareDetection();
  }

  /**
   * Initialize hardware signature pad detection
   */
  async initializeHardwareDetection() {
    try {
      // Check if Web HID API is available (for modern browsers)
      if ('hid' in navigator) {
        await this.initializeWebHID();
      }

      // Check for Topaz signature pads
      await this.initializeTopazPads();

      // Check for Wacom signature pads
      await this.initializeWacomPads();

      // Check for ePad devices
      await this.initializeEPadDevices();

      // Check for other signature pad vendors
      await this.initializeOtherPads();

      this.isInitialized = true;
    } catch (error) {
      console.warn('Hardware signature pad detection failed:', error);
      this.isInitialized = true; // Continue with software-only mode
    }
  }

  /**
   * Initialize Web HID API for generic signature pad support
   */
  async initializeWebHID() {
    try {
      // Request permission for known signature pad vendor IDs
      const filters = [
        { vendorId: 0x0699 }, // Topaz Systems
        { vendorId: 0x056A }, // Wacom
        { vendorId: 0x1B96 }, // N-trig (Microsoft Surface)
        { vendorId: 0x28BD }, // XP-Pen
      ];

      navigator.hid.addEventListener('connect', this.handleHIDConnect.bind(this));
      navigator.hid.addEventListener('disconnect', this.handleHIDDisconnect.bind(this));

      // Check for already connected devices
      const devices = await navigator.hid.getDevices();
      for (const device of devices) {
        await this.handleHIDConnect({ device });
      }
    } catch (error) {
      console.warn('Web HID initialization failed:', error);
    }
  }

  /**
   * Handle HID device connection
   */
  async handleHIDConnect(event) {
    const device = event.device;

    // Identify signature pad type based on vendor/product ID
    const padInfo = this.identifySignaturePad(device);
    if (padInfo) {
      this.connectedPads.set(device.productId, {
        device,
        ...padInfo,
        id: `${device.vendorId}-${device.productId}`,
        status: 'connected'
      });

      this.emit('padConnected', padInfo);
    }
  }

  /**
   * Handle HID device disconnection
   */
  handleHIDDisconnect(event) {
    const device = event.device;
    const padInfo = this.connectedPads.get(device.productId);

    if (padInfo) {
      this.connectedPads.delete(device.productId);
      this.emit('padDisconnected', padInfo);
    }
  }

  /**
   * Identify signature pad based on device information
   */
  identifySignaturePad(device) {
    const vendorId = device.vendorId;
    const productId = device.productId;

    // Topaz signature pads
    if (vendorId === 0x0699) {
      return {
        type: 'topaz',
        name: 'Topaz Signature Pad',
        model: this.getTopazModel(productId),
        vendor: 'Topaz Systems',
        capabilities: ['pressure', 'timestamp']
      };
    }

    // Wacom signature pads
    if (vendorId === 0x056A) {
      return {
        type: 'wacom',
        name: 'Wacom Signature Pad',
        model: this.getWacomModel(productId),
        vendor: 'Wacom',
        capabilities: ['pressure', 'tilt', 'timestamp']
      };
    }

    // ePad devices (your specific device)
    if (vendorId === 0x7fcd || vendorId === 0x9512 || vendorId === 0x8763 || vendorId === 0x436e) {
      return {
        type: 'epad',
        name: 'Generic ePad Device',
        model: this.getEPadModel(vendorId, productId),
        vendor: 'Generic ePad',
        capabilities: ['pressure', 'timestamp']
      };
    }

    // Other signature pad vendors
    if (vendorId === 0x1B96 || vendorId === 0x28BD) {
      return {
        type: 'generic',
        name: 'Generic Signature Pad',
        model: 'Unknown',
        vendor: 'Generic',
        capabilities: ['basic']
      };
    }

    return null;
  }

  /**
   * Initialize Topaz-specific signature pad support
   */
  async initializeTopazPads() {
    try {
      // Check if Topaz SigWeb is available (requires Topaz software installation)
      if (window.SigWeb) {
        const sigWeb = new window.SigWeb();
        if (await sigWeb.GetSigWebVersion()) {
          this.connectedPads.set('topaz-sigweb', {
            type: 'topaz',
            name: 'Topaz SigWeb',
            model: 'SigWeb Compatible',
            vendor: 'Topaz Systems',
            capabilities: ['pressure', 'timestamp', 'encryption'],
            driver: sigWeb,
            id: 'topaz-sigweb',
            status: 'connected'
          });

          this.emit('padConnected', this.connectedPads.get('topaz-sigweb'));
        }
      }
    } catch (error) {
      console.warn('Topaz signature pad initialization failed:', error);
    }
  }

  /**
   * Initialize Wacom-specific signature pad support
   */
  async initializeWacomPads() {
    try {
      // Check if Wacom signature SDK is available
      if (window.WacomGSS) {
        const wacom = new window.WacomGSS();
        if (await wacom.isServiceAvailable()) {
          this.connectedPads.set('wacom-gss', {
            type: 'wacom',
            name: 'Wacom Signature Pad',
            model: 'GSS Compatible',
            vendor: 'Wacom',
            capabilities: ['pressure', 'tilt', 'timestamp'],
            driver: wacom,
            id: 'wacom-gss',
            status: 'connected'
          });

          this.emit('padConnected', this.connectedPads.get('wacom-gss'));
        }
      }
    } catch (error) {
      console.warn('Wacom signature pad initialization failed:', error);
    }
  }

  /**
   * Initialize ePad devices
   */
  async initializeEPadDevices() {
    try {
      // Check if there's a generic ePad interface available
      if (window.EPadInterface) {
        const epad = new window.EPadInterface();
        if (await epad.isAvailable()) {
          this.connectedPads.set('epad-generic', {
            type: 'epad',
            name: 'Generic ePad Device',
            model: 'USB Compatible',
            vendor: 'Generic ePad',
            capabilities: ['pressure', 'timestamp'],
            driver: epad,
            id: 'epad-generic',
            status: 'connected'
          });

          this.emit('padConnected', this.connectedPads.get('epad-generic'));
        }
      }
    } catch (error) {
      console.warn('ePad device initialization failed:', error);
    }
  }

  /**
   * Initialize other signature pad vendors
   */
  async initializeOtherPads() {
    // Placeholder for other signature pad vendor integrations
    // Can be extended to support additional hardware vendors
  }

  /**
   * Get list of available signature pads
   */
  async detectAvailablePads() {
    if (!this.isInitialized) {
      await this.initializeHardwareDetection();
    }

    return Array.from(this.connectedPads.values());
  }

  /**
   * Capture signature from specified pad type
   */
  async captureSignature(padType) {
    const pad = Array.from(this.connectedPads.values()).find(p => p.type === padType);

    if (!pad) {
      throw new Error(`Signature pad of type ${padType} not found`);
    }

    try {
      switch (pad.type) {
        case 'topaz':
          return await this.captureTopazSignature(pad);
        case 'wacom':
          return await this.captureWacomSignature(pad);
        case 'epad':
          return await this.captureEPadSignature(pad);
        case 'generic':
          return await this.captureGenericSignature(pad);
        default:
          throw new Error(`Unsupported pad type: ${pad.type}`);
      }
    } catch (error) {
      console.error('Signature capture failed:', error);
      throw error;
    }
  }

  /**
   * Capture signature from Topaz signature pad
   */
  async captureTopazSignature(pad) {
    return new Promise((resolve, reject) => {
      try {
        const sigWeb = pad.driver;

        // Configure signature capture
        sigWeb.SetDisplayXSize(400);
        sigWeb.SetDisplayYSize(150);
        sigWeb.SetJustifyMode(0);

        // Start signature capture
        sigWeb.ClearTablet();

        // Wait for signature completion (this would typically involve user interaction)
        const checkSignature = setInterval(() => {
          if (sigWeb.NumberOfTabletPoints() > 0) {
            clearInterval(checkSignature);

            // Get signature as base64 image
            const signatureImage = sigWeb.RenderBitmap("", 400, 150, "image/png", 0.5, 0x00FFFFFF, 0x00000000, -1, -1);
            resolve(`data:image/png;base64,${signatureImage}`);
          }
        }, 100);

        // Timeout after 30 seconds
        setTimeout(() => {
          clearInterval(checkSignature);
          reject(new Error('Signature capture timeout'));
        }, 30000);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Capture signature from Wacom signature pad
   */
  async captureWacomSignature(pad) {
    return new Promise((resolve, reject) => {
      try {
        const wacom = pad.driver;

        // Start signature capture session
        wacom.startCapture({
          width: 400,
          height: 150,
          timeout: 30000
        }).then(signatureData => {
          // Convert signature data to base64 image
          resolve(signatureData.image);
        }).catch(reject);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Capture signature from ePad device
   */
  async captureEPadSignature(pad) {
    return new Promise((resolve, reject) => {
      try {
        if (pad.driver) {
          // Use ePad driver if available
          pad.driver.startCapture({
            width: 400,
            height: 150,
            timeout: 30000
          }).then(signatureData => {
            resolve(signatureData.image);
          }).catch(reject);
        } else {
          // Fallback to HID communication for your specific device
          this.captureEPadViaHID(pad).then(resolve).catch(reject);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Capture signature from ePad using HID communication
   */
  async captureEPadViaHID(pad) {
    return new Promise((resolve, reject) => {
      const performCapture = async () => {
      try {
        const device = pad.device;

        if (!device.opened) {
          await device.open();
        }

        // Send ePad start capture command
        const startCommand = new Uint8Array([0x01, 0x02, 0x03]); // Generic start command
        await device.sendReport(0x00, startCommand);

        // Set up signature data collection
        let signaturePoints = [];
        let isCapturing = true;

        const handleInput = (event) => {
          const data = new Uint8Array(event.data.buffer);

          // Parse ePad data format (adjust based on your device's protocol)
          if (data[0] === 0x01) { // Pen down
            isCapturing = true;
          } else if (data[0] === 0x02) { // Pen move
            if (isCapturing && data.length >= 5) {
              const x = (data[1] << 8) | data[2];
              const y = (data[3] << 8) | data[4];
              const pressure = data.length > 5 ? data[5] : 255;

              signaturePoints.push({ x, y, pressure, timestamp: Date.now() });
            }
          } else if (data[0] === 0x03) { // Pen up
            isCapturing = false;

            // Convert points to image
            if (signaturePoints.length > 0) {
              const imageData = this.convertPointsToImage(signaturePoints);
              device.removeEventListener('inputreport', handleInput);
              resolve(imageData);
            }
          }
        };

        device.addEventListener('inputreport', handleInput);

        // Timeout after 30 seconds
        setTimeout(() => {
          device.removeEventListener('inputreport', handleInput);
          if (signaturePoints.length > 0) {
            const imageData = this.convertPointsToImage(signaturePoints);
            resolve(imageData);
          } else {
            reject(new Error('ePad signature capture timeout - no signature detected'));
          }
        }, 30000);

      } catch (error) {
        reject(error);
      }
      };

      performCapture();
    });
  }

  /**
   * Convert signature points to base64 image
   */
  convertPointsToImage(points) {
    // Create canvas to draw signature
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');

    // Set up drawing style
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw signature from points
    if (points.length > 0) {
      ctx.beginPath();
      ctx.moveTo(points[0].x * (400/4096), points[0].y * (150/4096)); // Scale coordinates

      for (let i = 1; i < points.length; i++) {
        const x = points[i].x * (400/4096);
        const y = points[i].y * (150/4096);
        ctx.lineTo(x, y);
      }

      ctx.stroke();
    }

    return canvas.toDataURL('image/png');
  }

  /**
   * Capture signature from generic signature pad
   */
  async captureGenericSignature(pad) {
    // Implement generic signature capture using Web HID
    return new Promise((resolve, reject) => {
      // This would involve low-level HID communication
      // For now, return a placeholder
      setTimeout(() => {
        resolve('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==');
      }, 2000);
    });
  }

  /**
   * Clear signature on specified pad
   */
  async clearSignature(padType) {
    const pad = Array.from(this.connectedPads.values()).find(p => p.type === padType);

    if (pad && pad.driver) {
      try {
        switch (pad.type) {
          case 'topaz':
            pad.driver.ClearTablet();
            break;
          case 'wacom':
            await pad.driver.clear();
            break;
          case 'epad':
            await this.clearEPadSignature(pad);
            break;
          case 'generic':
            // Implement generic clear
            break;
        }
      } catch (error) {
        console.error('Clear signature failed:', error);
      }
    }
  }

  /**
   * Clear ePad signature
   */
  async clearEPadSignature(pad) {
    try {
      if (pad.driver) {
        await pad.driver.clear();
      } else if (pad.device) {
        // Send clear command via HID
        const clearCommand = new Uint8Array([0x04, 0x00]); // Generic clear command
        await pad.device.sendReport(0x00, clearCommand);
      }
    } catch (error) {
      console.error('ePad clear failed:', error);
    }
  }

  /**
   * Get ePad model name from vendor/product ID
   */
  getEPadModel(vendorId, productId) {
    if (vendorId === 0x7fcd && productId === 0x9512) {
      return 'ePad USB Signature Device (7fcd:9512)';
    }
    return `ePad Device (${vendorId.toString(16).toUpperCase()}:${productId.toString(16).toUpperCase()})`;
  }

  /**
   * Get Topaz model name from product ID
   */
  getTopazModel(productId) {
    const models = {
      0x0001: 'SignatureGem 1x5',
      0x0002: 'SignatureGem 5x3',
      0x0003: 'SignatureGem LCD 1x5',
      0x0004: 'SignatureGem LCD 4x3',
      0x0005: 'SignatureGem LCD 4x5'
    };
    return models[productId] || 'Unknown Model';
  }

  /**
   * Get Wacom model name from product ID
   */
  getWacomModel(productId) {
    const models = {
      0x0001: 'STU-300',
      0x0002: 'STU-500',
      0x0003: 'STU-520',
      0x0004: 'STU-530'
    };
    return models[productId] || 'Unknown Model';
  }

  /**
   * Event system for pad connection/disconnection
   */
  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Event listener error:', error);
        }
      });
    }
  }
}

export default SignaturePadManager;
