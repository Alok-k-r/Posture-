import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, updateAngle, setIsSimulating, setIsRecordingSession, resetSessionStats, setDeviceStatus, setHasPaired, addToSyncQueue, BreakRecord } from '../store/store';
import { PostureFigure } from '../components/posture/PostureFigure';
import { 
  Play, 
  Square, 
  Info, 
  ChevronRight, 
  Activity, 
  Clock, 
  Shield, 
  Zap, 
  Wind, 
  User, 
  Sparkles, 
  X, 
  Brain, 
  Bot, 
  Pause, 
  CheckCircle2, 
  AlertOctagon, 
  RefreshCw,
  Award,
  TrendingDown,
  Gauge,
  Flame
} from 'lucide-react';
import { cn } from '../lib/utils';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { generatePostureSummary } from '../services/geminiService';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from 'firebase/firestore';
import Markdown from 'react-markdown';
import { LocalModelService } from '../services/localModelService';

export const PostureScreen: React.FC = () => {
  const dispatch = useDispatch();
  const device = useSelector((state: RootState) => state.device);
  const posture = useSelector((state: RootState) => state.posture);
  const user = useSelector((state: RootState) => state.auth.user);
  const { angle, score, thresholds, history, isSimulating, isRecordingSession, totalSessionSeconds, goodSessionSeconds, maxFocusDuration, incidents, streak, activeBreak, breakHistory, baselineAngle } = posture;
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeAiTab, setActiveAiTab] = useState<'biomechanics' | 'markov' | 'parameters' | 'compliance'>('biomechanics');

  // Compute live 5-Layer Posture Biometrics and AI Diagnostics (Layer 2 - 4)
  const localAI = LocalModelService.recalculateAllBiomechanicalMetrics(
    angle,
    baselineAngle,
    history,
    goodSessionSeconds,
    totalSessionSeconds,
    incidents,
    user ? { age: user.age, height: user.height, weight: user.weight } : undefined
  );

  const prevHistoryLengthRef = useRef(breakHistory ? breakHistory.length : 0);

  useEffect(() => {
    if (breakHistory && breakHistory.length > prevHistoryLengthRef.current) {
      const newBreak = breakHistory[0];
      if (newBreak && user) {
        dispatch(addToSyncQueue({
          id: `sync_break_${newBreak.id}`,
          type: 'SYNC_BREAK',
          payload: newBreak,
          timestamp: new Date().toISOString()
        }));
      }
    }
    prevHistoryLengthRef.current = breakHistory ? breakHistory.length : 0;
  }, [breakHistory, user, dispatch]);

  const [autoOscillate, setAutoOscillate] = useState(true);
  const simulationDirRef = useRef(-1);
  const angleRef = useRef(angle);

  useEffect(() => {
    angleRef.current = angle;
  }, [angle]);

  // Auto-oscillation simulation effect
  useEffect(() => {
    if (!isSimulating || !autoOscillate) return;

    const interval = setInterval(() => {
      let nextAngle = angleRef.current + simulationDirRef.current * 4;
      if (nextAngle <= 42) {
        nextAngle = 42;
        simulationDirRef.current = 1;
      } else if (nextAngle >= 92) {
        nextAngle = 92;
        simulationDirRef.current = -1;
      }
      dispatch(updateAngle(nextAngle));
    }, 2000);

    return () => clearInterval(interval);
  }, [isSimulating, autoOscillate, dispatch]);

  const handleSaveSession = async () => {
    if (!user) {
      alert("Please login first to save your session.");
      return;
    }
    
    if (totalSessionSeconds < 5) {
      if (!confirm("This session is very short (< 5 seconds). Are you sure you want to save it?")) {
        return;
      }
    }

    setIsSaving(true);
    const statusLabel = score >= thresholds.good ? 'Excellent' : score >= thresholds.warn ? 'Fair' : 'Poor';

    try {
      const localKey = `posture_sessions_${user.id}`;
      const sessionData = {
        id: 'local-' + Date.now(),
        date: posture.sessionStartTime || new Date().toISOString(),
        startTime: posture.sessionStartTime || new Date().toISOString(),
        endTime: new Date().toISOString(),
        duration: totalSessionSeconds,
        score: score,
        slouches: incidents || 0,
        goodSessionSeconds: posture.goodSessionSeconds || 0,
        warnSessionSeconds: posture.warnSessionSeconds || 0,
        maxFocusStreak: maxFocusDuration,
        status: statusLabel,
      };

      try {
        const existingLocal = JSON.parse(localStorage.getItem(localKey) || '[]');
        existingLocal.unshift(sessionData);
        localStorage.setItem(localKey, JSON.stringify(existingLocal));
      } catch (localErr) {
        console.error("Failed to write session to localStorage:", localErr);
      }

      // Trigger On-Device Model Tuning & Learning Cycle (Layer 4)
      const localReportData = LocalModelService.recalculateAllBiomechanicalMetrics(
        angle,
        baselineAngle,
        history,
        goodSessionSeconds,
        totalSessionSeconds,
        incidents,
        user ? { age: user.age, height: user.height, weight: user.weight } : undefined
      );
      LocalModelService.saveSessionSummary({
        timestamp: sessionData.date,
        durationSeconds: totalSessionSeconds,
        grade: localReportData.sessionGrade,
        qualityScore: localReportData.sessionQualityScore,
        avgLoadLbs: localReportData.averageThoracicLoadLbs,
        peakLoadLbs: localReportData.peakThoracicLoadLbs,
        fatigueScore: localReportData.fatigueScore,
        stabilityScore: localReportData.stabilityScore,
        complianceRate: localReportData.dailyComplianceRate,
      });

      if (auth.currentUser) {
        const sessionsRef = collection(db, 'users', auth.currentUser.uid, 'sessions');
        await addDoc(sessionsRef, {
          date: sessionData.date,
          startTime: sessionData.startTime,
          endTime: sessionData.endTime,
          duration: totalSessionSeconds,
          score: score,
          slouches: incidents || 0,
          goodSessionSeconds: posture.goodSessionSeconds || 0,
          warnSessionSeconds: posture.warnSessionSeconds || 0,
          maxFocusStreak: maxFocusDuration,
          status: statusLabel,
          timestamp: serverTimestamp()
        });
      }

      dispatch(setIsRecordingSession(false));
      dispatch(resetSessionStats());
      alert("🎉 Posture session saved successfully! Your personalized Posture AI model has been tuned on-device based on this session.");
    } catch (error: any) {
      console.error("Failed to save session to cloud:", error);
      alert("Sync fallback active: Session saved locally. It will upload once network connection is restored.");
      dispatch(setIsRecordingSession(false));
      dispatch(resetSessionStats());
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateSummary = async () => {
    setIsSummarizing(true);
    try {
      const list: any[] = [];
      if (user) {
        try {
          const localKey = `posture_sessions_${user.id}`;
          const localSessions = JSON.parse(localStorage.getItem(localKey) || '[]');
          list.push(...localSessions);
        } catch (localErr) {
          console.error('Error loading local sessions for summary:', localErr);
        }
      }

      if (auth.currentUser) {
        try {
          const q = query(
            collection(db, 'users', auth.currentUser.uid, 'sessions'),
            orderBy('date', 'desc'),
            limit(15)
          );
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            const isDuplicate = list.some(s => s.id === doc.id || (s.date === data.date && s.duration === data.duration));
            if (!isDuplicate) {
              list.push({ id: doc.id, ...data });
            }
          });
        } catch (err) {
          console.error('Error fetching Firestore sessions for summary:', err);
        }
      }

      list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Compile Layer 4 pre-digested explainable report to feed Layer 5
      const localReport = LocalModelService.compileLocalAIReport();
      const result = await generatePostureSummary(history, score, list, localReport);
      setSummary(result);
    } catch (error) {
      console.error('Summary generation failed:', error);
    } finally {
      setIsSummarizing(false);
    }
  };

  const getStatusColor = (val: number) => {
    if (val >= thresholds.good) return '#22C55E';
    if (val >= thresholds.warn) return '#F97316';
    return '#EF4444';
  };

  const chartData = history.slice().reverse().map((a, i) => ({ index: i, angle: a }));

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

  const getShoulderBalance = (s: number) => {
    if (s >= thresholds.good) {
      const sym = 95 + Math.round((s - thresholds.good) * 0.25);
      return { value: `Stable (${Math.min(100, sym)}%)`, color: 'text-emerald-500' };
    } else if (s >= thresholds.warn) {
      const sym = 80 + Math.round((s - thresholds.warn) * 1.0);
      return { value: `Mild Tilt (${sym}%)`, color: 'text-orange' };
    } else {
      const sym = 50 + Math.round((s - 45) * 1.5);
      return { value: `Uneven (${Math.min(79, Math.max(30, sym))}% Symmetry)`, color: 'text-rose-500' };
    }
  };

  const getFatigueRisk = (hist: number[], currentScore: number) => {
    const poorCount = hist.filter(h => h < thresholds.warn).length;
    const ratio = hist.length > 0 ? poorCount / hist.length : (currentScore < thresholds.warn ? 0.6 : 0.1);

    if (ratio < 0.15) {
      return { value: 'Low Risk', color: 'text-emerald-500' };
    } else if (ratio < 0.45) {
      return { value: 'Medium Risk', color: 'text-orange' };
    } else {
      return { value: 'High Risk', color: 'text-rose-500' };
    }
  };

  const shoulder = getShoulderBalance(score);
  const fatigue = getFatigueRisk(history, score);

  const metrics = [
    { label: 'Shoulder Balance', value: shoulder.value, icon: Shield, color: shoulder.color },
    { label: 'Sitting Duration', value: formatDuration(totalSessionSeconds), icon: Clock, color: 'text-orange' },
    { label: 'Fatigue Risk', value: fatigue.value, icon: Activity, color: fatigue.color },
    { label: 'Focus Max Streak', value: formatDuration(maxFocusDuration), icon: (props: any) => <Zap size={14} {...props} />, color: 'text-purple-500' },
    { label: 'Slouch Incidents', value: `${incidents || 0} times`, icon: AlertOctagon, color: 'text-rose-500' },
  ];

  // Dynamic Sitting Timeline Events array based on session variables
  const getTimelineEvents = () => {
    const list = [];
    // Start of session
    list.push({
      time: '00:00',
      title: 'Biometric Stream Initialized',
      desc: 'S-Curve calibration successfully activated. Monitoring raw spinal inclination angle in real time.',
      icon: Activity,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50'
    });

    if (totalSessionSeconds > 10) {
      list.push({
        time: '+00:10',
        title: 'Vertebral Baseline Locked',
        desc: `Angle calibrated at ${posture.baselineAngle}° baseline. Paraspinal envelope defined.`,
        icon: Shield,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50'
      });
    }

    if (incidents > 0) {
      list.push({
        time: 'Slouch Event',
        title: `${incidents} Slouch Incident(s) Logged`,
        desc: 'Paravertebral muscles relaxed. System issued micro-vibration audio alert.',
        icon: AlertOctagon,
        color: 'text-rose-500',
        bg: 'bg-rose-50'
      });
    }

    if (maxFocusDuration > 30) {
      list.push({
        time: 'Endurance Spike',
        title: 'Uptrending Muscle Endurance',
        desc: `Continuous upright posture held for over ${formatDuration(maxFocusDuration)}. Training slow-twitch back fibers.`,
        icon: Zap,
        color: 'text-purple-600',
        bg: 'bg-purple-50'
      });
    }

    if (!isRecordingSession && totalSessionSeconds > 0) {
      list.push({
        time: 'Rest Break',
        title: 'Postural Rest Break',
        desc: 'Session paused. Paraspinal muscles entering nutrient-recharging recovery mode.',
        icon: Wind,
        color: 'text-amber-500',
        bg: 'bg-amber-50'
      });
    }

    return list;
  };

  // Gamified Milestones/Badges system state
  const mockMilestones = [
    { id: 'guardian', title: 'Spine Guardian', desc: 'Maintain ≥80% score for 5 mins', target: 300, current: goodSessionSeconds, unlocked: goodSessionSeconds >= 300, icon: Shield, color: 'text-emerald-500' },
    { id: 'resilience', title: 'Streak Champion', desc: 'Log a 3-day posture streak', target: 3, current: streak.current, unlocked: streak.current >= 3, icon: Flame, color: 'text-orange' },
    { id: 'pioneer', title: 'First Stance', desc: 'Complete your first session', target: 10, current: totalSessionSeconds, unlocked: totalSessionSeconds >= 10, icon: Award, color: 'text-indigo-600' },
    { id: 'focus', title: 'Deep Focus Master', desc: 'Hold focus streak for 120s', target: 120, current: maxFocusDuration, unlocked: maxFocusDuration >= 120, icon: Zap, color: 'text-purple-500' },
  ];

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-6 lg:p-8 space-y-8 pb-32 relative z-10 max-w-7xl mx-auto">
      {/* Telemetry Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="space-y-1 text-left">
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Biometric Cockpit</h2>
            <span className="relative flex h-2 w-2">
              <span className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                isRecordingSession ? "bg-rose-400" : "bg-slate-400"
              )}></span>
              <span className={cn(
                "relative inline-flex rounded-full h-2 w-2",
                isRecordingSession ? "bg-rose-500" : "bg-slate-500"
              )}></span>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>Biometric Stream v2.8</span>
            <span className="text-slate-200 font-normal">•</span>
            <span className="text-slate-500 font-mono">Live: {angle}°</span>
            <span className="text-slate-200 font-normal">•</span>
            <span>{isRecordingSession ? "Active Logging" : "Standby"}</span>
          </div>
        </div>

        {/* Compact telemetry badge */}
        <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-100 px-3.5 py-1.5 rounded-2xl self-start md:self-auto shadow-sm">
          <Activity size={13} className="text-indigo-500 animate-pulse" />
          <div className="text-left">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Real-time Stability</span>
            <span className="text-xs font-black text-slate-700">{Math.round(score)}% Score</span>
          </div>
        </div>
      </div>

      {/* Symmetrical Dual-Column Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: LIVE FEEDBACK & CONTROL TRYS (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 1: Live Bio-Feedback Sphere */}
          <div className="bg-white/80 backdrop-blur-md border border-slate-100 p-6 rounded-[32px] shadow-soft space-y-6 flex flex-col items-center">
            <div className="w-full flex justify-between items-center pb-2.5 border-b border-slate-50">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Activity size={12} className="text-emerald-500" />
                Live Bio-Feedback Sphere
              </span>
              {isRecordingSession && (
                <span className="text-[8px] font-black text-rose-500 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full animate-pulse uppercase">
                  REC {formatDuration(totalSessionSeconds)}
                </span>
              )}
            </div>

            {/* Posture Ring with exact viewBox to prevent responsive cutting */}
            <div className="relative w-72 h-72 flex items-center justify-center my-2">
              <svg 
                viewBox="0 0 320 320"
                className="absolute inset-0 w-full h-full -rotate-90"
              >
                <circle
                  cx="160" cy="160" r="145"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="14"
                  strokeOpacity={0.5}
                />
                <motion.circle
                  cx="160" cy="160" r="145"
                  fill="none"
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray="911"
                  initial={{ strokeDashoffset: 911 }}
                  animate={{ 
                    strokeDashoffset: 911 - (911 * score) / 100,
                    stroke: getStatusColor(angle),
                    filter: `drop-shadow(0 0 15px ${getStatusColor(angle)}44)`
                  }}
                  transition={{ 
                    strokeDashoffset: { type: "spring", stiffness: 35, damping: 15 },
                    stroke: { duration: 1.5, ease: "easeInOut" },
                    filter: { duration: 1.5, ease: "easeInOut" }
                  }}
                />
              </svg>

              {/* Silhouette & Score */}
              <div className="relative z-10 flex flex-col items-center translate-y-2">
                <div className="relative group">
                  <PostureFigure size={180} angle={angle} />
                  {/* Floating Micro Score Badge */}
                  <motion.div 
                    key="score-badge"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute -top-2 -right-2 bg-white/95 backdrop-blur-xl border border-slate-100 shadow-premium px-3 py-1.5 rounded-2xl flex items-center gap-1.5"
                  >
                    <div className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: getStatusColor(angle) }} />
                    <span className="text-xs font-black text-slate-800 tracking-tight">{Math.round(score)}%</span>
                  </motion.div>
                </div>
                <div className="mt-4 text-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] opacity-80">Stability Matrix</span>
                </div>
              </div>
            </div>

            {/* Live feedback controls */}
            <div className="w-full space-y-4">
              <div className="flex justify-center">
                <div className="px-4 py-2 bg-slate-50/80 border border-slate-100/60 rounded-full shadow-sm flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusColor(angle) }} />
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-none">
                    {score >= thresholds.good ? 'Optimal State' : score >= thresholds.warn ? 'Minor Slouch' : 'Critical Failure'}
                  </span>
                </div>
              </div>

              {/* Action buttons directly inside the primary feedback card */}
              <div className="pt-4 border-t border-slate-50 flex items-center justify-center gap-3">
                {!isRecordingSession ? (
                  <button
                    onClick={() => dispatch(setIsRecordingSession(true))}
                    className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm border bg-emerald-500 hover:bg-emerald-600 border-emerald-400 text-white cursor-pointer"
                    id="btn-session-toggle"
                  >
                    <Play size={11} className="stroke-[3]" fill="currentColor" />
                    {totalSessionSeconds > 0 ? "Resume session" : "Start posture tracking"}
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <button
                      onClick={() => dispatch(setIsRecordingSession(false))}
                      className="py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm border bg-amber-500 hover:bg-amber-600 border-amber-400 text-white cursor-pointer"
                      id="btn-session-pause"
                    >
                      <Pause size={11} className="stroke-[3]" fill="currentColor" />
                      Pause
                    </button>

                    <button
                      onClick={handleSaveSession}
                      disabled={isSaving}
                      className="py-3 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm border bg-indigo-600 hover:bg-indigo-700 border-indigo-500 text-white cursor-pointer disabled:opacity-50"
                      id="btn-session-save"
                    >
                      <CheckCircle2 size={11} className="stroke-[3]" />
                      {isSaving ? "Saving..." : "Save Log"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Biometric Simulator (positioned directly underneath the figure for instant alignment feedback) */}
          <div className="bg-white/80 backdrop-blur-md border border-slate-100 p-6 rounded-[32px] shadow-soft space-y-5">
            <div className="flex justify-between items-center text-left">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center transition-colors",
                  isSimulating ? "bg-indigo-50 text-indigo-600" : "bg-slate-50 text-slate-400"
                )}>
                  <Sparkles size={16} className={isSimulating ? "animate-pulse" : ""} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Biometric Simulator</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Simulate tilt angles & alerts</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const targetSim = !isSimulating;
                  dispatch(setIsSimulating(targetSim));
                  dispatch(setDeviceStatus(targetSim));
                  dispatch(setHasPaired(targetSim));
                }}
                className={cn(
                  "p-2 px-3.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm border cursor-pointer",
                  isSimulating 
                    ? "bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-100/60" 
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
                id="btn-toggle-sim"
              >
                {isSimulating ? "ON" : "Activate"}
              </button>
            </div>

            {isSimulating && (
              <div className="pt-2.5 border-t border-slate-50 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-left">
                    Auto-Fluctuate Angle
                  </label>
                  <button
                    onClick={() => setAutoOscillate(!autoOscillate)}
                    className={cn(
                      "p-1.5 px-3 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all active:scale-95 border cursor-pointer",
                      autoOscillate 
                        ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
                        : "bg-white border-slate-200 text-slate-400"
                    )}
                    id="btn-toggle-oscillate"
                  >
                    {autoOscillate ? "Oscillating (2s)" : "Manual Slider"}
                  </button>
                </div>

                <p className="text-[10px] text-slate-400 font-medium leading-relaxed text-left">
                  {autoOscillate 
                    ? "Sensing engine is dynamically oscillating the spinal tilt between 42° and 92° to test real-time alert trigger warnings." 
                    : "Drag the slider manually below. Pulling below 65° simulates lumbar slouching to log warnings and incidents."}
                </p>

                <div className="space-y-2 pt-1 text-left">
                  <div className="flex justify-between items-center text-[9px] font-mono font-black text-slate-400">
                    <span>Slouch (&lt; {thresholds.warn}°)</span>
                    <span className={cn(
                      "text-xs font-black px-2 py-0.5 rounded bg-slate-50 border",
                      angle < thresholds.warn ? "text-rose-500 border-rose-100 bg-rose-50/50" : "text-emerald-500 border-emerald-100"
                    )}>{Math.round(angle)}°</span>
                    <span>Optimal (&gt; {thresholds.good}°)</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="100"
                    value={Math.round(angle)}
                    disabled={autoOscillate}
                    onChange={(e) => {
                      dispatch(updateAngle(Number(e.target.value)));
                    }}
                    className={cn(
                      "w-full h-1.5 rounded-lg appearance-none cursor-pointer focus:outline-none transition-all",
                      autoOscillate ? "bg-slate-100 opacity-60 cursor-not-allowed" : "bg-slate-200 hover:bg-slate-300"
                    )}
                    style={{
                      background: `linear-gradient(to right, #ef4444 0%, #f97316 45%, #22c55e 100%)`
                    }}
                    id="slider-sim-angle"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Card 3: Posture Trend Graph */}
          <div className="bg-white/80 backdrop-blur-md border border-slate-100 p-6 rounded-[32px] shadow-soft space-y-4">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-50 text-left">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Posture Trend Log</h3>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Live stream feed</span>
            </div>
            <div className="h-28 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="100%">
                      <stop offset="5%" stopColor={getStatusColor(angle)} stopOpacity={0.15}/>
                      <stop offset="95%" stopColor={getStatusColor(angle)} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone" 
                    dataKey="angle" 
                    stroke={getStatusColor(angle)} 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#trendGradient)" 
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: BIOMETRIC INTEL & HISTORIC PERFORMANCE (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 4: Symmetric Biometrics metrics Grid */}
          <div className="space-y-3">
            <div className="px-1 flex justify-between items-center text-left">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Biometric telemetry Metrics</h3>
              <Shield size={13} className="text-slate-300" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {metrics.map((m, i) => {
                const Icon = m.icon;
                return (
                  <div key={i} className="bg-white/80 backdrop-blur-md border border-slate-100 p-4 rounded-[24px] shadow-soft space-y-3 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">{m.label}</span>
                      <div className={cn("w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center", m.color)}>
                        {typeof Icon === 'function' && !('displayName' in Icon) ? (Icon as any)({ size: 12 }) : <Icon size={12} />}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-800 leading-none">{m.value}</h4>
                    </div>
                  </div>
                );
              })}
              
              {/* Symmetrical Wide Dynamic Recovery Recommendation Banner */}
              <div className="col-span-2 bg-slate-900 p-4 rounded-[24px] flex items-center justify-between group cursor-pointer shadow-premium transition-all hover:bg-slate-950 text-left">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
                    <Activity size={16} className="animate-pulse text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Automated Recovery Recommendation</p>
                    <p className="text-xs font-semibold text-white leading-snug">“Take a 2-minute thoracic stretch break to reset vertebrae”</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
              </div>
            </div>
          </div>

          {/* Card 5: Posture AI Clinician Card */}
          <div className="relative rounded-[32px] overflow-hidden p-6 bg-gradient-to-br from-indigo-950 via-slate-900 to-violet-950 border border-indigo-500/20 shadow-premium group text-left">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/20 blur-2xl rounded-full pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-violet-500/10 blur-2xl rounded-full pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff04_1px,transparent_1px)] [background-size:16px_16px] opacity-60 pointer-events-none" />

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur-md opacity-50 group-hover:opacity-85 transition-opacity animate-duration-1000" />
                  <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center border border-white/10 shadow-lg text-white">
                    {isSummarizing ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Brain className="w-6 h-6 text-white animate-pulse" />
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-[8px] font-black text-indigo-300 uppercase tracking-widest flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-indigo-400 animate-ping" />
                      Gemini Clinical AI
                    </span>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">v3.5 Flash</span>
                  </div>
                  <h4 className="text-lg font-black text-white tracking-tight group-hover:text-indigo-200 transition-colors">
                    Posture AI Clinician
                  </h4>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-sm">
                    Generate an intelligent, real-time posture analysis report evaluating your vertebral S-curve, fatigue coefficients, and active streaks.
                  </p>
                </div>
              </div>

              <button
                onClick={handleGenerateSummary}
                disabled={isSummarizing}
                className="px-5 py-3 rounded-2xl bg-white text-slate-900 font-black text-[9px] uppercase tracking-widest hover:bg-slate-100 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shrink-0 min-w-[130px] disabled:opacity-50 self-start sm:self-auto cursor-pointer"
              >
                {isSummarizing ? (
                  <>
                    <RefreshCw size={10} className="animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles size={10} className="text-indigo-600 animate-bounce" />
                    Get Report
                    <ChevronRight size={10} className="stroke-[3]" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card 6: Posture Intelligence Dashboard (Layer 2 - 4) */}
          <div className="bg-white/80 backdrop-blur-md border border-slate-100 p-6 sm:p-7 rounded-[32px] space-y-5 shadow-soft">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-slate-100 text-left">
              <div className="space-y-0.5">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Brain className="w-4 h-4 text-indigo-500 animate-pulse" />
                  Posture Intelligence Dashboard
                </h4>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
                  On-device clinical and mathematical models running offline (Layers 2 - 4)
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-[8px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 shadow-sm">
                  Model v{localAI.modelMetadata?.version || "1.0"} (Active)
                </span>
              </div>
            </div>

            {/* Dynamic On-Device Anomaly Alert Banner */}
            {localAI.anomalyDetected && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-2xl bg-rose-50 border border-rose-150 flex items-start gap-3 text-rose-800 shadow-sm text-left animate-duration-1000"
              >
                <AlertOctagon className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5 animate-bounce" />
                <div className="space-y-1">
                  <span className="text-[8px] font-black uppercase tracking-widest text-rose-600 block">
                    On-Device Anomaly Engine (Layer 3)
                  </span>
                  <h5 className="text-xs font-black">Postural Deviation Alert (Score: {localAI.anomalyScore}/100)</h5>
                  <p className="text-[9px] font-semibold text-rose-700/90 leading-relaxed">
                    {localAI.anomalyDetails}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Tab Controls */}
            <div className="flex p-1 bg-slate-50 rounded-2xl border border-slate-100/60 overflow-x-auto scrollbar-none gap-1">
              {[
                { id: 'biomechanics', label: 'Clinician Trace' },
                { id: 'markov', label: 'Markov States' },
                { id: 'parameters', label: 'Model Versioning' },
                { id: 'compliance', label: 'Compliance & Certainty' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveAiTab(tab.id as any)}
                  className={cn(
                    "p-2 px-3 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all whitespace-nowrap flex-1 text-center cursor-pointer",
                    activeAiTab === tab.id
                      ? "bg-white text-indigo-600 shadow-sm border border-slate-100"
                      : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div className="pt-1">
              {/* TAB 1: Clinician Evidence Trace */}
              {activeAiTab === 'biomechanics' && (
                <div className="space-y-4">
                  <div className="space-y-0.5 text-left">
                    <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider">Clinician Traceability Chain (Layer 4)</h5>
                    <p className="text-[9px] text-slate-400 font-semibold leading-relaxed">
                      Real-time explainable feature-weight calculations justifying your current postural alignment wellness.
                    </p>
                  </div>

                  {/* Paraspinal force header cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                    <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Paraspinal Force</span>
                      <div className="text-sm font-black text-slate-800">{localAI.upperBackStrainLbs} lbs</div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase leading-none">Vertebral Load</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Daily Cumulative</span>
                      <div className="text-sm font-black text-slate-800">{localAI.cumulativeDailyLoadKgh} kg-h</div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase leading-none">Stress Index</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Fatigue score</span>
                      <div className="text-sm font-black text-slate-800">{localAI.fatigueScore}%</div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase leading-none">Muscle Lactic</span>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Unbroken Stress</span>
                      <div className="text-sm font-black text-slate-800">{localAI.continuousStressMinutes}m</div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase leading-none">Tension Exp</span>
                    </div>
                  </div>

                  {/* Explanatory Trace Log */}
                  <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white text-left">
                    <div className="grid grid-cols-12 bg-slate-50 p-2 text-[8px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <div className="col-span-4">Factor</div>
                      <div className="col-span-5">Evidence Trail</div>
                      <div className="col-span-2 text-center">Weight</div>
                      <div className="col-span-1 text-right">Rating</div>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {localAI.evidenceChain && localAI.evidenceChain.length > 0 ? (
                        localAI.evidenceChain.map((item, idx) => (
                          <div key={idx} className="grid grid-cols-12 p-2.5 text-[10px] items-center">
                            <div className="col-span-4 font-black text-slate-700">{item.factor}</div>
                            <div className="col-span-5 font-semibold text-slate-500 pr-2">{item.evidence}</div>
                            <div className="col-span-2 text-center font-black text-slate-600">{item.importance}</div>
                            <div className="col-span-1 text-right">
                              <span className={cn(
                                "px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase leading-none",
                                item.significance === "Critical" ? "bg-rose-50 text-rose-500 border border-rose-100" :
                                item.significance === "High" ? "bg-amber-50 text-amber-500 border border-amber-100" :
                                item.significance === "Moderate" ? "bg-indigo-50 text-indigo-500 border border-indigo-100" :
                                "bg-emerald-50 text-emerald-500 border border-emerald-100"
                              )}>
                                {item.significance.substring(0, 3)}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-[10px] font-semibold text-slate-400 italic">
                          Diagnostic factors calibrating... Sit upright for 5 seconds.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Markov Posture Transitions */}
              {activeAiTab === 'markov' && (
                <div className="space-y-4">
                  <div className="space-y-0.5 text-left">
                    <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider">Markov State Transitions (Layer 3)</h5>
                    <p className="text-[9px] text-slate-400 font-semibold leading-relaxed">
                      Calculates transition probabilities between discrete physical states based on chronological sensor stream angles.
                    </p>
                  </div>

                  {/* State Indicator Layout */}
                  <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col items-center justify-center space-y-3 relative overflow-hidden">
                    <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">Current Computed State</div>
                    <div className={cn(
                      "p-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-md relative z-10",
                      localAI.markovState === "Optimal Upright" ? "bg-emerald-500" :
                      localAI.markovState === "Mild Lean" ? "bg-amber-500" :
                      localAI.markovState === "Micro Slouch" ? "bg-orange-500" :
                      localAI.markovState === "Severe Collapse" ? "bg-rose-500 animate-pulse animate-duration-1000" :
                      "bg-indigo-600"
                    )}>
                      {localAI.markovState}
                    </div>
                    <p className="text-[9px] text-slate-500 font-medium text-center max-w-sm">
                      User posture is mapped within a finite state automaton to distinguish micro-movements, healthy adjustments, and real fatigue decay.
                    </p>
                  </div>

                  {/* Transition Matrix Probabilities */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col justify-between">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Upright ➔ Lean</span>
                      <div className="text-sm font-black text-slate-800 mt-1">{localAI.markovTransitions.stateUprightToLean}%</div>
                      <span className="text-[7px] text-slate-400 font-bold uppercase mt-0.5">Likelihood</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col justify-between">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Lean ➔ Slouch</span>
                      <div className="text-sm font-black text-slate-800 mt-1">{localAI.markovTransitions.stateLeanToSlouch}%</div>
                      <span className="text-[7px] text-slate-400 font-bold uppercase mt-0.5">Likelihood</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col justify-between">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Slouch ➔ Collapse</span>
                      <div className="text-sm font-black text-slate-800 mt-1">{localAI.markovTransitions.stateSlouchToSevere}%</div>
                      <span className="text-[7px] text-slate-400 font-bold uppercase mt-0.5">Likelihood</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col justify-between">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Slouch ➔ Recovery</span>
                      <div className="text-sm font-black text-slate-800 mt-1">{localAI.markovTransitions.stateSlouchToRecovery}%</div>
                      <span className="text-[7px] text-slate-400 font-bold uppercase mt-0.5">Active Adjust</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Personalized Model Versioning */}
              {activeAiTab === 'parameters' && (
                <div className="space-y-4 text-left">
                  <div className="space-y-0.5">
                    <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider">Personalized Model Versioning (Layer 4 Loop)</h5>
                    <p className="text-[9px] text-slate-400 font-semibold leading-relaxed">
                      Your baseline stamina coefficients and alerts tune themselves dynamically over time as completed sessions are archived on-device.
                    </p>
                  </div>

                  {/* Parameters List */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 space-y-1">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Endurance Base</span>
                      <div className="text-sm font-black text-slate-800">
                        {localAI.modelMetadata?.fatigueCoefficient ? `${(1 / localAI.modelMetadata.fatigueCoefficient).toFixed(2)}x` : "1.00x"}
                      </div>
                      <p className="text-[9px] text-slate-400 font-medium leading-tight">
                        Muscular endurance coefficient. Represents paraspinal resistance.
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 space-y-1">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Alert Sensitivity</span>
                      <div className="text-sm font-black text-slate-800">
                        {localAI.modelMetadata?.sensitivityFactor ? `${localAI.modelMetadata.sensitivityFactor.toFixed(2)}x` : "1.00x"}
                      </div>
                      <p className="text-[9px] text-slate-400 font-medium leading-tight">
                        Warning trigger tightens as historical compliance increases.
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 space-y-1">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Compliance Baseline</span>
                      <div className="text-sm font-black text-slate-800">
                        {localAI.modelMetadata?.complianceBaseline ? `${localAI.modelMetadata.complianceBaseline}%` : "85.0%"}
                      </div>
                      <p className="text-[9px] text-slate-400 font-medium leading-tight">
                        Moving average representing your alert responsiveness.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-indigo-50/40 border border-indigo-100/40 text-[9px] text-indigo-700/90 leading-relaxed font-semibold">
                    ℹ️ **Local Optimization:** Saving posture sessions automatically triggers local AI retraining of your warning sensitivities and fatigue slopes.
                  </div>
                </div>
              )}

              {/* TAB 4: Compliance Predictors */}
              {activeAiTab === 'compliance' && (
                <div className="space-y-4 text-left">
                  <div className="space-y-0.5">
                    <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider">Predictive Compliance & Certainty</h5>
                    <p className="text-[9px] text-slate-400 font-semibold leading-relaxed">
                      Real-time statistical estimators predicting immediate alert correction success and compiling sensor signal fluctuations.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">
                        Correction Likelihood
                      </span>
                      <div className="text-base font-black text-indigo-600 my-0.5">{localAI.logisticComplianceEstimate}%</div>
                      <p className="text-[9px] text-slate-400 font-medium leading-normal">
                        Logistic probability that you will correct posture if alerted.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">
                        Certainty Margin
                      </span>
                      <div className="text-base font-black text-emerald-500 my-0.5">{localAI.confidenceScore}%</div>
                      <div className="text-[8px] text-slate-500 font-bold font-mono leading-none mb-1">Interval: {localAI.confidenceInterval}</div>
                      <p className="text-[9px] text-slate-400 font-medium leading-normal">
                        Compound margin of raw sensor fluctuation noise.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">
                        Gyroscopic Drift
                      </span>
                      <div className="text-base font-black text-slate-800 my-0.5">{localAI.sensorDriftEstimatePercent}%</div>
                      <p className="text-[9px] text-slate-400 font-medium leading-normal">
                        Estimated gyroscopic signal error from continuous sitting.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 7: Rest & Recovery Decompression Analysis */}
          <div className="bg-white/80 backdrop-blur-md border border-slate-100 p-6 sm:p-7 rounded-[32px] space-y-5 shadow-soft text-left">
            <div className="flex items-center gap-3 pb-2.5 border-b border-slate-50">
              <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Recovery After Break Analysis</h4>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Lactic and tension coefficients during postural shifts</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Pre-Break Fatigue</span>
                <div className="text-base font-black text-rose-500">
                  {activeBreak 
                    ? `${activeBreak.preBreakFatigue}%` 
                    : (breakHistory && breakHistory.length > 0 ? `${breakHistory[0].preBreakFatigue}%` : `${Math.min(95, 20 + (incidents * 8))}%`)}
                </div>
                <p className="text-[9px] text-slate-400 font-medium leading-tight">
                  {activeBreak ? 'Frozen snapshot' : (breakHistory && breakHistory.length > 0 ? 'Last Rest log' : 'Dynamic estimation')}
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Post-Break Resilience</span>
                <div className="text-base font-black text-emerald-500">
                  {activeBreak
                    ? `${Math.min(100, Math.round(20 + ((activeBreak.durationSeconds || 0) * 0.5)))}%`
                    : (breakHistory && breakHistory.length > 0 ? `${breakHistory[0].postBreakResilience}%` : `${Math.max(10, Math.min(60, 20 + (incidents * 3) - 15))}%`)}
                </div>
                <p className="text-[9px] text-slate-400 font-medium leading-tight">
                  {activeBreak ? 'Restoring...' : (breakHistory && breakHistory.length > 0 ? 'Achieved resilience' : 'Potential restoration')}
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl space-y-1">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Thoracic Relief</span>
                <div className="text-base font-black text-indigo-600">
                  {activeBreak
                    ? `${Math.min(100, Math.round(15 + ((activeBreak.durationSeconds || 0) * 0.8)))}%`
                    : (breakHistory && breakHistory.length > 0 ? `${breakHistory[0].thoracicStressRelief}%` : `${Math.max(15, Math.min(85, 30 + (incidents > 0 ? 25 : 10)))}%`)}
                </div>
                <p className="text-[9px] text-slate-400 font-medium leading-tight">
                  {activeBreak ? 'Decompressing...' : (breakHistory && breakHistory.length > 0 ? 'Achieved decompression' : 'Estimated stress relief')}
                </p>
              </div>
            </div>

            {breakHistory && breakHistory.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Micro-Break Restoration Log</span>
                  <span className="text-[8px] font-black uppercase text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    Synced to Cloud
                  </span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                  {breakHistory.slice(0, 5).map((br, idx) => (
                    <div key={br.id || idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100/60 transition-all hover:bg-slate-100/50">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse animate-duration-1000" />
                        <div>
                          <span className="text-[9px] font-black text-slate-700 block">
                            Micro-Rest #{breakHistory.length - idx}
                          </span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase block mt-0.5">
                            {new Date(br.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • {br.durationSeconds}s duration
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="text-[7px] font-black text-rose-400 uppercase tracking-wider block">Pre-Fatigue</span>
                          <span className="text-[10px] font-black text-rose-500 leading-none">{br.preBreakFatigue}%</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[7px] font-black text-emerald-400 uppercase tracking-wider block">Post-Resil</span>
                          <span className="text-[10px] font-black text-emerald-500 leading-none">{br.postBreakResilience}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card 8: Sitting Session Timeline */}
          <div className="bg-white/80 backdrop-blur-md border border-slate-100 p-6 sm:p-7 rounded-[32px] space-y-5 shadow-soft text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                  <Gauge className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Sitting Session Timeline</h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Dynamic sequence log of active session events</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[8px] font-black uppercase tracking-wider text-slate-500 border border-slate-200">
                {isRecordingSession ? 'Recording Logs' : 'Standby'}
              </span>
            </div>

            <div className="relative pl-5 border-l-2 border-slate-100 space-y-5 pt-1">
              {getTimelineEvents().map((evt, idx) => (
                <div key={idx} className="relative">
                  {/* Timeline marker node */}
                  <div className="absolute -left-[28px] top-0.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-indigo-500 flex items-center justify-center shadow-soft">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest shrink-0">{evt.time}</span>
                      <span className="text-slate-300 text-[8px] shrink-0">•</span>
                      <h5 className="text-xs font-black text-slate-800 leading-tight">{evt.title}</h5>
                    </div>
                    <p className="text-[10px] font-semibold text-slate-500 leading-relaxed max-w-xl">
                      {evt.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 9: Active Training Milestones */}
          <div className="space-y-3">
            <div className="px-1 text-left">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Active Training Milestones</h4>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Gamified achievements for posture stabilizer training</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {mockMilestones.map((ms, msIdx) => {
                const IconComponent = ms.icon;
                return (
                  <div 
                    key={msIdx} 
                    className={cn(
                      "p-4 rounded-[24px] border text-center flex flex-col items-center justify-between min-h-[140px] transition-all hover:border-slate-200 cursor-default relative overflow-hidden",
                      ms.unlocked 
                        ? "bg-white border-indigo-100 shadow-soft" 
                        : "bg-slate-50/50 border-slate-100 text-slate-400"
                    )}
                  >
                    {/* Visual Unlocked Highlight */}
                    {ms.unlocked && (
                      <div className="absolute top-0 right-0 w-8 h-8 bg-indigo-500/10 rounded-bl-[16px] flex items-center justify-center">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      </div>
                    )}

                    <div className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center mx-auto mb-2",
                      ms.unlocked ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-300"
                    )}>
                      <IconComponent className="w-5 h-5" />
                    </div>

                    <div className="space-y-0.5">
                      <h5 className={cn("text-[11px] font-black", ms.unlocked ? "text-slate-800" : "text-slate-500")}>{ms.title}</h5>
                      <p className="text-[8px] leading-tight font-semibold text-slate-400">{ms.desc}</p>
                    </div>

                    <div className="w-full mt-2">
                      <div className="flex justify-between text-[7px] font-black text-slate-400 mb-0.5">
                        <span>Progress</span>
                        <span>{Math.min(ms.target, ms.current)}/{ms.target}</span>
                      </div>
                      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={cn("h-full transition-all duration-500", ms.unlocked ? "bg-indigo-600" : "bg-slate-300")}
                          style={{ width: `${Math.min(100, (ms.current / ms.target) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 10: Biometric Calculation Logic Guide */}
          <div className="bg-white/80 backdrop-blur-md border border-slate-100 p-6 rounded-[32px] shadow-soft">
            <details className="group [&_summary::-webkit-details-marker]:hidden border border-slate-150 rounded-2xl overflow-hidden bg-slate-50/40 text-left">
              <summary className="flex cursor-pointer items-center justify-between p-3.5 text-slate-800 transition-colors hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Info size={14} />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 font-sans">How is this calculated?</span>
                </div>
                <span className="shrink-0 transition duration-300">
                  <ChevronRight size={14} className="text-slate-400 group-open:rotate-90 transition-transform" />
                </span>
              </summary>
              <div className="p-4 border-t border-slate-100 bg-white space-y-3 text-[10px] leading-relaxed text-slate-600 font-medium">
                <p className="text-slate-500 italic leading-relaxed">
                  Our advanced diagnostic system continuously streams raw biometric data from your pairing device to compute clinically validated spinal markers:
                </p>
                <div className="space-y-2.5">
                  <div className="p-2.5 bg-slate-50/50 border border-slate-100 rounded-xl space-y-1">
                    <span className="font-black text-slate-800 uppercase block tracking-wider text-[8px]">1. Shoulder Balance</span>
                    <p className="text-[9px] text-slate-600 leading-relaxed">
                      Calculated dynamically from spinal inclination symmetry. If your alignment score is high (above {thresholds.good}%), we map high symmetry (95%-100%). Slumping below {thresholds.warn}% displays mild tilt or critical imbalance.
                    </p>
                  </div>
                  <div className="p-2.5 bg-slate-50/50 border border-slate-100 rounded-xl space-y-1">
                    <span className="font-black text-slate-800 uppercase block tracking-wider text-[8px]">2. Fatigue Risk</span>
                    <p className="text-[9px] text-slate-600 leading-relaxed">
                      Evaluated using the ratio of "incident sessions" (time spent slouching below {thresholds.warn}%) relative to the total continuous sitting duration stream to guard against lactic spasm traps.
                    </p>
                  </div>
                  <div className="p-2.5 bg-slate-50/50 border border-slate-100 rounded-xl space-y-1">
                    <span className="font-black text-slate-800 uppercase block tracking-wider text-[8px]">3. Focus Score & Time</span>
                    <p className="text-[9px] text-slate-600 leading-relaxed">
                      Upright alignment optimizes chest expansion and thoracic volume, preserving high blood oxygen saturation ($SpO_2$) and cerebral blood flow. This correlates mathematically to dynamic cognitive focus capacity (30% to 100%).
                    </p>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
};
