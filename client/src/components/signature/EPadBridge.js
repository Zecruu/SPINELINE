/**
 * ePad Bridge - Interface for Generic ePad devices
 * This bridges the gap between the Generic ePad Test Utility and our web application
 */

class EPadBridge {
  constructor() {
    this.isConnected = false;
    this.device = null;
    this.signatureData = null;
    this.eventListeners = new Map();
    
    // Try to detect if Generic ePad Test Utility is available
    this.detectEPadUtility();
  }

  /**
   * Detect if Generic ePad Test Utility is running or available
   */
  async detectEPadUtility() {
    try {
      // Check if there's a local server running the ePad utility
      const response = await fetch('http://localhost:8080/epad/status', {
        method: 'GET',
        mode: 'cors'
      });
      
      if (response.ok) {
        this.isConnected = true;
        this.emit('connected');
        return true;
      }
    } catch (error) {
      // ePad utility not running via HTTP, try WebSocket
      try {
        const ws = new WebSocket('ws://localhost:8081/epad');
        ws.onopen = () => {
          this.isConnected = true;
          this.device = ws;
          this.emit('connected');
          ws.close();
        };
        ws.onerror = () => {
          this.tryDirectHIDAccess();
        };
      } catch (wsError) {
        this.tryDirectHIDAccess();
      }
    }
    
    return false;
  }

  /**
   * Try direct HID access to ePad device
   */
  async tryDirectHIDAccess() {
    try {
      if (!('hid' in navigator)) {
        console.warn('Web HID API not supported');
        return false;
      }

      // Get already connected devices first
      const devices = await navigator.hid.getDevices();
      const ePadDevice = devices.find(device => 
        device.vendorId === 0x7fcd || 
        device.productId === 0x9512 ||
        device.productName?.toLowerCase().includes('epad')
      );

      if (ePadDevice) {
        this.device = ePadDevice;
        this.isConnected = true;
        this.emit('connected');
        return true;
      }

      // If not found, request access
      const requestedDevices = await navigator.hid.requestDevice({
        filters: [
          { vendorId: 0x7fcd },
          { productId: 0x9512 },
          { vendorId: 0x8763 },
          { vendorId: 0x436e }
        ]
      });

      if (requestedDevices.length > 0) {
        this.device = requestedDevices[0];
        this.isConnected = true;
        this.emit('connected');
        return true;
      }

    } catch (error) {
      console.error('Direct HID access failed:', error);
    }

    return false;
  }

  /**
   * Check if ePad is available and ready
   */
  async isAvailable() {
    if (this.isConnected) {
      return true;
    }
    
    return await this.detectEPadUtility();
  }

  /**
   * Start signature capture
   */
  async startCapture(options = {}) {
    if (!this.isConnected) {
      throw new Error('ePad device not connected');
    }

    const config = {
      width: options.width || 400,
      height: options.height || 150,
      timeout: options.timeout || 30000,
      ...options
    };

    try {
      // Try HTTP API first
      if (await this.captureViaHTTP(config)) {
        return this.signatureData;
      }
      
      // Try WebSocket API
      if (await this.captureViaWebSocket(config)) {
        return this.signatureData;
      }
      
      // Try direct HID communication
      return await this.captureViaHID(config);
      
    } catch (error) {
      console.error('ePad capture failed:', error);
      throw error;
    }
  }

  /**
   * Capture signature via HTTP API (if ePad utility provides one)
   */
  async captureViaHTTP(config) {
    try {
      const response = await fetch('http://localhost:8080/epad/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        const result = await response.json();
        this.signatureData = {
          image: result.signature,
          timestamp: Date.now(),
          method: 'http'
        };
        return true;
      }
    } catch (error) {
      console.warn('HTTP capture failed:', error);
    }
    return false;
  }

