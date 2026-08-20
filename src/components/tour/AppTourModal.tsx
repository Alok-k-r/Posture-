import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  RootState, 
  endTour, 
  nextTourStep, 
  prevTourStep, 
  setTourStep 
} from '../../store/store';
import { 
  Bot, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Activity, 
  Box, 
  Sliders, 
  Calendar, 
  BarChart2, 
  CheckCircle2,
  Zap,
  Target,
  Flame,
  ShieldCheck,
  HelpCircle
} from 'lucide-react';

export interface TourStep {
  id: string;
  route: string;
  selector: string;
  title: string;
  icon: any;
  badge: string;
  color: string;
  borderColor: string;
  badgeBg: string;
  working: string;
  tip: string;
  preferredPosition?: 'top' | 'bottom' | 'left' | 'right';
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'fatigue-card',
    route: '/',
    selector: '[data-tour="fatigue-card"]',
    title: 'Fatigue Risk & Biomechanical Strain',
    icon: Activity,
    badge: 'Live Strain Telemetry',
    color: 'from-amber-500 to-rose-600',
    borderColor: 'border-amber-400',
    badgeBg: 'bg-amber-500 text-white',
    working: 'This card measures real-time paraspinal strain load (in lbs) and muscle fatigue accumulating in your upper back. As you slouch forward, head leverage increases thoracic strain up to 38 lbs!',
    tip: 'Roll your shoulders back to instantly reduce thoracic strain load!',
    preferredPosition: 'bottom'
  },
  {
    id: 'posture-ring',
    route: '/',
    selector: '[data-tour="posture-ring"]',
    title: 'Live Posture Ring & Stance Index',
    icon: Sparkles,
    badge: 'Continuous Biofeedback',
    color: 'from-emerald-500 to-teal-600',
    borderColor: 'border-emerald-400',
    badgeBg: 'bg-emerald-500 text-white',
    working: 'Your main Posture Ring displays your live inclination angle and 0–100% daily Posture Integrity Score. Green indicates healthy S-curve alignment, while amber/red warns of slouching.',
    tip: 'Keep your Posture Ring above 80% to earn daily ergonomics badges!',
    preferredPosition: 'bottom'
  },
  {
    id: 'streak-card',
    route: '/',
    selector: '[data-tour="streak-card"]',
    title: 'Spinal Resilience & Streaks',
    icon: Flame,
    badge: 'Consistency Tracker',
    color: 'from-indigo-600 to-violet-700',
    borderColor: 'border-indigo-400',
    badgeBg: 'bg-indigo-600 text-white',
    working: 'Log your sitting sessions daily to build your Posture Resilience Streak! Session data is stored locally and synced with your cloud medical account.',
    tip: 'Consistent 15-minute good posture sessions build long-term spinal stamina.',
    preferredPosition: 'top'
  },
  {
    id: 'spine-3d-model',
    route: '/posture',
    selector: '[data-tour="spine-3d-model"]',
    title: 'Interactive 3D Anatomical Spine Twin',
    icon: Box,
    badge: 'Biomechanical 3D Model',
    color: 'from-blue-600 to-indigo-600',
    borderColor: 'border-blue-400',
    badgeBg: 'bg-blue-600 text-white',
    working: 'Here is your 3D Anatomical Spine Model from C1 to L5 vertebrae! Rotate the 3D model with your finger or mouse to inspect biomechanical stress heatmaps across Cervical, Thoracic, and Lumbar segments.',
    tip: 'Touch any vertebra in 3D to inspect its localized load distribution!',
    preferredPosition: 'bottom'
  },
  {
    id: 'recalibrate-baseline',
    route: '/thresholds',
    selector: '[data-tour="recalibrate-baseline"]',
    title: 'Neutral Baseline Calibration',
    icon: Target,
    badge: '0° Ergonomic Zeroing',
    color: 'from-emerald-600 to-teal-700',
    borderColor: 'border-emerald-500',
    badgeBg: 'bg-emerald-600 text-white',
    working: 'Sit in your ideal upright posture and tap "Calibrate Now". The system locks this exact position as 0° neutral baseline and calculates all tilt deviations relative to it.',
    tip: 'Recalibrate whenever you change your desk or chair height!',
    preferredPosition: 'bottom'
  },
  {
    id: 'alert-config',
    route: '/thresholds',
    selector: '[data-tour="alert-config"]',
    title: 'Custom Slouch Haptic Alarms',
    icon: Sliders,
    badge: 'Real-time Alarm Limits',
    color: 'from-amber-600 to-orange-600',
    borderColor: 'border-amber-400',
    badgeBg: 'bg-amber-600 text-white',
    working: 'Set your preferred tilt angle threshold and detection delay. When you slouch past this limit, PostureCare triggers instant haptic vibration and audio posture alerts.',
    tip: 'Set a 5-second detection delay to prevent false alarms during quick movements.',
    preferredPosition: 'top'
  },
  {
    id: 'tele-physio',
    route: '/appointments',
    selector: '[data-tour="tele-physio"]',
    title: 'Tele-Physio & Doctor Workspace',
    icon: Calendar,
    badge: 'Clinical Care Access',
    color: 'from-violet-600 to-purple-700',
    borderColor: 'border-violet-400',
    badgeBg: 'bg-violet-600 text-white',
    working: 'Connect with certified spine specialists & physiotherapists. Book in-clinic or video consultations, pay advance fees online, and share your 3D spine reports directly with doctors.',
    tip: 'Join the Live Consultation Workspace during your scheduled appointment!',
    preferredPosition: 'bottom'
  },
  {
    id: 'pdf-export',
    route: '/analytics',
    selector: '[data-tour="pdf-export"]',
    title: 'AI Report & Clinical PDF Export',
    icon: BarChart2,
    badge: 'Medical Data Export',
    color: 'from-cyan-600 to-blue-700',
    borderColor: 'border-cyan-400',
    badgeBg: 'bg-cyan-600 text-white',
    working: 'Interrogate your posture history with Gemini AI or generate official clinical PDF medical reports detailing your sitting habits, fatigue trends, and recovery speed.',
    tip: 'Export your PDF report to bring to your next physical therapy session!',
    preferredPosition: 'top'
  }
];

