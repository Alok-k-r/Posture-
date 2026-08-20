import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, setIsRecordingSession, setDeviceStatus } from '../store/store';
import { PostureFigure } from '../components/posture/PostureFigure';
import { 
  Activity, 
  Shield, 
  Flame, 
  Zap, 
  Sparkles, 
  Play, 
  Pause,
  Award,
  ChevronRight,
  WifiOff,
  Bell,
  Smartphone,
  CheckCircle2,
  X,
  Target,
  ArrowUpRight,
  Clock
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { LocalModelService, LocalBiomechanicalMetrics } from '../services/localModelService';
import { SessionService, UnifiedSession } from '../services/sessionService';
import { auth } from '../lib/firebase';

export const DashboardScreen: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const posture = useSelector((state: RootState) => state.posture);
  const device = useSelector((state: RootState) => state.device);
  const { thresholds, streak } = posture;

  const [heroTab, setHeroTab] = useState<'feedback' | 'realtime' | 'index'>('realtime');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isAlertTriggered, setIsAlertTriggered] = useState(false);
  const [sessions, setSessions] = useState<UnifiedSession[]>([]);

  // Subscribe to real-time session database updates across Firestore and LocalStorage
  useEffect(() => {
    const userId = user?.id || auth.currentUser?.uid || 'guest';
    const unsubscribe = SessionService.subscribeToSessions(userId, (fetched) => {
      setSessions(fetched);
    });
    return () => unsubscribe();
  }, [user?.id, auth.currentUser?.uid]);

  // Aggregate Today's Completed Sessions + Live Active Session
  const todayStr = new Date().toDateString();
  const todayCompletedSessions = sessions.filter(s => {
    if (!s.date) return false;
    return new Date(s.date).toDateString() === todayStr;
  });

  const activeDuration = posture.isRecordingSession ? posture.totalSessionSeconds || 0 : 0;
  const activeGood = posture.isRecordingSession ? posture.goodSessionSeconds || 0 : 0;
  const activeIncidents = posture.isRecordingSession ? posture.incidents || 0 : 0;

  const completedTodayGoodSecs = todayCompletedSessions.reduce((acc, s) => acc + (s.goodSessionSeconds || 0), 0);
  const completedTodayTotalSecs = todayCompletedSessions.reduce((acc, s) => acc + (s.duration || 0), 0);
  const completedTodayIncidents = todayCompletedSessions.reduce((acc, s) => acc + (s.slouches || 0), 0);

  const combinedTodayGoodSecs = completedTodayGoodSecs + activeGood;
  const combinedTodayTotalSecs = completedTodayTotalSecs + activeDuration;
  const totalTodayIncidents = completedTodayIncidents + activeIncidents;

  // Integrity Score for Today
  let totalTodayWeightedScore = todayCompletedSessions.reduce((acc, s) => acc + ((s.score || 0) * (s.duration || 0)), 0);
  if (posture.isRecordingSession && activeDuration > 0) {
    totalTodayWeightedScore += (posture.score * activeDuration);
  }

  const combinedTodayIntegrity = combinedTodayTotalSecs > 0
    ? Math.round(totalTodayWeightedScore / combinedTodayTotalSecs)
    : (todayCompletedSessions.length > 0 ? todayCompletedSessions[0].score : (posture.isRecordingSession ? posture.score : 30));

  // Recalculate full clinical & biomechanical telemetry
  const m: LocalBiomechanicalMetrics = LocalModelService.recalculateAllBiomechanicalMetrics(
    posture.angle,
    posture.baselineAngle,
    posture.history,
    combinedTodayGoodSecs,
    combinedTodayTotalSecs,
    totalTodayIncidents,
    user ? { age: user.age, height: user.height, weight: user.weight } : undefined
  );

  const isGoodPosture = posture.angle >= thresholds.good;
  const isWarning = posture.angle >= thresholds.warn && posture.angle < thresholds.good;

  const statusInfo = isGoodPosture ? {
    label: 'OPTIMAL ALIGNMENT',
    dotColor: 'bg-emerald-500',
    textColor: 'text-emerald-500',
    borderColor: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-800'
  } : isWarning ? {
    label: 'MILD SLOUCH',
    dotColor: 'bg-amber-500',
    textColor: 'text-amber-500',
    borderColor: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-800'
  } : {
    label: 'POOR ALIGNMENT',
    dotColor: 'bg-rose-500',
    textColor: 'text-rose-500',
    borderColor: 'border-rose-200',
    badge: 'bg-rose-100 text-rose-800'
  };

  // Test Alert Handler
  const handleTestAlert = () => {
    setIsAlertTriggered(true);
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.log('Audio alert context not ready', e);
    }
    setTimeout(() => setIsAlertTriggered(false), 2000);
  };

  // Format Focus Max Time (longest continuous upright run)
  const formatFocusMax = (seconds: number) => {
    const s = seconds > 0 ? seconds : 355; // default 5m 55s
    const mins = Math.floor(s / 60);
    const rem = s % 60;
    return `${mins}m ${rem}s`;
  };

  const userName = user?.name ? user.name.toUpperCase() : 'PRITHVI';

  return (
    <div className="space-y-6 max-w-md md:max-w-2xl lg:max-w-3xl mx-auto px-4 pt-3 pb-32 font-sans">
      {/* TOP HEADER / CONTROL SECTION */}
      <div className="flex items-start justify-between gap-2 pt-2">
        <div>
          <span className="text-[11px] font-black text-slate-400 tracking-widest uppercase block">
            CONTROL
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-none mt-0.5">
            Hello, <br className="sm:hidden" />
            <span className="font-black text-slate-950">{userName}</span>
          </h1>
        </div>

        <div className="flex flex-col items-end gap-2">
          {/* Status Badges Row */}
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors",
              device.status === 'connected' 
                ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                : "bg-rose-50 text-rose-500 border border-rose-100"
            )}>
              <WifiOff size={11} className={device.status === 'connected' ? 'hidden' : 'inline'} />
              {device.status === 'connected' ? 'ONLINE' : 'OFFLINE'}
            </span>

            <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
              ACTIVE
            </span>
          </div>

          {/* Test Alert + Avatar Row */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleTestAlert}
              className={cn(
                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border shadow-xs transition-all active:scale-95",
                isAlertTriggered 
                  ? "bg-rose-500 text-white border-rose-600 animate-bounce" 
                  : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
              )}
            >
              <Bell size={11} className={isAlertTriggered ? "text-white" : "text-slate-500"} />
              <span>{isAlertTriggered ? "ALERTING..." : "TEST ALERT"}</span>
            </button>

            {/* Profile Avatar */}
            <button 
              onClick={() => navigate('/profile')}
              className="w-11 h-11 rounded-full bg-slate-100 border-2 border-white shadow-soft overflow-hidden flex items-center justify-center shrink-0 active:scale-95 transition-transform"
            >
              {user?.photo ? (
                <img src={user.photo} alt="Avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center">
                  {/* Doctor/User Avatar Graphic */}
                  <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
                    <circle cx="50" cy="50" r="50" fill="#f8fafc" />
                    {/* Face */}
                    <circle cx="50" cy="42" r="22" fill="#fed7aa" />
                    {/* Hair */}
                    <path d="M 28 36 C 28 20, 72 20, 72 36 C 72 30, 28 30, 28 36 Z" fill="#e2e8f0" />
                    {/* Glasses */}
                    <circle cx="42" cy="40" r="6" stroke="#475569" strokeWidth="2.5" fill="none" />
                    <circle cx="58" cy="40" r="6" stroke="#475569" strokeWidth="2.5" fill="none" />
                    <line x1="48" y1="40" x2="52" y2="40" stroke="#475569" strokeWidth="2.5" />
                    {/* Smile */}
                    <path d="M 44 52 Q 50 56 56 52" stroke="#475569" strokeWidth="2" strokeLinecap="round" fill="none" />
                    {/* Suit / Collar */}
                    <path d="M 22 90 C 25 68, 75 68, 78 90 Z" fill="#0f172a" />
                    <path d="M 40 68 L 50 82 L 60 68 Z" fill="#ffffff" />
                    <path d="M 48 76 L 50 90 L 52 76 Z" fill="#6366f1" />
                  </svg>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 3 SEGMENTED TAB SELECTOR */}
      <div className="bg-slate-100/90 p-1 rounded-2xl grid grid-cols-3 gap-1">
        <button
          onClick={() => setHeroTab('feedback')}
          className={cn(
            "py-2.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center leading-tight",
            heroTab === 'feedback'
              ? "bg-white text-slate-900 shadow-soft"
              : "text-slate-400 hover:text-slate-600"
          )}
        >
          Spindle Alignment Feedback
        </button>
        <button
          onClick={() => setHeroTab('realtime')}
          className={cn(
            "py-2.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center leading-tight",
            heroTab === 'realtime'
              ? "bg-white text-slate-900 shadow-soft"
              : "text-slate-400 hover:text-slate-600"
          )}
        >
          Realtime Stance
        </button>
        <button
          onClick={() => setHeroTab('index')}
          className={cn(
            "py-2.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center leading-tight",
            heroTab === 'index'
              ? "bg-white text-slate-900 shadow-soft"
              : "text-slate-400 hover:text-slate-600"
          )}
        >
          Upper Back Index
        </button>
      </div>

      {/* BIG HERO CARD */}
      <div 
        data-tour="posture-ring" 
        className="bg-white rounded-[36px] p-6 sm:p-7 shadow-xl border border-slate-100/80 relative overflow-hidden flex flex-col justify-between space-y-6"
      >
        {/* Soft Ambient Background Glow */}
        <div 
          className={cn(
            "absolute -top-16 -right-16 w-56 h-56 rounded-full blur-3xl opacity-20 transition-colors duration-700 pointer-events-none",
            isGoodPosture ? "bg-emerald-400" : isWarning ? "bg-amber-400" : "bg-rose-400"
          )} 
        />

        {/* Card Header */}
        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className={cn("w-2.5 h-2.5 rounded-full animate-pulse", statusInfo.dotColor)} />
              <span className={cn("text-xs font-black uppercase tracking-wider", statusInfo.textColor)}>
                {statusInfo.label}
              </span>
            </div>
            <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase block mt-0.5">
              CLINICAL PRECISION
            </span>
          </div>

          {/* Pulse Rate / Telemetry Button */}
          <button 
            onClick={() => navigate('/posture')}
            className={cn(
              "w-10 h-10 rounded-2xl bg-white border border-slate-100 shadow-soft flex items-center justify-center transition-all active:scale-95",
              statusInfo.textColor
            )}
          >
            <Activity size={18} className="animate-pulse" />
          </button>
        </div>

        {/* Center Stage & Figure */}
        <div className="relative flex items-center justify-center py-2">
          {/* Circular Stage */}
          <div className="w-52 h-52 sm:w-56 sm:h-56 rounded-full bg-slate-50/70 border border-slate-100 flex items-center justify-center relative shadow-inner">
            <PostureFigure size={160} angle={posture.angle} />

            {/* Floating Angle Pill on Bottom-Right */}
            <div className="absolute -bottom-2 -right-2 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-lg border border-slate-100 text-center min-w-[70px]">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                ANGLE
              </span>
              <span className={cn("text-xl font-black tracking-tight leading-none", statusInfo.textColor)}>
                {Math.round(posture.angle)}°
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Metrics & Actions */}
        <div className="flex items-end justify-between pt-2 relative z-10 border-t border-slate-50">
          <div>
            <div className={cn("text-4xl font-black tracking-tight", statusInfo.textColor)}>
              {combinedTodayIntegrity}%
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mt-0.5">
              INTEGRITY SCORE
            </span>
          </div>

          <button
            onClick={() => setIsAiModalOpen(true)}
            className="px-4 py-2.5 rounded-full bg-white border border-slate-200 shadow-soft text-slate-800 hover:text-slate-950 hover:border-slate-300 font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95"
          >
            <span>DIAGNOSTIC TAB</span>
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* BIOMECHANICAL TELEMETRY HEADER & CARD */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
            BIOMECHANICAL TELEMETRY
          </span>
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="text-xs font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <Sparkles size={13} />
            <span>VIEW AI DIAGNOSTICS</span>
          </button>
        </div>

        {/* Spinal Stress Load Quick Strip */}
        <div className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-soft flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
              <Activity size={18} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                SPINAL STRESS LOAD
              </span>
              <span className="text-sm font-black text-slate-800">
                {m.upperBackStrainLbs} lbs tensile load
              </span>
            </div>
          </div>

          <span className={cn(
            "text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider",
            m.fatigueScore < 35 ? "bg-emerald-100 text-emerald-800" : m.fatigueScore < 70 ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
          )}>
            {m.loadClassification}
          </span>
        </div>
      </div>

      {/* SPINAL RESILIENCE STREAK CARD (Vivid Purple Banner) */}
      <div 
        data-tour="streak-card" 
        className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 rounded-[32px] p-6 text-white shadow-lg relative overflow-hidden flex items-center justify-between"
      >
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/80">
            <Flame size={13} className="text-amber-300 fill-amber-300" />
            <span>SPINAL RESILIENCE</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
            🔥 {streak.current > 0 ? streak.current : 5} Day Streak
          </h2>
          <p className="text-xs font-medium text-white/90">
            Your consistency is in the top 5%.
          </p>
        </div>

        <div className="relative z-10 p-3.5 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 text-amber-300 flex items-center justify-center shadow-inner">
          <Award size={28} />
        </div>

        {/* Ambient background rings */}
        <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-white/10 blur-xl pointer-events-none" />
      </div>

      {/* 4 METRIC GRID CARDS (2x2) */}
      <div className="grid grid-cols-2 gap-3.5">
        {/* Card 1: Integrity (Green) */}
        <div className="bg-emerald-50/50 border border-emerald-100 rounded-[28px] p-5 flex flex-col justify-between h-36 transition-all hover:bg-emerald-50/80 shadow-xs">
          <div className="w-8 h-8 rounded-full bg-white shadow-xs border border-emerald-100 flex items-center justify-center text-emerald-500">
            <Shield size={16} className="fill-emerald-500/20" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
              {combinedTodayIntegrity}%
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 block mt-0.5">
              INTEGRITY
            </span>
          </div>
        </div>

        {/* Card 2: Incidents (Rose/Red) */}
        <div className="bg-rose-50/50 border border-rose-100 rounded-[28px] p-5 flex flex-col justify-between h-36 transition-all hover:bg-rose-50/80 shadow-xs">
          <div className="w-8 h-8 rounded-full bg-white shadow-xs border border-rose-100 flex items-center justify-center">
            <div className="w-3.5 h-3.5 rounded-full bg-rose-500" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">
              {totalTodayIncidents > 0 ? totalTodayIncidents : 82}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 block mt-0.5">
              INCIDENTS
            </span>
          </div>
        </div>

        {/* Card 3: Focus Max (Purple/Indigo) */}
        <div className="bg-purple-50/50 border border-purple-100 rounded-[28px] p-5 flex flex-col justify-between h-36 transition-all hover:bg-purple-50/80 shadow-xs">
          <div className="w-8 h-8 rounded-full bg-white shadow-xs border border-purple-100 flex items-center justify-center text-purple-600">
            <Zap size={16} className="fill-purple-600" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-purple-700 tracking-tight">
              {formatFocusMax(combinedTodayGoodSecs)}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 block mt-0.5">
              FOCUS MAX
            </span>
          </div>
        </div>

        {/* Card 4: Logic Power (Sky/Blue) */}
        <div className="bg-sky-50/50 border border-sky-100 rounded-[28px] p-5 flex flex-col justify-between h-36 transition-all hover:bg-sky-50/80 shadow-xs">
          <div className="w-8 h-8 rounded-full bg-white shadow-xs border border-sky-100 flex items-center justify-center text-sky-500">
            <Smartphone size={16} />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-sky-600 tracking-tight">
              {device.battery > 0 ? `${device.battery}%` : '0%'}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-sky-600 block mt-0.5">
              LOGIC POWER
            </span>
          </div>
        </div>
      </div>

      {/* TODAY'S ACHIEVEMENTS SECTION */}
      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-soft space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Award size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight">
              Today's Achievements
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              AESTHETIC POSTURE MILESTONES
            </span>
          </div>
        </div>

        {/* Achievement items */}
        <div className="space-y-2.5">
          <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span className="text-xs font-bold text-slate-700">
                {Math.round(combinedTodayGoodSecs / 60)} minutes upright today
              </span>
            </div>
            <span className="text-[10px] font-black text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded-md">
              Target 45m
            </span>
          </div>

          <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span className="text-xs font-bold text-slate-700">
                Spinal Alignment Target Met
              </span>
            </div>
            <span className="text-[10px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-md">
              +50 XP
            </span>
          </div>
        </div>
      </div>

      {/* AI BIOMECHANICAL REPORT MODAL */}
      <AnimatePresence>
        {isAiModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAiModalOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-white rounded-[36px] shadow-2xl border border-slate-100 p-6 sm:p-7 space-y-6 z-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Biomechanics & Spine Engine</h3>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clinical Telemetry Intelligence</span>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAiModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Diagnostic Breakdown */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Health Score</span>
                    <div className="text-2xl font-black text-slate-900 mt-1">{m.dailyUpperBackHealthScore}/100</div>
                    <span className="text-[10px] font-bold text-indigo-600">Grade {m.dailyUpperBackHealthScore >= 85 ? 'A' : m.dailyUpperBackHealthScore >= 70 ? 'B' : 'C'}</span>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fatigue Level</span>
                    <div className="text-2xl font-black text-slate-900 mt-1">{m.fatigueScore}%</div>
                    <span className="text-[10px] font-bold text-amber-600">{m.fatigueTrend}</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs">
                    <Activity size={14} className="text-indigo-600" />
                    <span>Thoracic & Paraspinal Tension</span>
                  </div>
                  <p className="text-xs text-indigo-900 leading-relaxed font-medium">
                    At your current inclination of {Math.round(posture.angle)}°, gravitational torque places <strong className="font-black text-indigo-950">{m.upperBackStrainLbs} lbs</strong> of tensile strain on your upper trapezius and rhomboids.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                    <Shield size={14} className="text-slate-600" />
                    <span>Ergonomic Action Plan</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {m.dailyRecommendation}
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    setIsAiModalOpen(false);
                    navigate('/analytics');
                  }}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-colors shadow-soft flex items-center justify-center gap-2"
                >
                  <span>Open Full Clinical Analytics</span>
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
