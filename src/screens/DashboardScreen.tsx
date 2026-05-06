import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { PostureFigure } from '../components/posture/PostureFigure';
import { Activity, Shield, Flame, AlertCircle, ChevronRight, Trophy, Star, Clock, Zap, Sparkles, Battery, Wifi, WifiOff, Bell } from 'lucide-react';
import { cn } from '../lib/utils';
import { useDispatch } from 'react-redux';
import { analyzePosture } from '../services/geminiService';
import { sendLocalNotification } from '../services/notificationService';
import { useNavigate } from 'react-router-dom';

export const DashboardScreen: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const posture = useSelector((state: RootState) => state.posture);
  const device = useSelector((state: RootState) => state.device);
  const { thresholds, streak, isSimulating } = posture;

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

  const status = getStatusInfo(posture.angle);

  return (
    <div className="p-6 space-y-8 pb-28 relative z-10">
      {/* Header & Quick Status */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">Perspective Control</p>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none">Hello, {user?.name?.split(' ')[0]}</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end gap-1">
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-colors",
              device.isConnected ? "bg-emerald-100/50 text-emerald-600 border border-emerald-200/50" : "bg-rose-100/50 text-rose-600 border border-rose-200/50"
            )}>
              {device.isConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
              {device.isConnected ? "Online" : "Offline"}
            </div>
            {isSimulating && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase tracking-[0.15em] border border-indigo-100 animate-pulse">
                Monitoring
              </div>
            )}
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
              <div className="text-2xl font-black text-bento-rose-text">{posture.history.filter(a => a < thresholds.warn).length}</div>
              <p className="text-[10px] font-black uppercase tracking-widest text-bento-rose-text/60">Incidents</p>
           </div>
        </div>

        {/* Focus Card */}
        <div className="bg-bento-violet-bg p-6 rounded-[36px] border border-bento-violet-border flex flex-col justify-between h-[160px] shadow-soft group hover:border-violet-400 transition-all cursor-pointer active:scale-95">
           <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-soft text-bento-violet-text">
              <Zap size={20} fill="currentColor" />
           </div>
           <div>
              <div className="text-2xl font-black text-bento-violet-text">45m</div>
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
           <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:bg-indigo-50 px-3 py-2 rounded-xl transition-colors">Clear All</button>
        </div>
        
        <div className="space-y-4">
          {(posture.angle < thresholds.warn ? [
            { msg: 'System detected slump period.', type: 'warn', time: 'Just now', icon: AlertCircle, bg: 'bg-orange/10', color: 'text-orange', border: 'border-orange/20' },
            { msg: 'Muscle fatigue risk elevated.', type: 'warn', time: '1m ago', icon: Activity, bg: 'bg-orange/10', color: 'text-orange', border: 'border-orange/20' }
          ] : [
            { msg: 'Consistency target reached.', type: 'good', time: 'Just now', icon: Star, bg: 'bg-emerald-50/50', color: 'text-emerald-500', border: 'border-emerald-100' },
            { msg: 'Spinal integrity optimal.', type: 'good', time: '2m ago', icon: Shield, bg: 'bg-emerald-50/50', color: 'text-emerald-500', border: 'border-emerald-100' }
          ]).map((alert, i) => (
            <motion.div 
              key={i} 
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              whileHover={{ scale: 1.02 }}
              className={cn(
                "p-5 rounded-[36px] flex items-center gap-5 border transition-all cursor-pointer group shadow-soft",
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

