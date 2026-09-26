import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, setIsRecordingSession, calculateLiveAlignmentScore } from '../store/store';
import { PostureFigure } from '../components/posture/PostureFigure';
import { 
  Shield, 
  Flame, 
  Zap, 
  Sparkles, 
  Award,
  ChevronRight,
  ChevronLeft,
  WifiOff,
  Bluetooth,
  Smartphone,
  CheckCircle2,
  X,
  ArrowUpRight,
  Activity,
  Calendar as CalendarIcon,
  Play,
  Pause
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { LocalModelService, LocalBiomechanicalMetrics } from '../services/localModelService';
import { SessionService, UnifiedSession } from '../services/sessionService';
import { auth } from '../lib/firebase';
import { DeviceRequiredModal } from '../components/modals/DeviceRequiredModal';

export const DashboardScreen: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const posture = useSelector((state: RootState) => state.posture);
  const device = useSelector((state: RootState) => state.device);
  const { thresholds, streak } = posture;

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isDeviceRequiredModalOpen, setIsDeviceRequiredModalOpen] = useState(false);
  const [sessions, setSessions] = useState<UnifiedSession[]>([]);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(new Date());
  const [calendarMonthOffset, setCalendarMonthOffset] = useState<number>(0);

  const handleRecordingToggle = () => {
    if (posture.isRecordingSession) {
      // If actively recording, clicking pauses the recording
      dispatch(setIsRecordingSession(false));
    } else {
      // Only start recording if device is connected or simulator is enabled
      if (!device.isConnected && !posture.isSimulating) {
        setIsDeviceRequiredModalOpen(true);
        return;
      }
      dispatch(setIsRecordingSession(true));
      navigate('/posture');
    }
  };

  // Subscribe to real-time session database updates across Firestore and LocalStorage
  useEffect(() => {
    const userId = user?.id || auth.currentUser?.uid || 'guest';
    const unsubscribe = SessionService.subscribeToSessions(userId, (fetched) => {
      setSessions(fetched);
    });
    return () => unsubscribe();
  }, [user?.id, auth.currentUser?.uid]);

  // Aggregate Today's Completed Sessions + Live Active Session
  const todayStr = new Date().toDateString();
  const todayCompletedSessions = sessions.filter(s => {
    if (!s.date) return false;
    return new Date(s.date).toDateString() === todayStr;
  });

  const activeDuration = posture.isRecordingSession ? posture.totalSessionSeconds || 0 : 0;
  const activeGood = posture.isRecordingSession ? posture.goodSessionSeconds || 0 : 0;
  const activeIncidents = posture.isRecordingSession ? posture.incidents || 0 : 0;

  const completedTodayGoodSecs = todayCompletedSessions.reduce((acc, s) => acc + (s.goodSessionSeconds || 0), 0);
  const completedTodayTotalSecs = todayCompletedSessions.reduce((acc, s) => acc + (s.duration || 0), 0);
  const completedTodayIncidents = todayCompletedSessions.reduce((acc, s) => acc + (s.slouches || 0), 0);

  const combinedTodayGoodSecs = completedTodayGoodSecs + activeGood;
  const combinedTodayTotalSecs = completedTodayTotalSecs + activeDuration;
  const totalTodayIncidents = completedTodayIncidents + activeIncidents;

  // Real-time consecutive streak dynamically calculated from actual database sessions
  const realStreak = SessionService.calculateRealStreak(sessions);

  // Integrity Score for Today - based purely on recorded data
  const hasTodayData = combinedTodayTotalSecs > 0 || todayCompletedSessions.length > 0 || (posture.isRecordingSession && activeDuration > 0);
  let totalTodayWeightedScore = todayCompletedSessions.reduce((acc, s) => acc + ((s.score || 0) * (s.duration || 0)), 0);
  if (posture.isRecordingSession && activeDuration > 0) {
    totalTodayWeightedScore += (posture.score * activeDuration);
  }

  const liveAlignmentScore = calculateLiveAlignmentScore(posture.angle, posture.baselineAngle, thresholds);
  const combinedTodayIntegrity = combinedTodayTotalSecs > 0
    ? Math.round(totalTodayWeightedScore / combinedTodayTotalSecs)
    : (todayCompletedSessions.length > 0 ? todayCompletedSessions[0].score : (posture.isRecordingSession ? posture.score : liveAlignmentScore));

  // Calendar calculations for the current/selected month
  const activeMonthDate = new Date();
  activeMonthDate.setMonth(activeMonthDate.getMonth() + calendarMonthOffset);
  const currentMonthName = activeMonthDate.toLocaleString('default', { month: 'long' });
  const currentYear = activeMonthDate.getFullYear();

  const firstDayOfMonth = new Date(activeMonthDate.getFullYear(), activeMonthDate.getMonth(), 1);
  const daysInMonth = new Date(activeMonthDate.getFullYear(), activeMonthDate.getMonth() + 1, 0).getDate();
  const startingDayIndex = (firstDayOfMonth.getDay() + 6) % 7; // Monday = 0

  // Build calendar matrix days - ONLY show dots for days with REAL recorded sessions
  const calendarDays = [];
  for (let i = 0; i < startingDayIndex; i++) {
    calendarDays.push({ day: null, date: null, score: null, status: 'empty' });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(activeMonthDate.getFullYear(), activeMonthDate.getMonth(), d);
    const dateStr = dateObj.toDateString();
    const isToday = dateStr === new Date().toDateString();
    const isFuture = dateObj > new Date();

    const matchingSessions = sessions.filter(s => {
      if (!s.date) return false;
      return new Date(s.date).toDateString() === dateStr;
    });

    let score: number | null = null;
    let status: 'optimal' | 'moderate' | 'poor' | 'empty' | 'rest' = 'empty';

    if (isToday) {
      if (hasTodayData && combinedTodayIntegrity > 0) {
        score = combinedTodayIntegrity;
        if (score >= thresholds.good) status = 'optimal';
        else if (score >= thresholds.warn) status = 'moderate';
        else status = 'poor';
      }
    } else if (matchingSessions.length > 0) {
      const sum = matchingSessions.reduce((acc, s) => acc + (s.score || 0), 0);
      score = Math.round(sum / matchingSessions.length);
      if (score >= thresholds.good) status = 'optimal';
      else if (score >= thresholds.warn) status = 'moderate';
      else if (score > 0) status = 'poor';
    }

    calendarDays.push({
      day: d,
      date: dateObj,
      score: isFuture ? null : score,
      status: isFuture ? 'empty' : status,
      isToday,
      isFuture,
    });
  }

  // Recalculate full clinical & biomechanical telemetry
  const m: LocalBiomechanicalMetrics = LocalModelService.recalculateAllBiomechanicalMetrics(
    posture.angle,
    posture.baselineAngle,
    posture.history,
    combinedTodayGoodSecs,
    combinedTodayTotalSecs,
    totalTodayIncidents,
    user ? { age: user.age, height: user.height, weight: user.weight } : undefined
  );

  // Dynamic status evaluation based on thresholds
  const isGoodPosture = posture.angle >= thresholds.good;
  const isWarning = posture.angle >= thresholds.warn && posture.angle < thresholds.good;

  // Dynamic Theme Colors directly matching the posture angle
  const statusTheme = isGoodPosture ? {
    statusText: 'OPTIMAL ALIGNMENT',
    dotBg: 'bg-[#10b981]',
    colorHex: '#10b981',
    primaryTextClass: 'text-[#10b981]',
    subTextClass: 'text-[#34d399]',
    cardGlowClass: 'from-emerald-100/40 via-emerald-50/15 to-transparent',
    ecgColor: '#10b981',
    badgeClass: 'bg-emerald-100 text-emerald-800'
  } : isWarning ? {
    statusText: 'MILD SLOUCH',
    dotBg: 'bg-[#f59e0b]',
    colorHex: '#f59e0b',
    primaryTextClass: 'text-[#f59e0b]',
    subTextClass: 'text-[#fbbf24]',
    cardGlowClass: 'from-amber-100/40 via-amber-50/15 to-transparent',
    ecgColor: '#f59e0b',
    badgeClass: 'bg-amber-100 text-amber-800'
  } : {
    statusText: 'POOR ALIGNMENT',
    dotBg: 'bg-[#ff2d55]',
    colorHex: '#ff2d55',
    primaryTextClass: 'text-[#ff2d55]',
    subTextClass: 'text-[#fb7185]',
    cardGlowClass: 'from-rose-100/50 via-rose-50/15 to-transparent',
    ecgColor: '#ff2d55',
    badgeClass: 'bg-rose-100 text-rose-800'
  };

  // Format Focus Max Time
  const formatFocusMax = (seconds: number) => {
    const s = Math.max(0, seconds || 0);
    const mins = Math.floor(s / 60);
    const rem = s % 60;
    return `${mins}m ${rem}s`;
  };

  const todayMaxFocus = posture.isRecordingSession
    ? Math.max(posture.maxFocusDuration || 0, activeGood)
    : todayCompletedSessions.reduce((max, s) => Math.max(max, s.maxFocusStreak || s.goodSessionSeconds || 0), 0);

  return (
    <div className="space-y-4 max-w-md md:max-w-xl mx-auto px-4 pt-1 pb-32 font-sans selection:bg-indigo-100">
      
      {/* HEADER: ONLINE STATUS, RECORDING BUTTON & PROFILE AVATAR AT THE SAME LEVEL */}
      <div className="flex items-center justify-between gap-2.5 pt-1">
        {/* Left: Online Status + Recording Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn(
            "px-2.5 py-1.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-2xs shrink-0",
            device.isConnected 
              ? "bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]" 
              : "bg-[#ffe4e6] text-[#e11d48] border border-[#fecdd3]"
          )}>
            {device.isConnected ? (
              <Bluetooth size={12} className="inline stroke-[2.5] text-[#059669]" />
            ) : (
              <WifiOff size={11} className="inline stroke-[2.5]" />
            )}
            {device.isConnected ? 'ONLINE' : 'OFFLINE'}
          </span>

          <button
            onClick={handleRecordingToggle}
            className={cn(
              "px-3 py-1.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 border transition-all active:scale-95 cursor-pointer shadow-2xs select-none shrink-0",
              posture.isRecordingSession
                ? "bg-[#ffe4e6] text-[#e11d48] border-[#fecdd3] hover:bg-[#fed7aa]/30"
                : (posture.totalSessionSeconds || 0) > 0
                ? "bg-[#fef3c7] text-[#d97706] border-[#fde68a] hover:bg-[#fef08a]"
                : "bg-[#ede9fe] text-[#6366f1] border-[#ddd6fe] hover:bg-[#e0e7ff]"
            )}
            title={
              posture.isRecordingSession
                ? "Recording session in progress. Click to pause."
                : (posture.totalSessionSeconds || 0) > 0
                ? "Session paused. Click to resume and open Posture."
                : "Click to start recording and open Posture."
            }
          >
            {posture.isRecordingSession ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#e11d48] animate-pulse shrink-0" />
                <span>RECORDING IN PROGRESS</span>
              </>
            ) : (posture.totalSessionSeconds || 0) > 0 ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#d97706] shrink-0" />
                <span>PAUSED</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1] shrink-0" />
                <span>START RECORDING</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Profile Avatar Box */}
        <div className="flex items-center shrink-0">
          <button 
            onClick={() => navigate('/profile')}
            className="w-12 h-12 rounded-full bg-white border-2 border-white shadow-md overflow-hidden flex items-center justify-center shrink-0 active:scale-95 transition-transform hover:ring-2 hover:ring-indigo-100"
            title="Profile & Settings"
          >
            {user?.photo ? (
              <img src={user.photo} alt="Avatar" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#f8fafc] flex items-center justify-center p-0.5">
                <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
                  {/* Clean Background disc */}
                  <circle cx="50" cy="50" r="48" fill="#f1f5f9" />
                  
                  {/* Doctor/User Face */}
                  <circle cx="50" cy="42" r="21" fill="#fed7aa" />
                  
                  {/* Parted Gray Hair */}
                  <path 
                    d="M 28 36 C 28 18, 72 18, 72 36 C 72 28, 58 24, 50 24 C 42 24, 28 28, 28 36 Z" 
                    fill="#e2e8f0" 
                  />
                  <path 
                    d="M 28 36 C 32 30, 42 32, 48 30 C 52 28, 68 28, 72 36" 
                    stroke="#cbd5e1" 
                    strokeWidth="1.5" 
                    fill="none" 
                  />

                  {/* Wireframe Glasses */}
                  <circle cx="41" cy="40" r="6.5" stroke="#334155" strokeWidth="2.2" fill="none" />
                  <circle cx="59" cy="40" r="6.5" stroke="#334155" strokeWidth="2.2" fill="none" />
                  <line x1="47.5" y1="40" x2="52.5" y2="40" stroke="#334155" strokeWidth="2.2" />
                  
                  {/* Eyes inside glasses */}
                  <circle cx="41" cy="40" r="1.8" fill="#1e293b" />
                  <circle cx="59" cy="40" r="1.8" fill="#1e293b" />

                  {/* Nose */}
                  <path d="M 50 43 L 48.5 48 L 51.5 48" stroke="#f97316" strokeWidth="1.2" strokeLinecap="round" fill="none" />

                  {/* Gentle Smile */}
                  <path d="M 44 54 Q 50 58 56 54" stroke="#475569" strokeWidth="2" strokeLinecap="round" fill="none" />
                  
                  {/* Doctor Suit / Dark Coat & White Shirt Collar */}
                  <path d="M 18 94 C 22 68, 78 68, 82 94 Z" fill="#0f172a" />
                  <path d="M 38 68 L 50 84 L 62 68 Z" fill="#ffffff" />
                  <path d="M 48 76 L 50 94 L 52 76 Z" fill="#4f46e5" />
                </svg>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* 3. BIG HERO CARD (Dynamic Posture Colors + Refined Height & Smooth Edges) */}
      <div 
        data-tour="posture-ring" 
        className="bg-white rounded-[32px] p-5 pb-4 sm:p-6 sm:pb-4.5 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.08),0_4px_12px_-2px_rgba(15,23,42,0.03)] border border-slate-100/90 relative overflow-hidden flex flex-col justify-between space-y-2 sm:space-y-2.5 transition-all"
      >
        {/* Soft Dynamic Gradient Background Glow */}
        <div 
          className={cn(
            "absolute inset-0 bg-gradient-to-t pointer-events-none transition-all duration-700",
            statusTheme.cardGlowClass
          )} 
        />

        {/* Card Header: Dynamic Status & ECG button */}
        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className={cn("w-2 h-2 rounded-full animate-pulse", statusTheme.dotBg)} />
              <span 
                className="text-xs sm:text-sm font-black uppercase tracking-wider"
                style={{ color: statusTheme.colorHex }}
              >
                {statusTheme.statusText}
              </span>
            </div>
            <span 
              className="text-[9px] sm:text-[10px] font-black tracking-widest uppercase block mt-0.5"
              style={{ color: statusTheme.colorHex, opacity: 0.8 }}
            >
              CLINICAL PRECISION
            </span>
          </div>

          {/* Floating ECG Pulse waveform button */}
          <button 
            onClick={() => navigate('/posture')}
            className="w-10 h-10 rounded-xl bg-white border border-slate-100 shadow-2xs flex items-center justify-center transition-all hover:bg-slate-50 active:scale-95"
            title="Posture Telemetry"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path 
                d="M 2 12 L 6 12 L 9 5 L 13 19 L 16 10 L 18 14 L 22 12" 
                stroke={statusTheme.ecgColor} 
                strokeWidth="2.3" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            </svg>
          </button>
        </div>

        {/* Center Circular Stage + Head Figure + Floating Angle Pill */}
        <div className="relative flex items-center justify-center py-0">
          {/* Circular Stage with clean bevel & soft depth */}
          <div className="w-52 h-52 sm:w-56 sm:h-56 rounded-full bg-gradient-to-b from-[#f8fafc] to-[#f1f5f9] border border-slate-200/80 flex items-center justify-center relative shadow-[inset_0_2px_6px_rgba(0,0,0,0.02),0_4px_16px_rgba(15,23,42,0.03)]">
            <PostureFigure size={165} angle={posture.angle} />

            {/* Floating Angle Pill on Bottom-Right - Pristine Overlapping Badge */}
            <div className="absolute bottom-2 -right-2 sm:bottom-3 sm:-right-3 z-20 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-[0_8px_20px_-4px_rgba(15,23,42,0.12),0_2px_6px_-1px_rgba(15,23,42,0.04)] border border-slate-100/90 text-center min-w-[76px] select-none">
              <span 
                className="text-[9px] font-black tracking-widest uppercase block transition-colors"
                style={{ color: statusTheme.colorHex }}
              >
                ANGLE
              </span>
              <span 
                className="text-2xl font-black tracking-tight leading-none transition-colors"
                style={{ color: statusTheme.colorHex }}
              >
                {Math.round(posture.angle)}°
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Integrity Score + Diagnostic Tab Button (Tightened & Seamless) */}
        <div className="flex items-end justify-between pt-0 pb-0.5 relative z-10">
          <div>
            <div 
              className="text-3xl sm:text-4xl font-black tracking-tight leading-none"
              style={{ color: statusTheme.colorHex }}
            >
              {combinedTodayIntegrity}%
            </div>
            <span 
              className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest block mt-0.5"
              style={{ color: statusTheme.colorHex, opacity: 0.8 }}
            >
              INTEGRITY SCORE
            </span>
          </div>

          <button
            onClick={() => setIsAiModalOpen(true)}
            className="px-4 py-2 rounded-full bg-white border border-slate-200 shadow-2xs hover:shadow-soft text-slate-900 hover:text-black font-black text-[11px] sm:text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95"
          >
            <span>DIAGNOSTIC TAB</span>
            <ChevronRight size={13} className="stroke-[3]" />
          </button>
        </div>
      </div>

      {/* 5. BIOMECHANICAL TELEMETRY */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
            BIOMECHANICAL TELEMETRY
          </span>
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="text-xs font-black uppercase tracking-wider text-[#6366f1] hover:text-indigo-700 flex items-center gap-1.5"
          >
            <Sparkles size={14} />
            <span>VIEW AI DIAGNOSTICS</span>
          </button>
        </div>

        {/* Spinal Stress Load Card */}
        <div className="bg-white rounded-[28px] p-5 border border-slate-100 shadow-soft flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              SPINAL STRESS LOAD
            </span>
            <span className="text-xs font-medium text-slate-500 mt-0.5 block">
              Average Load: {m.upperBackStrainLbs} lbs
            </span>
          </div>

          <span className={cn(
            "text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider",
            m.fatigueScore < 35 
              ? "bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]" 
              : m.fatigueScore < 70 
              ? "bg-[#fef3c7] text-[#b45309] border border-[#fde68a]" 
              : "bg-[#ffe4e6] text-[#e11d48] border border-[#fecdd3]"
          )}>
            {m.fatigueScore < 35 ? "LOW" : m.fatigueScore < 70 ? "MODERATE" : "HIGH"}
          </span>
        </div>
      </div>

      {/* 6. SPINAL RESILIENCE STREAK BANNER */}
      <div 
        data-tour="streak-card" 
        className="bg-gradient-to-r from-[#6366f1] via-[#7c3aed] to-[#6d28d9] rounded-[32px] p-6 text-white shadow-lg relative overflow-hidden flex items-center justify-between"
      >
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/80">
            <Flame size={13} className="text-amber-300 fill-amber-300" />
            <span>SPINAL RESILIENCE</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
            🔥 {realStreak.current} Day Streak
          </h2>
          <p className="text-xs font-medium text-white/90">
            {realStreak.current === 0 
              ? 'Start recording posture sessions to build your daily streak!'
              : realStreak.current === 1
              ? '1 day streak active! Record today to keep building momentum.'
              : `${realStreak.current} consecutive active days! Great consistency.`}
          </p>
        </div>

        <div className="relative z-10 p-3.5 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 text-amber-300 flex items-center justify-center shadow-inner">
          <Award size={28} />
        </div>

        {/* Ambient background glow */}
        <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-white/10 blur-xl pointer-events-none" />
      </div>

      {/* 7. 2x2 METRIC GRID CARDS */}
      <div className="grid grid-cols-2 gap-3.5">
        {/* Card 1: Integrity (Green) */}
        <div className="bg-[#f0fdf4] border border-[#dcfce7] rounded-[28px] p-5 flex flex-col justify-between h-36 shadow-2xs">
          <div className="w-9 h-9 rounded-full bg-white shadow-2xs border border-[#dcfce7] flex items-center justify-center text-[#16a34a]">
            <Shield size={18} className="fill-[#16a34a]/20" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-[#16a34a] tracking-tight">
              {hasTodayData ? `${combinedTodayIntegrity}%` : '0%'}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#16a34a] block mt-0.5">
              INTEGRITY
            </span>
          </div>
        </div>

        {/* Card 2: Incidents (Rose/Red) */}
        <div className="bg-[#fff1f2] border border-[#ffe4e6] rounded-[28px] p-5 flex flex-col justify-between h-36 shadow-2xs">
          <div className="w-9 h-9 rounded-full bg-white shadow-2xs border border-[#ffe4e6] flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-[#e11d48]" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-[#e11d48] tracking-tight">
              {totalTodayIncidents}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#e11d48] block mt-0.5">
              INCIDENTS
            </span>
          </div>
        </div>

        {/* Card 3: Focus Max (Purple) */}
        <div className="bg-[#faf5ff] border border-[#f3e8ff] rounded-[28px] p-5 flex flex-col justify-between h-36 shadow-2xs">
          <div className="w-9 h-9 rounded-full bg-white shadow-2xs border border-[#f3e8ff] flex items-center justify-center text-[#7e22ce]">
            <Zap size={18} className="fill-[#7e22ce]" />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-[#7e22ce] tracking-tight">
              {formatFocusMax(todayMaxFocus)}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#7e22ce] block mt-0.5">
              FOCUS MAX
            </span>
          </div>
        </div>

        {/* Card 4: Logic Power (Sky Blue) */}
        <div className="bg-[#f0f9ff] border border-[#e0f2fe] rounded-[28px] p-5 flex flex-col justify-between h-36 shadow-2xs">
          <div className="w-9 h-9 rounded-full bg-white shadow-2xs border border-[#e0f2fe] flex items-center justify-center text-[#0284c7]">
            <Smartphone size={18} />
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-[#0284c7] tracking-tight">
              {device.battery > 0 ? `${device.battery}%` : '0%'}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#0284c7] block mt-0.5">
              LOGIC POWER
            </span>
          </div>
        </div>
      </div>

      {/* 8. TODAY'S ACHIEVEMENTS */}
      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-soft space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#ede9fe] text-[#6366f1] flex items-center justify-center">
            <Award size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight">
              Today's Achievements
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              AESTHETIC POSTURE MILESTONES
            </span>
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={18} className="text-[#10b981]" />
              <span className="text-xs font-bold text-slate-700">
                {Math.round(combinedTodayGoodSecs / 60)} minutes today.
              </span>
            </div>
            <span className="text-[10px] font-black text-[#6366f1] uppercase bg-[#ede9fe] px-2.5 py-1 rounded-md">
              Target 45m
            </span>
          </div>
        </div>
      </div>

      {/* 9. MONTHLY POSTURE COMPLIANCE CALENDAR */}
      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-soft space-y-5">
        {/* Calendar Header with Month Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
              <CalendarIcon size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight">
                {currentMonthName} {currentYear}
              </h3>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                MONTHLY POSTURE COMPLIANCE
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCalendarMonthOffset(prev => prev - 1)}
              className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200/70 transition-colors active:scale-95"
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCalendarMonthOffset(0)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors",
                calendarMonthOffset === 0 
                  ? "bg-indigo-50 text-indigo-600 border border-indigo-100" 
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200"
              )}
            >
              Today
            </button>
            <button
              onClick={() => setCalendarMonthOffset(prev => prev + 1)}
              className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200/70 transition-colors active:scale-95"
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
            <span key={idx} className="text-[11px] font-black text-slate-400 uppercase py-1">
              {day}
            </span>
          ))}
        </div>

        {/* Calendar Day Grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map((item, index) => {
            if (!item.day) {
              return <div key={`empty-${index}`} className="h-10 sm:h-11 rounded-xl bg-slate-50/40" />;
            }

            const isSelected = selectedCalendarDate && item.date && selectedCalendarDate.toDateString() === item.date.toDateString();

            return (
              <button
                key={`day-${item.day}`}
                onClick={() => item.date && setSelectedCalendarDate(item.date)}
                className={cn(
                  "h-10 sm:h-11 rounded-2xl flex flex-col items-center justify-center relative transition-all active:scale-95 border",
                  item.isToday 
                    ? "border-indigo-600 bg-indigo-50/40 font-black shadow-xs" 
                    : isSelected 
                    ? "border-slate-400 bg-slate-100 shadow-xs" 
                    : "border-transparent bg-slate-50/70 hover:bg-slate-100/80",
                  item.isFuture && "opacity-40 pointer-events-none"
                )}
              >
                <span className={cn(
                  "text-xs font-bold leading-none",
                  item.isToday ? "text-indigo-600 font-black" : "text-slate-700"
                )}>
                  {item.day}
                </span>

                {/* Score Status Dot Indicator */}
                {!item.isFuture && item.status !== 'empty' && (
                  <div className="mt-1 flex items-center justify-center">
                    <span 
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        item.status === 'optimal' 
                          ? "bg-[#10b981]" 
                          : item.status === 'moderate' 
                          ? "bg-[#f59e0b]" 
                          : item.status === 'poor' 
                          ? "bg-[#ff2d55]" 
                          : "bg-slate-300"
                      )} 
                    />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Date Summary Footer */}
        {selectedCalendarDate && (() => {
          const selectedDateStr = selectedCalendarDate.toDateString();
          const isSelectedToday = selectedDateStr === new Date().toDateString();
          const daySessions = isSelectedToday
            ? todayCompletedSessions
            : sessions.filter(s => s.date && new Date(s.date).toDateString() === selectedDateStr);
          const hasDayData = isSelectedToday ? hasTodayData : daySessions.length > 0;
          const dayScore = isSelectedToday
            ? (hasTodayData ? combinedTodayIntegrity : null)
            : (daySessions.length > 0 ? Math.round(daySessions.reduce((a, b) => a + (b.score || 0), 0) / daySessions.length) : null);
          const dayDuration = isSelectedToday
            ? combinedTodayTotalSecs
            : daySessions.reduce((a, b) => a + (b.duration || 0), 0);

          return (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">
                  {selectedCalendarDate.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                {isSelectedToday && (
                  <span className="bg-indigo-100 text-indigo-700 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase">
                    Today
                  </span>
                )}
                {hasDayData && dayScore !== null ? (
                  <span className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded-md",
                    dayScore >= thresholds.good ? "bg-emerald-100 text-emerald-800" :
                    dayScore >= thresholds.warn ? "bg-amber-100 text-amber-800" :
                    "bg-rose-100 text-rose-800"
                  )}>
                    {dayScore}% Score • {Math.round(dayDuration / 60)}m logged
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-slate-400">
                    No sessions recorded
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#10b981]" />
                  <span className="text-[10px] font-bold text-slate-500">Optimal</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
                  <span className="text-[10px] font-bold text-slate-500">Mild</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#ff2d55]" />
                  <span className="text-[10px] font-bold text-slate-500">Poor</span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* AI BIOMECHANICAL REPORT MODAL */}
      <AnimatePresence>
        {isAiModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAiModalOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-white rounded-[36px] shadow-2xl border border-slate-100 p-6 sm:p-7 space-y-6 z-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Biomechanics & Spine Engine</h3>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clinical Telemetry Intelligence</span>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAiModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Diagnostic Breakdown */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Health Score</span>
                    <div className="text-2xl font-black text-slate-900 mt-1">{m.dailyUpperBackHealthScore}/100</div>
                    <span className="text-[10px] font-bold text-indigo-600">Grade {m.dailyUpperBackHealthScore >= 85 ? 'A' : m.dailyUpperBackHealthScore >= 70 ? 'B' : 'C'}</span>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fatigue Level</span>
                    <div className="text-2xl font-black text-slate-900 mt-1">{m.fatigueScore}%</div>
                    <span className="text-[10px] font-bold text-amber-600">{m.fatigueTrend}</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs">
                    <Activity size={14} className="text-indigo-600" />
                    <span>Thoracic & Paraspinal Tension</span>
                  </div>
                  <p className="text-xs text-indigo-900 leading-relaxed font-medium">
                    At your current posture angle of {Math.max(0, Math.min(90, Math.round(posture.angle)))}°, gravitational torque places <strong className="font-black text-indigo-950">{m.upperBackStrainLbs} lbs</strong> of tensile strain on your upper trapezius and rhomboids.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                    <Shield size={14} className="text-slate-600" />
                    <span>Ergonomic Action Plan</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {m.dailyRecommendation}
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    setIsAiModalOpen(false);
                    navigate('/analytics');
                  }}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-colors shadow-soft flex items-center justify-center gap-2"
                >
                  <span>Open Full Clinical Analytics</span>
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <DeviceRequiredModal
        isOpen={isDeviceRequiredModalOpen}
        onClose={() => setIsDeviceRequiredModalOpen(false)}
        onConnectedAndStart={() => {
          dispatch(setIsRecordingSession(true));
          navigate('/posture');
        }}
      />
    </div>
  );
};
