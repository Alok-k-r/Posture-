import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  email?: string;
  isPrimary?: boolean;
}

export interface FallIncidentRecord {
  id: string;
  timestamp: string;
  impactForce?: number; // in g
  gyroPeak?: number; // in dps
  latitude?: number;
  longitude?: number;
  status: 'cancelled_by_user' | 'sos_dispatched' | 'simulated_test';
  resolvedAt?: string;
  dispatchDetails?: {
    cloudSms: boolean;
    cloudEmail: boolean;
    voiceBeacon: boolean;
    contactsNotified: string[];
  };
}

export interface ActiveFallAlert {
  id: string;
  timestamp: string;
  stage: 'countdown' | 'sos_dispatched' | 'cancelled';
  remainingSeconds: number;
  totalCountdownSeconds: number;
  coords?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  impactForce?: number;
  gyroPeak?: number;
}

export interface DispatchStatusLog {
  timestamp: string;
  deliveredCount: number;
  channels: string[];
  contactsNotified: string[];
}

export interface FallDetectionState {
  enabled: boolean;
  countdownDuration: number; // in seconds (10, 15, 30, 45, 60)
  sensitivity: 'low' | 'medium' | 'high';
  automatedCloudDispatch: boolean; // Auto-send via cloud without needing manual user clicks
  voiceBeaconEnabled: boolean; // Voice announcement beacon on speaker
  customWebhookUrl: string; // Optional custom integration endpoint
  emergencyContacts: EmergencyContact[];
  activeFallAlert: ActiveFallAlert | null;
  fallHistory: FallIncidentRecord[];
  lastDispatchStatus: DispatchStatusLog | null;
}

const initialContacts: EmergencyContact[] = [
  {
    id: 'c1',
    name: 'Dr. Sarah Mitchell',
    phone: '+1 (555) 234-5678',
    relationship: 'Primary Physician',
    email: 'sarah.mitchell@clinic.health',
    isPrimary: true
  },
  {
    id: 'c2',
    name: 'Emily Davis',
    phone: '+1 (555) 987-6543',
    relationship: 'Family Member / Spouse',
    email: 'emily.davis@example.com',
    isPrimary: false
  }
];

const initialState: FallDetectionState = {
  enabled: true,
  countdownDuration: 15,
  sensitivity: 'medium',
  automatedCloudDispatch: true,
  voiceBeaconEnabled: true,
  customWebhookUrl: '',
  emergencyContacts: initialContacts,
  activeFallAlert: null,
  lastDispatchStatus: null,
  fallHistory: [
    {
      id: 'fall-hist-1',
      timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
      impactForce: 3.1,
      gyroPeak: 235,
      latitude: 37.7749,
      longitude: -122.4194,
      status: 'cancelled_by_user',
      resolvedAt: new Date(Date.now() - 86400000 * 3 + 4000).toISOString()
    }
  ]
};

