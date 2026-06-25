import { store, updateAngle, updateBattery, setDeviceStatus, setHasPaired } from '../store/store';

// BLE GATT Profile Constants
export const POSTURE_SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
export const TELEMETRY_CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

class BluetoothService {
  private device: any = null;
  private server: any = null;
  private characteristic: any = null;
  private reconnectTimeout: any = null;
  private isConnecting: boolean = false;

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && ('bluetooth' in navigator || (navigator as any).bluetooth !== undefined);
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
    } catch (error) {
      this.isConnecting = false;
      console.error('BLE connection request cancelled or failed:', error);
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

      console.log('Fetching Telemetry Characteristic...');
      const characteristic = await service.getCharacteristic(TELEMETRY_CHARACTERISTIC_UUID);
      this.characteristic = characteristic;

      console.log('Starting Telemetry Notifications...');
      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', this.handleTelemetryNotification);

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

  private handleTelemetryNotification = (event: Event) => {
    const target = event.target as any;
    if (!target || !target.value) return;

    try {
      const decoder = new TextDecoder('utf-8');
      const rawText = decoder.decode(target.value).trim();
      console.log('📡 BLE Received Raw Packet:', rawText);

      // Parse payload format:
      // Format 1: JSON payload {"angle": 82, "battery": 95}
      // Format 2: Comma-separated "82,95" (extremely lightweight for ESP32)
      // Format 3: Raw integer "82"
      if (rawText.startsWith('{') && rawText.endsWith('}')) {
        const payload = JSON.parse(rawText);
        if (typeof payload.angle === 'number') {
          store.dispatch(updateAngle(payload.angle));
        }
        if (typeof payload.battery === 'number' || typeof payload.batteryLevel === 'number') {
          store.dispatch(updateBattery(payload.battery ?? payload.batteryLevel));
        }
      } else if (rawText.includes(',')) {
        const parts = rawText.split(',');
        const angle = parseInt(parts[0], 10);
        const battery = parseInt(parts[1], 10);
        if (!isNaN(angle)) store.dispatch(updateAngle(angle));
        if (!isNaN(battery)) store.dispatch(updateBattery(battery));
      } else {
        const angle = parseInt(rawText, 10);
        if (!isNaN(angle)) {
          store.dispatch(updateAngle(angle));
        }
      }
    } catch (err) {
      console.warn('Failed to parse telemetry packet:', err);
    }
  };

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

    if (this.characteristic) {
      this.characteristic.removeEventListener('characteristicvaluechanged', this.handleTelemetryNotification);
      this.characteristic.stopNotifications().catch(() => {});
      this.characteristic = null;
    }

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