export const AppTourModal: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const tourActive = useSelector((state: RootState) => state.ui.tourActive);
  const tourStep = useSelector((state: RootState) => state.ui.tourStep);

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [bubblePos, setBubblePos] = useState<{ top: number; left: number; arrowDirection: 'up' | 'down' | 'left' | 'right' }>({ top: 100, left: 100, arrowDirection: 'up' });
  const [targetFound, setTargetFound] = useState(false);

  const currentStepData = TOUR_STEPS[tourStep] || TOUR_STEPS[0];
  const isFirstStep = tourStep === 0;
  const isLastStep = tourStep === TOUR_STEPS.length - 1;

  // Auto-navigate route on tour step change
  useEffect(() => {
    if (tourActive && currentStepData) {
      if (location.pathname !== currentStepData.route) {
        navigate(currentStepData.route);
      }
    }
  }, [tourActive, tourStep, currentStepData, navigate, location.pathname]);

  // Recalculate target position & update bubble placement
  const updateTargetPos = () => {
    if (!tourActive || !currentStepData) return;

    const el = document.querySelector(currentStepData.selector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      setTargetFound(true);

      // Compute bubble position relative to window viewport
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const bubbleWidth = Math.min(380, windowWidth - 32);
      const bubbleHeight = 220; // estimated card height

      let top = 0;
      let left = Math.max(16, Math.min(rect.left + rect.width / 2 - bubbleWidth / 2, windowWidth - bubbleWidth - 16));
      let arrowDirection: 'up' | 'down' | 'left' | 'right' = 'up';

      // Decide if bubble should sit above or below the target element
      const spaceBelow = windowHeight - rect.bottom;
      const spaceAbove = rect.top;

      if (currentStepData.preferredPosition === 'top' && spaceAbove > bubbleHeight + 20) {
        top = rect.top - bubbleHeight - 16;
        arrowDirection = 'down';
      } else if (spaceBelow >= bubbleHeight + 20) {
        top = rect.bottom + 16;
        arrowDirection = 'up';
      } else if (spaceAbove >= bubbleHeight + 20) {
        top = rect.top - bubbleHeight - 16;
        arrowDirection = 'down';
      } else {
        // Center fallback on mobile if element takes whole screen
        top = Math.max(20, rect.top + rect.height / 2 - bubbleHeight / 2);
        arrowDirection = 'up';
      }

      setBubblePos({ top, left, arrowDirection });
    } else {
      setTargetFound(false);
      setTargetRect(null);
    }
  };

  useEffect(() => {
    if (!tourActive) return;

    // Retry position finding after DOM updates & transitions
    const timer = setTimeout(updateTargetPos, 350);
    const timer2 = setTimeout(updateTargetPos, 800);

    window.addEventListener('resize', updateTargetPos);
    window.addEventListener('scroll', updateTargetPos, true);

    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
      window.removeEventListener('resize', updateTargetPos);
      window.removeEventListener('scroll', updateTargetPos, true);
    };
  }, [tourActive, tourStep, location.pathname]);

  if (!tourActive) return null;

  const StepIcon = currentStepData.icon;

  const handleNext = () => {
    if (isLastStep) {
      dispatch(endTour());
    } else {
      dispatch(nextTourStep());
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      dispatch(prevTourStep());
    }
  };

  const handleSkip = () => {
    dispatch(endTour());
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
        {/* Dimmed Backdrop with Cutout Effect */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleSkip}
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] pointer-events-auto transition-opacity duration-300"
        />

        {/* Target Element Spotlight Ring Overlay */}
        {targetRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className={`absolute rounded-[28px] ring-4 ring-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.5)] border-2 border-white pointer-events-none z-10 animate-pulse`}
          />
        )}

        {/* Anchored Speech Bubble Card */}
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.92 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{
            position: 'fixed',
            top: `${bubblePos.top}px`,
            left: `${bubblePos.left}px`,
            width: 'calc(100vw - 32px)',
            maxWidth: '400px'
          }}
          className="pointer-events-auto z-20"
        >
          {/* Directional Pointer Arrow */}
          {targetRect && (
            <div 
              className={`absolute w-0 h-0 border-8 border-transparent z-30 transition-all ${
                bubblePos.arrowDirection === 'up'
                  ? '-top-4 left-1/2 -translate-x-1/2 border-b-white'
                  : '-bottom-4 left-1/2 -translate-x-1/2 border-t-white'
              }`}
            />
          )}

          {/* Speech Bubble Container */}
          <div className="bg-white rounded-[28px] shadow-2xl border-2 border-slate-100 overflow-hidden text-slate-800 relative">
            {/* Top Assistant Banner */}
            <div className={`p-3.5 sm:p-4 bg-gradient-to-r ${currentStepData.color} text-white flex items-center justify-between gap-3`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shrink-0">
                  <Bot size={18} className="text-white animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white leading-tight">Posture AI Assistant</span>
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30">
                      Step {tourStep + 1}/{TOUR_STEPS.length}
                    </span>
                  </div>
                  <span className="text-[10px] text-white/80 font-bold block leading-none mt-0.5">
                    Interactive Feature Tour
                  </span>
                </div>
              </div>

              <button
                onClick={handleSkip}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95 text-[10px] font-black px-2 flex items-center gap-1"
                title="Exit Tour"
              >
                <span>Skip</span>
                <X size={12} />
              </button>
            </div>

            {/* Bubble Main Body */}
            <div className="p-4 sm:p-5 space-y-3.5">
              {/* Feature Title */}
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl ${currentStepData.badgeBg} flex items-center justify-center shrink-0 font-bold shadow-sm`}>
                  <StepIcon size={16} />
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                    {currentStepData.badge}
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                    {currentStepData.title}
                  </h3>
                </div>
              </div>

              {/* Speech Bubble Working Explanation */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs font-semibold text-slate-700 leading-relaxed relative">
                <p>{currentStepData.working}</p>
              </div>

              {/* Action Tip Callout */}
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-100 text-emerald-900 text-[11px] font-bold leading-tight">
                <Sparkles size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>💡 {currentStepData.tip}</span>
              </div>

              {/* Controls Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  onClick={handlePrev}
                  disabled={isFirstStep}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${
                    isFirstStep
                      ? 'opacity-0 pointer-events-none'
                      : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 active:scale-95'
                  }`}
                >
                  <ChevronLeft size={14} />
                  <span>Back</span>
                </button>

                <button
                  onClick={handleNext}
                  className={`px-4 py-2 rounded-xl text-xs font-black text-white shadow-md transition-all active:scale-95 flex items-center gap-1.5 bg-gradient-to-r ${currentStepData.color}`}
                >
                  <span>{isLastStep ? 'Finish Tour 🎉' : 'Next Feature'}</span>
                  {isLastStep ? <CheckCircle2 size={14} /> : <ChevronRight size={14} />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
