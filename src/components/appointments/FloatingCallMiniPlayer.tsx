import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  Maximize2, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Volume2, 
  Activity, 
  ShieldCheck, 
  ChevronUp
} from 'lucide-react';
import { RootState, maximizeCall, toggleCallMic, endCall } from '../../store/store';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

export const FloatingCallMiniPlayer: React.FC = () => {
  const dispatch = useDispatch();
  const { isActive, isMinimized, appointment, isMicMuted, callStartedAt } = useSelector(
    (state: RootState) => state.call
  );
  const posture = useSelector((state: RootState) => state.posture);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isDoctorSpeaking, setIsDoctorSpeaking] = useState(true);

  // Active call timer
  useEffect(() => {
    if (!isActive || !callStartedAt) {
      setElapsedSeconds(0);
      return;
    }

    const startTimestamp = new Date(callStartedAt).getTime();
    const updateElapsed = () => {
      const now = Date.now();
      const secs = Math.max(0, Math.floor((now - startTimestamp) / 1000));
      setElapsedSeconds(secs);
    };

    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    const speakingTimer = setInterval(() => {
      setIsDoctorSpeaking(prev => !prev);
    }, 4000);

    return () => {
      clearInterval(timer);
      clearInterval(speakingTimer);
    };
  }, [isActive, callStartedAt]);

  if (!isActive || !isMinimized || !appointment) return null;

  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;
  const timerFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const handleEnd = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(endCall());
    toast.success('Consultation call ended.');
  };

  const handleToggleMic = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(toggleCallMic());
  };

  const handleMaximize = () => {
    dispatch(maximizeCall());
  };

  return (
    <AnimatePresence>
      <motion.div
        drag
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 50 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ cursor: 'grabbing' }}
        onClick={handleMaximize}
        className="fixed bottom-24 right-4 sm:right-6 z-[9999] w-48 sm:w-56 bg-white/95 backdrop-blur-2xl border-2 border-slate-200/90 rounded-[28px] shadow-2xl overflow-hidden cursor-pointer select-none ring-1 ring-black/5"
      >
        {/* DRAG HANDLE & TOP STATUS */}
        <div className="p-2.5 pb-1 flex items-center justify-between border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-[10px] font-black text-slate-800 truncate">
              {appointment.doctorName}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono font-black text-indigo-600">
              {timerFormatted}
            </span>
            <button
              onClick={handleMaximize}
              className="p-1 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors"
              title="Expand to Fullscreen"
            >
              <Maximize2 size={11} />
            </button>
          </div>
        </div>

        {/* COMPACT VIDEO CANVAS AREA */}
        <div className="p-3 flex items-center gap-3 bg-gradient-to-b from-white to-slate-50/80">
          {/* Doctor Avatar with Speaking indicator */}
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center font-extrabold text-indigo-600 text-sm shadow-inner">
              {appointment.doctorName.replace('Dr. ', '').charAt(0)}
            </div>
            {isDoctorSpeaking && (
              <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-emerald-500 text-white shadow-xs">
                <Volume2 size={9} />
              </div>
            )}
          </div>

          {/* Quick Spine Status & Specialty */}
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[10px] text-slate-500 truncate font-medium">
              {appointment.specialty}
            </p>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-[9.5px] font-bold text-indigo-700">
              <Activity size={10} />
              <span>{Math.round(posture.angle || 84)}° Live</span>
            </div>
          </div>
        </div>

        {/* QUICK FLOATING CONTROL BAR */}
        <div className="p-2 bg-slate-100/80 border-t border-slate-100 flex items-center justify-between gap-1">
          {/* Tap to Expand Hint */}
          <span className="text-[9px] text-slate-400 font-bold flex items-center gap-0.5 pl-1">
            <ChevronUp size={10} /> Tap to expand
          </span>

          <div className="flex items-center gap-1.5">
            {/* Mic Toggle */}
            <button
              onClick={handleToggleMic}
              className={cn(
                "p-1.5 rounded-xl transition-all shadow-xs active:scale-95",
                isMicMuted 
                  ? "bg-rose-50 text-rose-600 border border-rose-200" 
                  : "bg-white hover:bg-slate-200 text-slate-700 border border-slate-200"
              )}
              title={isMicMuted ? "Unmute Mic" : "Mute Mic"}
            >
              {isMicMuted ? <MicOff size={13} /> : <Mic size={13} />}
            </button>

            {/* End Call Button */}
            <button
              onClick={handleEnd}
              className="p-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white transition-all shadow-xs active:scale-95"
              title="End Consultation"
            >
              <PhoneOff size={13} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
