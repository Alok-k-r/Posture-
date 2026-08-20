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
    gender?: 'male' | 'female' | 'other' | '';
    hasAcceptedTerms?: boolean;
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
      if (typeof window !== 'undefined' && window.localStorage && action.payload?.id) {
        localStorage.setItem('current_user_id', action.payload.id);
      }
    },
    logout: (state) => {
      state.isAuth = false;
      state.user = null;
      state.loading = false;
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('login_mode');
        localStorage.removeItem('local_user_profile');
        localStorage.removeItem('current_user_id');
        localStorage.removeItem('persist:root');
      }
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
  tourActive: boolean;
  tourStep: number;
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: { chatOpen: false, tourActive: false, tourStep: 0 } as UIState,
  reducers: {
    setChatOpen: (state, action: PayloadAction<boolean>) => {
      state.chatOpen = action.payload;
    },
    startTour: (state, action: PayloadAction<number | undefined>) => {
      state.tourActive = true;
      state.tourStep = action.payload ?? 0;
    },
    endTour: (state) => {
      state.tourActive = false;
    },
    setTourStep: (state, action: PayloadAction<number>) => {
      state.tourStep = action.payload;
    },
    nextTourStep: (state) => {
      state.tourStep += 1;
    },
    prevTourStep: (state) => {
      if (state.tourStep > 0) state.tourStep -= 1;
    },
  },
});