export const fallDetectionSlice = createSlice({
  name: 'fallDetection',
  initialState,
  reducers: {
    setFallDetectionEnabled: (state, action: PayloadAction<boolean>) => {
      state.enabled = action.payload;
    },
    setCountdownDuration: (state, action: PayloadAction<number>) => {
      state.countdownDuration = Math.max(5, Math.min(60, action.payload));
    },
    setSensitivity: (state, action: PayloadAction<'low' | 'medium' | 'high'>) => {
      state.sensitivity = action.payload;
    },
    setAutomatedCloudDispatch: (state, action: PayloadAction<boolean>) => {
      state.automatedCloudDispatch = action.payload;
    },
    setVoiceBeaconEnabled: (state, action: PayloadAction<boolean>) => {
      state.voiceBeaconEnabled = action.payload;
    },
    setCustomWebhookUrl: (state, action: PayloadAction<string>) => {
      state.customWebhookUrl = action.payload;
    },
    addEmergencyContact: (state, action: PayloadAction<EmergencyContact>) => {
      if (action.payload.isPrimary) {
        state.emergencyContacts.forEach(c => { c.isPrimary = false; });
      }
      state.emergencyContacts.push(action.payload);
    },
    updateEmergencyContact: (state, action: PayloadAction<EmergencyContact>) => {
      const idx = state.emergencyContacts.findIndex(c => c.id === action.payload.id);
      if (idx !== -1) {
        if (action.payload.isPrimary) {
          state.emergencyContacts.forEach(c => { c.isPrimary = false; });
        }
        state.emergencyContacts[idx] = action.payload;
      }
    },
    removeEmergencyContact: (state, action: PayloadAction<string>) => {
      state.emergencyContacts = state.emergencyContacts.filter(c => c.id !== action.payload);
      if (state.emergencyContacts.length > 0 && !state.emergencyContacts.some(c => c.isPrimary)) {
        state.emergencyContacts[0].isPrimary = true;
      }
    },
    triggerFallAlert: (state, action: PayloadAction<{ id: string; timestamp: string; impactForce?: number; gyroPeak?: number }>) => {
      state.activeFallAlert = {
        id: action.payload.id,
        timestamp: action.payload.timestamp,
        stage: 'countdown',
        remainingSeconds: state.countdownDuration,
        totalCountdownSeconds: state.countdownDuration,
        impactForce: action.payload.impactForce,
        gyroPeak: action.payload.gyroPeak
      };
    },
    decrementCountdown: (state) => {
      if (state.activeFallAlert && state.activeFallAlert.stage === 'countdown') {
        if (state.activeFallAlert.remainingSeconds > 1) {
          state.activeFallAlert.remainingSeconds -= 1;
        } else {
          state.activeFallAlert.remainingSeconds = 0;
          state.activeFallAlert.stage = 'sos_dispatched';
          // Record to history
          state.fallHistory.unshift({
            id: state.activeFallAlert.id,
            timestamp: state.activeFallAlert.timestamp,
            impactForce: state.activeFallAlert.impactForce,
            gyroPeak: state.activeFallAlert.gyroPeak,
            latitude: state.activeFallAlert.coords?.latitude,
            longitude: state.activeFallAlert.coords?.longitude,
            status: 'sos_dispatched',
            resolvedAt: new Date().toISOString(),
            dispatchDetails: {
              cloudSms: state.automatedCloudDispatch,
              cloudEmail: true,
              voiceBeacon: state.voiceBeaconEnabled,
              contactsNotified: state.emergencyContacts.map(c => c.name)
            }
          });
          state.fallHistory = state.fallHistory.slice(0, 30);
        }
      }
    },
    resolveFallAlert: (state, action: PayloadAction<{ reason: 'cancelled_by_user' | 'sos_dispatched' | 'simulated_test' }>) => {
      if (state.activeFallAlert) {
        if (action.payload.reason === 'cancelled_by_user') {
          state.fallHistory.unshift({
            id: state.activeFallAlert.id,
            timestamp: state.activeFallAlert.timestamp,
            impactForce: state.activeFallAlert.impactForce,
            gyroPeak: state.activeFallAlert.gyroPeak,
            latitude: state.activeFallAlert.coords?.latitude,
            longitude: state.activeFallAlert.coords?.longitude,
            status: 'cancelled_by_user',
            resolvedAt: new Date().toISOString()
          });
          state.fallHistory = state.fallHistory.slice(0, 30);
        }
        state.activeFallAlert = null;
      }
    },
    setFallEmergencyCoords: (state, action: PayloadAction<{ latitude: number; longitude: number; accuracy: number }>) => {
      if (state.activeFallAlert) {
        state.activeFallAlert.coords = action.payload;
      }
    },
    setLastDispatchStatus: (state, action: PayloadAction<DispatchStatusLog>) => {
      state.lastDispatchStatus = action.payload;
    },
    updateFallIncidentStatus: (state, action: PayloadAction<{ id: string; status: FallIncidentRecord['status'] }>) => {
      const inc = state.fallHistory.find(h => h.id === action.payload.id);
      if (inc) {
        inc.status = action.payload.status;
      }
    },
    clearFallHistory: (state) => {
      state.fallHistory = [];
    }
  }
});

export const {
  setFallDetectionEnabled,
  setCountdownDuration,
  setSensitivity,
  setAutomatedCloudDispatch,
  setVoiceBeaconEnabled,
  setCustomWebhookUrl,
  addEmergencyContact,
  updateEmergencyContact,
  removeEmergencyContact,
  triggerFallAlert,
  decrementCountdown,
  resolveFallAlert,
  setFallEmergencyCoords,
  setLastDispatchStatus,
  updateFallIncidentStatus,
  clearFallHistory
} = fallDetectionSlice.actions;

export default fallDetectionSlice.reducer;
