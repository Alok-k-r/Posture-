import { configureStore, createSlice, PayloadAction, combineReducers } from '@reduxjs/toolkit';
import { 
  persistStore, 
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// Auth Slice
interface AuthState {
  isAuth: boolean;
  user: {
    name: string;
    email: string;
    photo: string | null;
    id: string;
    age?: number;
    height?: number;
    weight?: number;
  } | null;
  loading: boolean;
}

const authInitialState: AuthState = {
  isAuth: false,
  user: null,
  loading: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState: authInitialState,
  reducers: {
    login: (state, action: PayloadAction<AuthState['user']>) => {
      state.isAuth = true;
      state.user = action.payload;
      state.loading = false;
    },
    logout: (state) => {
      state.isAuth = false;
      state.user = null;
      state.loading = false;
    },
    setAuthLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    updateUser: (state, action: PayloadAction<Partial<AuthState['user']>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
});

// UI Slice
interface UIState {
  chatOpen: boolean;
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: { chatOpen: false } as UIState,
  reducers: {
    setChatOpen: (state, action: PayloadAction<boolean>) => {
      state.chatOpen = action.payload;
    },
  },
});

// Posture Slice
export interface BreakRecord {
  id: string;
  timestamp: string;
  preBreakFatigue: number;
  postBreakResilience: number;
  thoracicStressRelief: number;
  durationSeconds: number;
}

interface PostureState {
  angle: number;
  score: number;
  history: number[];
  thresholds: {
    good: number;
    warn: number;
    bad: number;
    alertAngle: number;
    alertDelay: number; // in seconds
    vibrationIntensity: number; // 0-100
    vibrationEnabled: boolean;
    slouchWarningTime: number; // default 10 seconds
    slouchStrongTime: number; // default 30 seconds
    snoozeDuration: number; // default 20 seconds
    stopDuration: number; // default 600 seconds
    reminderMessage: string;
  };
  baselineAngle: number;
  streak: { current: number; longest: number };
  isSimulating: boolean;
  isRecordingSession: boolean;
  autoRecordEnabled: boolean;
  // Dynamic session tracking metrics
  isCurrentlySlouching: boolean;
  incidents: number;
  maxFocusDuration: number;
  currentFocusDuration: number;
  totalSessionSeconds: number;
  goodSessionSeconds: number;
  warnSessionSeconds: number;
  integrityScore: number;
  sessionStartTime: string | null;
  // New break tracking properties
  activeBreak: {
    startTime: string;
    preBreakFatigue: number;
    durationSeconds: number;
  } | null;
  breakHistory: BreakRecord[];
}

const postureSlice = createSlice({
  name: 'posture',
  initialState: {
    angle: 82,
    score: 82,
    history: [],
    thresholds: { 
      good: 80, 
      warn: 65, 
      bad: 50,
      alertAngle: 15,
      alertDelay: 5,
      vibrationIntensity: 70,
      vibrationEnabled: true,
      slouchWarningTime: 10,
      slouchStrongTime: 30,
      snoozeDuration: 20,
      stopDuration: 600,
      reminderMessage: "Spine Alignment Alert! Please sit up straight, roll your shoulders back, and protect your back."
    },
    baselineAngle: 90,
    streak: { current: 5, longest: 8 },
    isSimulating: false,
    isRecordingSession: true,
    autoRecordEnabled: false,
    // Dynamic session stats defaults
    isCurrentlySlouching: false,
    incidents: 0,
    maxFocusDuration: 0,
    currentFocusDuration: 0,
    totalSessionSeconds: 0,
    goodSessionSeconds: 0,
    warnSessionSeconds: 0,
    integrityScore: 100,
    sessionStartTime: null,
    activeBreak: null,
    breakHistory: [],
  } as PostureState,
  reducers: {
    updateAngle: (state, action: PayloadAction<number>) => {
      const rounded = Math.round(action.payload);
      state.angle = rounded;
      
      // Self-heal any stale/undefined fields from old redux-persist cache
      if (state.totalSessionSeconds === undefined || isNaN(state.totalSessionSeconds)) state.totalSessionSeconds = 0;
      if (state.goodSessionSeconds === undefined || isNaN(state.goodSessionSeconds)) state.goodSessionSeconds = 0;
      if (state.warnSessionSeconds === undefined || isNaN(state.warnSessionSeconds)) state.warnSessionSeconds = 0;
      if (state.incidents === undefined || isNaN(state.incidents)) state.incidents = 0;
      if (state.isCurrentlySlouching === undefined) state.isCurrentlySlouching = false;
      if (state.currentFocusDuration === undefined || isNaN(state.currentFocusDuration)) state.currentFocusDuration = 0;
      if (state.maxFocusDuration === undefined || isNaN(state.maxFocusDuration)) state.maxFocusDuration = 0;
      if (state.integrityScore === undefined || isNaN(state.integrityScore)) state.integrityScore = 100;
      if (state.score === undefined || isNaN(state.score)) state.score = 100;
      if (state.activeBreak === undefined) state.activeBreak = null;
      if (state.breakHistory === undefined) state.breakHistory = [];

      if (!state.isRecordingSession) {
        state.score = rounded; // If not recording, let the ring reflect raw live posture
      } else {
        state.score = state.integrityScore; // Ensure display score represents actual commitment rating while active
      }
    },
    tickSessionStats: (state) => {
      // Self-heal any stale/undefined fields from old redux-persist cache
      if (state.totalSessionSeconds === undefined || isNaN(state.totalSessionSeconds)) state.totalSessionSeconds = 0;
      if (state.goodSessionSeconds === undefined || isNaN(state.goodSessionSeconds)) state.goodSessionSeconds = 0;
      if (state.warnSessionSeconds === undefined || isNaN(state.warnSessionSeconds)) state.warnSessionSeconds = 0;
      if (state.incidents === undefined || isNaN(state.incidents)) state.incidents = 0;
      if (state.isCurrentlySlouching === undefined) state.isCurrentlySlouching = false;
      if (state.currentFocusDuration === undefined || isNaN(state.currentFocusDuration)) state.currentFocusDuration = 0;
      if (state.maxFocusDuration === undefined || isNaN(state.maxFocusDuration)) state.maxFocusDuration = 0;
      if (state.integrityScore === undefined || isNaN(state.integrityScore)) state.integrityScore = 100;
      if (state.score === undefined || isNaN(state.score)) state.score = 100;
      if (state.activeBreak === undefined) state.activeBreak = null;
      if (state.breakHistory === undefined) state.breakHistory = [];

      if (!state.isRecordingSession) {
        if (state.activeBreak) {
          state.activeBreak.durationSeconds = (state.activeBreak.durationSeconds || 0) + 1;
        }
        return;
      }

      const angle = state.angle;
      const t = state.thresholds;

      // 1. Advance total session duration
      state.totalSessionSeconds += 1;

      // 2. Classify current alignment
      const isSlouch = angle < t.warn;
      if (angle >= t.good) {
        state.goodSessionSeconds += 1;
      } else if (angle >= t.warn) {
        state.warnSessionSeconds += 1;
      }

      // 3. Stable transition-based incident counter & focus duration calculation
      if (isSlouch) {
        // If they just entered the slouch zone
        if (!state.isCurrentlySlouching) {
          state.incidents += 1;
          state.isCurrentlySlouching = true;
          // Record current focus streak if it exceeds max before resetting
          if (state.currentFocusDuration > state.maxFocusDuration) {
            state.maxFocusDuration = state.currentFocusDuration;
          }
          state.currentFocusDuration = 0;
        }
      } else {
        // They are in healthy alignment
        state.isCurrentlySlouching = false;
        state.currentFocusDuration += 1;
        // Continuously update max focus duration to match current peak
        if (state.currentFocusDuration > state.maxFocusDuration) {
          state.maxFocusDuration = state.currentFocusDuration;
        }
      }

      // 4. Compute dynamic Posture Integrity (Commitment Score)
      const totalTimeStr = Math.max(1, state.totalSessionSeconds);
      const healthyRatio = (state.goodSessionSeconds * 1.0 + state.warnSessionSeconds * 0.75) / totalTimeStr;
      const rawScore = Math.round(healthyRatio * 100);

      // Transition penalty (e.g., 3% per slouch transition) to motivate maintaining continuous posture
      const penalty = state.incidents * 3;
      state.integrityScore = Math.max(30, Math.min(100, rawScore - penalty));

      // Synchronize primary display score to reflect true calculated user alignment commitment
      state.score = state.integrityScore;

      // Also append score and angle to local history for charts or diagnostic tracking
      state.history = [angle, ...state.history].slice(0, 50);
    },
    resetSessionStats: (state) => {
      state.totalSessionSeconds = 0;
      state.goodSessionSeconds = 0;
      state.warnSessionSeconds = 0;
      state.incidents = 0;
      state.isCurrentlySlouching = false;
      state.currentFocusDuration = 0;
      state.maxFocusDuration = 0;
      state.integrityScore = 100;
      state.score = 100;
      state.sessionStartTime = null;
    },
    setThresholds: (state, action: PayloadAction<Partial<PostureState['thresholds']>>) => {
      state.thresholds = { ...state.thresholds, ...action.payload };
    },
    recalibrateBaseline: (state, action: PayloadAction<number>) => {
      state.baselineAngle = Math.round(action.payload);
    },
    setIsSimulating: (state, action: PayloadAction<boolean>) => {
      state.isSimulating = action.payload;
    },
    setPostureHistory: (state, action: PayloadAction<number[]>) => {
      if (state.isRecordingSession) {
        state.history = action.payload.map(Math.round).slice(0, 50);
      }
    },
    setIsRecordingSession: (state, action: PayloadAction<boolean>) => {
      state.isRecordingSession = action.payload;
      if (action.payload) {
        // When resuming starting recording, update raw live posture alignment status
        state.isCurrentlySlouching = state.angle < state.thresholds.warn;
        if (!state.sessionStartTime) {
          state.sessionStartTime = new Date().toISOString();
        }

        // If there was an active break, compile the BreakRecord and push to history
        if (state.activeBreak) {
          const preBreakFatigue = state.activeBreak.preBreakFatigue;
          const durationSeconds = state.activeBreak.durationSeconds || 1;

          // Compute realistic biological recovery percentages based on rest duration (in seconds)
          const postBreakResilience = Math.min(100, Math.round(20 + (durationSeconds * 0.5)));
          const thoracicStressRelief = Math.min(100, Math.round(15 + (durationSeconds * 0.8)));

          const breakRecord: BreakRecord = {
            id: 'break-' + Date.now(),
            timestamp: new Date().toISOString(),
            preBreakFatigue,
            postBreakResilience,
            thoracicStressRelief,
            durationSeconds
          };

          if (!state.breakHistory) {
            state.breakHistory = [];
          }

          state.breakHistory.unshift(breakRecord);
          state.breakHistory = state.breakHistory.slice(0, 50);

          try {
            localStorage.setItem('posture_breaks_history', JSON.stringify(state.breakHistory));
          } catch (e) {
            console.error('Failed to write break history to localStorage:', e);
          }

          state.activeBreak = null;
        }
      } else {
        // Pausing / Taking a break
        // We only log a real pre-break fatigue if the user has been in active sitting
        const preBreakFatigue = Math.min(95, 20 + (state.incidents * 8));
        state.activeBreak = {
          startTime: new Date().toISOString(),
          preBreakFatigue,
          durationSeconds: 0
        };
      }
    },
    setAutoRecordEnabled: (state, action: PayloadAction<boolean>) => {
      state.autoRecordEnabled = action.payload;
    },
  },
});

// Device Slice
interface DeviceState {
  hasPaired: boolean;
  isConnected: boolean;
  skippedSetup: boolean;
  batteryLevel: number;
  firmwareVersion: string;
  lastConnected: string | null;
}

const deviceSlice = createSlice({
  name: 'device',
  initialState: {
    hasPaired: false,
    isConnected: false,
    skippedSetup: false,
    batteryLevel: 85,
    firmwareVersion: 'v2.4.1',
    lastConnected: null,
  } as DeviceState,
  reducers: {
    setDeviceStatus: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },
    setHasPaired: (state, action: PayloadAction<boolean>) => {
      state.hasPaired = action.payload;
      if (action.payload) {
        state.isConnected = true;
        state.lastConnected = new Date().toISOString();
      } else {
        state.isConnected = false;
        state.lastConnected = null;
        state.skippedSetup = false;
      }
    },
    setSkippedSetup: (state, action: PayloadAction<boolean>) => {
      state.skippedSetup = action.payload;
    },
    updateBattery: (state, action: PayloadAction<number>) => {
      state.batteryLevel = action.payload;
    },
    unpairDevice: (state) => {
      state.hasPaired = false;
      state.isConnected = false;
      state.lastConnected = null;
      state.skippedSetup = false;
    }
  }
});

