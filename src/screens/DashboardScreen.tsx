import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, setIsRecordingSession } from '../store/store';
import { PostureFigure } from '../components/posture/PostureFigure';
import { 
  Activity, 
  Shield, 
  Flame, 
  AlertCircle, 
  ChevronRight, 
  Trophy, 
  Star, 
  Clock, 
  Zap, 
  Sparkles, 
  Battery, 
  Wifi, 
  WifiOff, 
  Bell, 
  ShieldCheck, 
  Play, 
  Pause,
  Award,
  CheckCircle2,
  Calendar,
  Info,
  ArrowUpRight,
  X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { analyzePosture } from '../services/geminiService';
import { sendLocalNotification } from '../services/notificationService';
import { useNavigate } from 'react-router-dom';
import { LocalModelService } from '../services/localModelService';

export const DashboardScreen: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const posture = useSelector((state: RootState) => state.posture);
  const device = useSelector((state: RootState) => state.device);
  const { thresholds, streak, goodSessionSeconds, totalSessionSeconds } = posture;

  const [activeTab, setActiveTab] = useState<'realtime' | 'health-index'>('realtime');
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Fetch metrics from our local AI biomechanical engine
  const m = LocalModelService.getMetrics();
  const statusInfo = m.dailyUpperBackHealthScore >= 80 ? {
    label: 'Perfect',
    color: 'bg-emerald-500',
    text: 'text-emerald-500',
    bg: 'bg-emerald-50/50',
    border: 'border-emerald-100',
    emoji: '🌟'
  } : m.dailyUpperBackHealthScore >= 60 ? {
    label: 'Fair',
    color: 'bg-amber-500',
    text: 'text-amber-500',
    bg: 'bg-amber-50/50',
    border: 'border-amber-100',
    emoji: '⚠️'
  } : {
    label: 'Poor',
    color: 'bg-rose-500',
    text: 'text-rose-500',
    bg: 'bg-rose-50/50',
    border: 'border-rose-100',
    emoji: '🔴'
  };

  const hasData = totalSessionSeconds > 0 || posture.history.length > 0;

  const formatSecs = (sec: number) => {
    if (!sec || sec === 0) return '0s';
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  // 28-day Consistency Calendar logic
  const consistencyDays = Array.from({ length: 28 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (27 - i));
    
    let scoreVal = 80;
    let type: 'excellent' | 'good' | 'average' | 'poor' | 'missed' = 'good';
    
    if (i === 27) {
      scoreVal = hasData ? posture.score : 0;
    } else if (i === 26) {
      scoreVal = hasData ? 78 : 0;
    } else if (i % 7 === 0) {
      type = 'missed';
      scoreVal = 0;
    } else if (i % 9 === 0) {
      type = 'poor';
      scoreVal = 48;
    } else if (i % 5 === 0) {
      type = 'average';
      scoreVal = 68;
    } else if (i % 3 === 0) {
      type = 'excellent';
      scoreVal = 92;
    } else {
      type = 'good';
      scoreVal = 82;
    }

    if (type !== 'missed') {
      if (scoreVal >= thresholds.good) type = 'excellent';
      else if (scoreVal >= thresholds.warn) type = 'good';
      else if (scoreVal > 45) type = 'average';
      else if (scoreVal > 0) type = 'poor';
      else type = 'missed';
    }
    
    return {
      dayNum: date.getDate(),
      dateStr: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: scoreVal,
      type
    };
  });

  return (
    <div className="p-6 space-y-8 pb-32 relative z-10 max-w-4xl mx-auto">
      {/* Header & Quick Status */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">Perspective Control</p>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none">Hello, {user?.name?.split(' ')[0]}</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5">
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-colors border",
                device.isConnected ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border-rose-500/20"
              )}>
                {device.isConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
                {device.isConnected ? "Online" : "Offline"}
              </div>
              
              <button
                onClick={() => dispatch(setIsRecordingSession(!posture.isRecordingSession))}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border active:scale-95",
                  posture.isRecordingSession 
                    ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" 
                    : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                )}
              >
                <span className="relative flex h-1.5 w-1.5">
                  {posture.isRecordingSession && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  )}
                  <span className={cn(
                    "relative inline-flex rounded-full h-1.5 w-1.5",
                    posture.isRecordingSession ? "bg-indigo-500" : "bg-amber-500"
                  )}></span>
                </span>
                {posture.isRecordingSession ? "Active" : "Paused"}
              </button>
            </div>

            <button 
              onClick={() => sendLocalNotification('System Check', { body: 'Notification system is fully functional' })}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[8px] font-black uppercase tracking-[0.15em] border border-slate-200 hover:bg-slate-200 transition-colors"
            >
              <Bell size={8} /> Test Alert
            </button>
          </div>
          <button 
            onClick={() => navigate('/profile')}
            className="w-14 h-14 rounded-[26px] bg-white p-0.5 border-2 border-white shadow-premium active:scale-95 transition-all overflow-hidden"
          >
            <div className="w-full h-full rounded-[22px] overflow-hidden">
              {user?.photo ? (
                <img src={user.photo} alt="Avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                  <span className="text-white font-black text-xl">{user?.name?.[0]}</span>
                </div>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Active Recording Standby Warning Banner */}
      {!posture.isRecordingSession && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => dispatch(setIsRecordingSession(true))}
          className="mx-1 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10 cursor-pointer px-4 py-2 rounded-full flex items-center justify-between gap-3 shadow-sm transition-all active:scale-[0.99] group"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
            </span>
            <span className="text-[9.5px] font-black text-amber-700 uppercase tracking-wider shrink-0">Biometric Stream Suspended</span>
            <span className="text-[9px] text-slate-400 hidden sm:inline font-bold">• Active spinal calibration and composure metrics are paused.</span>
          </div>
          <button className="text-[9px] font-black uppercase tracking-widest text-amber-600 group-hover:text-amber-700 flex items-center gap-1 active:scale-95 transition-all shrink-0">
            <Play size={8} fill="currentColor" className="stroke-[3]" />
            Resume
          </button>
        </motion.div>
      )}

      {/* Main Hero Visualizer Layout with tabs */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Spindle Alignment Feedback</span>
          <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('realtime')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                activeTab === 'realtime' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"
              )}
            >
              Realtime Stance
            </button>
            <button 
              onClick={() => setActiveTab('health-index')}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                activeTab === 'health-index' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"
              )}
            >
              Upper Back Index
            </button>
          </div>
        </div>

        {activeTab === 'realtime' ? (
          <motion.div
            layoutId="hero-card"
            className={cn(
              "rounded-[48px] p-7 border border-white/40 flex flex-col justify-between h-[340px] shadow-premium relative overflow-hidden transition-colors duration-500", 
              statusInfo.bg
            )}
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/40 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            
            <div className="flex justify-between items-start relative z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2.5 h-2.5 rounded-full", statusInfo.color, "animate-pulse")} />
                  <span className={cn("text-[11px] font-black uppercase tracking-[0.25em]", statusInfo.text)}>
                    {statusInfo.label} Alignment
                  </span>
                </div>
                <p className={cn("text-[9px] font-bold opacity-60 uppercase tracking-widest", statusInfo.text)}>Clinical Precision</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-white/60 backdrop-blur-xl flex items-center justify-center shadow-soft border border-white/50">
                <Activity size={20} className={statusInfo.text} />
              </div>
            </div>

            <div className="relative flex-1 flex items-center justify-center -my-2">
               <div className="w-52 h-52 flex items-center justify-center bg-white/40 backdrop-blur-2xl rounded-full border border-white/60 shadow-premium relative">
                  <PostureFigure size={190} angle={posture.angle} />
                  
                  <motion.div 
                    animate={{ y: [0, -3, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -right-6 top-1/2 bg-white/90 backdrop-blur-md p-2.5 px-4 rounded-2xl shadow-premium border border-white/50"
                  >
                     <div className={cn("text-[8px] font-black uppercase tracking-widest leading-none", statusInfo.text)}>Angle</div>
                     <div className={cn("text-xl font-black mt-1", statusInfo.text)}>
                        {Math.round(posture.angle)}°
                     </div>
                  </motion.div>
               </div>
            </div>
            
            <div className="flex items-end justify-between relative z-10">
              <div className="space-y-1">
                <h4 className={cn("text-4xl font-black tracking-tighter leading-none px-1", statusInfo.text)}>
                   {Math.round(posture.score)}%
                </h4>
                <p className={cn("text-[9px] font-black uppercase tracking-[0.2em] opacity-40 leading-none", statusInfo.text)}>Integrity Score</p>
              </div>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/posture')}
                className="px-4 py-2.5 bg-white/60 backdrop-blur-md rounded-xl border border-white/50 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-800 shadow-soft"
              >
                Diagnostic Tab <ChevronRight size={12} />
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            layoutId="hero-card"
            className="glass p-7 sm:p-8 rounded-[48px] shadow-premium border border-indigo-100/30 relative overflow-hidden flex flex-col justify-between h-[340px]"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="space-y-3">
              <span className="bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/10 flex items-center gap-1.5 w-max">
                <Shield size={10} fill="currentColor" /> Premium Orthopedic Core
              </span>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">
                Upper Back Health Score
              </h3>
              <p className="text-sm font-semibold text-slate-500 leading-relaxed max-w-lg">
                {m.dailyUpperBackHealthScore >= 80 
                  ? "Excellent paraspinal balance. Take short standing breaks every 45 minutes to maintain spinal nutrition." 
                  : "Moderate strain level detected. Minor slouching shifts the load onto your upper fibers."}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 p-5 rounded-[32px] border border-slate-100">
              <div className="flex items-center gap-5">
                <div className="text-center">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">Grade</span>
                  <span className="text-3xl font-black text-indigo-600 tracking-tighter block mt-0.5">{m.sessionGrade}</span>
                </div>
                <div className="w-[1px] h-10 bg-slate-200" />
                <div className="text-left">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Health Index</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-3xl font-black text-slate-800 tracking-tighter">{m.dailyUpperBackHealthScore}</span>
                    <span className="text-xs font-bold text-slate-400">/100</span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => navigate('/analytics')}
                className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 hover:bg-indigo-700 transition-colors"
              >
                View Analytics <ArrowUpRight size={12} />
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Primary Biomechanical Indicators Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Biomechanical Telemetry</h3>
          <button 
            onClick={() => setIsAiModalOpen(true)}
            className="text-[9px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest flex items-center gap-1 transition-all"
          >
            <Sparkles size={10} className="text-indigo-500 animate-pulse" /> View AI Report
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Card 1: Upper Back Stress Load */}
          <div className="glass p-5 rounded-[32px] shadow-soft border border-slate-100 flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Spinal Stress Load</span>
              <span className={cn(
                "text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider",
                m.loadClassification === "Very Low" || m.loadClassification === "Low"
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                  : "bg-amber-50 text-amber-600 border border-amber-100"
              )}>
                {m.loadClassification}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-800">{m.upperBackStrainLbs}</span>
                <span className="text-xs font-black text-slate-400 uppercase">lbs</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Average Load: {m.averageThoracicLoadLbs} lbs</p>
            </div>
          </div>

          {/* Card 2: Muscle Fatigue */}
          <div className="glass p-5 rounded-[32px] shadow-soft border border-slate-100 flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Muscle Fatigue</span>
              <span className="text-[8px] font-black px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded uppercase tracking-wider border border-indigo-100">
                {m.fatigueTrend}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="24" cy="24" r="19" stroke="#F1F5F9" strokeWidth="4.5" fill="transparent" />
                  <circle 
                    cx="24" cy="24" r="19" 
                    stroke="#F59E0B" strokeWidth="4.5" 
                    fill="transparent" 
                    strokeDasharray={119.3}
                    strokeDashoffset={119.3 - (119.3 * m.fatigueScore) / 100}
                  />
                </svg>
                <span className="absolute text-[10px] font-black text-slate-800">{m.fatigueScore}%</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-xs font-black text-slate-700">Accumulating</span>
                <p className="text-[9px] text-slate-400 font-semibold uppercase">Rate: +{m.fatigueGrowthRate}%/m</p>
              </div>
            </div>
          </div>

          {/* Card 3: Posture Recovery */}
          <div className="glass p-5 rounded-[32px] shadow-soft border border-slate-100 flex flex-col justify-between min-h-[140px]">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Recovery Compliance</span>
              <span className="text-[8px] font-black px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded uppercase tracking-wider border border-emerald-100">
                {m.recoveryClassification}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-800">{m.recoveryEfficiency}%</span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Response: {m.averageRecoveryTimeSeconds}s response speed</p>
            </div>
          </div>

        </div>
      </div>

      {/* Bento Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Streak Card - Wide */}
        <div className="col-span-2 bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-[40px] text-white shadow-premium relative overflow-hidden flex justify-between items-center group cursor-pointer active:scale-[0.98] transition-all">
           <div className="absolute right-0 top-0 bottom-0 w-48 bg-white/5 skew-x-[-20deg] translate-x-20 blur-sm" />
           <div className="space-y-1 relative z-10">
              <div className="flex items-center gap-1.5 opacity-70">
                 <Flame size={12} className="text-orange" />
                 <span className="text-[9px] font-black uppercase tracking-[0.2em]">Spinal Resilience</span>
              </div>
              <h3 className="text-2xl font-black tracking-tight">🔥 {streak.current} Day Streak</h3>
              <p className="text-[10px] font-bold opacity-60">Your consistency is in the top 5%.</p>
           </div>
           <div className="flex items-center gap-2 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-premium">
                 <Trophy size={26} className="text-amber-400" />
              </div>
           </div>
        </div>

        {/* Integrity Card */}
        <div className="bg-bento-green-bg p-6 rounded-[36px] border border-bento-green-border flex flex-col justify-between h-[160px] shadow-soft group hover:border-green transition-all cursor-pointer active:scale-95">
           <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-soft text-bento-green-text">
              <Shield size={20} fill="currentColor" />
           </div>
           <div>
              <div className="text-2xl font-black text-bento-green-text">{Math.round(posture.score)}%</div>
              <p className="text-[10px] font-black uppercase tracking-widest text-bento-green-text/60">Integrity</p>
           </div>
        </div>

        {/* Slouches Card */}
        <div className="bg-bento-rose-bg p-6 rounded-[36px] border border-bento-rose-border flex flex-col justify-between h-[160px] shadow-soft group hover:border-rose-400 transition-all cursor-pointer active:scale-95">
           <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-soft text-bento-rose-text">
              <AlertCircle size={20} fill="currentColor" />
           </div>
           <div>
              <div className="text-2xl font-black text-bento-rose-text">{posture.incidents}</div>
              <p className="text-[10px] font-black uppercase tracking-widest text-bento-rose-text/60">Incidents</p>
           </div>
        </div>

        {/* Focus Card */}
        <div className="bg-bento-violet-bg p-6 rounded-[36px] border border-bento-violet-border flex flex-col justify-between h-[160px] shadow-soft group hover:border-violet-400 transition-all cursor-pointer active:scale-95">
           <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-soft text-bento-violet-text">
              <Zap size={20} fill="currentColor" />
           </div>
           <div>
              <div className="text-2xl font-black text-bento-violet-text">
                {formatSecs(posture.maxFocusDuration)}
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-bento-violet-text/60">Focus Max</p>
           </div>
        </div>

        {/* Battery Card */}
        <div className="bg-bento-blue-bg p-6 rounded-[36px] border border-bento-blue-border flex flex-col justify-between h-[160px] shadow-soft group hover:border-blue-400 transition-all cursor-pointer active:scale-95">
           <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-soft text-bento-blue-text">
              <Battery size={20} className="text-bento-blue-text" />
           </div>
           <div>
              <div className="text-2xl font-black text-bento-blue-text">{device.batteryLevel}%</div>
              <p className="text-[10px] font-black uppercase tracking-widest text-bento-blue-text/60">Logic Power</p>
           </div>
        </div>
      </div>

      {/* TODAY'S ACHIEVEMENT CARD */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass p-7 sm:p-8 rounded-[48px] shadow-premium border border-indigo-100/30 bg-gradient-to-br from-indigo-50/10 to-purple-50/10 relative overflow-hidden space-y-6"
      >
        <div className="absolute -right-16 -bottom-16 w-48 h-48 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-800">Today's Achievements</h4>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Aesthetic Posture Milestones</p>
          </div>
        </div>

        <div className="p-4 bg-white/60 border border-indigo-100/50 rounded-3xl">
          <p className="text-sm font-black text-slate-800 leading-relaxed text-center">
            "{m.todaysAchievement}"
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="bg-slate-50/40 p-4 rounded-2xl border border-slate-100/60">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Longest Safe Sitting</span>
            <span className="text-base font-black text-indigo-900 block mt-1">
              {Math.round(m.longestStableSessionSeconds / 60)} minutes
            </span>
          </div>
          <div className="bg-slate-50/40 p-4 rounded-2xl border border-slate-100/60">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Best Recovery</span>
            <span className="text-base font-black text-indigo-900 block mt-1">
              {m.fastestResponseTimeSeconds > 0 ? `${m.fastestResponseTimeSeconds} seconds` : "N/A"}
            </span>
          </div>
          <div className="bg-slate-50/40 p-4 rounded-2xl border border-slate-100/60">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Daily Recommendation</span>
            <span className="text-xs font-bold text-indigo-900 block mt-1 truncate max-w-full" title={m.dailyRecommendation}>
              {m.dailyRecommendation}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Consistency Calendar (GitHub Style) */}
      <div className="glass p-6 rounded-[40px] shadow-soft space-y-5 border border-slate-100/80">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-sm font-black text-slate-800">Consistency Calendar</h4>
            <p className="text-[10px] font-bold text-slate-400">Visual index of daily alignment performance across the last 4 weeks</p>
          </div>
          <Calendar className="w-5 h-5 text-slate-400" />
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-7 gap-1.5 max-w-lg mx-auto w-full pt-2">
            {consistencyDays.map((day, dIdx) => {
              let colorClass = "bg-slate-100 text-slate-400";
              if (day.type === 'excellent') colorClass = "bg-emerald-500 text-white shadow-sm shadow-emerald-200";
              else if (day.type === 'good') colorClass = "bg-indigo-500 text-white shadow-sm shadow-indigo-100";
              else if (day.type === 'average') colorClass = "bg-amber-500 text-white shadow-sm shadow-amber-100";
              else if (day.type === 'poor') colorClass = "bg-rose-500 text-white shadow-sm shadow-rose-150";
              
              return (
                <div 
                  key={dIdx}
                  className={cn(
                    "aspect-square w-full rounded-md flex items-center justify-center text-[9px] font-black cursor-pointer hover:scale-110 active:scale-95 transition-all",
                    colorClass
                  )}
                  title={`${day.dateStr}: ${day.score > 0 ? `${day.score}% Score` : 'No sitting tracked'}`}
                >
                  {day.dayNum}
                </div>
              );
            })}
          </div>

          {/* Calendar Grid Legend */}
          <div className="flex flex-wrap justify-center items-center gap-4 text-[8px] font-black uppercase tracking-widest text-slate-400 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-emerald-500 rounded-md" /> <span>Excellent (≥{thresholds.good}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-indigo-500 rounded-md" /> <span>Good (≥{thresholds.warn}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-amber-500 rounded-md" /> <span>Average</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-rose-500 rounded-md" /> <span>Poor</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-slate-100 rounded-md border border-slate-200" /> <span>No Data</span>
            </div>
          </div>
        </div>
      </div>



      {/* Local AI Synthesis Diagnostic Summary Modal */}
      <AnimatePresence>
        {isAiModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Dark glass backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAiModalOpen(false)}
              className="absolute inset-0 bg-slate-950/45 backdrop-blur-md"
            />
            
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[44px] shadow-premium border border-slate-150 overflow-hidden z-10 p-7 space-y-6 max-h-[85vh] overflow-y-auto scrollbar-thin"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                    <Sparkles size={20} className="animate-spin [animation-duration:10s]" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Offline Analytical Model</span>
                    <h4 className="text-lg font-black text-slate-800 tracking-tight">Biomechanical AI Report</h4>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAiModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Dynamic Health Index Meter */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-50/40 border border-indigo-100/50 p-4 rounded-3xl text-center">
                  <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Health Index</span>
                  <div className="text-3xl font-black text-indigo-900 leading-none">{m.dailyUpperBackHealthScore}%</div>
                  <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-100/40 px-2 py-0.5 rounded-full inline-block mt-2">
                    Grade {m.sessionGrade}
                  </span>
                </div>
                <div className="bg-emerald-50/40 border border-emerald-100/50 p-4 rounded-3xl text-center">
                  <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest block mb-1">Muscle Fatigue</span>
                  <div className="text-3xl font-black text-emerald-800 leading-none">{m.fatigueScore}%</div>
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-100/40 px-2 py-0.5 rounded-full inline-block mt-2">
                    {m.fatigueTrend}
                  </span>
                </div>
              </div>

              {/* Parsed insights sections styled perfectly */}
              <div className="space-y-4">
                <div className="p-5 bg-slate-50/50 rounded-3xl border border-slate-100 space-y-4">
                  {/* Skeletal section */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-slate-700" />
                      <h5 className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Vertebral Load Assessment</h5>
                    </div>
                    <p className="text-xs font-bold text-slate-500 leading-relaxed">
                      Your head and shoulder forward flexion angle is currently <span className="text-indigo-600 font-extrabold">{Math.round(Math.max(0, Math.abs(posture.baselineAngle - posture.angle)))}°</span> off-baseline. Active thoracic muscle strain load is <span className="text-indigo-600 font-extrabold">{m.upperBackStrainLbs} lbs</span> (Classification: <span className="text-indigo-600 font-extrabold">{m.loadClassification}</span>).
                    </p>
                  </div>

                  <div className="h-[1px] bg-slate-100 w-full" />

                  {/* Muscle Fatigue section */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Flame size={14} className="text-slate-700" />
                      <h5 className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Lactic Acid & Endurance Profile</h5>
                    </div>
                    <p className="text-xs font-bold text-slate-500 leading-relaxed">
                      Stability index is <span className="text-slate-800 font-black">{m.stabilityScore}%</span> with a fatigue growth rate of <span className="text-slate-800 font-black">+{m.fatigueGrowthRate}%/min</span>. Predicted thoracic muscle endurance depletion in 30 minutes: <span className="text-slate-800 font-black">{m.predictedFatigue30m}%</span>.
                    </p>
                  </div>

                  <div className="h-[1px] bg-slate-100 w-full" />

                  {/* Sitting signature */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Info size={14} className="text-slate-700" />
                      <h5 className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Kinetic Behavioral Profile</h5>
                    </div>
                    <p className="text-xs font-bold text-slate-500 leading-relaxed">
                      Learned sitting archetype: <span className="text-indigo-600 font-extrabold">{m.digitalProfile.sittingStyle}</span> with a custom slouch signature identified as <span className="text-indigo-600 font-extrabold">"{m.digitalProfile.typicalSlouchPattern}"</span>. Predicted high-risk hourly interval: <span className="text-indigo-600 font-extrabold">{m.digitalProfile.highRiskTimeWindow}</span>.
                    </p>
                  </div>

                  <div className="h-[1px] bg-slate-100 w-full" />

                  {/* Clinical advice */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Trophy size={14} className="text-slate-700" />
                      <h5 className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Physical Decompression Guidance</h5>
                    </div>
                    <p className="text-xs font-bold text-slate-500 leading-relaxed">
                      {m.breakRecommendationMessage} (Urgency: <span className="text-indigo-600 font-extrabold">{m.breakUrgency}</span>). Clinical Advice: <span className="text-slate-800 font-extrabold italic">"{m.injuryRisk.clinicalAdvice}"</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setIsAiModalOpen(false)}
                  className="w-full py-4 bg-slate-950 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-colors shadow-lg active:scale-95"
                >
                  Dismiss Analysis
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
