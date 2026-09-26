import { store, updateAngle, updateBattery, setDeviceStatus, setHasPaired, updateVitals } from '../store/store';
import { vitalsService } from './vitalsService';
import { ImuTelemetryFilter } from './biomechanicsEngine';

// BLE GATT Profile Constants - Aligned with PosturePal ESP32 V2.1.1-FIXED firmware
export const POSTURE_SERVICE_UUID = '00001830-0000-1000-8000-00805f9b34fb';
export const CHARACTERISTIC_ANGLE_UUID = '00002a5a-0000-1000-8000-00805f9b34fb';
export const CHARACTERISTIC_BATT_UUID = '00002a19-0000-1000-8000-00805f9b34fb';
export const CHARACTERISTIC_CONFIG_UUID = '00002a5c-0000-1000-8000-00805f9b34fb';
export const CHARACTERISTIC_VITALS_UUID = '00002a5e-0000-1000-8000-00805f9b34fb';
export const HEART_RATE_SERVICE_UUID = '0000180d-0000-1000-8000-00805f9b34fb';
export const CHARACTERISTIC_HR_UUID = '00002a37-0000-1000-8000-00805f9b34fb';

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
    return this.server && this.server.connected;
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
        filters: [{ namePrefix: 'PosturePal' }],
        optionalServices: [POSTURE_SERVICE_UUID]
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
        await angleChar.startNotifications();
        angleChar.addEventListener('characteristicvaluechanged', this.handleAngleNotification);
        console.log('✅ Angle characteristic notifications started.');
      } catch (err) {
        console.error('Failed to bind Angle Characteristic:', err);
      }

      console.log('Fetching Battery Characteristic...');
      try {
        const battChar = await service.getCharacteristic(CHARACTERISTIC_BATT_UUID);
        this.batteryCharacteristic = battChar;
        await battChar.startNotifications();
        battChar.addEventListener('characteristicvaluechanged', this.handleBatteryNotification);
        console.log('✅ Battery characteristic notifications started.');
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

      // Optional: Fetch Vitals characteristic if present in firmware
      try {
        const vitalsChar = await service.getCharacteristic(CHARACTERISTIC_VITALS_UUID);
        await vitalsChar.startNotifications();
        vitalsChar.addEventListener('characteristicvaluechanged', (e: any) => {
          try {
            const view = e.target.value;
            const hr = view.getUint8(0);
            const spo2 = view.getUint8(1);
            if (hr > 30 && hr < 220) {
              const currentAngle = store.getState().posture.angle;
              vitalsService.logTelemetry({
                heartRate: hr,
                spo2: (spo2 >= 70 && spo2 <= 100) ? spo2 : 98,
                status: 'live',
                postureAngle: currentAngle,
                deviceId: this.device?.id || 'ble-hardware-pod'
              });
            }
          } catch (err) {
            console.warn('Failed to parse vitals packet:', err);
          }
        });
        console.log('✅ Vitals characteristic notifications active.');
      } catch {
        // Hardware firmware may transmit posture only
      }

      // Check for standard Bluetooth SIG Heart Rate Service (0x180D) if available
      try {
        const hrService = await this.server.getPrimaryService(HEART_RATE_SERVICE_UUID);
        if (hrService) {
          const hrChar = await hrService.getCharacteristic(CHARACTERISTIC_HR_UUID);
          await hrChar.startNotifications();
          hrChar.addEventListener('characteristicvaluechanged', (e: any) => {
            try {
              const view = e.target.value;
              const flags = view.getUint8(0);
              // Bit 0: 0 = 8-bit BPM, 1 = 16-bit BPM
              const is16Bit = (flags & 0x01) !== 0;
              const hr = is16Bit ? view.getUint16(1, true) : view.getUint8(1);
              if (hr > 30 && hr < 220) {
                const currentAngle = store.getState().posture.angle;
                vitalsService.logTelemetry({
                  heartRate: hr,
                  spo2: store.getState().vitals.spo2 || 98,
                  status: 'live',
                  postureAngle: currentAngle,
                  deviceId: this.device?.id || 'ble-hr-sensor'
                });
              }
            } catch (hrErr) {
              console.warn('Failed to parse standard BLE HR packet:', hrErr);
            }
          });
          console.log('✅ Standard BLE Heart Rate service notifications active.');
        }
      } catch {
        // Standard HR service not advertised, continue
      }

      // Successfully paired and connected
      store.dispatch(setHasPaired(true));
      store.dispatch(setDeviceStatus(true));
      store.dispatch(updateVitals({ status: 'live' }));
      console.log('✅ Bluetooth Low Energy connected and listening!');
      return true;
    } catch (error) {
      console.error('Failed to establish GATT handshake:', error);
      store.dispatch(setDeviceStatus(false));
      return false;
    }
  }

  private handleAngleNotification = (event: Event) => {
    const target = event.target as any;
    if (!target || !target.value) return;

    try {
      const view = target.value; // DataView
      // ESP32 sends 2-byte signed integer (int16_t) little-endian
      const rawAngle = view.getInt16(0, true);
      // Tier 2: Real-time Complementary / Madgwick filter rejects transient spikes & stabilizes telemetry
      const filteredAngle = ImuTelemetryFilter.processSample(rawAngle);
      store.dispatch(updateAngle(filteredAngle));
      console.log(`📡 BLE Received Pitch: Raw=${rawAngle}°, Filtered=${filteredAngle}°`);
    } catch (err) {
      console.warn('Failed to parse angle binary packet:', err);
    }
  };

  private handleBatteryNotification = (event: Event) => {
    const target = event.target as any;
    if (!target || !target.value) return;

    try {
      const view = target.value; // DataView
      // ESP32 sends 1-byte unsigned integer (uint8_t)
      const battery = view.getUint8(0);
      store.dispatch(updateBattery(battery));
      console.log('📡 BLE Received Battery Level (binary):', battery);
    } catch (err) {
      console.warn('Failed to parse battery binary packet:', err);
    }
  };

  public async writeConfig(threshold: number, delayMs: number, baseline?: number): Promise<boolean> {
    if (!this.configCharacteristic) {
      console.warn('BLE Config Characteristic is not connected or available.');
      return false;
    }
    try {
      const payload: any = {
        t: threshold,
        d: delayMs
      };
      if (typeof baseline === 'number') {
        payload.b = baseline;
      }
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(payload));
      await this.configCharacteristic.writeValue(data);
      console.log('✅ Synchronized config updates directly to ESP32 Flash Preferences:', payload);
      return true;
    } catch (err) {
      console.error('Failed to write configuration updates to ESP32 over BLE:', err);
      return false;
    }
  }

  public async triggerCalibration(): Promise<boolean> {
    if (!this.configCharacteristic) {
      console.warn('BLE Config Characteristic is not connected or available for calibration.');
      return false;
    }
    try {
      const payload = { c: 1 };
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(payload));
      await this.configCharacteristic.writeValue(data);
      ImuTelemetryFilter.reset(store.getState().posture.baselineAngle || 90);
      console.log('✅ Sent physical calibration command ({"c":1}) to ESP32.');
      return true;
    } catch (err) {
      console.error('Failed to write calibration command to ESP32 over BLE:', err);
      return false;
    }
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