// Appointments Slice
export type AppointmentStatus = 'pending' | 'upcoming' | 'completed';

interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  hospital: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  fee: string;
}

const appointmentsSlice = createSlice({
  name: 'appointments',
  initialState: { 
    list: [
      {
        id: '1',
        doctorName: 'Dr. Rahul Sharma',
        specialty: 'Orthopedic',
        hospital: 'Apollo Hospital',
        date: new Date().toISOString(),
        time: '10:00 AM',
        status: 'upcoming',
        fee: '₹1200'
      },
      {
        id: '2',
        doctorName: 'Dr. Priya Verma',
        specialty: 'Physiotherapist',
        hospital: 'Fortis Clinic',
        date: new Date(Date.now() - 86400000 * 2).toISOString(),
        time: '02:30 PM',
        status: 'completed',
        fee: '₹800'
      },
      {
        id: '3',
        doctorName: 'Dr. Amit Patel',
        specialty: 'Neurologist',
        hospital: 'Max Healthcare',
        date: new Date(Date.now() + 86400000).toISOString(),
        time: '11:15 AM',
        status: 'pending',
        fee: '₹2000'
      }
    ] as Appointment[] 
  },
  reducers: {
    addAppointment: (state, action: PayloadAction<Appointment>) => {
      state.list.push(action.payload);
    },
    removeAppointment: (state, action: PayloadAction<string>) => {
      state.list = state.list.filter(a => a.id !== action.payload);
    },
    updateAppointment: (state, action: PayloadAction<Appointment>) => {
      const index = state.list.findIndex(a => a.id === action.payload.id);
      if (index !== -1) state.list[index] = action.payload;
    },
    setAppointmentStatus: (state, action: PayloadAction<{ id: string; status: AppointmentStatus }>) => {
      const appointment = state.list.find(a => a.id === action.payload.id);
      if (appointment) {
        appointment.status = action.payload.status;
      }
    },
  },
});

