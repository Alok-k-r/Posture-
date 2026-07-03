import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, setIsRecordingSession } from '../store/store';
import { PostureFigure } from '../components/posture/PostureFigure';
import { Activity, Shield, Flame, AlertCircle, ChevronRight, Trophy, Star, Clock, Zap, Sparkles, Battery, Wifi, WifiOff, Bell, ShieldCheck, Play, Pause } from 'lucide-react';
import { cn } from '../lib/utils';
import { analyzePosture } from '../services/geminiService';
import { sendLocalNotification } from '../services/notificationService';
import { useNavigate } from 'react-router-dom';

export const DashboardScreen: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const posture = useSelector((state: RootState) => state.posture);
  const device = useSelector((state: RootState) => state.device);
  const { thresholds, streak } = posture;

  // Posture Monitoring is managed dynamically with custom snooze and stop delays in SlouchAlarmManager.
  useEffect(() => {
    // Left empty purposely as posture alerts are managed gracefully via SlouchAlarmManager.
  }, []);

  const formatSecs = (sec: number) => {
    if (!sec || sec === 0) return '0s';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  const getSpinalIntelAlerts = () => {
    const list = [];
    const diff = Math.max(0, posture.baselineAngle - posture.angle);
    
    // 1. Biomechanical Alignment Alert
    if (diff > 15) {
      list.push({
        msg: `Severe spine tilt: ${diff}° deflection off baseline. Intervertebral shear force is significantly elevated.`,
        type: 'danger',
        time: 'Active',
        icon: AlertCircle,
        bg: 'bg-rose-50/70',
        color: 'text-rose-500',
        border: 'border-rose-100'
      });
    } else if (diff > 5) {
      list.push({
        msg: `Mild spine tilt: ${diff}° deflection off baseline. Paraspinal fatigue loading detected.`,
        type: 'warn',
        time: 'Active',
        icon: Activity,
        bg: 'bg-amber-50/70',
        color: 'text-amber-600',
        border: 'border-amber-100'
      });
    } else {
      list.push({
        msg: `Optimal S-Curve: Aligning beautifully in vertical envelope under balanced vertebral pressure.`,
        type: 'good',
        time: 'Continuous',
        icon: ShieldCheck,
        bg: 'bg-emerald-50/50',
        color: 'text-emerald-500',
        border: 'border-emerald-100'
      });
    }

    // 2. Incident Frequency & Core Stability Alert
    if (posture.incidents > 3) {
      list.push({
        msg: `System flagged ${posture.incidents} slouch incidents. Core fatigue detected; we recommend a 2-minute standing stretch.`,
        type: 'warn',
        time: 'Session Feed',
        icon: AlertCircle,
        bg: 'bg-orange-50/50',
        color: 'text-orange-500',
        border: 'border-orange-100'
      });
    } else if (posture.incidents > 0) {
      list.push({
        msg: `Composure maintained. Underwent ${posture.incidents} slouch transitions with stable posture recovery.`,
        type: 'good',
        time: 'Active',
        icon: Shield,
        bg: 'bg-slate-50/80',
        color: 'text-slate-500',
        border: 'border-slate-150'
      });
    } else {
      list.push({
        msg: `Spotless active session: 0 slouch incidents logged. Slow-twitch back muscles are performing exceptional control!`,
        type: 'good',
        time: 'Pristine',
        icon: Star,
        bg: 'bg-indigo-50/50',
        color: 'text-indigo-500',
        border: 'border-indigo-100'
      });
    }

    // 3. Cognitive Oxygenation & Focus Alert
    if (posture.maxFocusDuration > 120) {
      const minVal = Math.floor(posture.maxFocusDuration / 60);
      list.push({
        msg: `Thoracic volume peak: Kept continuous upright alignment for ${minVal}m to help preserve deep cerebral oxygen count.`,
        type: 'good',
        time: 'Peak',
        icon: Zap,
        bg: 'bg-purple-50/50',
        color: 'text-purple-600',
        border: 'border-purple-100'
      });
    } else if (posture.maxFocusDuration > 10) {
      list.push({
        msg: `Continuous posture streak hit ${posture.maxFocusDuration} seconds. paravertebral muscle memory actively training.`,
        type: 'good',
        time: 'Focus Streak',
        icon: Zap,
        bg: 'bg-violet-50/40',
        color: 'text-violet-500',
        border: 'border-violet-100'
      });
    } else {
      list.push({
        msg: `Ready to record focus depth. Hold upright alignment for over 10s to begin tracking continuous composure streaks.`,
        type: 'warn',
        time: 'Diagnostic',
        icon: Clock,
        bg: 'bg-slate-50/60',
        color: 'text-slate-400',
        border: 'border-slate-100'
      });
    }

    return list;
  };

  const getStatusInfo = (val: number) => {
    if (val >= thresholds.good) return { 
      label: 'Perfect', 
      color: 'bg-emerald-500', 
      text: 'text-emerald-500', 
      glow: 'shadow-emerald-500/20', 
      bg: 'bg-emerald-50/50', 
      border: 'border-emerald-100', 
      emoji: '🌟' 
    };
    if (val >= thresholds.warn) return { 
      label: 'Fair', 
      color: 'bg-amber-500', 
      text: 'text-amber-500', 
      glow: 'shadow-amber-500/20', 
      bg: 'bg-amber-50/50', 
      border: 'border-amber-100', 
      emoji: '⚠️' 
    };
    return { 
      label: 'Poor', 
      color: 'bg-rose-500', 
      text: 'text-rose-500', 
      glow: 'shadow-rose-500/20', 
      bg: 'bg-rose-50/50', 
      border: 'border-rose-100', 
      emoji: '🔴' 
    };
  };

  const status = getStatusInfo(posture.score);

  return (
    <div className="p-6 space-y-8 pb-28 relative z-10">
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
                <img src={user.photo} alt="Avatar" className="w-full h-full object-cover" />
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
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => dispatch(setIsRecordingSession(true))}
          className="bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 cursor-pointer p-4 rounded-[28px] flex items-center justify-between gap-4 shadow-sm transition-all active:scale-[0.99] group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/25 text-amber-600 flex items-center justify-center shrink-0">
              <Pause size={18} className="stroke-[3] animate-pulse" />
            </div>
            <div className="text-left">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Biometric Stream Suspended</h4>
              <p className="text-[10px] text-slate-500 font-bold leading-normal mt-0.5">
                Monitoring is paused. Live incidents, composure scoring, and focus metrics are currently not being compiled. Click to resume!
              </p>
            </div>
          </div>
          <button 
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[9px] uppercase tracking-wider font-black shadow-sm transition-all flex items-center gap-1 shrink-0"
          >
            <Play size={10} fill="currentColor" className="stroke-[3]" />
            Resume
          </button>
        </motion.div>
      )}

      {/* Main Feature: Posture Analysis Hero */}
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "rounded-[48px] p-7 border border-white/40 flex flex-col justify-between h-[340px] shadow-premium transition-all duration-700 relative overflow-hidden", 
          status.bg
        )}
      >
        {/* Dynamic Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/40 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
        <div className={cn("absolute -bottom-20 -left-20 w-48 h-48 blur-3xl rounded-full opacity-20", status.color)} />
        
        <div className="flex justify-between items-start relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className={cn("w-2.5 h-2.5 rounded-full", status.color, "animate-pulse")} />
              <span className={cn("text-[11px] font-black uppercase tracking-[0.25em]", status.text)}>
                {status.label} Alignment
              </span>
            </div>
            <p className={cn("text-[9px] font-bold opacity-60 uppercase tracking-widest", status.text)}>Clinical Precision</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-white/60 backdrop-blur-xl flex items-center justify-center shadow-soft border border-white/50">
            <Activity size={20} className={status.text} />
          </div>
        </div>

        {/* Center Visualizer */}
        <div className="relative flex-1 flex items-center justify-center -my-2">
           <div className="w-52 h-52 flex items-center justify-center bg-white/40 backdrop-blur-2xl rounded-full border border-white/60 shadow-premium relative group">
              <div className={cn("absolute inset-4 rounded-full opacity-10", status.color)} />
              <PostureFigure size={200} angle={posture.angle} />
              
              {/* Floating Stat Info */}
              <motion.div 
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -right-6 top-1/2 bg-white/90 backdrop-blur-md p-2.5 px-4 rounded-2xl shadow-premium border border-white/50"
              >
                 <div className={cn("text-[8px] font-black uppercase tracking-widest leading-none", status.text)}>Angle</div>
                 <div className={cn("text-xl font-black mt-1", status.text)}>
                    {Math.round(posture.angle)}°
                 </div>
              </motion.div>
           </div>
        </div>
        
        <div className="flex items-end justify-between relative z-10">
          <div className="space-y-1">
            <h4 className={cn("text-4xl font-black tracking-tighter leading-none px-1", status.text)}>
               {Math.round(posture.score)}%
            </h4>
            <p className={cn("text-[9px] font-black uppercase tracking-[0.2em] opacity-40 leading-none", status.text)}>Integrity Score</p>
          </div>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/posture')}
            className="px-4 py-2.5 bg-white/60 backdrop-blur-md rounded-xl border border-white/50 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-800 shadow-soft"
          >
            Insights <ChevronRight size={12} />
          </motion.button>
        </div>
      </motion.div>

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

      {/* Postural Intel: AI Alerts Layer */}
      <div className="space-y-5">
         <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <Sparkles size={20} />
               </div>
               <h3 className="text-xl font-black tracking-tight text-slate-800">Spinal Intel</h3>
            </div>
            <button 
              onClick={async () => {
                const insight = await analyzePosture(posture.angle, posture.history);
                sendLocalNotification('AI Insight', { body: insight, icon: '✨' });
              }}
              className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:bg-indigo-50 px-3 py-2 rounded-xl transition-colors"
            >
              AI Analysis
            </button>
         </div>
         
         <div className="space-y-4">
           {getSpinalIntelAlerts().map((alert, i) => (
             <motion.div 
               key={i} 
               layout
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               whileHover={{ scale: 1.02 }}
               className={cn(
                 "p-5 rounded-[36px] flex items-center gap-5 border transition-all cursor-pointer group shadow-soft bg-white",
                 alert.bg,
                 alert.border
               )}
             >
               <div className="w-14 h-14 rounded-2xl bg-white shadow-soft flex items-center justify-center text-2xl flex-shrink-0 transition-transform group-hover:scale-110">
                 <alert.icon size={22} className={alert.color} fill={alert.type === 'good' ? "currentColor" : "none"} />
               </div>
               <div className="flex-1">
                 <p className="text-sm font-black text-slate-800 leading-tight">{alert.msg}</p>
                 <div className="flex items-center gap-2 mt-1.5 opacity-60">
                    <Clock size={10} className="text-slate-400" />
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{alert.time}</span>
                 </div>
               </div>
               <div className="w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center text-slate-300 group-hover:text-slate-500 group-hover:bg-white transition-all">
                 <ChevronRight size={18} />
               </div>
             </motion.div>
           ))}
         </div>
      </div>
    </div>
  );
};
