import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, setThresholds, recalibrateBaseline } from '../store/store';
import { Star, AlertTriangle, XCircle, Save, RotateCcw, Info, Bell, Zap, Sliders, Target } from 'lucide-react';
import { cn } from '../lib/utils';

export const ThresholdScreen: React.FC = () => {
  const dispatch = useDispatch();
  const currentThresholds = useSelector((state: RootState) => state.posture.thresholds);
  const baselineAngle = useSelector((state: RootState) => state.posture.baselineAngle);
  const currentAngle = useSelector((state: RootState) => state.posture.angle);

  const [local, setLocal] = useState(currentThresholds);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);

  const handleSave = () => {
    dispatch(setThresholds(local));
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleRecalibrate = () => {
    setIsCalibrating(true);
    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(interval);
        dispatch(recalibrateBaseline(currentAngle));
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
      vibrationIntensity: 70
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
            <p className="text-xl font-black text-slate-800">{baselineAngle}°</p>
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