// Sync Slice
interface SyncAction {
  id: string;
  type: string;
  payload: any;
  timestamp: string;
}

interface SyncState {
  isOnline: boolean;
  syncQueue: SyncAction[];
}

const syncSlice = createSlice({
  name: 'sync',
  initialState: {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    syncQueue: [],
  } as SyncState,
  reducers: {
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    addToSyncQueue: (state, action: PayloadAction<SyncAction>) => {
      state.syncQueue.push(action.payload);
    },
    removeFromSyncQueue: (state, action: PayloadAction<string>) => {
      state.syncQueue = state.syncQueue.filter(a => a.id !== action.payload);
    },
    clearSyncQueue: (state) => {
      state.syncQueue = [];
    },
  },
});

export const { login, logout, setAuthLoading, updateUser } = authSlice.actions;
export const { setChatOpen } = uiSlice.actions;
export const { updateAngle, tickSessionStats, resetSessionStats, setThresholds, recalibrateBaseline, setIsSimulating, setPostureHistory, setIsRecordingSession, setAutoRecordEnabled } = postureSlice.actions;
export const { setDeviceStatus, setHasPaired, setSkippedSetup, updateBattery, unpairDevice } = deviceSlice.actions;
export const { addAppointment, removeAppointment, updateAppointment, setAppointmentStatus } = appointmentsSlice.actions;
export const { setOnlineStatus, addToSyncQueue, removeFromSyncQueue, clearSyncQueue } = syncSlice.actions;

const rootReducer = combineReducers({
  auth: authSlice.reducer,
  ui: uiSlice.reducer,
  posture: postureSlice.reducer,
  device: deviceSlice.reducer,
  appointments: appointmentsSlice.reducer,
  sync: syncSlice.reducer,
});

const persistConfig = {
  key: 'root',
  version: 1,
  storage,
  whitelist: ['ui', 'posture', 'appointments', 'sync', 'device'], // Persist these
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