// Posture Slice
export interface BreakRecord {
  id: string;
  timestamp: string;
  preBreakFatigue: number;
  postBreakFatigue: number;
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
  lastActiveDate: string | null;
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
    angle: 90,
    score: 100,
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
    streak: { current: 0, longest: 0 },
    isSimulating: false,
    isRecordingSession: false,
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
    lastActiveDate: typeof window !== 'undefined' ? new Date().toISOString().split('T')[0] : null,
    activeBreak: null,
    breakHistory: (() => {
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('posture_breaks_history') : null;
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    })(),
  } as PostureState,
  reducers: {
    updateAngle: (state, action: PayloadAction<number>) => {
      const rounded = Math.round(action.payload);
      state.angle = rounded;

      // Auto-check for new calendar day (morning fresh start)
      const todayStr = new Date().toISOString().split('T')[0];
      if (state.lastActiveDate && state.lastActiveDate !== todayStr) {
        state.lastActiveDate = todayStr;
        state.totalSessionSeconds = 0;
        state.goodSessionSeconds = 0;
        state.warnSessionSeconds = 0;
        state.incidents = 0;
        state.isCurrentlySlouching = false;
        state.currentFocusDuration = 0;
        state.maxFocusDuration = 0;
        state.integrityScore = 100;
        state.score = 100;
        state.isRecordingSession = false;
        state.sessionStartTime = null;
        state.activeBreak = null;
      } else if (!state.lastActiveDate) {
        state.lastActiveDate = todayStr;
      }
      
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
    checkDailyReset: (state) => {
      const todayStr = new Date().toISOString().split('T')[0];
      if (!state.lastActiveDate || state.lastActiveDate !== todayStr) {
        state.lastActiveDate = todayStr;
        state.totalSessionSeconds = 0;
        state.goodSessionSeconds = 0;
        state.warnSessionSeconds = 0;
        state.incidents = 0;
        state.isCurrentlySlouching = false;
        state.currentFocusDuration = 0;
        state.maxFocusDuration = 0;
        state.integrityScore = 100;
        state.score = 100;
        state.isRecordingSession = false;
        state.sessionStartTime = null;
        state.activeBreak = null;
      }
    },
    tickSessionStats: (state) => {
      // Auto-check for new calendar day (morning fresh start)
      const todayStr = new Date().toISOString().split('T')[0];
      if (state.lastActiveDate && state.lastActiveDate !== todayStr) {
        state.lastActiveDate = todayStr;
        state.totalSessionSeconds = 0;
        state.goodSessionSeconds = 0;
        state.warnSessionSeconds = 0;
        state.incidents = 0;
        state.isCurrentlySlouching = false;
        state.currentFocusDuration = 0;
        state.maxFocusDuration = 0;
        state.integrityScore = 100;
        state.score = 100;
        state.isRecordingSession = false;
        state.sessionStartTime = null;
        state.activeBreak = null;
      } else if (!state.lastActiveDate) {
        state.lastActiveDate = todayStr;
      }

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
      try {
        localStorage.setItem('posturecare_is_recording', action.payload ? 'true' : 'false');
      } catch {}
      if (action.payload) {
        // When resuming / starting recording, update raw live posture alignment status
        state.isCurrentlySlouching = state.angle < state.thresholds.warn;
        if (!state.sessionStartTime) {
          state.sessionStartTime = new Date().toISOString();
        }

        // If there was an active break, compile the BreakRecord and push to history
        if (state.activeBreak) {
          const preBreakFatigue = state.activeBreak.preBreakFatigue || 0;
          const startMs = new Date(state.activeBreak.startTime).getTime();
          const elapsedSecs = Math.round((Date.now() - startMs) / 1000);
          const durationSeconds = Math.max(0, Math.max(state.activeBreak.durationSeconds || 0, elapsedSecs));

          // Compute realistic biological recovery based on true exponential relaxation curve
          // Half-life ~240s (4 mins): 1 min = 22% relief, 2 mins = 39% relief, 5 mins = 71% relief, 10 mins = 92% relief
          const reliefFraction = durationSeconds > 0 ? (1 - Math.exp(-durationSeconds / 240)) : 0;
          const thoracicStressRelief = Math.min(98, Math.max(0, Math.round(reliefFraction * 100)));
          
          const fatigueCleared = (preBreakFatigue * thoracicStressRelief) / 100;
          const postBreakFatigue = Math.max(0, Math.round(preBreakFatigue - fatigueCleared));

          const breakRecord: BreakRecord = {
            id: 'break-' + Date.now(),
            timestamp: new Date().toISOString(),
            preBreakFatigue,
            postBreakFatigue,
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
        // Base fatigue comes from last break's postBreakFatigue if available
        const lastBreak = state.breakHistory && state.breakHistory.length > 0 ? state.breakHistory[0] : null;
        const baseFatigue = lastBreak ? (lastBreak.postBreakFatigue ?? (100 - (lastBreak as any).postBreakResilience || 0)) : 0;

        const totalSecs = state.totalSessionSeconds || 0;
        const warnSecs = state.warnSessionSeconds || 0;
        const incidents = state.incidents || 0;

        let calculatedFatigue = 0;
        if (totalSecs > 0) {
          const sittingMins = totalSecs / 60;
          const durationFatigue = sittingMins * 1.2; // ~1.2% per minute sitting
          const warnFatigue = (warnSecs / 60) * 2.0;  // extra ~2% per minute slouch warning
          const slouchPenalty = incidents * 5.0;       // +5% per slouch incident
          calculatedFatigue = Math.min(98, Math.max(0, Math.round(baseFatigue + durationFatigue + warnFatigue + slouchPenalty)));
        } else {
          calculatedFatigue = baseFatigue;
        }

        state.activeBreak = {
          startTime: new Date().toISOString(),
          preBreakFatigue: calculatedFatigue,
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
export type AppointmentStatus = 'pending' | 'approved_payment_pending' | 'upcoming' | 'completed' | 'cancelled';
export type ConsultationMode = 'In-Clinic' | 'Video Call';

export interface ChatMessage {
  id: string;
  sender: 'patient' | 'doctor';
  text: string;
  timestamp: string;
  reportAttachment?: {
    timeframe: 'Today' | 'Last 7 Days' | 'This Month';
    avgAngle: number;
    maxSlouch: number;
    totalHours: number;
    score: number;
    incidents: number;
    sharedAt: string;
  };
}

export interface SharedReport {
  id: string;
  timeframe: 'Today' | 'Last 7 Days' | 'This Month';
  sharedAt: string;
  avgAngle: number;
  maxSlouch: number;
  totalHours: number;
  score: number;
  incidents: number;
  stabilityScore: number;
  cervicalTorque: number;
}

export interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  hospital: string;
  location?: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  fee: string;
  mode: ConsultationMode;
  consultationType: string;
  notes?: string;
  meetingUrl?: string;
  cancellationReason?: string;
  
  // Advance Payment & Consultation Workspace
  advancePaid?: boolean;
  advanceFeeAmount?: number;
  advanceTransactionId?: string;
  advancePaidAt?: string;
  chatMessages?: ChatMessage[];
  sharedReports?: SharedReport[];
}

const appointmentsSlice = createSlice({
  name: 'appointments',
  initialState: { 
    list: [
      {
        id: '1',
        doctorName: 'Dr. Rahul Sharma',
        specialty: 'Orthopedic Spine Specialist',
        hospital: 'Apollo Spine & Rehab Center',
        location: 'Building B, Floor 3, Suite 302, Apollo Healthcare',
        date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        time: '10:00 AM',
        status: 'upcoming' as AppointmentStatus,
        fee: '₹1200',
        mode: 'In-Clinic' as ConsultationMode,
        consultationType: 'Postural Assessment',
        notes: 'Follow-up on lumbar strain & forward head posture review.',
        advancePaid: true,
        advanceFeeAmount: 200,
        advanceTransactionId: 'TXN-884190',
        advancePaidAt: new Date(Date.now() - 3600000).toISOString(),
        chatMessages: [
          {
            id: 'm1',
            sender: 'doctor',
            text: 'Hello! Your appointment is confirmed. Please share your recent posture diagnostic report before our session so I can review your spine trends.',
            timestamp: '10:15 AM'
          }
        ],
        sharedReports: []
      },
      {
        id: '2',
        doctorName: 'Dr. Priya Verma',
        specialty: 'Senior Physiotherapist',
        hospital: 'Fortis Spine & Posture Clinic',
        location: 'Tele-Consultation Room #4',
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        time: '02:30 PM',
        status: 'approved_payment_pending' as AppointmentStatus,
        fee: '₹800',
        mode: 'Video Call' as ConsultationMode,
        consultationType: 'Spine Rehabilitation',
        notes: 'Virtual review of ergonomics & neck stretching routine.',
        meetingUrl: 'https://meet.google.com/ais-posture-rehab',
        advancePaid: false,
        advanceFeeAmount: 200,
        chatMessages: [],
        sharedReports: []
      },
      {
        id: '3',
        doctorName: 'Dr. Amit Patel',
        specialty: 'Neuro-Muscular Specialist',
        hospital: 'Max Healthcare Institute',
        location: 'Max Spine Care Wing, OPD #12',
        date: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
        time: '11:15 AM',
        status: 'pending' as AppointmentStatus,
        fee: '₹2000',
        mode: 'In-Clinic' as ConsultationMode,
        consultationType: 'Ergonomic Review',
        notes: 'Awaiting confirmation from specialist for thoracic tension evaluation.',
        advancePaid: false,
        advanceFeeAmount: 200,
        chatMessages: [],
        sharedReports: []
      },
      {
        id: '4',
        doctorName: 'Dr. Sneha Rao',
        specialty: 'Spine Ergonomics Lead',
        hospital: 'Global Spine & Joint Care',
        location: 'Consultation Suite 5, Global Center',
        date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0],
        time: '04:00 PM',
        status: 'completed' as AppointmentStatus,
        fee: '₹1500',
        mode: 'In-Clinic' as ConsultationMode,
        consultationType: 'Postural Assessment',
        notes: 'Completed initial thoracic alignment baseline check.',
        advancePaid: true,
        advanceFeeAmount: 200,
        advanceTransactionId: 'TXN-773120',
        chatMessages: [],
        sharedReports: []
      }
    ] as Appointment[] 
  },
  reducers: {
    addAppointment: (state, action: PayloadAction<Appointment>) => {
      state.list.unshift(action.payload);
    },
    removeAppointment: (state, action: PayloadAction<string>) => {
      state.list = state.list.filter(a => a.id !== action.payload);
    },
    updateAppointment: (state, action: PayloadAction<Appointment>) => {
      const index = state.list.findIndex(a => a.id === action.payload.id);
      if (index !== -1) state.list[index] = action.payload;
    },
    rescheduleAppointment: (state, action: PayloadAction<{ id: string; date: string; time: string }>) => {
      const appointment = state.list.find(a => a.id === action.payload.id);
      if (appointment) {
        appointment.date = action.payload.date;
        appointment.time = action.payload.time;
      }
    },
    cancelAppointment: (state, action: PayloadAction<{ id: string; reason?: string }>) => {
      const appointment = state.list.find(a => a.id === action.payload.id);
      if (appointment) {
        appointment.status = 'cancelled';
        if (action.payload.reason) {
          appointment.cancellationReason = action.payload.reason;
        }
      }
    },
    approveAppointment: (state, action: PayloadAction<{ id: string }>) => {
      const appointment = state.list.find(a => a.id === action.payload.id);
      if (appointment) {
        appointment.status = 'approved_payment_pending';
        if (!appointment.advanceFeeAmount) appointment.advanceFeeAmount = 200;
      }
    },
    payAdvanceFee: (state, action: PayloadAction<{ id: string; transactionId: string; amount?: number }>) => {
      const appointment = state.list.find(a => a.id === action.payload.id);
      if (appointment) {
        appointment.status = 'upcoming';
        appointment.advancePaid = true;
        appointment.advanceFeeAmount = action.payload.amount || 200;
        appointment.advanceTransactionId = action.payload.transactionId;
        appointment.advancePaidAt = new Date().toISOString();
        
        // Add welcome message from doctor upon confirmation
        if (!appointment.chatMessages) appointment.chatMessages = [];
        appointment.chatMessages.push({
          id: 'msg-' + Date.now(),
          sender: 'doctor',
          text: `Payment of ₹${action.payload.amount || 200} received! Your slot is officially confirmed. Feel free to chat with me here or share your recent posture diagnostic report before our appointment.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    },
    addChatMessage: (state, action: PayloadAction<{ appointmentId: string; message: ChatMessage }>) => {
      const appointment = state.list.find(a => a.id === action.payload.appointmentId);
      if (appointment) {
        if (!appointment.chatMessages) appointment.chatMessages = [];
        appointment.chatMessages.push(action.payload.message);
      }
    },
    shareReportWithDoctor: (state, action: PayloadAction<{ appointmentId: string; report: SharedReport }>) => {
      const appointment = state.list.find(a => a.id === action.payload.appointmentId);
      if (appointment) {
        if (!appointment.sharedReports) appointment.sharedReports = [];
        appointment.sharedReports.unshift(action.payload.report);

        // Add message in chat stream too
        if (!appointment.chatMessages) appointment.chatMessages = [];
        appointment.chatMessages.push({
          id: 'msg-' + Date.now(),
          sender: 'patient',
          text: `Shared Posture Diagnostic Report (${action.payload.report.timeframe})`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          reportAttachment: {
            timeframe: action.payload.report.timeframe,
            avgAngle: action.payload.report.avgAngle,
            maxSlouch: action.payload.report.maxSlouch,
            totalHours: action.payload.report.totalHours,
            score: action.payload.report.score,
            incidents: action.payload.report.incidents,
            sharedAt: action.payload.report.sharedAt
          }
        });

        // Doctor automated reply
        appointment.chatMessages.push({
          id: 'msg-' + (Date.now() + 1),
          sender: 'doctor',
          text: `Thank you! I received your ${action.payload.report.timeframe} posture report. I am analyzing your spine curvature trends and biomechanical parameters on my clinical dashboard now.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
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
export const { setChatOpen, startTour, endTour, setTourStep, nextTourStep, prevTourStep } = uiSlice.actions;
export const { updateAngle, tickSessionStats, resetSessionStats, setThresholds, recalibrateBaseline, setIsSimulating, setPostureHistory, setIsRecordingSession, setAutoRecordEnabled, checkDailyReset } = postureSlice.actions;
export const { setDeviceStatus, setHasPaired, setSkippedSetup, updateBattery, unpairDevice } = deviceSlice.actions;
export const { addAppointment, removeAppointment, updateAppointment, setAppointmentStatus, rescheduleAppointment, cancelAppointment, approveAppointment, payAdvanceFee, addChatMessage, shareReportWithDoctor } = appointmentsSlice.actions;
export const { setOnlineStatus, addToSyncQueue, removeFromSyncQueue, clearSyncQueue } = syncSlice.actions;

const appReducer = combineReducers({
  auth: authSlice.reducer,
  ui: uiSlice.reducer,
  posture: postureSlice.reducer,
  device: deviceSlice.reducer,
  appointments: appointmentsSlice.reducer,
  sync: syncSlice.reducer,
});

const rootReducer = (state: any, action: any) => {
  if (action.type === 'auth/logout') {
    state = undefined;
  }
  return appReducer(state, action);
};

const persistConfig = {
  key: 'root',
  version: 1,
  storage,
  whitelist: ['auth', 'ui', 'posture', 'appointments', 'sync', 'device'], // Persist these including auth state
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
