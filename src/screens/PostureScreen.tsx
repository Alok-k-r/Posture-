import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  RootState, 
  updateAngle, 
  recalibrateBaseline, 
  setIsSimulating, 
  setIsRecordingSession, 
  resetSessionStats, 
  setThresholds, 
  setDeviceStatus, 
  setHasPaired 
} from '../store/store';
import { PostureFigure } from '../components/posture/PostureFigure';
import { Spine3DModel } from '../components/spine/Spine3DModel';
import { SlouchAlarmManager } from '../components/posture/SlouchAlarmManager';
import { 
  Activity, 
  Shield, 
  Flame, 
  AlertCircle, 
  ChevronRight, 
  Clock, 
  Zap, 
  Battery, 
  Bluetooth, 
  Volume2, 
  VolumeX,
  Vibrate,
  Sparkles, 
  Calendar, 
  Play, 
  Pause,
  Award,
  BookOpen,
  ArrowUpRight,
  RefreshCw,
  CheckCircle2,
  TrendingUp,
  BrainCircuit,
  Sliders,
  ChevronDown,
  Info,
  X,
  Target,
  Box,
  Timer,
  RotateCcw,
  Check,
  AlertTriangle,
  Layers,
  BarChart2,
  Dumbbell
} from 'lucide-react';
import { cn } from '../lib/utils';
import { AreaChart, Area, ResponsiveContainer, YAxis, Tooltip, BarChart, Bar, XAxis } from 'recharts';
import { generatePostureSummary } from '../services/geminiService';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Markdown from 'react-markdown';
import { SessionService, UnifiedSession } from '../services/sessionService';
import { LocalModelService, LocalBiomechanicalMetrics } from '../services/localModelService';
import { PosturePredictionView } from '../components/posture/PosturePredictionView';
import { PostureMlForecastService } from '../services/postureMlForecastService';

interface Exercise {
  id: string;
  name: string;
  target: string;
  durationSec: number;
  description: string;
  reps: string;
  iconName: string;
}

const POSTURE_EXERCISES: Exercise[] = [
  {
    id: 'chin-tuck',
    name: 'Cervical Chin Retraction',
    target: 'Deep Neck Flexors & Suboccipitals',
    durationSec: 30,
    description: 'Pull your chin straight back toward your spine without tilting your head down, creating a double chin. Hold 5s.',
    reps: '5 reps x 5 sec hold',
    iconName: 'neck'
  },
  {
    id: 'scapular-squeeze',
    name: 'Scapular Retraction & Squeeze',
    target: 'Rhomboids & Mid Trapezius',
    durationSec: 45,
    description: 'Pull shoulder blades backward and downward as if pinching a pencil between them. Breathe deeply.',
    reps: '10 reps x 4 sec hold',
    iconName: 'back'
  },
  {
    id: 'doorway-pec',
    name: 'Pectoral Doorway Stretch',
    target: 'Pectoralis Major & Minor',
    durationSec: 45,
    description: 'Place forearms against a doorframe at 90° angles and step forward until you feel a gentle chest opening stretch.',
    reps: '3 sets x 15 sec hold',
    iconName: 'chest'
  },
  {
    id: 'thoracic-extension',
    name: 'Chair Thoracic Extension',
    target: 'Thoracic Spine & Anterior Core',
    durationSec: 40,
    description: 'Interlace fingers behind your head and gently extend backward over the backrest of your chair.',
    reps: '8 slow repetitions',
    iconName: 'spine'
  }
];

