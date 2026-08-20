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

  const [activeTab, setActiveTab] = useState<'realtime' | '3d' | 'biomechanics' | 'drills' | 'history'>('realtime');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [autoOscillate, setAutoOscillate] = useState(true);
  const [showSimulator, setShowSimulator] = useState(false);
  const [audioAlerts, setAudioAlerts] = useState(true);
  const [recentSessions, setRecentSessions] = useState<UnifiedSession[]>([]);

  // Exercise active state
  const [activeExerciseIndex, setActiveExerciseIndex] = useState<number | null>(null);
  const [exerciseTimer, setExerciseTimer] = useState<number>(0);
  const [isExerciseRunning, setIsExerciseRunning] = useState<boolean>(false);

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

  // Exercise countdown timer
  useEffect(() => {
    if (!isExerciseRunning || activeExerciseIndex === null) return;
    if (exerciseTimer <= 0) {
      setIsExerciseRunning(false);
      return;
    }

    const timer = setInterval(() => {
      setExerciseTimer(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isExerciseRunning, exerciseTimer, activeExerciseIndex]);

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
          {/* Simulator Toggle */}
          <button
            onClick={() => {
              const next = !showSimulator;
              setShowSimulator(next);
              if (next && !isSimulating) {
                dispatch(setIsSimulating(true));
                dispatch(setDeviceStatus(true));
                dispatch(setHasPaired(true));
              }
            }}
            className={cn(
              "px-3.5 py-2 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all border shadow-soft",
              showSimulator 
                ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            )}
          >
            <Sliders size={14} />
            <span>{showSimulator ? "Close Sim" : "Posture Simulator"}</span>
          </button>

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

      {/* COLLAPSIBLE SIMULATOR TRAY */}
      <AnimatePresence>
        {showSimulator && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-5 bg-indigo-50/80 border border-indigo-100 rounded-[32px] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders size={14} className="text-indigo-600" />
                    Interactive Biometric Stance Simulator
                  </span>
                  <p className="text-[11px] text-indigo-800 font-medium">
                    Test how the 3D twin, alarms, and thoracic strain react to different angles.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAutoOscillate(!autoOscillate)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border shadow-sm transition-all",
                      autoOscillate ? "bg-emerald-500 text-white border-emerald-600" : "bg-white text-slate-700 border-slate-200"
                    )}
                  >
                    {autoOscillate ? "Auto-Oscillation Active" : "Manual Slider Drag"}
                  </button>
                </div>
              </div>

              {/* Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-black text-slate-700">
                  <span className="text-rose-600">Severe Slouch (30°)</span>
                  <span className="text-indigo-900 bg-white px-3 py-0.5 rounded-lg shadow-sm border border-indigo-100">
                    Live Angle: {Math.round(angle)}°
                  </span>
                  <span className="text-emerald-600">Upright Posture (100°)</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="100"
                  value={Math.round(angle)}
                  disabled={autoOscillate}
                  onChange={(e) => dispatch(updateAngle(Number(e.target.value)))}
                  className={cn(
                    "w-full h-2.5 rounded-lg appearance-none cursor-pointer focus:outline-none",
                    autoOscillate ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                  )}
                  style={{
                    background: 'linear-gradient(to right, #ef4444 0%, #f59e0b 40%, #10b981 100%)'
                  }}
                />
              </div>

              {/* Preset Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[10px] font-black text-indigo-900 uppercase">Quick Presets:</span>
                {[
                  { label: 'Ideal Upright (90°)', val: 90 },
                  { label: 'Mild Slouch (72°)', val: 72 },
                  { label: 'Desk Slouch (58°)', val: 58 },
                  { label: 'Phone Neck (42°)', val: 42 },
                ].map(p => (
                  <button
                    key={p.val}
                    onClick={() => {
                      setAutoOscillate(false);
                      dispatch(updateAngle(p.val));
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/90 hover:bg-white text-indigo-900 border border-indigo-100 text-[10px] font-bold shadow-sm"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'realtime', label: 'Live Cockpit', icon: Activity },
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
            className="glass p-7 sm:p-9 rounded-[40px] border border-slate-100 shadow-premium flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden"
          >
            {/* Left: Avatar & Live Ring */}
            <div className="flex flex-col items-center justify-center relative w-full md:w-auto">
              <div className="relative w-52 h-52 sm:w-56 sm:h-56 flex items-center justify-center bg-slate-50/90 rounded-full border-2 border-white shadow-soft">
                <PostureFigure size={170} angle={angle} />

                {/* Floating Live Angle Badge */}
                <div className="absolute bottom-3 bg-white/95 backdrop-blur-md px-4 py-1.5 rounded-2xl shadow-soft border border-slate-100 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full animate-ping" style={{ backgroundColor: getStatusColor(angle) }} />
                  <span className="text-sm font-black text-slate-900">{Math.round(angle)}° Tilt</span>
                </div>
              </div>
            </div>

            {/* Center: Live Alignment Status & Action Controls */}
            <div className="flex-1 space-y-4 text-center md:text-left w-full">
              <div className="space-y-2">
                <div className={cn(
                  "inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-sm",
                  statusColorClass
                )}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusColor(angle) }} />
                  <span>{statusLabel}</span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                  {Math.round(score)}% Alignment Score
                </h2>
                <p className="text-xs text-slate-500 font-medium max-w-md leading-relaxed">
                  {isOptimal 
                    ? "Paraspinal load is minimal. Natural spinal S-curve preserved with optimal gravitational balance." 
                    : "Forward cervical deviation detected. Bring your chest upright and pull your chin gently back to neutralize strain."}
                </p>
              </div>

              {/* Session Action Controls */}
              <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
                {!isRecordingSession ? (
                  <button
                    onClick={() => dispatch(setIsRecordingSession(true))}
                    className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Play size={14} fill="currentColor" />
                    <span>{totalSessionSeconds > 0 ? "Resume Session" : "Start Posture Session"}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => dispatch(setIsRecordingSession(false))}
                      className="flex-1 sm:flex-initial px-5 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Pause size={14} fill="currentColor" />
                      <span>Pause</span>
                    </button>

                    <button
                      onClick={handleSaveSession}
                      disabled={isSaving}
                      className="flex-1 sm:flex-initial px-5 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle2 size={15} />
                      <span>{isSaving ? "Saving..." : "Save Log"}</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={() => dispatch(recalibrateBaseline(angle))}
                  className="px-4 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Target size={14} />
                  <span>Zero Baseline ({Math.round(baselineAngle)}°)</span>
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

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-500">{ex.reps}</span>
                    <button
                      onClick={() => startExercise(idx)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm active:scale-95",
                        isSelected && isExerciseRunning ? "bg-amber-500 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"
                      )}
                    >
                      {isSelected && isExerciseRunning ? (
                        <>
                          <Timer size={12} className="animate-spin" />
                          <span>{exerciseTimer}s</span>
                        </>
                      ) : (
                        <>
                          <Play size={12} fill="currentColor" />
                          <span>Start Drill</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SESSION RECORDS TAB */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="glass p-6 rounded-[36px] border border-slate-100 shadow-premium space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">Recorded Posture Sessions</h3>
                <p className="text-xs text-slate-500 font-medium">Synced with Local Storage & Firebase Firestore</p>
              </div>
              <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                {recentSessions.length} Total Sessions
              </span>
            </div>

            {recentSessions.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Calendar size={32} className="mx-auto text-slate-300" />
                <p className="text-xs font-bold">No saved posture sessions yet.</p>
                <p className="text-[11px]">Start a session and tap "Save Log" to record posture data.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentSessions.slice(0, 10).map((s, idx) => (
                  <div key={s.id || idx} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black text-slate-900">
                        {new Date(s.date).toLocaleDateString()} at {new Date(s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                        Duration: {formatDuration(s.duration)} • Slouches: {s.slouches}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-indigo-600">{s.score}% Score</div>
                      <span className={cn(
                        "text-[9px] font-black uppercase px-2 py-0.5 rounded-full",
                        s.score >= 80 ? "bg-emerald-50 text-emerald-700" : s.score >= 60 ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
                      )}>
                        {s.status || 'Recorded'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
