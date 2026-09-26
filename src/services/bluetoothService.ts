import { store, updateAngle, updateBattery, setDeviceStatus, setHasPaired, setIsRecordingSession } from '../store/store';

// BLE GATT Profile Constants - Aligned with PosturePal ESP32 firmware
export const POSTURE_SERVICE_UUID = '00001830-0000-1000-8000-00805f9b34fb';
export const CHARACTERISTIC_ANGLE_UUID = '00002a5a-0000-1000-8000-00805f9b34fb';
export const CHARACTERISTIC_BATT_UUID = '00002a19-0000-1000-8000-00805f9b34fb';
export const CHARACTERISTIC_CONFIG_UUID = '00002a5c-0000-1000-8000-00805f9b34fb';

class BluetoothService {
  private device: any = null;
  private server: any = null;
  private angleCharacteristic: any = null;
  private batteryCharacteristic: any = null;
  private configCharacteristic: any = null;
  private reconnectTimeout: any = null;
  private isConnecting: boolean = false;

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && ('bluetooth' in navigator || (navigator as any).bluetooth !== undefined);
  }

  public isConnected(): boolean {
    return !!(this.server && this.server.connected);
  }

  public getDeviceName(): string {
    return this.device?.name || 'PosturePal Pod';
  }

  public async connect(): Promise<boolean> {
    if (!this.isSupported()) {
      console.warn('Web Bluetooth API is not supported in this environment.');
      return false;
    }

    if (this.isConnecting) return false;
    this.isConnecting = true;

    try {
      console.log('Requesting PosturePal Bluetooth device...');
      const bluetooth = (navigator as any).bluetooth;
      const device = await bluetooth.requestDevice({
        filters: [
          { namePrefix: 'PosturePal' },
          { namePrefix: 'Posture' },
          { namePrefix: 'ESP32' },
          { services: [POSTURE_SERVICE_UUID] }
        ],
        optionalServices: [POSTURE_SERVICE_UUID, 'battery_service', 0x180f, 0x1830]
      });

      this.device = device;
      device.addEventListener('gattserverdisconnected', this.handleDisconnected);

      const success = await this.establishGattConnection();
      this.isConnecting = false;
      return success;
    } catch (error: any) {
      this.isConnecting = false;
      const errMsg = String(error?.message || error);
      if (errMsg.includes('permissions policy') || errMsg.includes('disallowed') || errMsg.includes('SecurityError') || errMsg.includes('User cancelled')) {
        console.warn('BLE connection notice (sandbox policy or user bypass):', errMsg);
      } else {
        console.error('BLE connection request cancelled or failed:', error);
      }
      throw error;
    }
  }

  private async establishGattConnection(): Promise<boolean> {
    if (!this.device) return false;

    try {
      console.log('Connecting to GATT server...');
      const server = await this.device.gatt?.connect();
      if (!server) throw new Error('Could not connect to GATT server');
      this.server = server;

      console.log('Fetching Primary Service...');
      const service = await server.getPrimaryService(POSTURE_SERVICE_UUID);

      console.log('Fetching Angle/Pitch Characteristic...');
      try {
        const angleChar = await service.getCharacteristic(CHARACTERISTIC_ANGLE_UUID);
        this.angleCharacteristic = angleChar;
        // Attach listener BEFORE starting notifications to catch initial bursts
        angleChar.addEventListener('characteristicvaluechanged', this.handleAngleNotification);
        await angleChar.startNotifications();
        console.log('✅ Angle characteristic notifications started.');

        // Immediate initial read so app displays live angle without waiting for next motion/tick
        try {
          const initialAngleVal = await angleChar.readValue();
          if (initialAngleVal) {
            const parsed = this.parseBleAngle(initialAngleVal);
            if (parsed !== null) {
              store.dispatch(updateAngle(parsed));
              console.log('📡 BLE Initial Pitch Angle Read:', parsed);
            }
          }
        } catch (readErr) {
          console.log('Initial angle read not supported or handled via notify:', readErr);
        }
      } catch (err) {
        console.error('Failed to bind Angle Characteristic:', err);
      }

      console.log('Fetching Battery Characteristic...');
      try {
        const battChar = await service.getCharacteristic(CHARACTERISTIC_BATT_UUID);
        this.batteryCharacteristic = battChar;
        battChar.addEventListener('characteristicvaluechanged', this.handleBatteryNotification);
        await battChar.startNotifications();
        console.log('✅ Battery characteristic notifications started.');

        // Immediate initial battery read
        try {
          const initialBattVal = await battChar.readValue();
          if (initialBattVal) {
            const parsedBatt = this.parseBleBattery(initialBattVal);
            if (parsedBatt !== null) {
              store.dispatch(updateBattery(parsedBatt));
              console.log('📡 BLE Initial Battery Level Read:', parsedBatt);
            }
          }
        } catch (readErr) {
          console.log('Initial battery read not supported or handled via notify:', readErr);
        }
      } catch (err) {
        console.error('Failed to bind Battery Characteristic:', err);
      }

      console.log('Fetching Config Characteristic...');
      try {
        const configChar = await service.getCharacteristic(CHARACTERISTIC_CONFIG_UUID);
        this.configCharacteristic = configChar;
        console.log('✅ Config characteristic bound.');
      } catch (err) {
        console.warn('Config characteristic not found or not writable:', err);
      }

      // Successfully paired and connected
      store.dispatch(setHasPaired(true));
      store.dispatch(setDeviceStatus(true));
      console.log('✅ Bluetooth Low Energy connected and listening!');
      return true;
    } catch (error) {
      console.error('Failed to establish GATT handshake:', error);
      store.dispatch(setDeviceStatus(false));
      return false;
    }
  }

  /**
   * Resilient parsing of BLE angle characteristic supporting:
   * 1. 4-byte Float32 (Standard ESP32 C++ `float appAngle` little-endian)
   * 2. 2-byte Signed/Unsigned int16_t (standard GATT little-endian)
   * 3. 1-byte uint8_t
   * 4. UTF-8 text string (e.g. "85.4" or JSON {"angle": 85})
   */
  public parseBleAngle(view: DataView): number | null {
    if (!view || view.byteLength === 0) return null;

    // A. Check for JSON / text string payload
    try {
      const text = new TextDecoder().decode(view).trim();
      if (text.startsWith('{')) {
        const obj = JSON.parse(text);
        if (typeof obj.angle === 'number') return obj.angle;
        if (typeof obj.a === 'number') return obj.a;
      }
      const num = parseFloat(text);
      if (!isNaN(num) && /^-?\d+(\.\d+)?$/.test(text)) {
        if (num >= -180 && num <= 180) {
          return Math.round(num * 10) / 10;
        }
      }
    } catch {}

    // B. 4-byte Float32 (Standard IEEE 754 float in C++ Arduino `sizeof(appAngle) == 4`)
    if (view.byteLength === 4) {
      const floatValLE = view.getFloat32(0, true);
      if (!isNaN(floatValLE) && isFinite(floatValLE) && floatValLE >= -180 && floatValLE <= 180) {
        return Math.round(floatValLE * 10) / 10;
      }
      const floatValBE = view.getFloat32(0, false);
      if (!isNaN(floatValBE) && isFinite(floatValBE) && floatValBE >= -180 && floatValBE <= 180) {
        return Math.round(floatValBE * 10) / 10;
      }
      // Or 4-byte int32
      const int32LE = view.getInt32(0, true);
      if (int32LE >= -180 && int32LE <= 180) {
        return int32LE;
      }
    }

    // C. 2-byte Signed or Unsigned Integer (int16_t on ESP32)
    if (view.byteLength === 2) {
      const int16LE = view.getInt16(0, true);
      if (int16LE >= -180 && int16LE <= 180) {
        return int16LE;
      }
      const uint16LE = view.getUint16(0, true);
      if (uint16LE <= 180) {
        return uint16LE;
      }
      const int16BE = view.getInt16(0, false);
      if (int16BE >= -180 && int16BE <= 180) {
        return int16BE;
      }
    }

    // D. 1-byte Signed or Unsigned Integer (uint8 / int8)
    if (view.byteLength === 1) {
      const u8 = view.getUint8(0);
      return u8 <= 180 ? u8 : view.getInt8(0);
    }

    // Fallback if buffer has at least 2 bytes
    if (view.byteLength >= 2) {
      return view.getInt16(0, true);
    }

    return null;
  }

  /**
   * Resilient parsing of BLE battery characteristic supporting uint8, int16, float32, or text
   */
  public parseBleBattery(view: DataView): number | null {
    if (!view || view.byteLength === 0) return null;

    // A. Check for JSON / text string payload
    try {
      const text = new TextDecoder().decode(view).trim();
      if (text.startsWith('{')) {
        const obj = JSON.parse(text);
        if (typeof obj.battery === 'number') return Math.min(100, Math.max(0, Math.round(obj.battery)));
        if (typeof obj.batteryLevel === 'number') return Math.min(100, Math.max(0, Math.round(obj.batteryLevel)));
        if (typeof obj.b === 'number') return Math.min(100, Math.max(0, Math.round(obj.b)));
      }
      const num = parseFloat(text);
      if (!isNaN(num) && /^\d+(\.\d+)?$/.test(text)) {
        return Math.min(100, Math.max(0, Math.round(num)));
      }
    } catch {}

    // B. 1-byte uint8 (Standard BLE Battery Characteristic 0x2A19)
    if (view.byteLength === 1) {
      return Math.min(100, Math.max(0, view.getUint8(0)));
    }

    // C. 2-byte integer
    if (view.byteLength === 2) {
      const val = view.getInt16(0, true);
      if (val >= 0 && val <= 100) return val;
      return Math.min(100, Math.max(0, view.getUint8(0)));
    }

    // D. 4-byte Float32
    if (view.byteLength === 4) {
      const floatVal = view.getFloat32(0, true);
      if (!isNaN(floatVal) && floatVal >= 0 && floatVal <= 100) {
        return Math.min(100, Math.max(0, Math.round(floatVal)));
      }
    }

    return Math.min(100, Math.max(0, view.getUint8(0)));
  }

  private handleAngleNotification = (event: Event) => {
    const target = event.target as any;
    if (!target || !target.value) return;

    try {
      const view = target.value; // DataView
      const angle = this.parseBleAngle(view);
      if (angle !== null && !isNaN(angle)) {
        store.dispatch(updateAngle(angle));
        console.log('📡 BLE Received Pitch Angle:', angle, `(bytes: ${view.byteLength})`);

        // If auto-recording is enabled, activate session on live telemetry
        const state = store.getState();
        if (state.posture.autoRecordEnabled && !state.posture.isRecordingSession) {
          store.dispatch(setIsRecordingSession(true));
        }
      } else {
        console.warn('Could not parse BLE angle packet:', view);
      }
    } catch (err) {
      console.warn('Failed to parse angle packet:', err);
    }
  };

  private handleBatteryNotification = (event: Event) => {
    const target = event.target as any;
    if (!target || !target.value) return;

    try {
      const view = target.value; // DataView
      const battery = this.parseBleBattery(view);
      if (battery !== null && !isNaN(battery)) {
        store.dispatch(updateBattery(battery));
        console.log('📡 BLE Received Battery Level:', battery, '%');
      }
    } catch (err) {
      console.warn('Failed to parse battery packet:', err);
    }
  };

  public async writeConfigPayload(payload: any): Promise<boolean> {
    if (!this.configCharacteristic) {
      console.warn('BLE Config Characteristic is not connected or available.');
      return false;
    }
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(payload));
      await this.configCharacteristic.writeValue(data);
      console.log('✅ Synchronized configuration payload to ESP32 Flash Preferences:', payload);
      return true;
    } catch (err) {
      console.error('Failed to write configuration updates to ESP32 over BLE:', err);
      return false;
    }
  }

  public async writeConfig(threshold: number, delayMs: number, baseline?: number): Promise<boolean> {
    const payload: any = {
      t: threshold,
      d: delayMs
    };
    if (typeof baseline === 'number') {
      payload.b = baseline;
    }
    return this.writeConfigPayload(payload);
  }

  public async triggerCalibration(): Promise<boolean> {
    return this.writeConfigPayload({ c: 1 });
  }

  private handleDisconnected = () => {
    console.warn('⚠️ PosturePal BLE GATT disconnected!');
    store.dispatch(setDeviceStatus(false));

    // Attempt automatic reconnection if device was previously bonded
    if (this.device) {
      console.log('Triggering automatic background reconnection timer in 5 seconds...');
      if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = setTimeout(() => {
        this.reestablishGattConnectionSilently();
      }, 5000);
    }
  };

  private async reestablishGattConnectionSilently() {
    if (!this.device) return;
    console.log('Attempting silent GATT reconnection...');
    try {
      const success = await this.establishGattConnection();
      if (success) {
        console.log('✅ Background reconnection successful!');
      } else {
        // Schedule next retry
        this.reconnectTimeout = setTimeout(() => this.reestablishGattConnectionSilently(), 8000);
      }
    } catch (e) {
      this.reconnectTimeout = setTimeout(() => this.reestablishGattConnectionSilently(), 8000);
    }
  }

  public disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.angleCharacteristic) {
      this.angleCharacteristic.removeEventListener('characteristicvaluechanged', this.handleAngleNotification);
      this.angleCharacteristic.stopNotifications().catch(() => {});
      this.angleCharacteristic = null;
    }

    if (this.batteryCharacteristic) {
      this.batteryCharacteristic.removeEventListener('characteristicvaluechanged', this.handleBatteryNotification);
      this.batteryCharacteristic.stopNotifications().catch(() => {});
      this.batteryCharacteristic = null;
    }

    this.configCharacteristic = null;

    if (this.device) {
      this.device.removeEventListener('gattserverdisconnected', this.handleDisconnected);
    }

    if (this.server && this.server.connected) {
      this.server.disconnect();
    }

    this.server = null;
    this.device = null;
    store.dispatch(setDeviceStatus(false));
    console.log('Disconnected from BLE Device.');
  }
}

export const bluetoothService = new BluetoothService();