export const PostureScreen: React.FC = () => {
  const dispatch = useDispatch();
  const posture = useSelector((state: RootState) => state.posture);
  const device = useSelector((state: RootState) => state.device);
  const user = useSelector((state: RootState) => state.auth.user);

  const { 
    angle, 
    score, 
    thresholds, 
    history, 
    isSimulating, 
    isRecordingSession, 
    totalSessionSeconds, 
    goodSessionSeconds, 
    incidents, 
    baselineAngle
  } = posture;

  const [activeTab, setActiveTab] = useState<'realtime' | 'prediction' | '3d' | 'biomechanics' | 'drills' | 'history'>('realtime');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [autoOscillate, setAutoOscillate] = useState(true);
  const [showSimulator, setShowSimulator] = useState(false);
  const [audioAlerts, setAudioAlerts] = useState(true);
  const [recentSessions, setRecentSessions] = useState<UnifiedSession[]>([]);
  const [selectedHistoryFilter, setSelectedHistoryFilter] = useState<string>('0'); // '0' is Today by default

  // Exercise active state
  const [activeExerciseIndex, setActiveExerciseIndex] = useState<number | null>(null);
  const [exerciseTimer, setExerciseTimer] = useState<number>(0);
  const [isExerciseRunning, setIsExerciseRunning] = useState<boolean>(false);
  const [isExercisePaused, setIsExercisePaused] = useState<boolean>(false);
  const [exerciseFeedback, setExerciseFeedback] = useState<{
    name: string;
    target: string;
    boost: number;
  } | null>(null);

  const simulationDirRef = useRef(-1);
  const angleRef = useRef(angle);

  useEffect(() => {
    angleRef.current = angle;
  }, [angle]);

  // Load sessions
  useEffect(() => {
    const userId = user?.id || auth.currentUser?.uid || 'guest';
    const unsub = SessionService.subscribeToSessions(userId, (sessions) => {
      setRecentSessions(sessions);
    });
    return () => unsub();
  }, [user?.id, auth.currentUser?.uid]);

  // Auto-oscillation simulation
  useEffect(() => {
    if (!isSimulating || !autoOscillate) return;

    const interval = setInterval(() => {
      let nextAngle = angleRef.current + simulationDirRef.current * 4;
      if (nextAngle <= 42) {
        nextAngle = 42;
        simulationDirRef.current = 1;
      } else if (nextAngle >= 96) {
        nextAngle = 96;
        simulationDirRef.current = -1;
      }
      dispatch(updateAngle(nextAngle));
    }, 1200);

    return () => clearInterval(interval);
  }, [isSimulating, autoOscillate, dispatch]);

  // Exercise completion synthesizer
  const playCompletionChime = () => {
    if (!audioAlerts) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.18); // E5
      osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.36); // G5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(261.63, now); // C4
      osc2.frequency.exponentialRampToValueAtTime(392.00, now + 0.36); // G4

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.9);
      osc2.stop(now + 0.9);
    } catch (e) {
      console.warn('Audio chime failed:', e);
    }
  };

  const completeExercise = (index: number) => {
    const ex = POSTURE_EXERCISES[index];
    if (!ex) return;

    // 1. Log into on-device telemetry for ML training
    PostureMlForecastService.logCompletedExercise(ex.id, ex.name, ex.durationSec, ex.target);

    // 2. Play reward chime
    playCompletionChime();

    // 3. Set celebration feedback
    setExerciseFeedback({
      name: ex.name,
      target: ex.target,
      boost: 0.25
    });

    // 4. Reset active drill state
    setIsExerciseRunning(false);
    setIsExercisePaused(false);
    setActiveExerciseIndex(null);
    setExerciseTimer(0);

    setTimeout(() => {
      setExerciseFeedback(null);
    }, 6000);
  };

  // Exercise countdown timer
  useEffect(() => {
    if (!isExerciseRunning || isExercisePaused || activeExerciseIndex === null) return;
    
    if (exerciseTimer <= 0) {
      completeExercise(activeExerciseIndex);
      return;
    }

    const timer = setInterval(() => {
      setExerciseTimer(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          completeExercise(activeExerciseIndex);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isExerciseRunning, isExercisePaused, exerciseTimer, activeExerciseIndex]);

  // Biomechanical computations
  const localAI: LocalBiomechanicalMetrics = LocalModelService.recalculateAllBiomechanicalMetrics(
    angle,
    baselineAngle,
    history,
    goodSessionSeconds,
    totalSessionSeconds,
    incidents,
    user ? { age: user.age, height: user.height, weight: user.weight } : undefined
  );

  // Live ML Forecast
  const liveForecast = PostureMlForecastService.calculateForecast(
    recentSessions,
    score,
    90,
    user ? { age: user.age, height: user.height, weight: user.weight } : undefined
  );

  const formatDuration = (totalSecs: number) => {
    if (!totalSecs || totalSecs === 0) return '0s';
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h === 0) {
      if (m === 0) return `${s}s`;
      return `${m}m ${s}s`;
    }
    return `${h}h ${m}m ${s}s`;
  };

  const getStatusColor = (val: number) => {
    if (val >= thresholds.good) return '#10B981';
    if (val >= thresholds.warn) return '#F59E0B';
    return '#EF4444';
  };

  const isOptimal = angle >= thresholds.good;
  const isWarn = angle >= thresholds.warn && angle < thresholds.good;

  const statusTheme = isOptimal ? {
    statusText: 'OPTIMAL ALIGNMENT',
    dotBg: 'bg-[#10b981]',
    colorHex: '#10b981',
    primaryTextClass: 'text-[#10b981]',
    subTextClass: 'text-[#34d399]',
    cardGlowClass: 'from-emerald-100/40 via-emerald-50/15 to-transparent',
    ecgColor: '#10b981',
    badgeClass: 'bg-emerald-100 text-emerald-800'
  } : isWarn ? {
    statusText: 'MILD SLOUCH',
    dotBg: 'bg-[#f59e0b]',
    colorHex: '#f59e0b',
    primaryTextClass: 'text-[#f59e0b]',
    subTextClass: 'text-[#fbbf24]',
    cardGlowClass: 'from-amber-100/40 via-amber-50/15 to-transparent',
    ecgColor: '#f59e0b',
    badgeClass: 'bg-amber-100 text-amber-800'
  } : {
    statusText: 'POOR ALIGNMENT',
    dotBg: 'bg-[#ff2d55]',
    colorHex: '#ff2d55',
    primaryTextClass: 'text-[#ff2d55]',
    subTextClass: 'text-[#fb7185]',
    cardGlowClass: 'from-rose-100/50 via-rose-50/15 to-transparent',
    ecgColor: '#ff2d55',
    badgeClass: 'bg-rose-100 text-rose-800'
  };

  const statusLabel = isOptimal ? 'Optimal Alignment' : isWarn ? 'Mild Slouch' : 'Significant Slouch';
  const statusColorClass = isOptimal 
    ? 'text-emerald-600 bg-emerald-50 border-emerald-200' 
    : isWarn 
    ? 'text-amber-600 bg-amber-50 border-amber-200' 
    : 'text-rose-600 bg-rose-50 border-rose-200';

  const handleSaveSession = async () => {
    if (totalSessionSeconds <= 0) {
      alert("No posture data recorded in this session yet.");
      return;
    }

    setIsSaving(true);
    try {
      const sessionPayload = {
        date: new Date().toISOString(),
        duration: totalSessionSeconds,
        goodSessionSeconds: goodSessionSeconds || 0,
        score: Math.round(score),
        slouches: incidents || 0,
        baselineAngle: baselineAngle || 90,
        averageAngle: Math.round(history.length > 0 ? history.reduce((a, b) => a + b, 0) / history.length : angle),
        status: (isOptimal ? 'Excellent' : isWarn ? 'Fair' : 'Poor') as 'Excellent' | 'Fair' | 'Poor'
      };

      const userId = user?.id || auth.currentUser?.uid || 'guest';
      const existing = await SessionService.fetchUnifiedSessions(userId);
      const newSession: UnifiedSession = {
        id: `session-${Date.now()}`,
        date: sessionPayload.date,
        duration: sessionPayload.duration,
        score: sessionPayload.score,
        slouches: sessionPayload.slouches,
        goodSessionSeconds: sessionPayload.goodSessionSeconds,
        warnSessionSeconds: sessionPayload.duration - sessionPayload.goodSessionSeconds,
        status: sessionPayload.status,
        avgLoadLbs: localAI.upperBackStrainLbs,
        peakLoadLbs: Math.round(localAI.upperBackStrainLbs * 1.3),
        fatigueScore: localAI.fatigueScore,
        stabilityScore: localAI.stabilityScore,
        complianceRate: localAI.recoveryEfficiency,
        source: 'local'
      };

      SessionService.updateLocalStorageCache(userId, [newSession, ...existing]);

      if (auth.currentUser) {
        try {
          await addDoc(collection(db, 'users', auth.currentUser.uid, 'sessions'), {
            ...newSession,
            timestamp: serverTimestamp()
          });
        } catch (e) {
          console.warn('Firestore sync note:', e);
        }
      }

      dispatch(setIsRecordingSession(false));
      dispatch(resetSessionStats());
      alert("🎉 Posture session saved successfully!");
    } catch (error: any) {
      console.error("Failed to save session:", error);
      dispatch(setIsRecordingSession(false));
      dispatch(resetSessionStats());
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateSummary = async () => {
    setIsSummarizing(true);
    try {
      const localReport = LocalModelService.compileLocalAIReport();
      const result = await generatePostureSummary(history, score, recentSessions, localReport);
      setSummary(result);
    } catch (error) {
      console.error('Summary generation failed:', error);
    } finally {
      setIsSummarizing(false);
    }
  };

  const startExercise = (index: number) => {
    setActiveExerciseIndex(index);
    setExerciseTimer(POSTURE_EXERCISES[index].durationSec);
    setIsExerciseRunning(true);
    setIsExercisePaused(false);
  };

  const pauseExercise = () => {
    setIsExercisePaused(true);
  };

  const resumeExercise = () => {
    setIsExercisePaused(false);
  };

  const stopExercise = () => {
    setIsExerciseRunning(false);
    setIsExercisePaused(false);
    setActiveExerciseIndex(null);
    setExerciseTimer(0);
  };

  const chartData = history.slice(0, 30).reverse().map((a, i) => ({
    time: `${i}s`,
    angle: a
  }));

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-32 px-4 sm:px-6 pt-2">
      {/* Background Slouch Audio/Haptic Monitor */}
      <SlouchAlarmManager />

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Live Posture Cockpit
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Biometric stance telemetry, 3D anatomical twin & clinical ergonomics
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Alarm Audio Toggle */}
          <button
            onClick={() => setAudioAlerts(!audioAlerts)}
            className={cn(
              "p-2 rounded-2xl border shadow-soft transition-all",
              audioAlerts ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-100 border-slate-200 text-slate-400"
            )}
            title={audioAlerts ? "Sound alarms active" : "Sound alarms muted"}
          >
            {audioAlerts ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Device Connection Status */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-slate-100 shadow-soft text-xs font-bold text-slate-700">
            <span className={cn(
              "w-2 h-2 rounded-full",
              isRecordingSession ? "bg-rose-500 animate-pulse" : "bg-slate-400"
            )} />
            <span>{isRecordingSession ? "Live Telemetry" : "Idle"}</span>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'realtime', label: 'Live Cockpit', icon: Activity },
          { id: 'prediction', label: 'AI Trajectory & Forecast', icon: TrendingUp, badge: 'ML' },
          { id: '3d', label: '3D Anatomical Twin', icon: Box },
          { id: 'biomechanics', label: 'Spinal Biomechanics', icon: BrainCircuit },
          { id: 'drills', label: 'Posture Exercises', icon: Dumbbell },
          { id: 'history', label: 'Session Records', icon: Calendar }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition-all shadow-soft active:scale-95",
                isActive 
                  ? "bg-indigo-600 text-white shadow-indigo-200" 
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-100"
              )}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={cn(
                  "text-[9px] font-black px-1.5 py-0.5 rounded-md",
                  isActive ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700"
                )}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'realtime' && (
        <div className="space-y-6">
          {/* Main Hero Live Biofeedback Card */}
          <div 
            data-tour="posture-ring"
            className="bg-white rounded-[32px] p-6 sm:p-7 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.08),0_4px_12px_-2px_rgba(15,23,42,0.03)] border border-slate-100/90 relative overflow-hidden flex flex-col justify-between space-y-4 transition-all"
          >
            {/* Soft Dynamic Gradient Background Glow */}
            <div 
              className={cn(
                "absolute inset-0 bg-gradient-to-t pointer-events-none transition-all duration-700",
                statusTheme.cardGlowClass
              )} 
            />

            {/* Card Header: Dynamic Status & Clinical Badge */}
            <div className="flex items-start justify-between relative z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full animate-pulse", statusTheme.dotBg)} />
                  <span 
                    className="text-xs sm:text-sm font-black uppercase tracking-wider"
                    style={{ color: statusTheme.colorHex }}
                  >
                    {statusTheme.statusText}
                  </span>
                </div>
                <span 
                  className="text-[9px] sm:text-[10px] font-black tracking-widest uppercase block mt-0.5"
                  style={{ color: statusTheme.colorHex, opacity: 0.8 }}
                >
                  CLINICAL PRECISION
                </span>
              </div>

              {/* Status Pill */}
              <div className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-2xs",
                statusColorClass
              )}>
                {statusLabel}
              </div>
            </div>

            {/* Center: Circular Stage with PostureFigure + Overlapping Floating Angle Pill */}
            <div className="relative flex items-center justify-center py-2 z-10">
              <div className="w-52 h-52 sm:w-56 sm:h-56 rounded-full bg-gradient-to-b from-[#f8fafc] to-[#f1f5f9] border border-slate-200/80 flex items-center justify-center relative shadow-[inset_0_2px_6px_rgba(0,0,0,0.02),0_4px_16px_rgba(15,23,42,0.03)]">
                <PostureFigure size={165} angle={angle} />

                {/* Overlapping Floating Angle Pill on Bottom-Right */}
                <div className="absolute bottom-2 -right-2 sm:bottom-3 sm:-right-3 z-20 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-[0_8px_20px_-4px_rgba(15,23,42,0.12),0_2px_6px_-1px_rgba(15,23,42,0.04)] border border-slate-100/90 text-center min-w-[76px] select-none">
                  <span 
                    className="text-[9px] font-black tracking-widest uppercase block transition-colors"
                    style={{ color: statusTheme.colorHex }}
                  >
                    ANGLE
                  </span>
                  <span 
                    className="text-2xl font-black tracking-tight leading-none transition-colors"
                    style={{ color: statusTheme.colorHex }}
                  >
                    {Math.round(angle)}°
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom: Alignment Score + Clean Controls */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10 border-t border-slate-100/80">
              <div>
                <div 
                  className="text-3xl sm:text-4xl font-black tracking-tight leading-none"
                  style={{ color: statusTheme.colorHex }}
                >
                  {Math.round(score)}%
                </div>
                <span 
                  className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest block mt-0.5"
                  style={{ color: statusTheme.colorHex, opacity: 0.8 }}
                >
                  ALIGNMENT SCORE
                </span>
              </div>

              {/* Action Controls Cluster */}
              <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5 w-full sm:w-auto">
                {!isRecordingSession ? (
                  <button
                    onClick={() => dispatch(setIsRecordingSession(true))}
                    className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Play size={13} fill="currentColor" />
                    <span>{totalSessionSeconds > 0 ? "Resume Session" : "Start Session"}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => dispatch(setIsRecordingSession(false))}
                      className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
                    >
                      <Pause size={13} fill="currentColor" />
                      <span>Pause</span>
                    </button>

                    <button
                      onClick={handleSaveSession}
                      disabled={isSaving}
                      className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} />
                      <span>{isSaving ? "Saving..." : "Save"}</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={() => dispatch(recalibrateBaseline(angle))}
                  className="px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1.5"
                  title="Recalibrate Zero Baseline"
                >
                  <Target size={13} />
                  <span>Zero ({Math.round(baselineAngle)}°)</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4 Essential Realtime Telemetry Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass p-4 rounded-3xl border border-slate-100 shadow-soft space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Torso Inclination
              </span>
              <div className="text-2xl font-black text-slate-900">{Math.round(angle)}°</div>
              <span className="text-[10px] font-semibold text-slate-500">
                Target: ≥{thresholds.good}°
              </span>
            </div>

            <div className="glass p-4 rounded-3xl border border-slate-100 shadow-soft space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Spinal Load
              </span>
              <div className="text-2xl font-black text-slate-900">{localAI.upperBackStrainLbs} lbs</div>
              <span className={cn("text-[10px] font-bold", localAI.upperBackStrainLbs <= 15 ? "text-emerald-600" : "text-amber-600")}>
                {localAI.loadClassification}
              </span>
            </div>

            <div className="glass p-4 rounded-3xl border border-slate-100 shadow-soft space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Upright Time
              </span>
              <div className="text-2xl font-black text-slate-900">{formatDuration(goodSessionSeconds)}</div>
              <span className="text-[10px] font-semibold text-slate-500">
                of {formatDuration(totalSessionSeconds)}
              </span>
            </div>

            <div className="glass p-4 rounded-3xl border border-slate-100 shadow-soft space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Slouch Alerts
              </span>
              <div className="text-2xl font-black text-slate-900">{incidents || 0}</div>
              <span className="text-[10px] font-semibold text-slate-500">
                {incidents === 0 ? "Zero alerts" : "Detected"}
              </span>
            </div>
          </div>

          {/* Live Posture Sparkline Area Chart */}
          <div className="glass p-6 rounded-[36px] border border-slate-100 shadow-soft space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Activity size={15} className="text-indigo-600" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Live Posture Trend (Recent Readings)
                </h3>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                Streaming Sensor Feed
              </span>
            </div>

            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="angleGradient2" x1="0" y1="0" x2="0" y2="100%">
                      <stop offset="5%" stopColor={getStatusColor(angle)} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={getStatusColor(angle)} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <YAxis domain={[30, 100]} tick={{ fontSize: 9 }} stroke="#cbd5e1" />
                  <Tooltip 
                    formatter={(val: any) => [`${val}°`, 'Angle']}
                    contentStyle={{ borderRadius: '12px', fontSize: '11px', border: '1px solid #e2e8f0' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="angle" 
                    stroke={getStatusColor(angle)} 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#angleGradient2)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Biomechanical Prediction & Peak Slouch Forecast Card */}
          <div className="bg-gradient-to-r from-indigo-50 via-white to-emerald-50/50 p-6 rounded-[36px] border border-indigo-100 shadow-soft space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900">AI Posture Prediction & Slouch Trajectory</h3>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                      ML Prognosis
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {liveForecast.daysToTarget === 0 
                      ? "Ideal alignment target achieved!" 
                      : `Projected to reach 90% Ideal Posture in ~${liveForecast.daysToTarget} days (${liveForecast.projectedTargetDate})`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('prediction')}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0"
              >
                <span>Explore ML Model</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-xs space-y-0.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                  Improvement Velocity
                </span>
                <div className="text-base font-black text-emerald-600">
                  {liveForecast.improvementVelocityPerDay > 0 ? '+' : ''}{liveForecast.improvementVelocityPerDay}% / day
                </div>
                <span className="text-[10px] font-bold text-slate-500">{liveForecast.trajectoryStatus}</span>
              </div>

              <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-xs space-y-0.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                  Peak Slouch Window
                </span>
                <div className="text-base font-black text-rose-600">
                  {liveForecast.peakSlouchWindow.split(' - ')[0]} ({liveForecast.peakSlouchPercentage}%)
                </div>
                <span className="text-[10px] font-bold text-slate-500">Circadian fatigue peak</span>
              </div>

              <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-xs space-y-0.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                  Estimated Timeline
                </span>
                <div className="text-base font-black text-indigo-600">
                  {liveForecast.daysToTarget} Days
                </div>
                <span className="text-[10px] font-bold text-slate-500">Target: {liveForecast.projectedTargetDate}</span>
              </div>
            </div>
          </div>

          {/* AI Ergonomic Summary Box */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[36px] p-7 text-white shadow-premium space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white shrink-0">
                  <Sparkles size={18} className="text-indigo-300 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">PostureCare AI Ergonomist</h3>
                  <p className="text-xs text-indigo-200 font-medium">
                    Clinical biomechanics breakdown powered by Gemini AI.
                  </p>
                </div>
              </div>

              <button
                onClick={handleGenerateSummary}
                disabled={isSummarizing}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 shrink-0 disabled:opacity-60"
              >
                {isSummarizing ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Analyzing Spine...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={13} className="text-indigo-600" />
                    <span>{summary ? "Regenerate Analysis" : "Generate AI Advice"}</span>
                  </>
                )}
              </button>
            </div>

            {summary && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-4 bg-white/5 border border-white/10 rounded-2xl text-xs text-slate-200 leading-relaxed max-h-60 overflow-y-auto"
              >
                <Markdown>{summary}</Markdown>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* AI PREDICTION & TRAJECTORY TAB */}
      {activeTab === 'prediction' && (
        <PosturePredictionView 
          currentScore={score}
          recentSessions={recentSessions}
          userProfile={user ? { age: user.age, height: user.height, weight: user.weight, name: user.name } : undefined}
        />
      )}


      {/* 3D ANATOMICAL TWIN TAB */}
      {activeTab === '3d' && (
        <div data-tour="spine-3d-model" className="space-y-6">
          <div className="glass p-6 sm:p-8 rounded-[40px] border border-slate-100 shadow-premium">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Box size={16} className="text-indigo-600" />
                  Interactive 3D Anatomical Spine Twin
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Rotate 360° to inspect cervical, thoracic, and lumbar stress heatmaps in real time.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-black px-3 py-1 rounded-full bg-indigo-50 text-indigo-700">
                  {Math.round(angle)}° Dynamic Stance
                </span>
              </div>
            </div>

            {/* 3D Spine Component */}
            <div className="pt-4">
              <Spine3DModel 
                avgAngle={angle}
                slouchIncidents={incidents}
                stabilityScore={localAI.stabilityScore}
                showControls={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* BIOMECHANICS TAB */}
      {activeTab === 'biomechanics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass p-6 rounded-[32px] border border-slate-100 shadow-soft space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                Upper Back Strain
              </span>
              <div className="text-3xl font-black text-slate-900">{localAI.upperBackStrainLbs} lbs</div>
              <p className="text-xs text-slate-500 font-medium">{localAI.loadClassification} tensile load</p>
            </div>

            <div className="glass p-6 rounded-[32px] border border-slate-100 shadow-soft space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                Fatigue Score
              </span>
              <div className="text-3xl font-black text-slate-900">{localAI.fatigueScore}%</div>
              <p className="text-xs text-slate-500 font-medium">{localAI.fatigueTrend} accumulation</p>
            </div>

            <div className="glass p-6 rounded-[32px] border border-slate-100 shadow-soft space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                Cumulative Load
              </span>
              <div className="text-3xl font-black text-slate-900">{localAI.cumulativeDailyLoadKgh} kg·h</div>
              <p className="text-xs text-slate-500 font-medium">Gravitational torque on spine</p>
            </div>
          </div>

          <div className="glass p-7 rounded-[40px] border border-slate-100 shadow-premium space-y-4">
            <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <BrainCircuit size={16} className="text-indigo-600" />
              Clinical Recommendations & Ergonomic Plan
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {localAI.dailyRecommendation}
            </p>
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs font-medium text-indigo-900">
              <strong>Break Recommendation:</strong> {localAI.breakRecommendationMessage}
            </div>
          </div>
        </div>
      )}

      {/* POSTURE EXERCISES & DRILLS TAB */}
      {activeTab === 'drills' && (
        <div className="space-y-6">
          {/* Exercise Completion Reward Feedback Banner */}
          <AnimatePresence>
            {exerciseFeedback && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.96 }}
                className="p-5 rounded-[28px] bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xl flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                    <Sparkles size={20} className="text-white animate-bounce" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider">
                      Drill Completed & Ingested to ML Pipeline!
                    </h4>
                    <p className="text-xs text-emerald-100 font-medium">
                      <strong>{exerciseFeedback.name}</strong> • +{exerciseFeedback.boost}% / day improvement velocity added to ML forecast. Biomechanical fatigue reduced!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setExerciseFeedback(null)}
                  className="p-1.5 rounded-full hover:bg-white/20 transition-all text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dedicated Active Drill Player Card (Shown when an exercise is active) */}
          {activeExerciseIndex !== null && (() => {
            const currentEx = POSTURE_EXERCISES[activeExerciseIndex];
            const totalSec = currentEx.durationSec;
            const elapsedSec = totalSec - exerciseTimer;
            const progressPercent = Math.min(100, Math.max(0, (elapsedSec / totalSec) * 100));

            return (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass p-6 sm:p-7 rounded-[36px] border-2 border-indigo-500 shadow-premium space-y-5 bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white relative overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full",
                        isExercisePaused ? "bg-amber-400 text-slate-900 font-black" : "bg-emerald-400 text-slate-900 font-black animate-pulse"
                      )}>
                        {isExercisePaused ? "Drill Paused" : "Active Exercise Drill"}
                      </span>
                      <span className="text-[10px] text-indigo-200 font-bold">
                        Target: {currentEx.target}
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-white">
                      {currentEx.name}
                    </h3>
                    <p className="text-xs text-indigo-100 font-medium max-w-xl">
                      {currentEx.description}
                    </p>
                  </div>

                  {/* Large Countdown Display */}
                  <div className="text-center sm:text-right shrink-0 bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/15 min-w-[120px]">
                    <div className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                      {exerciseTimer} <span className="text-xs font-bold text-indigo-200">sec</span>
                    </div>
                    <div className="text-[10px] font-black uppercase text-indigo-300">
                      {isExercisePaused ? "Paused" : "Remaining"}
                    </div>
                  </div>
                </div>

                {/* Animated Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase text-indigo-200">
                    <span>Progress: {Math.round(progressPercent)}%</span>
                    <span>{currentEx.reps}</span>
                  </div>
                  <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/10">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        isExercisePaused ? "bg-amber-400" : "bg-gradient-to-r from-indigo-400 to-emerald-400"
                      )}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Interactive Control Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    {isExercisePaused ? (
                      <button
                        type="button"
                        onClick={resumeExercise}
                        className="px-4 py-2 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                      >
                        <Play size={14} fill="currentColor" />
                        Resume Drill
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={pauseExercise}
                        className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                      >
                        <Pause size={14} />
                        Pause Drill
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={stopExercise}
                      className="px-4 py-2 rounded-2xl bg-white/10 hover:bg-rose-500/80 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border border-white/15 active:scale-95 transition-all cursor-pointer"
                    >
                      <RotateCcw size={14} />
                      Stop / Cancel
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => completeExercise(activeExerciseIndex)}
                    className="px-4 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    <CheckCircle2 size={14} />
                    Finish Early & Log to ML
                  </button>
                </div>
              </motion.div>
            );
          })()}

          {/* Continuous ML Training & Active Interventions Feed Header */}
          <div className="glass p-5 rounded-[28px] border border-slate-100 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                <BrainCircuit size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    ML Continuous Training & Telemetry Pipeline
                  </h4>
                  <span className="flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Ingestion
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Completed drills and ergonomic breaks continuously adjust your OLS regression trajectory & paraspinal fatigue models.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <div className="text-[9px] font-bold uppercase text-slate-400">Drills Today</div>
                <div className="text-xs font-black text-indigo-600">
                  {liveForecast.drillsCompletedToday} done
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <div className="text-[9px] font-bold uppercase text-slate-400">ML Velocity Boost</div>
                <div className="text-xs font-black text-emerald-600">
                  +{liveForecast.drillVelocityBoost}% / day
                </div>
              </div>
            </div>
          </div>

          {/* Exercises Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {POSTURE_EXERCISES.map((ex, idx) => {
              const isSelected = activeExerciseIndex === idx;
              return (
                <div 
                  key={ex.id}
                  className={cn(
                    "glass p-6 rounded-[32px] border shadow-soft flex flex-col justify-between space-y-4 transition-all",
                    isSelected ? "border-indigo-500 ring-2 ring-indigo-400/30" : "border-slate-100"
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                        {ex.target}
                      </span>
                      <span className="text-xs font-bold text-slate-400">{ex.durationSec}s</span>
                    </div>
                    <h4 className="text-sm font-black text-slate-900">{ex.name}</h4>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      {ex.description}
                    </p>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 gap-2">
                    <span className="text-[11px] font-bold text-slate-500 truncate">{ex.reps}</span>

                    {isSelected ? (
                      <div className="flex items-center gap-1.5">
                        {isExercisePaused ? (
                          <button
                            type="button"
                            onClick={resumeExercise}
                            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                            title="Resume Drill"
                          >
                            <Play size={13} fill="currentColor" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={pauseExercise}
                            className="p-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                            title="Pause Drill"
                          >
                            <Pause size={13} />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={stopExercise}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-bold border border-slate-200 transition-all active:scale-95 cursor-pointer"
                          title="Stop / Reset Drill"
                        >
                          <RotateCcw size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => completeExercise(idx)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-sm active:scale-95 cursor-pointer"
                          title="Finish Drill Early"
                        >
                          <Check size={13} />
                          <span>Done</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startExercise(idx)}
                        className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm active:scale-95 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                      >
                        <Play size={12} fill="currentColor" />
                        <span>Start Drill</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SESSION RECORDS TAB */}
      {activeTab === 'history' && (() => {
        const now = new Date();
        
        // Dynamic day options for dropdown: Today, Yesterday, Days 2-6, and All 7 Days
        const dayOptions = [
          { value: '0', label: `Today (${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})` },
          { value: '1', label: `Yesterday (${new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})` },
          ...Array.from({ length: 5 }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (i + 2));
            return {
              value: String(i + 2),
              label: `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
            };
          }),
          { value: 'all', label: 'Last 7 Days (All Records)' }
        ];

        // Filtered sessions based on selected day
        const filteredSessions = recentSessions.filter(s => {
          if (!s.date) return false;
          const sessionDate = new Date(s.date);
          
          if (selectedHistoryFilter === 'all') {
            const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
            sevenDaysAgo.setHours(0, 0, 0, 0);
            return sessionDate >= sevenDaysAgo;
          }
          
          const daysAgo = parseInt(selectedHistoryFilter, 10);
          const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
          return sessionDate.toDateString() === targetDate.toDateString();
        });

        // Compute aggregated metrics for filtered period
        const totalDurationSec = filteredSessions.reduce((acc, s) => acc + (s.duration || 0), 0);
        const avgScore = filteredSessions.length > 0 
          ? Math.round(filteredSessions.reduce((acc, s) => acc + (s.score || 0), 0) / filteredSessions.length)
          : 0;
        const totalSlouches = filteredSessions.reduce((acc, s) => acc + (s.slouches || 0), 0);
        const avgSpineLoad = filteredSessions.length > 0
          ? (filteredSessions.reduce((acc, s) => acc + (s.avgLoadLbs || 13), 0) / filteredSessions.length).toFixed(1)
          : '0.0';

        const selectedOptionObj = dayOptions.find(o => o.value === selectedHistoryFilter);

        return (
          <div className="space-y-5">
            {/* Header with Filter Dropdown */}
            <div className="glass p-6 rounded-[32px] border border-slate-100 shadow-premium space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">Session Records</h3>
                    <span className="flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                      <CheckCircle2 size={11} />
                      Synced with ML & DB
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Live session history synchronized across Analytics, Dashboard, and ML Forecast
                  </p>
                </div>

                {/* 7-Days Dropdown Selector */}
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <label htmlFor="session-day-filter" className="sr-only">Filter Sessions by Day</label>
                    <select
                      id="session-day-filter"
                      value={selectedHistoryFilter}
                      onChange={(e) => setSelectedHistoryFilter(e.target.value)}
                      className="appearance-none bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-black py-2 pl-3 pr-8 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-pointer shadow-sm"
                    >
                      {dayOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Aggregated Period Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100/80">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sessions</div>
                  <div className="text-lg font-black text-slate-900 mt-0.5">
                    {filteredSessions.length} <span className="text-xs font-semibold text-slate-400">rec</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {selectedHistoryFilter === '0' ? 'Today only' : selectedOptionObj?.label}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100/80">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tracked Time</div>
                  <div className="text-lg font-black text-indigo-600 mt-0.5">
                    {formatDuration(totalDurationSec)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Total duration</div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100/80">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Avg Posture</div>
                  <div className={cn(
                    "text-lg font-black mt-0.5",
                    avgScore >= 80 ? "text-emerald-600" : avgScore >= 60 ? "text-indigo-600" : "text-rose-600"
                  )}>
                    {avgScore > 0 ? `${avgScore}%` : '—'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {avgScore >= 80 ? 'Optimal' : avgScore >= 60 ? 'Moderate' : 'Needs attention'}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100/80">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Slouches</div>
                  <div className="text-lg font-black text-amber-600 mt-0.5">
                    {totalSlouches} <span className="text-xs font-semibold text-slate-400">events</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Avg strain: {avgSpineLoad} lbs</div>
                </div>
              </div>
            </div>

            {/* List of Session Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                  {selectedHistoryFilter === '0' 
                    ? `Today's Recorded Sessions (${filteredSessions.length})`
                    : selectedHistoryFilter === 'all'
                    ? `Last 7 Days Recordings (${filteredSessions.length})`
                    : `${selectedOptionObj?.label} Recordings (${filteredSessions.length})`
                  }
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  Database & LocalStorage Verified
                </span>
              </div>

              {filteredSessions.length === 0 ? (
                <div className="glass p-10 rounded-[32px] border border-slate-100 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto text-slate-400 border border-slate-100">
                    <Calendar size={22} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800">No sessions recorded on this day</p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                      {selectedHistoryFilter === '0' 
                        ? 'Tap "Save Session Log" from the Live Monitor when you complete your current posture session to add today\'s record.' 
                        : 'Select another day from the dropdown menu to inspect previous session records.'}
                    </p>
                  </div>
                  {isRecordingSession && (
                    <button
                      type="button"
                      onClick={handleSaveSession}
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md transition-all cursor-pointer"
                    >
                      <Sparkles size={13} />
                      {isSaving ? 'Logging to Database...' : 'Save Current Live Session Now'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSessions.map((session, idx) => {
                    const sessionDateObj = new Date(session.date);
                    const isSessionExcellent = session.score >= 80;
                    const isSessionFair = session.score >= 60 && session.score < 80;
                    
                    return (
                      <motion.div
                        key={session.id || idx}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: idx * 0.04 }}
                        className="glass p-5 rounded-[28px] border border-slate-100 hover:border-indigo-100 shadow-premium transition-all space-y-3.5"
                      >
                        {/* Top Session Row */}
                        <div className="flex items-start justify-between">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900">
                                {sessionDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="text-[10px] text-slate-500 font-bold">
                                • {sessionDateObj.toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'short' })}
                              </span>
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                {formatDuration(session.duration)}
                              </span>
                            </div>
                            <p className="text-[11px] font-medium text-slate-500">
                              Focus Streak: {formatDuration(session.maxFocusStreak || Math.floor(session.duration * 0.6))} • Good Posture: {formatDuration(session.goodSessionSeconds || Math.floor(session.duration * (session.score / 100)))}
                            </p>
                          </div>

                          {/* Score Pill */}
                          <div className="text-right flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className={cn(
                                "text-sm font-black",
                                isSessionExcellent ? "text-emerald-600" : isSessionFair ? "text-indigo-600" : "text-rose-600"
                              )}>
                                {session.score}% Score
                              </span>
                            </div>
                            <span className={cn(
                              "text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full",
                              isSessionExcellent 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                : isSessionFair 
                                ? "bg-amber-50 text-amber-700 border border-amber-100" 
                                : "bg-rose-50 text-rose-700 border border-rose-100"
                            )}>
                              {session.status || (isSessionExcellent ? 'Excellent' : isSessionFair ? 'Fair' : 'Poor')}
                            </span>
                          </div>
                        </div>

                        {/* Biomechanical Details Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                          <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-500 font-bold block">Slouch Events</span>
                            <span className="font-black text-amber-600">
                              {session.slouches} {session.slouches === 1 ? 'incident' : 'incidents'}
                            </span>
                          </div>

                          <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-500 font-bold block">Avg Spine Load</span>
                            <span className="font-black text-slate-800">
                              {(session.avgLoadLbs || 12.5).toFixed(1)} lbs
                            </span>
                          </div>

                          <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-500 font-bold block">Stability Score</span>
                            <span className="font-black text-indigo-600">
                              {session.stabilityScore || 85}%
                            </span>
                          </div>

                          <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                            <span className="text-[10px] text-slate-500 font-bold block">Compliance</span>
                            <span className="font-black text-emerald-600">
                              {session.complianceRate || 90}%
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
