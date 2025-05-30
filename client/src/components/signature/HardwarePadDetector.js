/**
 * Hardware Signature Pad Detector
 * Utility for detecting and testing hardware signature pad connections
 */

export class HardwarePadDetector {
  static async detectUSBSignaturePads() {
    const detectedPads = [];

    try {
      // Check if Web HID API is supported
      if (!('hid' in navigator)) {
        console.warn('Web HID API not supported in this browser');
        return detectedPads;
      }

      // Request access to HID devices (requires user gesture)
      // Try with no filters first to see all available devices
      const devices = await navigator.hid.requestDevice({
        filters: [] // No filters - show all HID devices
      });

      if (!devices || devices.length === 0) {
        throw new Error('No device selected');
      }

      for (const device of devices) {
        const padInfo = this.identifyDevice(device);
        if (padInfo) {
          detectedPads.push(padInfo);
        }
      }

    } catch (error) {
      console.error('USB signature pad detection failed:', error);
    }

    return detectedPads;
  }

  static identifyDevice(device) {
    const vendorId = device.vendorId;
    const productId = device.productId;
    const productName = device.productName || '';
    const manufacturerName = device.manufacturerName || '';

    // Topaz signature pads
    if (vendorId === 0x0699) {
      return {
        type: 'topaz',
        name: 'Topaz Signature Pad',
        model: this.getTopazModel(productId),
        vendor: 'Topaz Systems',
        vendorId,
        productId,
        device,
        capabilities: ['pressure', 'timestamp', 'encryption']
      };
    }

    // Wacom signature pads
    if (vendorId === 0x056A) {
      return {
        type: 'wacom',
        name: 'Wacom Signature Pad',
        model: this.getWacomModel(productId),
        vendor: 'Wacom',
        vendorId,
        productId,
        device,
        capabilities: ['pressure', 'tilt', 'timestamp']
      };
    }

    // Check if device name/manufacturer suggests it's a signature pad or ePad
    const deviceText = `${productName} ${manufacturerName}`.toLowerCase();
    const isLikelySignaturePad =
      deviceText.includes('signature') ||
      deviceText.includes('epad') ||
      deviceText.includes('padlink') ||
      deviceText.includes('pad') ||
      deviceText.includes('tablet') ||
      deviceText.includes('pen') ||
      deviceText.includes('touch') ||
      // Your specific device IDs
      vendorId === 0x7fcd ||
      productId === 0x9512 ||
      vendorId === 0x9512 ||
      vendorId === 0x8763 ||
      vendorId === 0x436e;

    // Special handling for ePadLink devices
    if (deviceText.includes('epadlink') || deviceText.includes('epad')) {
      return {
        type: 'epad',
        name: productName || 'ePadLink USB ePad',
        model: `ePadLink Device - VID:${vendorId.toString(16).toUpperCase()} PID:${productId.toString(16).toUpperCase()}`,
        vendor: 'ePadLink',
        vendorId,
        productId,
        device,
        capabilities: ['pressure', 'timestamp', 'usb']
      };
    }

    if (isLikelySignaturePad) {
      return {
        type: 'epad',
        name: productName || 'Generic ePad Device',
        model: `${manufacturerName || 'Unknown'} - VID:${vendorId.toString(16).toUpperCase()} PID:${productId.toString(16).toUpperCase()}`,
        vendor: manufacturerName || 'Generic ePad',
        vendorId,
        productId,
        device,
        capabilities: ['pressure', 'timestamp']
      };
    }

    // For any other HID device, treat as potential signature device
    return {
      type: 'generic',
      name: productName || 'Generic HID Device',
      model: `${manufacturerName || 'Unknown'} - VID:${vendorId.toString(16).toUpperCase()} PID:${productId.toString(16).toUpperCase()}`,
      vendor: manufacturerName || 'Unknown',
      vendorId,
      productId,
      device,
      capabilities: ['basic']
    };
  }

  static getTopazModel(productId) {
    const models = {
      0x0001: 'SignatureGem 1x5',
      0x0002: 'SignatureGem 5x3',
      0x0003: 'SignatureGem LCD 1x5',
      0x0004: 'SignatureGem LCD 4x3',
      0x0005: 'SignatureGem LCD 4x5',
      0x0006: 'SignatureGem LCD 1x5 USB',
      0x0007: 'SignatureGem T-S460',
      0x0008: 'SignatureGem T-S461',
      0x0009: 'SignatureGem T-LBK462',
      0x000A: 'SignatureGem T-LBK755',
      0x000B: 'SignatureGem T-LBK750'
    };
    return models[productId] || `Unknown Topaz Model (${productId.toString(16).toUpperCase()})`;
  }

  static getWacomModel(productId) {
    const models = {
      0x0001: 'STU-300',
      0x0002: 'STU-500',
      0x0003: 'STU-520',
      0x0004: 'STU-530',
      0x0005: 'STU-540',
      0x0006: 'DTU-1031',
      0x0007: 'DTU-1141',
      0x0008: 'STU-430',
      0x0009: 'STU-630'
    };
    return models[productId] || `Unknown Wacom Model (${productId.toString(16).toUpperCase()})`;
  }

