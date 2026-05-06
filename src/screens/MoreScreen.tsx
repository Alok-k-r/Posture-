import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { FileText, Sliders, User, Brain, Bell, Shield, Info, ChevronRight, Share2, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

export const MoreScreen: React.FC = () => {
  const { isOnline, syncQueue } = useSelector((state: RootState) => state.sync);

  const menuItems = [
    { label: 'Device Management', desc: 'Hardware status & battery', path: '/device', icon: Wifi, color: 'text-indigo', bg: 'bg-indigo-10' },
    { label: 'Posture Thresholds', desc: 'Custom calibration & alerts', path: '/thresholds', icon: Sliders, color: 'text-orange', bg: 'bg-orange/10' },
    { label: 'Personal Profile', desc: 'Edit your health profile', path: '/profile', icon: User, color: 'text-green', bg: 'bg-green/10' },
    { label: 'Reports & Export', desc: 'View spinal history logs', path: '/reports', icon: FileText, color: 'text-blue', bg: 'bg-blue/10' },
  ];

  const secondaryItems = [
    { label: 'Notifications', icon: Bell },
    { label: 'Privacy & Security', icon: Shield },
    { label: 'About PostureCare', icon: Info },
    { label: 'Share with Doctor', icon: Share2 },
  ];

  return (
    <div className="p-6 space-y-8 pb-24 relative z-10">
      <div className="space-y-1">
        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none">Settings</h2>
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2">Control Center</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Sync Status Card */}
        <div className="glass p-5 rounded-[32px] shadow-soft flex items-center justify-between border-white/60">
          <div className="flex items-center gap-5">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shadow-soft",
              isOnline ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            )}>
              {isOnline ? <Wifi size={24} /> : <WifiOff size={24} />}
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                {isOnline ? 'System Online' : 'Offline Mode'}
                {syncQueue.length > 0 && <RefreshCw size={12} className="animate-spin text-indigo-500" />}
              </h4>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                {syncQueue.length > 0 ? `${syncQueue.length} nodes pending sync` : 'Cloud state synchronized'}
              </p>
            </div>
          </div>
          <div className="text-right">
             <span className={cn(
               "text-[10px] font-black px-3 py-1 rounded-xl uppercase tracking-tighter",
               isOnline ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200" : "bg-rose-500 text-white"
             )}>
                {isOnline ? 'Live' : 'Standby'}
             </span>
          </div>
        </div>

        {menuItems.map((item, i) => (
          <NavLink
            key={i}
            to={item.path}
            className="glass group flex items-center gap-5 p-6 rounded-[32px] shadow-soft active:scale-[0.98] transition-all border-white/40"
          >
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-soft transition-transform group-hover:scale-105", 
              item.path === '/reports' ? "bg-indigo-50 text-indigo-600" :
              item.path === '/thresholds' ? "bg-amber-50 text-amber-600" :
              item.path === '/profile' ? "bg-emerald-50 text-emerald-600" : "bg-violet-50 text-violet-600"
            )}>
              <item.icon size={26} />
            </div>
            <div className="flex-1">
              <h4 className="text-base font-extrabold text-slate-800 tracking-tight leading-none">{item.label}</h4>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mt-1.5">{item.desc}</p>
            </div>
            <ChevronRight size={20} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
          </NavLink>
        ))}
      </div>

      <div className="space-y-4 pt-4">
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4 leading-none">Security & Legal</h3>
        <div className="glass rounded-[40px] shadow-premium divide-y divide-white/20 overflow-hidden border-white/40">
          {secondaryItems.map((item, i) => (
            <button key={i} className="w-full flex items-center justify-between p-6 hover:bg-white/40 transition-colors">
              <div className="flex items-center gap-5">
                <item.icon size={22} className="text-slate-400" />
                <span className="text-sm font-extrabold text-slate-700 tracking-tight leading-none">{item.label}</span>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </button>
          ))}
        </div>
      </div>

      <div className="text-center space-y-1">
        <p className="text-[10px] font-black text-textMuted uppercase tracking-widest">Version 2.4.0 (Build 82)</p>
        <p className="text-[10px] font-medium text-textMuted underline italic leading-relaxed px-8 opacity-40">
          "Developed with ❤️ for spinal health. HIPAA Compliant v2."
        </p>
      </div>
    </div>
  );
};
