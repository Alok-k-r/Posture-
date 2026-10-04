import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.posturecare.health',
  appName: 'PostureCare — Smart Healthcare',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    BluetoothLe: {
      displayStrings: {
        scanning: "Scanning for PostureCare ESP32...",
        cancel: "Cancel",
        availableDevices: "Available BLE Sensors",
        noDeviceFound: "No PostureCare sensor found nearby."
      }
    }
  }
};

export default config;
