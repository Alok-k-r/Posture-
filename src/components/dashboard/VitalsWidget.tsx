import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, updateVitals } from '../../store/store';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Activity, X, Bluetooth, Sparkles, RefreshCw, CheckCircle2, Zap, ArrowUpRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { vitalsService } from '../../services/vitalsService';

export const VitalsWidget: React.FC = () => {
  const dispatch = useDispatch();
  const vitals = useSelector((state: RootState) => state.vitals);
  const device = useSelector((state: RootState) => state.device);
  const posture = useSelector((state: RootState) => state.posture);
  const isSimulating = posture.isSimulating;

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [correlationAnalysis, setCorrelationAnalysis] = useState<string | null>(null);

  // Check accessibility reduced motion preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, []);

  // Determine active connection state: true only if physical BLE device is paired or simulator active
  const isLive = Boolean(device.isConnected || isSimulating);

  // Background physiological simulation only when live/simulating
  useEffect(() => {
    if (!isLive) return;

    // Small organic variations (e.g. 71-74 BPM, 98-99% SpO2)
    const interval = setInterval(() => {
      const randomBpmOffset = Math.floor(Math.random() * 3) - 1; // -1, 0, +1
      const newBpm = Math.min(84, Math.max(68, (vitals.heartRate || 72) + randomBpmOffset));
      const randomSpo2 = Math.random() > 0.85 ? 99 : 98;

      // Log through vitalsService to keep backend, local store, and statistics in sync
      vitalsService.logTelemetry({
        heartRate: newBpm,
        spo2: randomSpo2,
        status: 'live',
        postureAngle: posture.angle,
        deviceId: device.isConnected ? 'ble-wearable-pod' : 'simulator-vitals',
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [isLive, vitals.heartRate, posture.angle, device.isConnected]);

  const heartRate = vitals.heartRate || 72;
  const spo2 = vitals.spo2 || 98;
  const hrv = vitals.hrv || 48;
  const dailyStats = vitals.dailyStats || {
    minHr: 65,
    maxHr: 88,
    avgHr: 72,
    minSpo2: 97,
    maxSpo2: 99,
    avgSpo2: 98,
  };

  // Real-time calculated beat interval in seconds: 60 / BPM
  const beatDuration = Math.max(0.45, Math.min(1.5, 60 / heartRate));

  // Heart Rate Classification
  const getHeartRateState = (bpm: number) => {
    if (bpm < 60) return { label: 'Resting / Low', color: '#5B8DEF' };
    if (bpm > 120) return { label: 'CHECK', color: '#EF6A6A' };
    if (bpm > 100) return { label: 'ELEVATED', color: '#F59E0B' };
    return { label: 'Normal', color: '#42B883' };
  };

  // SpO2 Classification
  const getSpO2State = (level: number) => {
    if (level < 90) return { label: 'Low', color: '#EF6A6A' };
    if (level < 95) return { label: 'Below usual', color: '#F59E0B' };
    return { label: 'Normal', color: '#42B883' };
  };

  const hrStatus = getHeartRateState(heartRate);
  const spo2Status = getSpO2State(spo2);
  const hrZone = vitalsService.getHeartRateZone(heartRate);
  const spo2Category = vitalsService.getSpo2Category(spo2);

  const handleRunCorrelationAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await vitalsService.analyzeCorrelation({
        heartRate,
        spo2,
        postureAngle: posture.angle,
        postureScore: posture.score,
        vitalsHistory: vitals.history || [],
      });
      setCorrelationAnalysis(result);
    } catch (e) {
      console.error(e);
      setCorrelationAnalysis('Unable to generate AI correlation at this moment.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
        whileTap={{ scale: prefersReducedMotion ? 1 : 0.985 }}
        onClick={() => setIsDetailModalOpen(true)}
        className={cn(
          "relative rounded-[24px] sm:rounded-[26px] p-3 sm:p-4 overflow-hidden flex flex-col justify-between border border-white/80 select-none shadow-[0_8px_24px_-6px_rgba(15,23,42,0.06),0_2px_8px_rgba(15,23,42,0.02)] transition-shadow hover:shadow-[0_12px_28px_-6px_rgba(15,23,42,0.08)] cursor-pointer",
          "bg-gradient-to-br from-[#FFF5F7] via-[#FAF5FF] to-[#F2F6FE]"
        )}
        style={{ minHeight: '172px' }}
      >
        {/* 1. Subtle Animated Ambient Living Gradient */}
        {!prefersReducedMotion && (
          <motion.div
            animate={{
              opacity: [0.15, 0.28, 0.15],
              scale: [1, 1.06, 1],
            }}
            transition={{
              duration: 9,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -bottom-10 -right-10 w-36 h-36 sm:w-44 sm:h-44 rounded-full pointer-events-none blur-2xl bg-pink-200/30"
          />
        )}

        {/* 2. Top Header: Vitals Label + Live Status Pill */}
        <div className="flex items-start justify-between relative z-10 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            {/* Heartbeat Badge */}
            <div className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 rounded-full bg-white/80 backdrop-blur-md shadow-2xs border border-pink-100 flex items-center justify-center text-pink-500">
              <Activity size={13} className="stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <span className="text-[9.5px] sm:text-[10.5px] font-black uppercase tracking-wider text-slate-800 block leading-none">
                VITALS
              </span>
              <span className="text-[9.5px] sm:text-[10.5px] font-semibold text-slate-400 block leading-tight mt-0.5 truncate">
                Live Health
              </span>
            </div>
          </div>

          {/* Dynamic Connection Indicator */}
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/75 backdrop-blur-md border border-white/60 shadow-2xs shrink-0">
            {isLive ? (
              <>
                <motion.span
                  animate={prefersReducedMotion ? {} : { opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"
                />
                <span className="text-[8.5px] sm:text-[9px] font-black tracking-wider text-emerald-700 uppercase">
                  LIVE
                </span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full border border-slate-400 bg-transparent shrink-0" />
                <span className="text-[8.5px] sm:text-[9px] font-bold tracking-wider text-slate-400 uppercase">
                  OFFLINE
                </span>
              </>
            )}
          </div>
        </div>

        {/* 3. Section 1: Heart Rate with Dynamic BPM Radial Pulse */}
        <div className="flex items-center justify-between py-1 relative z-10 min-w-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <Heart size={10} className="text-rose-500 fill-rose-500 shrink-0" />
              <span className="text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider text-slate-500 truncate">
                HEART RATE
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
                {isLive ? heartRate : '--'}
              </span>
              <span className="text-[9.5px] font-bold text-slate-400">BPM</span>
            </div>
            <span
              className="text-[8.5px] sm:text-[9px] font-bold block mt-0.5 leading-none"
              style={{ color: isLive ? hrStatus.color : '#94A3B8' }}
            >
              {isLive ? hrStatus.label : 'Device offline'}
            </span>
          </div>

          {/* Concentric Heart Pulse Rings */}
          <div className="relative w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center shrink-0">
            {/* Outer Soft Ring */}
            <motion.div
              animate={prefersReducedMotion || !isLive ? {} : {
                scale: [1, 1.12, 1],
                opacity: [0.35, 0.65, 0.35]
              }}
              transition={{ duration: beatDuration, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full bg-pink-100/70 border border-pink-200/50"
            />

            {/* Middle Ring */}
            <motion.div
              animate={prefersReducedMotion || !isLive ? {} : {
                scale: [1, 1.08, 1],
                opacity: [0.6, 0.9, 0.6]
              }}
              transition={{ duration: beatDuration, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-1 sm:inset-1.5 rounded-full bg-white/80 shadow-2xs flex items-center justify-center border border-pink-100"
            />

            {/* Heart Core Icon (Pulsing at 60 / BPM) */}
            <motion.div
              animate={prefersReducedMotion || !isLive ? {} : {
                scale: [1, 1.16, 1],
              }}
              transition={{ duration: beatDuration, repeat: Infinity, ease: "easeInOut" }}
              className="relative z-10"
            >
              <Heart size={15} className={cn("transition-colors", isLive ? "text-[#D94B72] fill-[#D94B72]" : "text-slate-400 fill-slate-300")} />
            </motion.div>
          </div>
        </div>

        {/* Subtle Divider */}
        <div className="border-t border-slate-200/60 my-0.5" />

        {/* 4. Section 2: SpO2 with Circular Oxygen Ring & Soft Sine Wave */}
        <div className="flex items-center justify-between py-1 relative z-10 min-w-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="text-[8.5px] font-black text-emerald-600">O₂</span>
              <span className="text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider text-slate-500 truncate">
                SPO2
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
                {isLive ? spo2 : '--'}
              </span>
              <span className="text-[9.5px] font-bold text-slate-400">%</span>
            </div>
            <span
              className="text-[8.5px] sm:text-[9px] font-bold block mt-0.5 leading-none"
              style={{ color: isLive ? spo2Status.color : '#94A3B8' }}
            >
              {isLive ? spo2Status.label : 'Waiting for telemetry'}
            </span>
          </div>

          {/* Circular Oxygen Ring Visualization with Sine Wave Detail */}
          <div className="relative w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center shrink-0">
            {/* Breathing Outer Ring */}
            <motion.div
              animate={prefersReducedMotion || !isLive ? {} : {
                scale: [1, 1.05, 1],
                opacity: [0.6, 0.9, 0.6]
              }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full bg-emerald-50/80 border border-emerald-200/60 shadow-2xs"
            />

            {/* Center O2 Badge */}
            <div className="w-6.5 h-6.5 sm:w-7.5 sm:h-7.5 rounded-full bg-white shadow-2xs border border-emerald-100 flex items-center justify-center relative z-10">
              <span className="text-[9.5px] sm:text-[10px] font-black text-emerald-600 tracking-tighter">
                O₂
              </span>
            </div>

            {/* Decorative Corner Sine Wave */}
            <div className="absolute -bottom-1 -right-2 w-9 sm:w-11 h-4 pointer-events-none opacity-40">
              <svg viewBox="0 0 48 20" fill="none" className="w-full h-full">
                <path
                  d="M 2 16 C 12 16, 18 4, 28 4 C 38 4, 42 16, 46 16"
                  stroke="#8B5CF6"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </motion.div>

      {/* DETAILED VITALS & CARDIOPULMONARY CLINICAL MODAL */}
      <AnimatePresence>
        {isDetailModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 text-slate-800 max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
                    <Activity size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Vitals & Live Health Hub</h3>
                    <p className="text-xs text-slate-500">Cardiopulmonary Telemetry & Biomechanical Core</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Status Banner with Server Sync Badge */}
              <div className={cn(
                "p-3 rounded-2xl flex items-center justify-between gap-3 border",
                isLive ? "bg-emerald-50/80 text-emerald-900 border-emerald-200/80" : "bg-slate-50 text-slate-700 border-slate-200"
              )}>
                <div className="flex items-center gap-2.5 min-w-0">
                  {isLive ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  ) : (
                    <Bluetooth size={16} className="text-slate-400 shrink-0" />
                  )}
                  <div className="text-xs min-w-0">
                    <div className="font-bold truncate">
                      {isLive ? 'Hardware Live Feed Connected' : 'Wearable Pod Offline'}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {isLive ? 'Continuous optical PPG & dual-wavelength pulse oximetry' : 'Pair wearable or run simulator for live data stream'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white text-[10px] font-bold shadow-2xs shrink-0 text-slate-600">
                  <CheckCircle2 size={11} className="text-emerald-500" />
                  <span>Synced to Server</span>
                </div>
              </div>

              {/* 4-Stat Telemetry Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Heart Rate</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-slate-900">{isLive ? heartRate : '--'}</span>
                    <span className="text-[10px] font-bold text-slate-400">BPM</span>
                  </div>
                  <span className="text-[10px] font-bold mt-0.5 block" style={{ color: hrStatus.color }}>
                    {hrStatus.label}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">SpO2 Oxygen</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-slate-900">{isLive ? spo2 : '--'}</span>
                    <span className="text-[10px] font-bold text-slate-400">%</span>
                  </div>
                  <span className="text-[10px] font-bold mt-0.5 block" style={{ color: spo2Status.color }}>
                    {spo2Category.category}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Resting HR</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-slate-900">{dailyStats.minHr}</span>
                    <span className="text-[10px] font-bold text-slate-400">BPM</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">Today's Min</span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Est. HRV</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-xl font-black text-slate-900">{isLive ? hrv : '--'}</span>
                    <span className="text-[10px] font-bold text-slate-400">ms</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">Vagal Tone</span>
                </div>
              </div>

              {/* Heart Rate Physiological Zone */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-slate-800">Autonomic Zone: {hrZone.zone}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ backgroundColor: `${hrZone.color}20`, color: hrZone.color }}>
                    {heartRate} BPM
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {hrZone.description}
                </p>
              </div>

              {/* Spinal-Cardiovascular Biomechanical Linkage */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-100">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 mb-1">
                  <Zap size={14} className="text-indigo-600" />
                  <span>Spinal-Cardiopulmonary Coupling</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Current posture pitch is <strong>{Math.round(posture.angle)}°</strong>. Forward head posture and slumped thoracic kyphosis compress the anterior ribcage, restricting diaphragmatic excursion and forcing shallow breathing, which elevates resting cardiac work.
                </p>

                {correlationAnalysis ? (
                  <div className="mt-3 p-3 rounded-xl bg-white border border-indigo-100 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                    <div className="font-bold text-indigo-950 mb-1 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-indigo-600" />
                      <span>Clinical Biomechanical Assessment</span>
                    </div>
                    {correlationAnalysis}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleRunCorrelationAnalysis}
                    disabled={isAnalyzing}
                    className="mt-2.5 w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60 shadow-xs"
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw size={13} className="animate-spin" />
                        <span>Analyzing Cardiopulmonary Alignment...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} />
                        <span>Analyze Cardiopulmonary Correlation (AI Engine)</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