  /**
   * Capture signature via WebSocket
   */
  async captureViaWebSocket(config) {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket('ws://localhost:8081/epad');
        
        ws.onopen = () => {
          ws.send(JSON.stringify({
            command: 'startCapture',
            config: config
          }));
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'signature') {
            this.signatureData = {
              image: data.signature,
              timestamp: Date.now(),
              method: 'websocket'
            };
            ws.close();
            resolve(true);
          } else if (data.type === 'error') {
            ws.close();
            reject(new Error(data.message));
          }
        };

        ws.onerror = () => {
          reject(new Error('WebSocket connection failed'));
        };

        // Timeout
        setTimeout(() => {
          ws.close();
          reject(new Error('Capture timeout'));
        }, config.timeout);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Capture signature via direct HID communication
   */
  async captureViaHID(config) {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.device.opened) {
          await this.device.open();
        }

        let signaturePoints = [];
        let isCapturing = false;
        let lastPoint = null;

        const handleInput = (event) => {
          const data = new Uint8Array(event.data.buffer);
          
          // Parse your specific ePad protocol
          // Adjust these values based on your device's actual data format
          if (data.length >= 6) {
            const status = data[0];
            const x = (data[1] << 8) | data[2];
            const y = (data[3] << 8) | data[4];
            const pressure = data[5];

            if (status & 0x01) { // Pen down
              isCapturing = true;
              lastPoint = { x, y, pressure, timestamp: Date.now() };
              signaturePoints.push(lastPoint);
            } else if (status & 0x02) { // Pen move
              if (isCapturing) {
                const point = { x, y, pressure, timestamp: Date.now() };
                signaturePoints.push(point);
                lastPoint = point;
              }
            } else if (status & 0x04) { // Pen up
              if (isCapturing && signaturePoints.length > 0) {
                isCapturing = false;
                const imageData = this.convertPointsToImage(signaturePoints, config);
                this.signatureData = {
                  image: imageData,
                  points: signaturePoints,
                  timestamp: Date.now(),
                  method: 'hid'
                };
                this.device.removeEventListener('inputreport', handleInput);
                resolve(this.signatureData);
              }
            }
          }
        };

        this.device.addEventListener('inputreport', handleInput);

        // Send start capture command
        const startCommand = new Uint8Array([0x01, 0x00, 0x00, 0x00]);
        await this.device.sendReport(0x00, startCommand);

        // Timeout
        setTimeout(() => {
          this.device.removeEventListener('inputreport', handleInput);
          if (signaturePoints.length > 0) {
            const imageData = this.convertPointsToImage(signaturePoints, config);
            this.signatureData = {
              image: imageData,
              points: signaturePoints,
              timestamp: Date.now(),
              method: 'hid-timeout'
            };
            resolve(this.signatureData);
          } else {
            reject(new Error('No signature captured within timeout period'));
          }
        }, config.timeout);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Convert signature points to image
   */
  convertPointsToImage(points, config) {
    const canvas = document.createElement('canvas');
    canvas.width = config.width;
    canvas.height = config.height;
    const ctx = canvas.getContext('2d');

    // Clear background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (points.length === 0) {
      return canvas.toDataURL('image/png');
    }

    // Set drawing style
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Find bounds for scaling
    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));

    const scaleX = (canvas.width - 20) / (maxX - minX || 1);
    const scaleY = (canvas.height - 20) / (maxY - minY || 1);
    const scale = Math.min(scaleX, scaleY);

    // Draw signature
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const x = 10 + (points[i].x - minX) * scale;
      const y = 10 + (points[i].y - minY) * scale;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    return canvas.toDataURL('image/png');
  }

  /**
   * Clear signature
   */
  async clear() {
    this.signatureData = null;
    
    if (this.device && this.device.opened) {
      try {
        const clearCommand = new Uint8Array([0x02, 0x00, 0x00, 0x00]);
        await this.device.sendReport(0x00, clearCommand);
      } catch (error) {
        console.error('Clear command failed:', error);
      }
    }
  }

  /**
   * Event system
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

// Make EPadBridge available globally for the SignaturePadManager
if (typeof window !== 'undefined') {
  window.EPadInterface = EPadBridge;
}

export default EPadBridge;