  /**
   * Test hardware signature pad connection
   */
  static async testPadConnection(padInfo) {
    try {
      const device = padInfo.device;

      if (!device.opened) {
        await device.open();
      }

      // Send a simple test command (varies by manufacturer)
      let testResult = false;

      switch (padInfo.type) {
        case 'topaz':
          testResult = await this.testTopazConnection(device);
          break;
        case 'wacom':
          testResult = await this.testWacomConnection(device);
          break;
        default:
          testResult = await this.testGenericConnection(device);
          break;
      }

      return {
        success: testResult,
        message: testResult ? 'Connection successful' : 'Connection failed',
        padInfo
      };

    } catch (error) {
      return {
        success: false,
        message: `Connection error: ${error.message}`,
        padInfo
      };
    }
  }

  static async testTopazConnection(device) {
    try {
      // Send Topaz status query command
      const statusCommand = new Uint8Array([0x01, 0x00]); // Example command
      await device.sendReport(0x00, statusCommand);

      // Wait for response
      const response = await this.waitForResponse(device, 1000);
      return response && response.length > 0;

    } catch (error) {
      console.error('Topaz connection test failed:', error);
      return false;
    }
  }

  static async testWacomConnection(device) {
    try {
      // Send Wacom status query command
      const statusCommand = new Uint8Array([0x02, 0x00]); // Example command
      await device.sendReport(0x00, statusCommand);

      // Wait for response
      const response = await this.waitForResponse(device, 1000);
      return response && response.length > 0;

    } catch (error) {
      console.error('Wacom connection test failed:', error);
      return false;
    }
  }

  static async testGenericConnection(device) {
    try {
      // Generic connection test - just check if device responds
      return device.opened;
    } catch (error) {
      console.error('Generic connection test failed:', error);
      return false;
    }
  }

  static async waitForResponse(device, timeout = 1000) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        device.removeEventListener('inputreport', handleInput);
        reject(new Error('Response timeout'));
      }, timeout);

      const handleInput = (event) => {
        clearTimeout(timeoutId);
        device.removeEventListener('inputreport', handleInput);
        resolve(event.data);
      };

      device.addEventListener('inputreport', handleInput);
    });
  }

  /**
   * Check for software-based signature pad libraries
   */
  static checkSoftwareLibraries() {
    const libraries = {
      topazSigWeb: {
        available: typeof window !== 'undefined' && 'SigWeb' in window,
        name: 'Topaz SigWeb',
        version: null
      },
      wacomGSS: {
        available: typeof window !== 'undefined' && 'WacomGSS' in window,
        name: 'Wacom GSS',
        version: null
      },
      scriptelEasyScript: {
        available: typeof window !== 'undefined' && 'ScriptelEasyScript' in window,
        name: 'Scriptel EasyScript',
        version: null
      }
    };

    // Try to get version information
    if (libraries.topazSigWeb.available) {
      try {
        const sigWeb = new window.SigWeb();
        libraries.topazSigWeb.version = sigWeb.GetSigWebVersion();
      } catch (error) {
        console.warn('Could not get Topaz SigWeb version:', error);
      }
    }

    if (libraries.wacomGSS.available) {
      try {
        const wacom = new window.WacomGSS();
        libraries.wacomGSS.version = wacom.getVersion();
      } catch (error) {
        console.warn('Could not get Wacom GSS version:', error);
      }
    }

    return libraries;
  }

  /**
   * Get comprehensive signature pad environment info
   */
  static async getEnvironmentInfo() {
    const info = {
      browser: {
        userAgent: navigator.userAgent,
        webHIDSupported: 'hid' in navigator,
        webUSBSupported: 'usb' in navigator,
        isSecureContext: window.isSecureContext
      },
      softwareLibraries: this.checkSoftwareLibraries(),
      hardwarePads: [],
      recommendations: []
    };

    // Try to detect hardware pads (requires user interaction)
    try {
      if (info.browser.webHIDSupported && info.browser.isSecureContext) {
        // Note: This would require user gesture in real implementation
        // info.hardwarePads = await this.detectUSBSignaturePads();
        info.recommendations.push('Web HID API available - hardware signature pads can be detected');
      } else {
        if (!info.browser.isSecureContext) {
          info.recommendations.push('HTTPS required for hardware signature pad detection');
        }
        if (!info.browser.webHIDSupported) {
          info.recommendations.push('Browser does not support Web HID API - use software libraries');
        }
      }
    } catch (error) {
      info.recommendations.push(`Hardware detection error: ${error.message}`);
    }

    // Add software library recommendations
    const availableLibraries = Object.values(info.softwareLibraries).filter(lib => lib.available);
    if (availableLibraries.length > 0) {
      info.recommendations.push(`Software libraries available: ${availableLibraries.map(lib => lib.name).join(', ')}`);
    } else {
      info.recommendations.push('No signature pad software libraries detected - install vendor drivers');
    }

    return info;
  }
}

export default HardwarePadDetector;
