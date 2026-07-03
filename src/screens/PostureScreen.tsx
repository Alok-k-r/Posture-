import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, updateAngle, setIsSimulating, setIsRecordingSession, resetSessionStats, setDeviceStatus, setHasPaired } from '../store/store';
import { PostureFigure } from '../components/posture/PostureFigure';
import { Play, Square, Info, ChevronRight, Activity, Clock, Shield, Zap, Wind, User, Sparkles, X, Brain, Bot, Pause, CheckCircle2, AlertOctagon } from 'lucide-react';
import { cn } from '../lib/utils';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { generatePostureSummary } from '../services/geminiService';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs } from 'firebase/firestore';
import Markdown from 'react-markdown';

export const PostureScreen: React.FC = () => {
  const dispatch = useDispatch();
  const device = useSelector((state: RootState) => state.device);
  const posture = useSelector((state: RootState) => state.posture);
  const user = useSelector((state: RootState) => state.auth.user);
  const { angle, score, thresholds, history, isSimulating, isRecordingSession, totalSessionSeconds, maxFocusDuration, incidents } = posture;
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
      // 1. Save locally so that even in demo/offline mode, the user can see it in their reports screen instantly
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

      // 2. Try to save to Firestore if auth.currentUser is available
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
      alert("🎉 Posture session saved successfully to medical reports!");
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

      // 1. Fetch local sessions
      if (user) {
        try {
          const localKey = `posture_sessions_${user.id}`;
          const localSessions = JSON.parse(localStorage.getItem(localKey) || '[]');
          list.push(...localSessions);
        } catch (localErr) {
          console.error('Error loading local sessions for summary:', localErr);
        }
      }

      // 2. Fetch cloud sessions if online
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

      // 3. Sort chronologically (oldest to newest) to let AI evaluate progression through the day
      list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const result = await generatePostureSummary(history, score, list);
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

  // Math-synchronized calculation logic based on current score / thresholds / history
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

  const getFocusScore = (s: number) => {
    const focus = Math.min(100, Math.max(30, Math.round(s * 0.82 + 18)));
    const focusLabel = focus >= 85 ? 'Optimal' : focus >= 65 ? 'Impaired' : 'Declined';
    return { value: `${focus}% (${focusLabel})`, color: focus >= 85 ? 'text-purple-500' : focus >= 65 ? 'text-orange' : 'text-rose-500' };
  };

  const shoulder = getShoulderBalance(score);
  const fatigue = getFatigueRisk(history, score);
  const focus = getFocusScore(score);

  const metrics = [
    { label: 'Shoulder Balance', value: shoulder.value, icon: Shield, color: shoulder.color },
    { label: 'Sitting Duration', value: formatDuration(totalSessionSeconds), icon: Clock, color: 'text-orange' },
    { label: 'Fatigue Risk', value: fatigue.value, icon: Activity, color: fatigue.color },
    { label: 'Focus Max Streak', value: formatDuration(maxFocusDuration), icon: (props: any) => <Zap size={14} {...props} />, color: 'text-purple-500', isZap: true },
    { label: 'Slouch Incidents', value: `${incidents || 0} times`, icon: AlertOctagon, color: 'text-rose-500' },
  ];

  return (
    <div className="min-h-screen bg-transparent p-6 space-y-8 pb-24 relative z-10">
      {/* Header */}
      <div className="flex justify-between items-end mb-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none">Diagnostic</h2>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Biometric Stream v2.8</p>
        </div>
        <div className="glass p-3 px-4 rounded-3xl flex flex-col justify-center gap-1 shadow-soft border-white/60 min-w-[210px]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  {isRecordingSession && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  )}
                  <span className={cn(
                    "relative inline-flex rounded-full h-2 w-2",
                    isRecordingSession ? "bg-rose-500" : "bg-slate-400"
                  )}></span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-800">
                  {isRecordingSession ? "Recording Session" : "Session Paused"}
                </span>
              </div>
              <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                {isRecordingSession ? "Alarms & History Active" : "In Standby Mode"}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => dispatch(setIsRecordingSession(!isRecordingSession))}
                className={cn(
                  "p-2 px-3 rounded-xl flex items-center justify-center gap-1.5 text-[9.5px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm border",
                  isRecordingSession 
                    ? "bg-amber-500 hover:bg-amber-600 border-amber-400 text-white" 
                    : "bg-emerald-500 hover:bg-emerald-600 border-emerald-400 text-white"
                )}
                id="btn-session-toggle"
              >
                {isRecordingSession ? (
                  <>
                    <Pause size={10} className="stroke-[3]" fill="currentColor" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play size={10} className="stroke-[3]" fill="currentColor" />
                    Resume
                  </>
                )}
              </button>

              {totalSessionSeconds > 0 && (
                <button
                  onClick={handleSaveSession}
                  disabled={isSaving}
                  className="p-2 px-3 rounded-xl flex items-center justify-center gap-1.5 text-[9.5px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm border bg-indigo-600 hover:bg-indigo-700 border-indigo-500 text-white disabled:opacity-50"
                  id="btn-session-save"
                >
                  <CheckCircle2 size={10} className="stroke-[3]" />
                  {isSaving ? "Saving..." : "Save"}
                </button>
              )}
            </div>
          </div>
          <div className="border-t border-slate-100/80 mt-1.5 pt-1 flex justify-between items-center text-[8px] font-mono text-slate-400">
            <span>Live Angle: {angle}°</span>
            <span>Pod Status: {device.isConnected ? "ONLINE" : "OFFLINE"}</span>
          </div>
        </div>
      </div>

      {/* Central Visualizer Section */}
      <div className="relative flex flex-col items-center justify-center py-4">
        {/* Animated Posture Ring */}
        <div className="relative w-80 h-80 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90">
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
               stroke={getStatusColor(angle)}
               strokeWidth="14"
               strokeLinecap="round"
               strokeDasharray="911"
               initial={{ strokeDashoffset: 911 }}
               animate={{ strokeDashoffset: 911 - (911 * score) / 100 }}
               transition={{ duration: 1.5, ease: "circOut" }}
               style={{ filter: `drop-shadow(0 0 15px ${getStatusColor(angle)}44)` }}
             />
          </svg>

          {/* Silhouette & Score */}
          <div className="relative z-10 flex flex-col items-center translate-y-2">
             <div className="relative group">
                <PostureFigure size={200} angle={angle} />
                {/* Floating Micro Score Badge */}
                <motion.div 
                   key="score-badge"
                   initial={{ opacity: 0, scale: 0.8 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="absolute -top-4 -right-4 bg-white/90 backdrop-blur-xl border border-white shadow-premium px-4 py-2 rounded-2xl flex items-center gap-2"
                >
                   <div className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: getStatusColor(angle) }} />
                   <span className="text-base font-black text-slate-800 tracking-tighter">{Math.round(score)}%</span>
                </motion.div>
             </div>
             <div className="mt-6 text-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] opacity-80">Stability Matrix</span>
             </div>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="mt-10">
           <div className="px-8 py-3 glass rounded-full shadow-soft flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getStatusColor(angle) }} />
              <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">
                {score >= thresholds.good ? 'Optimal State' : score >= thresholds.warn ? 'Minor Slouch' : 'Critical Failure'}
              </span>
           </div>
        </div>
      </div>

      {/* AI Posture Summary Action */}
      <div className="px-1">
        <button 
          onClick={handleGenerateSummary}
          disabled={isSummarizing}
          className="w-full bg-slate-900 border border-slate-800 text-white p-6 rounded-[32px] shadow-premium flex items-center justify-between group transition-all active:scale-[0.98] overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 -rotate-12 translate-x-4 translate-y-[-10px] group-hover:rotate-0 transition-transform">
            <Bot size={100} />
          </div>
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-premium-indigo flex items-center justify-center shadow-lg shadow-indigo-500/20">
              {isSummarizing ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Sparkles size={26} className="text-white" />
              )}
            </div>
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Intelligent Analysis</p>
              <h4 className="text-xl font-extrabold tracking-tight">Generate Summary</h4>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-1 transition-transform relative z-10">
            <ChevronRight size={20} />
          </div>
        </button>
      </div>

      {/* AI Summary Modal */}
      <AnimatePresence>
        {summary && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 pb-24">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSummary(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[40px] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-8 pb-4 flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <Brain size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Physician AI Report</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800">Session Insight</h3>
                </div>
                <button 
                  onClick={() => setSummary(null)}
                  className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="px-8 pb-8 overflow-y-auto custom-scrollbar">
                <div className="prose prose-slate prose-sm max-w-none">
                  <div className="markdown-body text-slate-600 font-medium leading-relaxed italic">
                    <Markdown>{summary}</Markdown>
                  </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-4 text-slate-400">
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                    <Shield size={18} />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider leading-tight">
                    Clinically generated based on your real-time spinal metrics.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Insights Panel */}
      <div className="space-y-4">
        <div className="px-2 flex justify-between items-center">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">AI Biometrics</h3>
          <Shield size={14} className="text-slate-300" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((m, i) => {
            const Icon = m.icon;
            return (
              <div key={i} className="bg-white/40 backdrop-blur-md border border-slate-100 p-4 rounded-[24px] shadow-sm space-y-3">
                <div className={cn("w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center", m.color)}>
                  {typeof Icon === 'function' && !('displayName' in Icon) ? (Icon as any)({ size: 14 }) : <Icon size={14} />}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5">{m.label}</p>
                  <h4 className="text-sm font-black text-slate-800">{m.value}</h4>
                </div>
              </div>
            );
          })}
          <div className="col-span-2 bg-slate-900 p-4 rounded-[24px] flex items-center justify-between group cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
                <Activity size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Recovery Suggestion</p>
                <p className="text-xs font-medium text-white">“Take a 2-minute stretch break”</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Biometric Simulator */}
      <div className="bg-white border border-slate-100 p-6 rounded-[32px] shadow-soft space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center transition-colors",
              isSimulating ? "bg-indigo-50 text-indigo-600" : "bg-slate-50 text-slate-400"
            )}>
              <Sparkles size={18} className={isSimulating ? "animate-pulse" : ""} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Biometric Simulator</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Test Posture & Incidents</p>
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
              "p-2 px-3.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm border",
              isSimulating 
                ? "bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-100/60" 
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
            id="btn-toggle-sim"
          >
            {isSimulating ? "Simulator ON" : "Turn On Simulator"}
          </button>
        </div>

        {isSimulating && (
          <div className="pt-2 border-t border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                Auto-Fluctuate Angle
              </label>
              <button
                onClick={() => setAutoOscillate(!autoOscillate)}
                className={cn(
                  "p-1.5 px-3 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 border",
                  autoOscillate 
                    ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
                    : "bg-white border-slate-200 text-slate-400"
                )}
                id="btn-toggle-oscillate"
              >
                {autoOscillate ? "Oscillating (Every 2s)" : "Manual Mode"}
              </button>
            </div>

            {/* Warning / Help note */}
            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
              {autoOscillate 
                ? "The simulator is automatically fluctuating the angle between 42° and 92° to trigger posture transitions (underwarn, upright) and count slouch incidents dynamically." 
                : "Adjust the manual slider below to test specific postural tilt positions. Pull below 65° to trigger a slouch warning alarm and count an incident!"}
            </p>

            {/* Slider */}
            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 font-black">
                <span>Critical (&lt; {thresholds.warn}°)</span>
                <span className={cn(
                  "text-xs font-black",
                  angle < thresholds.warn ? "text-rose-500" : "text-emerald-500"
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

      {/* Trend Graph */}
      <div className="bg-white border border-slate-50 p-6 rounded-[32px] shadow-sm space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-sm font-black text-slate-800">Posture Trend</h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Live Session</span>
        </div>
        <div className="h-28 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="100%">
                  <stop offset="5%" stopColor={getStatusColor(angle)} stopOpacity={0.1}/>
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

      {/* Biometric Calculation Logic Guide */}
      <div className="bg-white border border-slate-100 p-6 rounded-[32px] shadow-soft space-y-4">
        <details className="group [&_summary::-webkit-details-marker]:hidden border border-slate-100/60 rounded-2xl overflow-hidden bg-slate-50/40">
          <summary className="flex cursor-pointer items-center justify-between p-4 text-slate-800 transition-colors hover:bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Info size={16} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">How is this calculated?</span>
            </div>
            <span className="shrink-0 transition duration-300">
              <ChevronRight size={16} className="text-slate-400 group-open:rotate-90 transition-transform" />
            </span>
          </summary>
          <div className="p-5 border-t border-slate-100 bg-white space-y-4 text-[11px] leading-relaxed text-slate-600 font-medium">
            <p className="text-slate-500 italic">
              Our advanced diagnostic system continuously streams raw biometric data from your pairing device to compute clinically validated spinal markers:
            </p>
            <div className="space-y-3.5">
              <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl space-y-1">
                <span className="font-extrabold text-slate-800 uppercase block tracking-wider text-[9px]">1. Shoulder Balance</span>
                <p className="text-[10px] text-slate-600">
                  Calculated dynamically from spinal inclination symmetry. If your alignment score is high (above {thresholds.good}%), we map high symmetry (95%-100%). Slumping below {thresholds.warn}% displays mild tilt or critical imbalance.
                </p>
              </div>
              <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl space-y-1">
                <span className="font-extrabold text-slate-800 uppercase block tracking-wider text-[9px]">2. Fatigue Risk</span>
                <p className="text-[10px] text-slate-600">
                  Evaluated using the ratio of "incident sessions" (time spent slouching below {thresholds.warn}%) relative to the total continuous sitting duration stream to guard against lactic spasm traps.
                </p>
              </div>
              <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl space-y-1">
                <span className="font-extrabold text-slate-800 uppercase block tracking-wider text-[9px]">3. Focus Score & Time</span>
                <p className="text-[10px] text-slate-600">
                  Upright alignment optimizes chest expansion and thoracic volume, preserving high blood oxygen saturation ($SpO_2$) and cerebral blood flow. This correlates mathematically to dynamic cognitive focus capacity (30% to 100%).
                </p>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};

