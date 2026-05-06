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
  };
  baselineAngle: number;
  streak: { current: number; longest: number };
  isSimulating: boolean;
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
      vibrationIntensity: 70
    },
    baselineAngle: 90,
    streak: { current: 5, longest: 8 },
    isSimulating: false,
  } as PostureState,
  reducers: {
    updateAngle: (state, action: PayloadAction<number>) => {
      state.angle = action.payload;
      state.score = action.payload; // Simplified for now
      state.history = [action.payload, ...state.history].slice(0, 50);
    },
    setThresholds: (state, action: PayloadAction<Partial<PostureState['thresholds']>>) => {
      state.thresholds = { ...state.thresholds, ...action.payload };
    },
    recalibrateBaseline: (state, action: PayloadAction<number>) => {
      state.baselineAngle = action.payload;
    },
    setIsSimulating: (state, action: PayloadAction<boolean>) => {
      state.isSimulating = action.payload;
    },
  },
});

// Device Slice
interface DeviceState {
  isConnected: boolean;
  batteryLevel: number;
  firmwareVersion: string;
  lastConnected: string | null;
}

const deviceSlice = createSlice({
  name: 'device',
  initialState: {
    isConnected: true,
    batteryLevel: 85,
    firmwareVersion: 'v2.4.1',
    lastConnected: new Date().toISOString(),
  } as DeviceState,
  reducers: {
    setDeviceStatus: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },
    updateBattery: (state, action: PayloadAction<number>) => {
      state.batteryLevel = action.payload;
    },
    unpairDevice: (state) => {
      state.isConnected = false;
      state.lastConnected = null;
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
export const { updateAngle, setThresholds, recalibrateBaseline, setIsSimulating } = postureSlice.actions;
export const { setDeviceStatus, updateBattery, unpairDevice } = deviceSlice.actions;
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
