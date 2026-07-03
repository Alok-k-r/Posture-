import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, setThresholds, recalibrateBaseline, addToSyncQueue } from '../store/store';
import { Star, AlertTriangle, XCircle, Save, RotateCcw, Info, Bell, Zap, Sliders, Target } from 'lucide-react';
import { cn } from '../lib/utils';
import { bluetoothService } from '../services/bluetoothService';
import { db, auth, rtdb } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { ref as rtdbRef, set as rtdbSet } from 'firebase/database';

export const ThresholdScreen: React.FC = () => {
  const dispatch = useDispatch();
  const currentThresholds = useSelector((state: RootState) => state.posture.thresholds);
  const baselineAngle = useSelector((state: RootState) => state.posture.baselineAngle);
  const currentAngle = useSelector((state: RootState) => state.posture.angle);
  const isOnline = useSelector((state: RootState) => state.sync.isOnline);

  const [local, setLocal] = useState(currentThresholds);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);

  const handleSave = () => {
    dispatch(setThresholds(local));
    
    // Sync to cloud
    dispatch(addToSyncQueue({
      id: `thresh_${Date.now()}`,
      type: 'SYNC_THRESHOLDS',
      payload: local,
      timestamp: new Date().toISOString()
    }));

    // If connected to physical ESP32 pod via BLE, write active parameters to its flash preferences
    if (bluetoothService.isConnected()) {
      // local.alertAngle is the threshold angle; alertDelay is the warning confirmation timer in seconds
      bluetoothService.writeConfig(local.alertAngle, local.alertDelay * 1000, baselineAngle).catch((err) => {
        console.warn('Could not update ESP32 config over active BLE link:', err);
      });
    }

    // Also sync thresholds to Firebase Realtime Database config path for physical device
    const uid = auth.currentUser?.uid;
    if (uid) {
      const configRef = rtdbRef(rtdb, `devices/${uid}/config`);
      rtdbSet(configRef, {
        alertAngle: local.alertAngle,
        alertDelayMs: local.alertDelay * 1000,
        vibrationEnabled: local.vibrationEnabled,
        reminderMessage: local.reminderMessage
      }).catch(err => console.warn('Could not update RTDB config:', err));
    }

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleRecalibrate = () => {
    setIsCalibrating(true);
    let count = 3;
    const interval = setInterval(async () => {
      count -= 1;
      if (count <= 0) {
        clearInterval(interval);
        const calibratedAngle = Math.round(currentAngle);
        dispatch(recalibrateBaseline(calibratedAngle));

        // 1. Sync BLE if connected
        if (bluetoothService.isConnected()) {
          bluetoothService.writeConfig(local.alertAngle, local.alertDelay * 1000, calibratedAngle).catch((err) => {
            console.warn('Could not write calibration baseline to ESP32 over BLE:', err);
          });
        }

        // 2. Sync to Firestore and RTDB under user's actual UID
        const uid = auth.currentUser?.uid;
        if (uid) {
          try {
            // Firestore device document
            const deviceRef = doc(db, 'devices', uid);
            await setDoc(deviceRef, {
              baselineAngle: calibratedAngle,
              lastSync: new Date().toISOString()
            }, { merge: true });

            // RTDB current/config path
            const currentRef = rtdbRef(rtdb, `devices/${uid}/current`);
            await rtdbSet(currentRef, {
              baselineAngle: calibratedAngle,
              lastCalibrated: new Date().toISOString()
            });

            console.log('✅ Physical device calibration synchronized to Firestore and Realtime Database.');
          } catch (err) {
            console.error('Failed to sync physical device calibration to cloud database:', err);
          }
        }

        setIsCalibrating(false);
      }
    }, 1000);
  };

  const handleReset = () => {
    setLocal({ 
      good: 80, 
      warn: 65, 
      bad: 50,
      alertAngle: 15,
      alertDelay: 5,
      vibrationIntensity: 70,
      vibrationEnabled: true,
      slouchWarningTime: 10,
      slouchStrongTime: 30,
      snoozeDuration: 20,
      stopDuration: 600,
      reminderMessage: "Spine Alignment Alert! Please sit up straight, roll your shoulders back, and protect your back."
    });
  };

  return (
    <div className="p-6 space-y-6 pb-24 relative z-10">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none">Thresholds</h2>
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2">Personal Calibration</p>
      </div>

      {/* Recalibrate Baseline Card */}
      <div className="glass p-6 rounded-[40px] shadow-premium space-y-5 border-emerald-100/50">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-800 tracking-tight">Recalibrate Baseline</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Set current angle as 0° (Perfect)</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <Target size={24} />
          </div>
        </div>
        
        <div className="bg-slate-100/50 p-4 rounded-3xl flex items-center justify-between">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Baseline</p>
            <p className="text-xl font-black text-slate-800">{Math.round(baselineAngle)}°</p>
          </div>
          <button 
            onClick={handleRecalibrate}
            disabled={isCalibrating}
            className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all disabled:opacity-50"
          >
            {isCalibrating ? "Calibrating..." : "Calibrate Now"}
          </button>
        </div>
      </div>

      {/* Alert Configuration */}
      <div className="glass p-8 rounded-[48px] shadow-premium space-y-8">
        <div className="flex items-center gap-3">
          <Bell size={20} className="text-indigo-500" />
          <h3 className="text-base font-black text-slate-800 tracking-tight">Alert Intelligence</h3>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Alert Angle Delta</span>
            <span className="text-sm font-black text-indigo-600">{local.alertAngle}°</span>
          </div>
          <input 
            type="range" min="5" max="30" value={local.alertAngle} 
            onChange={(e) => setLocal({ ...local, alertAngle: Number(e.target.value) })}
            className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600 shadow-inner" 
          />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Detection Delay</span>
            <span className="text-sm font-black text-indigo-600">{local.alertDelay}s</span>
          </div>
          <input 
            type="range" min="1" max="30" value={local.alertDelay} 
            onChange={(e) => setLocal({ ...local, alertDelay: Number(e.target.value) })}
            className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600 shadow-inner" 
          />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Vibration Intensity</span>
            <span className="text-sm font-black text-amber-500">{local.vibrationIntensity}%</span>
          </div>
          <input 
            type="range" min="0" max="100" value={local.vibrationIntensity} 
            onChange={(e) => setLocal({ ...local, vibrationIntensity: Number(e.target.value) })}
            className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-amber-500 shadow-inner" 
          />
        </div>
      </div>

      {/* Real-time Slouch Alarm Customization */}
      <div className="glass p-8 rounded-[48px] shadow-premium space-y-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Zap size={20} className="text-rose-500" />
            <h3 className="text-base font-black text-slate-800 tracking-tight">Vibration Slouch Alarm</h3>
          </div>
          <button
            onClick={() => setLocal({ ...local, vibrationEnabled: !local.vibrationEnabled })}
            className={cn(
              "p-1.5 px-3 rounded-full text-[9px] font-black uppercase tracking-wider transition-all",
              local.vibrationEnabled 
                ? "bg-emerald-100 text-emerald-700 border border-emerald-200" 
                : "bg-slate-100 text-slate-400 border border-slate-200"
            )}
          >
            {local.vibrationEnabled ? "Active" : "Muted"}
          </button>
        </div>

        <div className="space-y-6">
          {/* Custom Reminder Message */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block px-1">
              Custom Reminder Message
            </label>
            <p className="text-[9px] text-slate-400 font-bold px-1 mb-2">Message displayed on the full-screen alarm page</p>
            <textarea
              rows={2}
              value={local.reminderMessage || ''}
              onChange={(e) => setLocal({ ...local, reminderMessage: e.target.value })}
              placeholder="E.g., Spine Alignment Alert! Please sit up straight."
              className="w-full text-xs font-medium text-slate-700 p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 placeholder:text-slate-300 resize-none shadow-inner"
            />
          </div>
          {/* Slouch Warning Threshold Seconds */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <div>
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Slouch Trigger Delay (Slight Vibe)</span>
                <p className="text-[9px] text-slate-400 font-bold mt-1">First alert delay for brief slump period</p>
              </div>
              <span className="text-sm font-black text-slate-800">{local.slouchWarningTime}s</span>
            </div>
            <input 
              type="range" min="3" max="60" value={local.slouchWarningTime} 
              onChange={(e) => setLocal({ ...local, slouchWarningTime: Number(e.target.value) })}
              className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600 shadow-inner" 
            />
          </div>

          {/* Slouch Strong Alert Threshold Seconds */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <div>
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Slouch Ignore Delay (Strong Vibe)</span>
                <p className="text-[9px] text-slate-400 font-bold mt-1">Escalates vibration strength when ignored</p>
              </div>
              <span className="text-sm font-black text-rose-500">{local.slouchStrongTime}s</span>
            </div>
            <input 
              type="range" min="15" max="120" value={local.slouchStrongTime} 
              onChange={(e) => setLocal({ ...local, slouchStrongTime: Number(e.target.value) })}
              className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-rose-500 shadow-inner" 
            />
          </div>

          {/* Snooze Duration */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <div>
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Snooze Duration</span>
                <p className="text-[9px] text-slate-400 font-bold mt-1">Subdues slight vibration while slouching</p>
              </div>
              <span className="text-sm font-black text-indigo-600">{local.snoozeDuration}s</span>
            </div>
            <input 
              type="range" min="5" max="120" value={local.snoozeDuration} 
              onChange={(e) => setLocal({ ...local, snoozeDuration: Number(e.target.value) })}
              className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600 shadow-inner" 
            />
          </div>

          {/* Stop Silence Duration */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <div>
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Silence Duration (Stop Button)</span>
                <p className="text-[9px] text-slate-400 font-bold mt-1">Completely suspends alerts after tapping Stop</p>
              </div>
              <span className="text-sm font-black text-indigo-600">{Math.round(local.stopDuration / 60)} mins</span>
            </div>
            <input 
              type="range" min="1" max="60" value={Math.round(local.stopDuration / 60)} 
              onChange={(e) => setLocal({ ...local, stopDuration: Number(e.target.value) * 60 })}
              className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-indigo-600 shadow-inner" 
            />
          </div>

          {/* Vibration Tester Zone */}
          <div className="bg-slate-50 p-5 rounded-[32px] space-y-4 border border-slate-100">
            <div className="text-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Tactile Alignment Testing</span>
              <p className="text-[8px] text-slate-400 font-medium mt-1">Tap below to test different phone vibration patterns</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button"
                onClick={() => {
                  if ('vibrate' in navigator) navigator.vibrate([150]);
                }}
                className="p-3.5 rounded-2xl bg-white hover:bg-slate-100 border border-slate-200/60 shadow-soft text-[9px] font-black uppercase tracking-wider text-slate-700 active:scale-95 transition-all text-center"
              >
                📳 Slight Vibration
              </button>
              <button 
                type="button"
                onClick={() => {
                  if ('vibrate' in navigator) navigator.vibrate([400, 150, 400]);
                }}
                className="p-3.5 rounded-2xl bg-white hover:bg-slate-100 border border-slate-200/60 shadow-soft text-[9px] font-black uppercase tracking-wider text-rose-500 active:scale-95 transition-all text-center"
              >
                📳 Strong Vibration
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="glass p-6 rounded-[40px] shadow-soft space-y-5">
        <div className="flex items-center gap-2 ml-2">
          <Sliders size={16} className="text-slate-400" />
          <h3 className="text-xs font-black text-slate-500 tracking-tight uppercase">Scoring Thresholds</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'GOOD', key: 'good', color: 'bg-emerald-50 text-emerald-600' },
            { label: 'WARN', key: 'warn', color: 'bg-amber-50 text-amber-600' },
            { label: 'BAD', key: 'bad', color: 'bg-rose-50 text-rose-600' },
          ].map((t) => (
            <div key={t.key} className={cn("p-4 rounded-3xl text-center space-y-1 shadow-soft", t.color)}>
              <span className="text-[8px] font-black uppercase tracking-widest opacity-60">{t.label}</span>
              <p className="text-lg font-black">{local[t.key as keyof typeof local]}°</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        <button 
          onClick={handleReset}
          className="flex-1 glass border-white/40 text-slate-400 py-5 rounded-3xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-soft"
        >
          <RotateCcw size={18} /> Reset
        </button>
        <button 
          onClick={handleSave}
          className="flex-[2] bg-slate-900 text-white py-5 rounded-3xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-premium active:scale-95 transition-all"
        >
          {showSuccess ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
              <Star size={18} fill="white" /> Applied
            </motion.div>
          ) : (
            <>
              <Save size={18} /> Save Config
            </>
          )}
        </button>
      </div>
    </div>
  );
};
