import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, tickSessionStats } from '../../store/store';
import { motion, AnimatePresence } from 'motion/react';
import { AlertOctagon, Bell, Coffee, Play, Sliders, VolumeX, Volume2, ShieldCheck, HelpCircle, ChevronRight, Clock, ShieldAlert } from 'lucide-react';
import { cn } from '../../lib/utils';
import { LocalModelService } from '../../services/localModelService';

export const SlouchAlarmManager: React.FC = () => {
  const dispatch = useDispatch();
  const { 
    angle, 
    score, 
    thresholds, 
    isRecordingSession,
    baselineAngle,
    history,
    goodSessionSeconds,
    totalSessionSeconds,
    incidents
  } = useSelector((state: RootState) => state.posture);
  
  const user = useSelector((state: RootState) => state.auth.user);
  
  // Local active states
  const [slouchSeconds, setSlouchSeconds] = useState(0);
  const [isSnoozed, setIsSnoozed] = useState(false);
  const [snoozeUntil, setSnoozeUntil] = useState<number | null>(null);
  const [snoozeLevel, setSnoozeLevel] = useState<number | null>(null);
  const [pausedUntil, setPausedUntil] = useState<number | null>(null);
  const [sliderKey, setSliderKey] = useState(0);

  // Sound and local Mute persists
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem('posturecare_alarm_muted');
    return saved === 'true';
  });

  // Current real smartphone clock
  const [currentTime, setCurrentTime] = useState(new Date());

  // Web Audio API Synthesizer references
  const audioCtxRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<any>(null);
  const vibrationIntervalRef = useRef<any>(null);
  
  // Recalculate local biomechanical analytical metrics using the upgraded five-layer on-device ML model
  const localAI = LocalModelService.recalculateAllBiomechanicalMetrics(
    angle,
    baselineAngle,
    history,
    goodSessionSeconds,
    totalSessionSeconds,
    incidents,
    user ? { age: user.age, height: user.height, weight: user.weight } : undefined
  );

  // Dynamic, model-driven personalized slouch detection based on active muscle stamina & user compliance
  const effectiveWarnThreshold = localAI?.personalizedWarnThreshold || thresholds.warn;
  const isSlouching = angle < effectiveWarnThreshold;
  const [goodPostureSeconds, setGoodPostureSeconds] = useState(0);

  // Track incidents to log hourly slouch patterns
  const prevIncidentsRef = useRef(incidents);

  useEffect(() => {
    // If a new slouch incident occurred, log it to build hourly/time-of-day pattern maps
    if (incidents > prevIncidentsRef.current) {
      LocalModelService.logSlouchTimePattern();
    }
    prevIncidentsRef.current = incidents;
  }, [incidents]);

  // 1. Clock timer
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // 2. Core slouch clock / counter effect with robust 3-second debounce
  useEffect(() => {
    let interval: any;
    
    if (isRecordingSession) {
      interval = setInterval(() => {
        // Dispatch session metrics tick to Redux
        dispatch(tickSessionStats());

        const now = Date.now();
        if (pausedUntil && now < pausedUntil) {
          setSlouchSeconds(0);
          setGoodPostureSeconds(0);
          return;
        }

        if (isSlouching) {
          setSlouchSeconds((prev) => prev + 1);
          setGoodPostureSeconds(0);
        } else {
          setGoodPostureSeconds((prev) => {
            const next = prev + 1;
            if (next >= 3) {
              setSlouchSeconds(0); // Reset slouch warning timers only after 3 consecutive seconds of correct posture
            }
            return next;
          });
        }
      }, 1000);
    } else {
      setSlouchSeconds(0);
      setGoodPostureSeconds(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSlouching, pausedUntil, isRecordingSession]);

  // 3. Audio Synth Alarm continuous loop controller
  const playAlarmSound = () => {
    if (isMuted) {
      stopAlarmSound();
      return;
    }
    
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
      }

      // Classic mobile ringtone beep pattern (beep-beep tone at 880Hz, repeat every 1.25s)
      alarmIntervalRef.current = setInterval(() => {
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        
        const playBeep = (timeOffset: number, frequency: number, duration: number) => {
          try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(frequency, ctx.currentTime + timeOffset);
            
            gain.gain.setValueAtTime(0, ctx.currentTime + timeOffset);
            gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + timeOffset + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + timeOffset + duration - 0.02);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(ctx.currentTime + timeOffset);
            osc.stop(ctx.currentTime + timeOffset + duration);
          } catch (e) {
            console.warn('Audio node failed to bind:', e);
          }
        };

        // play dual-chirp with mobile gap representation
        playBeep(0, 980, 0.12);
        playBeep(0.18, 980, 0.12);
      }, 1250);

    } catch (err) {
      console.warn('AudioContext failed setup:', err);
    }
  };

  const stopAlarmSound = () => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    if (audioCtxRef.current) {
      if (audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
      audioCtxRef.current = null;
    }
  };

  // Mute toggle handler
  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    localStorage.setItem('posturecare_alarm_muted', String(nextMute));
  };

  // 4. Check Snooze expiration and reset postural count when it ends
  useEffect(() => {
    if (snoozeUntil) {
      const interval = setInterval(() => {
        if (Date.now() >= snoozeUntil) {
          setIsSnoozed(false);
          setSnoozeUntil(null);
          setSnoozeLevel(null);
          setSlouchSeconds(0); // Fair count reset: let them posture for given time before Level 1 triggers again
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [snoozeUntil]);

  // 5. Vibration & Sound trigger synchronization
  const activeLevel2 = slouchSeconds >= thresholds.slouchStrongTime;
  const activeLevel1 = slouchSeconds >= thresholds.slouchWarningTime && !activeLevel2;
  const isSnoozedCurrently = isSnoozed && snoozeUntil && Date.now() < snoozeUntil;

  // Decide if the alert overlay and alarm is allowed to prompt:
  // - If isSnoozedCurrently:
  //   - If snoozeLevel is 2: Silenced completely.
  //   - If snoozeLevel is 1: Re-trigger only if it reaches activeLevel2.
  // - If NOT currently snoozed: show either Level 1 or Level 2 triggers.
  const isOverlayAllowed = isRecordingSession && (isSnoozedCurrently
    ? (snoozeLevel === 1 ? activeLevel2 : false)
    : (activeLevel1 || activeLevel2));

  const showOverlayAlarm = isOverlayAllowed && !(pausedUntil && Date.now() < pausedUntil);

  // Safely snooze alarm on any back button click or layout navigation within HashRouter
  useEffect(() => {
    const handleNavigationSnooze = () => {
      if (showOverlayAlarm) {
        handleSnooze();
      }
    };
    window.addEventListener('hashchange', handleNavigationSnooze);
    return () => {
      window.removeEventListener('hashchange', handleNavigationSnooze);
    };
  }, [showOverlayAlarm]);

  useEffect(() => {
    if (showOverlayAlarm) {
      setSliderKey(prev => prev + 1); // Reset Slider Handle
      playAlarmSound();
    } else {
      stopAlarmSound();
    }
    return () => stopAlarmSound();
  }, [showOverlayAlarm, isMuted]);

  // 6. Vibration loop
  const now = Date.now();
  const isPausedState = pausedUntil ? now < pausedUntil : false;
  const vibrationLevel = (!isRecordingSession || !thresholds.vibrationEnabled || isPausedState || !isOverlayAllowed)
    ? 0
    : (slouchSeconds >= thresholds.slouchStrongTime ? 2 : (slouchSeconds >= thresholds.slouchWarningTime ? 1 : 0));

  useEffect(() => {
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }

    if (vibrationLevel === 0) {
      return;
    }

    if (vibrationLevel === 2) {
      const runHeavyVibe = () => {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([400, 150, 400]);
        }
      };
      runHeavyVibe();
      vibrationIntervalRef.current = setInterval(runHeavyVibe, 1500);
    } else if (vibrationLevel === 1) {
      const runSlightVibe = () => {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([150]);
        }
      };
      runSlightVibe();
      vibrationIntervalRef.current = setInterval(runSlightVibe, 3000);
    }

    return () => {
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
        vibrationIntervalRef.current = null;
      }
    };
  }, [vibrationLevel]);

  // Command Action: Snooze Alarm
  const handleSnooze = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
    stopAlarmSound();
    setIsSnoozed(true);
    // Find active level when snooze is clicked, so we can selectively snooze
    const currentActiveLevel = slouchSeconds >= thresholds.slouchStrongTime ? 2 : 1;
    setSnoozeLevel(currentActiveLevel);
    setSnoozeUntil(Date.now() + thresholds.snoozeDuration * 1000);
  };

  // Command Action: Stop Alarm (Pause monitoring alerts for stopDuration)
  const handleStop = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
    stopAlarmSound();
    setPausedUntil(Date.now() + thresholds.stopDuration * 1000);
    setSlouchSeconds(0);
    setIsSnoozed(false);
    setSnoozeUntil(null);
    setSnoozeLevel(null);
  };

  // Remaining paused seconds calculations for the pause banner
  const [pausedSecRemaining, setPausedSecRemaining] = useState(0);
  useEffect(() => {
    if (pausedUntil) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.round((pausedUntil - Date.now()) / 100));
        setPausedSecRemaining(remaining);
        if (remaining <= 0) {
          setPausedUntil(null);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [pausedUntil]);

  // Log alarm and correction events dynamically
  const prevShowOverlayAlarmRef = useRef(false);
  const alarmStartTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (showOverlayAlarm && !prevShowOverlayAlarmRef.current) {
      // Alarm just started
      alarmStartTimeRef.current = Date.now();
      try {
        LocalModelService.logReminderSent();
        console.log('🔔 Slouch alarm triggered! Logged to local compliance logs.');
      } catch (err) {
        console.warn('Failed to log reminder sent:', err);
      }
    } else if (!showOverlayAlarm && prevShowOverlayAlarmRef.current) {
      // Alarm just stopped
      if (alarmStartTimeRef.current) {
        const responseTime = (Date.now() - alarmStartTimeRef.current) / 1000;
        // Check if the alarm stopped because they corrected (slouchSeconds is 0 or less than warning threshold)
        const corrected = slouchSeconds < thresholds.slouchWarningTime;
        if (corrected) {
          try {
            LocalModelService.logPostureCorrected(responseTime);
            console.log(`✅ Slouch corrected in ${responseTime.toFixed(1)} seconds! Logged to compliance logs.`);
          } catch (err) {
            console.warn('Failed to log posture corrected:', err);
          }
        }
        alarmStartTimeRef.current = null;
      }
    }
    prevShowOverlayAlarmRef.current = showOverlayAlarm;
  }, [showOverlayAlarm, slouchSeconds, thresholds]);

  // Format Lockscreen Chronometer displays
  const formatClockTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatClockDate = (date: Date) => {
    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase();
  };

  return (
    <>
      {/* 1. Resume notification/alert bar */}
      <AnimatePresence>
        {pausedUntil && pausedSecRemaining > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-24 left-4 right-4 z-50 bg-slate-900/95 backdrop-blur-md p-4 rounded-3xl flex items-center justify-between border border-slate-700/50 shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
                <Coffee size={18} className="animate-pulse" />
              </div>
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-400 leading-none">Slouch Alerts Paused</h4>
                <p className="text-xs text-white font-black mt-1">
                  Resuming in {Math.floor(pausedSecRemaining / 10 / 60)}m {Math.floor((pausedSecRemaining / 10) % 60)}s
                </p>
              </div>
            </div>
            <button
              onClick={() => setPausedUntil(null)}
              className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-[9px] uppercase tracking-widest rounded-lg transition-all active:scale-95"
            >
              Resume
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Full-Screen Alarming Smartphone Overlay */}
      <AnimatePresence>
        {showOverlayAlarm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-slate-950 flex flex-col justify-between p-8 pb-36 sm:pb-48 text-white overflow-hidden select-none"
          >
            {/* Ambient smartphone glowing overlays */}
            <div className="absolute inset-0 z-0">
              <div className={cn(
                "absolute -top-40 -left-40 w-[400px] h-[400px] rounded-full blur-[160px] opacity-35 transition-colors duration-1000",
                activeLevel2 ? "bg-rose-600" : "bg-amber-500"
              )} />
              <div className={cn(
                "absolute -bottom-45 -right-45 w-[400px] h-[400px] rounded-full blur-[160px] opacity-35 transition-colors duration-1000",
                activeLevel2 ? "bg-red-600" : "bg-yellow-500"
              )} />
            </div>

            {/* Top Smartphone Status Bar Area */}
            <div className="relative z-10 flex items-center justify-between w-full pt-4 px-2">
              <div className="flex items-center gap-2">
                <ShieldAlert size={14} className={activeLevel2 ? "text-rose-400" : "text-amber-400"} />
                <span className="text-[10px] font-black tracking-widest text-slate-300">POSTURECARE ALARM</span>
              </div>
              <button
                onClick={handleToggleMute}
                className={cn(
                  "p-2.5 rounded-full backdrop-blur-md border transition-all active:scale-90",
                  isMuted 
                    ? "bg-rose-500/20 border-rose-500/30 text-rose-300"
                    : "bg-white/10 border-white/15 text-slate-200 hover:bg-white/15"
                )}
                title={isMuted ? "Unmute alarm sound" : "Mute alarm sound"}
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>

            {/* Smartphone Lockscreen Clock Display */}
            <div className="relative z-10 flex flex-col items-center text-center mt-4">
              <span className="text-[11px] font-black tracking-[0.25em] text-slate-400">
                {formatClockDate(currentTime)}
              </span>
              <h2 className="text-6xl sm:text-7xl font-sans font-black tracking-tighter text-white mt-1.5 mb-1 select-none">
                {formatClockTime(currentTime)}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full animate-ping",
                  activeLevel2 ? "bg-rose-500" : "bg-amber-500"
                )} />
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest leading-none",
                  activeLevel2 ? "text-rose-400" : "text-amber-400"
                )}>
                  {activeLevel2 ? "🚨 Level 2: Critical Alignment Collapse" : "⚠️ Level 1: Slouching Warning"}
                </span>
              </div>
            </div>

            {/* Smartphone Glowing Rippling Rings */}
            <div className="relative z-10 flex-grow flex flex-col items-center justify-center py-6">
              <div className="relative w-64 h-64 flex items-center justify-center">
                
                {/* Ring 3 (Outer most wave) */}
                <motion.div
                  animate={{ scale: [0.95, 1.45, 0.95], opacity: [0.2, 0, 0.2] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  className={cn(
                    "absolute inset-0 rounded-full border-2 border-dashed opacity-10",
                    activeLevel2 ? "border-rose-500" : "border-amber-500"
                  )}
                />

                {/* Ring 2 (Middle wave) */}
                <motion.div
                  animate={{ scale: [0.95, 1.25, 0.95], opacity: [0.3, 0.1, 0.3] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  className={cn(
                    "absolute w-48 h-48 rounded-full border border-solid opacity-20",
                    activeLevel2 ? "border-rose-500" : "border-amber-500"
                  )}
                />

                {/* Ring 1 (Active Center Body) */}
                <motion.div
                  animate={{ 
                    scale: activeLevel2 ? [1, 1.1, 1] : [1, 1.04, 1],
                    rotate: activeLevel2 ? [-4, 4, -4, 4, 0] : [-1, 1, -1, 1, 0]
                  }}
                  transition={{ 
                    scale: { duration: 1.4, repeat: Infinity, ease: "easeInOut" },
                    rotate: { duration: 0.45, repeat: Infinity, ease: "easeInOut" }
                  }}
                  className={cn(
                    "w-36 h-36 rounded-full flex flex-col items-center justify-center border-2 border-slate-700/30 shadow-2xl relative select-none",
                    activeLevel2 
                      ? "bg-rose-500/15 text-rose-400 shadow-rose-950/30" 
                      : "bg-amber-500/15 text-amber-400 shadow-amber-950/20"
                  )}
                >
                  <Bell size={40} className="stroke-[1.5]" />
                  <span className="text-3xl font-black font-sans tracking-tight mt-1">{slouchSeconds}s</span>
                  <span className="text-[7px] font-black uppercase text-slate-300 tracking-wider">Slouch Time</span>
                </motion.div>
              </div>

              {/* Status details & Posture card */}
              <div className="w-full max-w-sm mt-4 px-2">
                <div className="bg-white/[0.04] border border-white/10 backdrop-blur-xl p-5 rounded-3xl shadow-2xl text-center space-y-2">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-[8px] font-black text-rose-300 uppercase tracking-[0.25em] block">
                      Spinal Diagnostics
                    </span>
                  </div>
                  <p className="text-xs font-black text-slate-200 leading-normal max-w-[280px] mx-auto italic">
                    "{thresholds.reminderMessage || 'Alignment Alert! Please sit up straight and protect your posture.'}"
                  </p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Angle: <span className="font-extrabold text-rose-400">{Math.round(angle)}°</span> (Limit: &gt;{thresholds.good}°)
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Smartphone Actions */}
            <div className="relative z-10 w-full max-w-sm mx-auto space-y-4 pb-4 mb-6 sm:mb-10">
              
              <div className="text-center">
                <p className="text-[9.5px] font-black text-emerald-400 uppercase tracking-widest flex items-center justify-center gap-1.5 animate-pulse">
                  <ShieldCheck size={12} /> Sit straight to automatically dismiss alarm
                </p>
              </div>

              {/* Dual working buttons: Snooze & Stop */}
              <div className="grid grid-cols-2 gap-4">
                {/* Snooze button */}
                <button
                  onClick={handleSnooze}
                  className="bg-white/10 hover:bg-white/15 border border-white/10 text-white font-black tracking-widest py-4 px-4 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-lg select-none"
                >
                  <span className="text-sm font-black uppercase tracking-wider block">Snooze</span>
                  <span className="text-[8px] opacity-60 font-black uppercase tracking-wider block">({thresholds.snoozeDuration}s)</span>
                </button>

                {/* Stop Alarm button */}
                <button
                  onClick={handleStop}
                  className="bg-rose-500 hover:bg-rose-600 text-white font-black tracking-widest py-4 px-4 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 shadow-xl select-none shadow-rose-950/20"
                >
                  <span className="text-sm font-black uppercase tracking-wider block">Stop Alarm</span>
                  <span className="text-[8px] opacity-85 font-black uppercase tracking-wider block">Silence 10m</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
