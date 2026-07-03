import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, unpairDevice, setDeviceStatus, setAutoRecordEnabled } from '../store/store';
import { Wifi, Battery, Cpu, ShieldCheck, Trash2, Smartphone, AlertCircle, RefreshCw, ChevronLeft, Bluetooth, Eye, Link2, Link2Off } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { auth } from '../lib/firebase';
import { bluetoothService } from '../services/bluetoothService';

export const DeviceScreen: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const device = useSelector((state: RootState) => state.device);
  const { angle, baselineAngle, autoRecordEnabled } = useSelector((state: RootState) => state.posture);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isConnectingBle, setIsConnectingBle] = useState(false);
  const [hasBlePermissionError, setHasBlePermissionError] = useState(false);

  const handleConnectBle = async () => {
    setIsConnectingBle(true);
    setHasBlePermissionError(false);
    try {
      const success = await bluetoothService.connect();
      if (success) {
        dispatch(setDeviceStatus(true));
      } else {
        alert("Could not establish BLE GATT connection. Make sure your pod's Bluetooth is active.");
      }
    } catch (err: any) {
      const errMsg = String(err.message || err);
      if (errMsg.includes('permissions policy') || errMsg.includes('disallowed') || errMsg.includes('SecurityError')) {
        setHasBlePermissionError(true);
        console.warn('Bluetooth connection disallowed by permissions policy inside iframe.');
      } else {
        console.error(err);
        alert(`Bluetooth link failed: ${err.message || err}`);
      }
    } finally {
      setIsConnectingBle(false);
    }
  };

  const handleDisconnectBle = () => {
    bluetoothService.disconnect();
    dispatch(setDeviceStatus(false));
  };

  const handleUnpair = () => {
    if (confirm("Are you sure you want to unpair PostureAI Hardware v2.4? This will stop real-time monitoring.")) {
      bluetoothService.disconnect();
      dispatch(unpairDevice());
      navigate('/more');
    }
  };

  const handleUpdate = () => {
    setIsUpdating(true);
    setTimeout(() => setIsUpdating(false), 3000);
  };

  if (!device.hasPaired) {
    return (
      <div className="p-6 space-y-6 pb-24 relative z-10">
        <button onClick={() => navigate('/more')} className="flex items-center gap-2 text-slate-400 font-bold mb-2">
          <ChevronLeft size={18} />
          <span className="text-[10px] uppercase tracking-widest">Back to Settings</span>
        </button>

        <div className="glass p-8 rounded-[48px] shadow-premium text-center space-y-6 border-white/60 py-12">
          <div className="w-20 h-25 bg-indigo-50/80 text-indigo-500 rounded-3xl flex items-center justify-center mx-auto shadow-indigo-100/50 shadow-lg border border-indigo-100">
            <Cpu size={36} className="animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">No Hardware Paired</h2>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              Your account isn't coupled with a PosturePal LSM6DS3 pod. Pair your device to enable precision biofeedback and real-time posture assessments.
            </p>
          </div>

          <button
            onClick={() => navigate('/device-setup')}
            className="px-6 py-4 bg-gradient-to-r from-slate-900 to-black text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-premium hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 max-w-xs mx-auto w-full"
          >
            <Bluetooth className="w-4 h-4 animate-pulse text-indigo-400" />
            Launch Pairing Wizard
          </button>
        </div>
      </div>
    );
  }

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

      {/* Live Stream Telemetry Monitor */}
      <div className="glass p-6 rounded-[36px] shadow-soft space-y-4 border-indigo-200/40 bg-gradient-to-br from-indigo-50/20 to-white/95">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                device.isConnected ? "bg-emerald-400" : "bg-rose-400"
              )}></span>
              <span className={cn(
                "relative inline-flex rounded-full h-2 w-2",
                device.isConnected ? "bg-emerald-500" : "bg-rose-500"
              )}></span>
            </span>
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Live Telemetry Diagnostics</span>
          </div>
          <span className="text-[9px] font-mono px-2 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200 uppercase font-extrabold">
            {device.isConnected ? "Physical Stream Active" : "Stream Standby"}
          </span>
        </div>

        <div className="bg-slate-950 rounded-2xl p-4 font-mono text-[10px] text-emerald-400 space-y-2 border border-slate-900 shadow-inner">
          <div className="flex justify-between items-center text-[10px] border-b border-slate-800 pb-1.5 mb-1.5 font-bold">
            <span className="text-slate-500 uppercase text-[8px] tracking-wider">Channel Metric</span>
            <span className="text-slate-500 uppercase text-[8px] tracking-wider">Stream State</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-500 text-[9px]">📡 Firestore Stream:</span>
            <span className="text-white text-right truncate max-w-[180px]">
              /devices/{auth.currentUser?.uid || 'guest'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 text-[9px]">📐 Spine Slouch Angle:</span>
            <span className="text-emerald-300 font-bold">{angle}°</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 text-[9px]">🔄 Telemetry Updates:</span>
            <span className="text-indigo-400">{device.isConnected ? "CONNECTED & STANDBY" : "OFFLINE / DISCONNECTED"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 text-[9px]">📊 Baseline Calibrated:</span>
            <span className="text-emerald-400">{baselineAngle}°</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 text-[9px]">🔋 PosturePal Pod Battery:</span>
            <span className="text-slate-200">{device.batteryLevel}%</span>
          </div>
        </div>

        <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/40 text-[9px] text-indigo-950 leading-relaxed font-bold">
          💡 <strong>Verification Guide:</strong> When your hardware writes measurements, the changes trigger an immediate push to <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-800">/devices/{"{uid}"}</code>. The app subscribes to this doc in real-time, instantly rendering live alignment updates!
        </div>
      </div>

      {/* Auto-Recording Configuration */}
      <div className="glass p-6 rounded-[36px] shadow-soft space-y-4 border-slate-100 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <RefreshCw size={20} className={autoRecordEnabled ? "animate-spin" : ""} />
            </div>
            <div className="text-left">
              <p className="text-sm font-extrabold text-slate-800 tracking-tight">Auto-Record When Online</p>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">ESP32 Auto-Session trigger</p>
            </div>
          </div>
          
          <button
            onClick={() => dispatch(setAutoRecordEnabled(!autoRecordEnabled))}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
              autoRecordEnabled ? "bg-indigo-600" : "bg-slate-200"
            )}
            role="switch"
            aria-checked={autoRecordEnabled}
            id="toggle-auto-record"
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                autoRecordEnabled ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
        </div>
        
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide leading-relaxed text-left">
          When this feature is enabled, a posture recording session will automatically activate as soon as real-world posture streams are received from your physical ESP32 LSM6DS3 device!
        </p>
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

        {hasBlePermissionError && (
          <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-[28px] text-left space-y-3 shadow-md mx-2">
            <div className="flex items-center gap-2 text-amber-500 text-xs font-black uppercase tracking-wider">
              <AlertCircle size={15} className="animate-pulse" />
              Embedded Iframe Restricting BLE
            </div>
            <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
              Google AI Studio restricts active Web Bluetooth hardware pairing within the embedded dev preview iframe. To link and stream telemetry from your physical <strong className="text-slate-900">PosturePal ESP32 pod</strong>, please open this app in a new browser tab:
            </p>
            <a
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-[10px] uppercase tracking-wider font-extrabold transition-all active:scale-95 shadow-sm"
            >
              Open in New Tab ↗
            </a>
          </div>
        )}
        
        {device.isConnected ? (
          <button 
            onClick={handleDisconnectBle}
            className="w-full flex items-center justify-between p-6 bg-slate-900 border-rose-500/20 rounded-[32px] shadow-premium hover:bg-slate-800 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-500 text-white rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Link2Off size={20} />
              </div>
              <div className="text-left">
                <p className="text-sm font-extrabold text-white tracking-tight">Disconnect BLE</p>
                <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mt-0.5">Pause local Bluetooth Low Energy stream</p>
              </div>
            </div>
          </button>
        ) : (
          <button 
            onClick={handleConnectBle}
            disabled={isConnectingBle}
            className="w-full flex items-center justify-between p-6 bg-slate-900 border-indigo-500/20 rounded-[32px] shadow-premium hover:bg-slate-800 transition-colors group disabled:opacity-50"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-500 text-white rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Link2 size={20} className={isConnectingBle ? "animate-spin" : ""} />
              </div>
              <div className="text-left">
                <p className="text-sm font-extrabold text-white tracking-tight">
                  {isConnectingBle ? "Connecting..." : "Connect Live BLE"}
                </p>
                <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mt-0.5">Initiate direct low-latency pod stream</p>
              </div>
            </div>
          </button>
        )}

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
