import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, unpairDevice } from '../store/store';
import { Wifi, Battery, Cpu, ShieldCheck, Trash2, Smartphone, AlertCircle, RefreshCw, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

export const DeviceScreen: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const device = useSelector((state: RootState) => state.device);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUnpair = () => {
    if (confirm("Are you sure you want to unpair PostureAI Hardware v2.4? This will stop real-time monitoring.")) {
      dispatch(unpairDevice());
      navigate('/more');
    }
  };

  const handleUpdate = () => {
    setIsUpdating(true);
    setTimeout(() => setIsUpdating(false), 3000);
  };

  return (
    <div className="p-6 space-y-6 pb-24 relative z-10">
      {/* Custom Back Nav */}
      <button onClick={() => navigate('/more')} className="flex items-center gap-2 text-slate-400 font-bold mb-2">
        <ChevronLeft size={18} />
        <span className="text-[10px] uppercase tracking-widest">Back to Settings</span>
      </button>

      {/* Device Status Hero */}
      <div className="glass p-8 rounded-[48px] shadow-premium text-center space-y-4 border-white/60">
        <div className="relative inline-block">
          <div className={cn(
            "w-24 h-24 rounded-[32px] flex items-center justify-center shadow-premium mx-auto",
            device.isConnected ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
          )}>
            <Smartphone size={40} />
          </div>
          {device.isConnected && (
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-emerald-500 border-4 border-white flex items-center justify-center animate-pulse shadow-lg">
              <Wifi size={14} className="text-white" />
            </div>
          )}
        </div>
        
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight leading-none">PostureCare Pod</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Serial: PA-8229-XJ</p>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-50 border border-slate-100">
          <div className={cn("w-2 h-2 rounded-full", device.isConnected ? "bg-emerald-500" : "bg-rose-500")} />
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
            {device.isConnected ? "Device Connected" : "Connection Lost"}
          </span>
        </div>
      </div>

      {/* Hardware Details Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass p-6 rounded-[32px] shadow-soft space-y-3">
          <div className="flex justify-between items-center">
            <Battery size={20} className={cn(device.batteryLevel > 20 ? "text-emerald-500" : "text-rose-500")} />
            <span className="text-[10px] font-black text-slate-400 uppercase">Power</span>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800 tracking-tighter">{device.batteryLevel}%</p>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Battery Level</p>
          </div>
        </div>

        <div className="glass p-6 rounded-[32px] shadow-soft space-y-3">
          <div className="flex justify-between items-center">
            <Cpu size={20} className="text-indigo-500" />
            <span className="text-[10px] font-black text-slate-400 uppercase">System</span>
          </div>
          <div>
            <p className="text-2xl font-black text-slate-800 tracking-tighter">{device.firmwareVersion}</p>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Firmware</p>
          </div>
        </div>
      </div>

      {/* Security & Updates */}
      <div className="glass rounded-[40px] shadow-premium divide-y divide-slate-100 overflow-hidden">
        <button 
          onClick={handleUpdate}
          disabled={isUpdating}
          className="w-full flex items-center justify-between p-6 hover:bg-slate-50 active:bg-slate-100 transition-colors"
        >
          <div className="flex items-center gap-4 text-left">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <RefreshCw size={20} className={isUpdating ? "animate-spin" : ""} />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-800 tracking-tight">Software Update</p>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Check for new stability features</p>
            </div>
          </div>
        </button>

        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-800 tracking-tight">Hardware Security</p>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">End-to-end encrypted stream</p>
            </div>
          </div>
          <span className="text-[9px] font-black px-2 py-1 bg-emerald-500 text-white rounded-lg uppercase tracking-tighter">Secure</span>
        </div>
      </div>

      {/* Critical Actions */}
      <div className="space-y-4 pt-4">
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">Hardware Management</h3>
        {device.isConnected ? (
          <button 
            onClick={handleUnpair}
            className="w-full flex items-center justify-between p-6 glass border-rose-100 rounded-[32px] shadow-soft hover:bg-rose-50 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Trash2 size={20} />
              </div>
              <div className="text-left">
                <p className="text-sm font-extrabold text-rose-600 tracking-tight">Unpair Device</p>
                <p className="text-[9px] font-black text-rose-300 uppercase tracking-widest mt-0.5">Disconnect hardware from account</p>
              </div>
            </div>
          </button>
        ) : (
          <button 
            onClick={() => dispatch(setDeviceStatus(true))}
            className="w-full flex items-center justify-between p-6 bg-slate-900 border-indigo-500/20 rounded-[32px] shadow-premium hover:bg-slate-800 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-500 text-white rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Wifi size={20} />
              </div>
              <div className="text-left">
                <p className="text-sm font-extrabold text-white tracking-tight">Pair Device</p>
                <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mt-0.5">Reconnect PostureAI Pod</p>
              </div>
            </div>
            <RefreshCw size={18} className="text-indigo-400" />
          </button>
        )}
      </div>

      {/* Connection Info */}
      <div className="p-4 bg-slate-50 rounded-3xl flex gap-3 items-start">
        <AlertCircle size={14} className="text-slate-400 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] font-bold text-slate-400 leading-relaxed uppercase tracking-tight">
          To pair a new device, ensure Bluetooth is enabled and hold the power button for 5 seconds until the LED flashes blue.
        </p>
      </div>
    </div>
  );
};
