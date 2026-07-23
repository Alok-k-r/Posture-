import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, setChatOpen, setIsRecordingSession } from '../store/store';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  TrendingUp, 
  Target, 
  Zap, 
  Clock, 
  Calendar, 
  ChevronRight, 
  Activity, 
  Brain, 
  Shield, 
  Sparkles, 
  MessageSquare, 
  Flame, 
  Award, 
  CheckCircle2, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Info,
  Play,
  PlayCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { LocalModelService } from '../services/localModelService';
import { SessionService, UnifiedSession } from '../services/sessionService';
import { auth } from '../lib/firebase';

export const AnalyticsScreen: React.FC = () => {
  const dispatch = useDispatch();
  const { 
    thresholds, 
    score: currentScore, 
    history, 
    incidents,
    goodSessionSeconds,
    totalSessionSeconds,
    isRecordingSession
  } = useSelector((state: RootState) => state.posture);
  const user = useSelector((state: RootState) => state.auth.user);

  const [sessions, setSessions] = useState<UnifiedSession[]>([]);

  useEffect(() => {
    const userId = user?.id || auth.currentUser?.uid || 'guest';
    const unsubscribe = SessionService.subscribeToSessions(userId, (fetched) => {
      setSessions(fetched);
    });
    return () => unsubscribe();
  }, [user?.id, auth.currentUser?.uid]);

  const completedSessionsCount = sessions.length;
  const isDemo = localStorage.getItem('login_mode') === 'demo';
  const shouldShowRealData = isRecordingSession || completedSessionsCount >= 1 || isDemo;

  const [selectedDayIndex, setSelectedDayIndex] = useState(4); 
  const [viewType, setViewType] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [activeTrendMetric, setActiveTrendMetric] = useState<'health' | 'load' | 'fatigue' | 'recovery'>('health');
  const [advancedExpanded, setAdvancedExpanded] = useState(false);

  // Retrieve current computed metrics from our Local AI Biomechanical Engine
  const localMetrics = LocalModelService.getMetrics();
  const c = localMetrics.slouchConcentration;
  const totalPatterns = c.morningSlouches + c.afternoonSlouches + c.eveningSlouches + c.nightSlouches;
  const dp = localMetrics.digitalProfile;
  const risk = localMetrics.injuryRisk;

  // Calculate average score from history
  const historyAvg = history.length > 0 
    ? Math.round(history.reduce((acc, val) => acc + val, 0) / history.length) 
    : 82;

  // Smart Empty State check: Avoid showing blank charts or zeros if no active session tracked yet
  const hasData = totalSessionSeconds > 0 || history.length > 0;

  const handleAskGemini = () => {
    const report = LocalModelService.compileLocalAIReport();
    const event = new CustomEvent('posturecare_trigger_ai_report', { detail: { report } });
    window.dispatchEvent(event);
    dispatch(setChatOpen(true));
  };

  const getDayColor = (s: number) => {
    if (s >= thresholds.good) return '#22C55E';
    if (s >= thresholds.warn) return '#6366F1';
    return '#EF4444';
  };

  // 7. Consistency Calendar Grid Calculations (GitHub style for last 28 days)
  const consistencyDays = Array.from({ length: 28 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (27 - i));
    const dateKey = date.toDateString();
    
    let score = 0;
    let type: 'excellent' | 'good' | 'average' | 'poor' | 'missed' = 'missed';
    
    const isDemo = localStorage.getItem('login_mode') === 'demo';
    
    if (isDemo) {
      score = 80;
      type = 'good';
      if (i === 27) {
        score = hasData ? currentScore : 0;
      } else if (i === 26) {
        score = hasData ? historyAvg - 4 : 0;
      } else if (i % 7 === 0) {
        type = 'missed';
        score = 0;
      } else if (i % 9 === 0) {
        type = 'poor';
        score = 48;
      } else if (i % 5 === 0) {
        type = 'average';
        score = 68;
      } else if (i % 3 === 0) {
        type = 'excellent';
        score = 92;
      } else {
        type = 'good';
        score = 82;
      }
    } else {
      // REAL USER - Check actual sessions from unified database sessions
      const matchedSessions = sessions.filter(s => {
        if (!s.date) return false;
        return new Date(s.date).toDateString() === dateKey;
      });
      
      if (i === 27) {
        if (hasData) {
          score = currentScore;
        } else if (matchedSessions.length > 0) {
          score = matchedSessions[0].score;
        } else {
          score = 0;
        }
      } else {
        if (matchedSessions.length > 0) {
          const sum = matchedSessions.reduce((acc, s) => acc + (s.score || 0), 0);
          score = Math.round(sum / matchedSessions.length);
        } else {
          score = 0;
        }
      }
    }

    if (type !== 'missed' || !isDemo) {
      if (score >= thresholds.good) type = 'excellent';
      else if (score >= thresholds.warn) type = 'good';
      else if (score > 45) type = 'average';
      else if (score > 0) type = 'poor';
      else type = 'missed';
    }
    
    return {
      dayNum: date.getDate(),
      dateStr: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score,
      type
    };
  });

  // Weekly achievements calculated dynamically from user's real sessions in the last 7 days vs previous 7 days
  const now = new Date();
  const past7DaysSessions = sessions.filter(s => {
    if (!s.date && !s.startTime) return false;
    const d = new Date(s.date || s.startTime || '');
    const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
    return diffDays >= 0 && diffDays <= 7;
  });

  const prev7DaysSessions = sessions.filter(s => {
    if (!s.date && !s.startTime) return false;
    const d = new Date(s.date || s.startTime || '');
    const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
    return diffDays > 7 && diffDays <= 14;
  });

  const thisWeekCount = past7DaysSessions.length + (totalSessionSeconds > 0 ? 1 : 0);

  const thisWeekAvgLoad = past7DaysSessions.length > 0 
    ? past7DaysSessions.reduce((acc, s) => acc + (s.avgLoadLbs || 12), 0) / past7DaysSessions.length 
    : localMetrics.averageThoracicLoadLbs;

  const prevWeekAvgLoad = prev7DaysSessions.length > 0 
    ? prev7DaysSessions.reduce((acc, s) => acc + (s.avgLoadLbs || 18), 0) / prev7DaysSessions.length 
    : 18.5;

  const loadReductionPercent = prevWeekAvgLoad > 0 
    ? Math.max(0, Math.round(((prevWeekAvgLoad - thisWeekAvgLoad) / prevWeekAvgLoad) * 100)) 
    : 0;

  const thisWeekAvgEndurance = past7DaysSessions.length > 0 
    ? past7DaysSessions.reduce((acc, s) => acc + (s.score || 70), 0) / past7DaysSessions.length 
    : (hasData ? currentScore : 70);

  const prevWeekAvgEndurance = prev7DaysSessions.length > 0 
    ? prev7DaysSessions.reduce((acc, s) => acc + (s.score || 70), 0) / prev7DaysSessions.length 
    : 70;

  const enduranceGainPercent = prevWeekAvgEndurance > 0 
    ? Math.max(0, Math.round(((thisWeekAvgEndurance - prevWeekAvgEndurance) / prevWeekAvgEndurance) * 100)) 
    : 0;

  // 8. Health Trend Timeline dynamic dataset (daily / weekly / monthly)
  const getTrendData = () => {
    const isDemo = localStorage.getItem('login_mode') === 'demo';
    
    if (isDemo) {
      if (viewType === 'daily') {
        return [
          { name: '09:00', health: 85, load: 12, fatigue: 15, recovery: 90, stability: 88 },
          { name: '11:00', health: 88, load: 15, fatigue: 20, recovery: 85, stability: 92 },
          { name: '13:00', health: 78, load: 24, fatigue: 35, recovery: 80, stability: 82 },
          { name: '15:00', health: 65, load: 38, fatigue: 52, recovery: 70, stability: 74 },
          { name: '17:00', health: 82, load: 18, fatigue: 28, recovery: 88, stability: 86 },
          { name: '19:00', health: hasData ? historyAvg : 80, load: Math.round(localMetrics.upperBackStrainLbs), fatigue: Math.round(localMetrics.fatigueScore), recovery: Math.round(localMetrics.recoveryEfficiency), stability: Math.round(localMetrics.stabilityScore) },
        ];
      } else if (viewType === 'weekly') {
        return [
          { name: 'Mon', health: 85, load: 14, fatigue: 22, recovery: 88, stability: 86 },
          { name: 'Tue', health: 72, load: 28, fatigue: 45, recovery: 75, stability: 78 },
          { name: 'Wed', health: 88, load: 12, fatigue: 18, recovery: 92, stability: 90 },
          { name: 'Thu', health: 65, load: 35, fatigue: 55, recovery: 68, stability: 72 },
          { name: 'Fri', health: hasData ? historyAvg : 84, load: Math.round(localMetrics.averageThoracicLoadLbs), fatigue: Math.round(localMetrics.fatigueScore), recovery: Math.round(localMetrics.recoveryEfficiency), stability: Math.round(localMetrics.stabilityScore) },
          { name: 'Sat', health: 78, load: 16, fatigue: 24, recovery: 85, stability: 84 },
          { name: 'Sun', health: 82, load: 15, fatigue: 20, recovery: 89, stability: 88 },
        ];
      } else {
        return [
          { name: 'Jan', health: 70, load: 26, fatigue: 40, recovery: 72, stability: 75 },
          { name: 'Feb', health: 74, load: 22, fatigue: 32, recovery: 78, stability: 80 },
          { name: 'Mar', health: 81, load: 18, fatigue: 25, recovery: 84, stability: 85 },
          { name: 'Apr', health: hasData ? historyAvg : 82, load: Math.round(localMetrics.averageThoracicLoadLbs), fatigue: Math.round(localMetrics.fatigueScore), recovery: Math.round(localMetrics.recoveryEfficiency), stability: Math.round(localMetrics.stabilityScore) },
        ];
      }
    } else {
      // REAL USER - Strictly mapped to actual user history days/hours/weeks
      const today = new Date();
      
      if (viewType === 'daily') {
        // Today's hourly timeline slots (08:00 to 20:00)
        const hourSlots = [8, 10, 12, 14, 16, 18, 20];
        return hourSlots.map(hour => {
          const slotLabel = `${hour.toString().padStart(2, '0')}:00`;
          
          // Filter sessions recorded today around this hour (+/- 1 hour)
          const matched = sessions.filter(s => {
            if (!s.date && !s.startTime) return false;
            const sDate = new Date(s.date || s.startTime || '');
            return sDate.toDateString() === today.toDateString() && Math.abs(sDate.getHours() - hour) <= 1;
          });

          const isCurrentHour = Math.abs(today.getHours() - hour) <= 1;

          if (matched.length > 0) {
            const avgHealth = Math.round(matched.reduce((acc, s) => acc + (s.score || 0), 0) / matched.length);
            const avgLoad = Math.round(matched.reduce((acc, s) => acc + (s.avgLoadLbs || 12), 0) / matched.length);
            const avgFatigue = Math.round(matched.reduce((acc, s) => acc + (s.fatigueScore || 20), 0) / matched.length);
            const avgRecovery = Math.round(matched.reduce((acc, s) => acc + (s.complianceRate || 85), 0) / matched.length);
            const avgStability = Math.round(matched.reduce((acc, s) => acc + (s.stabilityScore || 85), 0) / matched.length);

            return { name: slotLabel, health: avgHealth, load: avgLoad, fatigue: avgFatigue, recovery: avgRecovery, stability: avgStability };
          } else if (isCurrentHour && hasData) {
            // Active live recording session right now
            return {
              name: slotLabel,
              health: currentScore,
              load: Math.round(localMetrics.upperBackStrainLbs),
              fatigue: Math.round(localMetrics.fatigueScore),
              recovery: Math.round(localMetrics.recoveryEfficiency),
              stability: Math.round(localMetrics.stabilityScore)
            };
          } else {
            // NO SESSION RECORDED for this hour -> 0
            return { name: slotLabel, health: 0, load: 0, fatigue: 0, recovery: 0, stability: 0 };
          }
        });

      } else if (viewType === 'weekly') {
        // Last 7 Days (6 days ago to Today)
        return Array.from({ length: 7 }, (_, idx) => {
          const date = new Date();
          date.setDate(today.getDate() - (6 - idx));
          const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
          const isToday = date.toDateString() === today.toDateString();

          const matched = sessions.filter(s => {
            if (!s.date && !s.startTime) return false;
            const sDate = new Date(s.date || s.startTime || '');
            return sDate.toDateString() === date.toDateString();
          });

          if (matched.length > 0) {
            const avgHealth = Math.round(matched.reduce((acc, s) => acc + (s.score || 0), 0) / matched.length);
            const avgLoad = Math.round(matched.reduce((acc, s) => acc + (s.avgLoadLbs || 12), 0) / matched.length);
            const avgFatigue = Math.round(matched.reduce((acc, s) => acc + (s.fatigueScore || 20), 0) / matched.length);
            const avgRecovery = Math.round(matched.reduce((acc, s) => acc + (s.complianceRate || 85), 0) / matched.length);
            const avgStability = Math.round(matched.reduce((acc, s) => acc + (s.stabilityScore || 85), 0) / matched.length);

            return { name: dayLabel, health: avgHealth, load: avgLoad, fatigue: avgFatigue, recovery: avgRecovery, stability: avgStability };
          } else if (isToday && hasData) {
            // Live active session today
            return {
              name: dayLabel,
              health: currentScore,
              load: Math.round(localMetrics.upperBackStrainLbs),
              fatigue: Math.round(localMetrics.fatigueScore),
              recovery: Math.round(localMetrics.recoveryEfficiency),
              stability: Math.round(localMetrics.stabilityScore)
            };
          } else {
            // NO SESSION ON THIS DAY -> 0
            return { name: dayLabel, health: 0, load: 0, fatigue: 0, recovery: 0, stability: 0 };
          }
        });

      } else {
        // Monthly view: Past 4 weeks (3 weeks ago to Current Week)
        return Array.from({ length: 4 }, (_, idx) => {
          const weekLabel = `W${idx + 1}`;
          
          // Filter sessions in week bucket
          const endDaysAgo = (3 - idx) * 7;
          const startDaysAgo = endDaysAgo + 7;

          const matched = sessions.filter(s => {
            if (!s.date && !s.startTime) return false;
            const sDate = new Date(s.date || s.startTime || '');
            const diffDays = Math.floor((today.getTime() - sDate.getTime()) / (1000 * 3600 * 24));
            return diffDays >= endDaysAgo && diffDays < startDaysAgo;
          });

          const isCurrentWeek = idx === 3;

          if (matched.length > 0) {
            const avgHealth = Math.round(matched.reduce((acc, s) => acc + (s.score || 0), 0) / matched.length);
            const avgLoad = Math.round(matched.reduce((acc, s) => acc + (s.avgLoadLbs || 12), 0) / matched.length);
            const avgFatigue = Math.round(matched.reduce((acc, s) => acc + (s.fatigueScore || 20), 0) / matched.length);
            const avgRecovery = Math.round(matched.reduce((acc, s) => acc + (s.complianceRate || 85), 0) / matched.length);
            const avgStability = Math.round(matched.reduce((acc, s) => acc + (s.stabilityScore || 85), 0) / matched.length);

            return { name: weekLabel, health: avgHealth, load: avgLoad, fatigue: avgFatigue, recovery: avgRecovery, stability: avgStability };
          } else if (isCurrentWeek && hasData) {
            return {
              name: weekLabel,
              health: currentScore,
              load: Math.round(localMetrics.upperBackStrainLbs),
              fatigue: Math.round(localMetrics.fatigueScore),
              recovery: Math.round(localMetrics.recoveryEfficiency),
              stability: Math.round(localMetrics.stabilityScore)
            };
          } else {
            // NO SESSION IN THIS WEEK -> 0
            return { name: weekLabel, health: 0, load: 0, fatigue: 0, recovery: 0, stability: 0 };
          }
        });
      }
    }
  };

  const trendData = getTrendData();

  const getMetricKey = () => {
    switch (activeTrendMetric) {
      case 'health': return 'health';
      case 'load': return 'load';
      case 'fatigue': return 'fatigue';
      case 'recovery': return 'recovery';
      default: return 'health';
    }
  };

  const getMetricColor = () => {
    switch (activeTrendMetric) {
      case 'health': return '#6366F1'; // indigo
      case 'load': return '#EF4444'; // rose
      case 'fatigue': return '#F59E0B'; // amber
      case 'recovery': return '#10B981'; // emerald
    }
  };

  const getMetricUnit = () => {
    switch (activeTrendMetric) {
      case 'health': return '% Score';
      case 'load': return ' lbs';
      case 'fatigue': return '%';
      case 'recovery': return '%';
    }
  };

  return (
    <div className="p-6 space-y-8 pb-32 relative z-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none">Intelligence</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2.5">Upper Back Health Platform</p>
        </div>
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
          <Brain className="w-6 h-6 animate-pulse" />
        </div>
      </div>

      {/* SMART EMPTY STATE */}
      {!hasData ? (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-8 rounded-[48px] text-center space-y-6 shadow-premium border border-slate-100/50"
        >
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-600">
            <Activity className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-800">Learning your posture habits...</h3>
            <p className="text-sm font-medium text-slate-500 max-w-md mx-auto leading-relaxed">
              We need dynamic biomechanical data to formulate your upper back intelligence dashboard.
            </p>
            <div className="inline-block bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mt-3">
              "Complete one sitting session to unlock your Health Report"
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Your sensor calibration begins immediately as you hold an upright baseline posture.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-8">
          
          {/* 1. HEALTH SCORE CARD */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-7 sm:p-8 rounded-[48px] shadow-premium border border-indigo-100/30 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div className="space-y-3 flex-1">
                <span className="bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-500/10 flex items-center gap-1.5 w-max">
                  <Shield size={10} fill="currentColor" /> Premium Orthopedic Core
                </span>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">
                  Upper Back Health Score
                </h3>
                <p className="text-sm font-semibold text-slate-500 leading-relaxed">
                  {localMetrics.dailyUpperBackHealthScore >= 80 
                    ? "Excellent upright stance consistency! S-Curve paraspinal muscles are perfectly stabilized." 
                    : "Moderate strain level detected. Minor slouching shifts the load onto your upper fibers."}
                </p>
              </div>
              
              <div className="flex items-center gap-5 shrink-0 bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
                <div className="text-center">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">Grade</span>
                  <span className="text-3xl font-black text-indigo-600 tracking-tighter block mt-0.5">{localMetrics.sessionGrade}</span>
                </div>
                <div className="w-[1px] h-10 bg-slate-200" />
                <div className="text-right">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Health Index</span>
                  <div className="flex items-baseline justify-end gap-1 mt-0.5">
                    <span className="text-4xl font-black text-slate-800 tracking-tighter">{localMetrics.dailyUpperBackHealthScore}</span>
                    <span className="text-sm font-bold text-slate-400">/100</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 2. CURRENT LOAD CARD (STRESS LEVEL) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass p-6 sm:p-8 rounded-[48px] shadow-soft space-y-6"
          >
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Activity className="w-4.5 h-4.5 text-rose-500 animate-pulse" /> Upper Back Stress Level
                </h4>
                <p className="text-xs font-semibold text-slate-500">Gravitational lever force acting on thoracic spine joints</p>
              </div>
              {shouldShowRealData && (
                <span className={cn(
                  "text-[10px] font-black px-3.5 py-1 rounded-full uppercase tracking-wider border shadow-sm",
                  localMetrics.loadClassification === "Very Low" || localMetrics.loadClassification === "Low"
                    ? "bg-emerald-50 border-emerald-100 text-emerald-600"
                    : localMetrics.loadClassification === "Moderate"
                    ? "bg-amber-50 border-amber-100 text-amber-600"
                    : "bg-rose-50 border-rose-100 text-rose-600"
                )}>
                  {localMetrics.loadClassification} Stress
                </span>
              )}
            </div>

            {!shouldShowRealData ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4 bg-slate-50/50 rounded-[32px] border border-dashed border-slate-200">
                <Activity className="w-8 h-8 text-slate-300 mb-2 animate-pulse" />
                <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-1">Spinal Load Calculations Standby</h5>
                <p className="text-[10px] text-slate-400 font-semibold max-w-[320px] leading-relaxed">
                  Real-time trapezius eccentric tension and gravitational lever force modeling require an active posture recording session.
                </p>
                <button 
                  onClick={() => dispatch(setIsRecordingSession(true))}
                  className="mt-3.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-[9px] font-black uppercase tracking-widest transition-all active:scale-95"
                >
                  Start Recording
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-slate-50/40 p-5 rounded-3xl border border-slate-100/60 space-y-1.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Real-Time Load</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-800">{localMetrics.upperBackStrainLbs}</span>
                      <span className="text-xs font-black text-slate-400 uppercase">lbs</span>
                    </div>
                  </div>
                  <div className="bg-slate-50/40 p-5 rounded-3xl border border-slate-100/60 space-y-1.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Peak Strain</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-800">{localMetrics.peakThoracicLoadLbs}</span>
                      <span className="text-xs font-black text-slate-400 uppercase">lbs</span>
                    </div>
                  </div>
                  <div className="bg-slate-50/40 p-5 rounded-3xl border border-slate-100/60 space-y-1.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Session Average</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-800">{localMetrics.averageThoracicLoadLbs}</span>
                      <span className="text-xs font-black text-slate-400 uppercase">lbs</span>
                    </div>
                  </div>
                </div>

                {/* Premium segmented visual meter */}
                <div className="space-y-2">
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex gap-0.5 p-0.5">
                    <div className={cn("h-full rounded-l-full flex-1 transition-all duration-500", localMetrics.upperBackStrainLbs <= 15 ? "bg-emerald-500" : "bg-emerald-200/50")} />
                    <div className={cn("h-full flex-1 transition-all duration-500", localMetrics.upperBackStrainLbs > 15 && localMetrics.upperBackStrainLbs <= 25 ? "bg-teal-500" : "bg-teal-200/50")} />
                    <div className={cn("h-full flex-1 transition-all duration-500", localMetrics.upperBackStrainLbs > 25 && localMetrics.upperBackStrainLbs <= 38 ? "bg-amber-500" : "bg-amber-200/50")} />
                    <div className={cn("h-full flex-1 transition-all duration-500", localMetrics.upperBackStrainLbs > 38 && localMetrics.upperBackStrainLbs <= 50 ? "bg-orange-500" : "bg-orange-200/50")} />
                    <div className={cn("h-full rounded-r-full flex-1 transition-all duration-500", localMetrics.upperBackStrainLbs > 50 ? "bg-rose-500" : "bg-rose-200/50")} />
                  </div>
                  <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    <span>Excellent (10lbs)</span>
                    <span>Low</span>
                    <span>Moderate</span>
                    <span>High</span>
                    <span>Needs Attention</span>
                  </div>
                </div>

                <div className="bg-slate-50/50 border border-slate-150 p-3 rounded-2xl flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-400 font-semibold leading-normal">
                    <strong>Wellness Insight:</strong> This metric calculates static paraspinal muscle load based on postural displacement relative to your spine vertical gravity axis. It is designed for fatigue prevention, not as an official medical diagnostic.
                  </p>
                </div>
              </>
            )}
          </motion.div>

          {/* 3. MUSCLE FATIGUE CARD */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass p-6 sm:p-8 rounded-[48px] shadow-soft space-y-6"
          >
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Flame className="w-4.5 h-4.5 text-amber-500" /> Muscle Fatigue Level
                </h4>
                <p className="text-xs font-semibold text-slate-500">Active paraspinal and trap muscle micro-stability degradation</p>
              </div>
              {shouldShowRealData && (
                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-wider border border-indigo-100">
                  {localMetrics.fatigueTrend} Trend
                </span>
              )}
            </div>

            {!shouldShowRealData ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4 bg-slate-50/50 rounded-[32px] border border-dashed border-slate-200">
                <Flame className="w-8 h-8 text-slate-300 mb-2 animate-pulse" />
                <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-1">Muscle Fatigue Tracking Standby</h5>
                <p className="text-[10px] text-slate-400 font-semibold max-w-[320px] leading-relaxed">
                  Paraspinal and levator scapulae fatigue estimation models activate only during active postural composure recording.
                </p>
                <button 
                  onClick={() => dispatch(setIsRecordingSession(true))}
                  className="mt-3.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-[9px] font-black uppercase tracking-widest transition-all active:scale-95"
                >
                  Start Recording
                </button>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-center gap-8 bg-slate-50/30 p-5 rounded-[36px] border border-slate-100/60">
                <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="72" cy="72" r="58" stroke="#F1F5F9" strokeWidth="10" fill="transparent" />
                    <motion.circle 
                      cx="72" 
                      cy="72" 
                      r="58" 
                      stroke="#F59E0B" 
                      strokeWidth="10" 
                      fill="transparent" 
                      strokeDasharray={364.4}
                      initial={{ strokeDashoffset: 364.4 }}
                      animate={{ strokeDashoffset: 364.4 - (364.4 * localMetrics.fatigueScore) / 100 }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-slate-800 tracking-tighter">{localMetrics.fatigueScore}%</span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Fatigue Index</span>
                  </div>
                </div>

                <div className="flex-1 w-full space-y-4">
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="bg-white/60 p-3.5 rounded-2xl border border-slate-150">
                      <span className="text-[8px] font-black text-slate-400 uppercase block">Fatigue Growth</span>
                      <span className="text-sm font-black text-slate-700 block mt-0.5">+{localMetrics.fatigueGrowthRate}%/min</span>
                    </div>
                    <div className="bg-white/60 p-3.5 rounded-2xl border border-slate-150">
                      <span className="text-[8px] font-black text-slate-400 uppercase block">Recovery Speed</span>
                      <span className="text-sm font-black text-emerald-600 block mt-0.5">+{localMetrics.fatigueRecoveryRate}%/min</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-[9.5px] font-bold text-slate-500 px-1 border-t border-slate-100 pt-3">
                    <div className="flex justify-between">
                      <span>PREDICTED FATIGUE (30 MINS)</span>
                      <span className="font-black text-slate-700">{localMetrics.predictedFatigue30m}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>PREDICTED FATIGUE (60 MINS)</span>
                      <span className="font-black text-slate-700">{localMetrics.predictedFatigue60m}%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* 4. RECOVERY SCORE CARD */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass p-6 sm:p-8 rounded-[48px] shadow-soft space-y-6"
          >
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" /> Posture Recovery Score
                </h4>
                <p className="text-xs font-semibold text-slate-500">Speed and compliance of vertical alignment adjustments</p>
              </div>
              {shouldShowRealData && (
                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider border border-emerald-100">
                  {localMetrics.recoveryClassification} Class
                </span>
              )}
            </div>

            {!shouldShowRealData ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4 bg-slate-50/50 rounded-[32px] border border-dashed border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-slate-300 mb-2 animate-pulse" />
                <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-1">Posture Recovery Analytics Standby</h5>
                <p className="text-[10px] text-slate-400 font-semibold max-w-[320px] leading-relaxed">
                  Compliance metrics, alert realignment speeds, and recovery rate computations activate only during active postural tracking.
                </p>
                <button 
                  onClick={() => dispatch(setIsRecordingSession(true))}
                  className="mt-3.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-[9px] font-black uppercase tracking-widest transition-all active:scale-95"
                >
                  Start Recording
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50/40 p-5 rounded-3xl border border-slate-100/60 text-center space-y-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Adjustment Efficiency</span>
                  <span className="text-2xl font-black text-slate-800 block">{localMetrics.recoveryEfficiency}%</span>
                  <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wide">Correction smooth index</span>
                </div>
                
                <div className="bg-slate-50/40 p-5 rounded-3xl border border-slate-100/60 text-center space-y-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Average Response</span>
                  <span className="text-2xl font-black text-slate-800 block">{localMetrics.averageRecoveryTimeSeconds}s</span>
                  <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wide">From alarm to upright</span>
                </div>

                <div className="bg-slate-50/40 p-5 rounded-3xl border border-slate-100/60 text-center space-y-1 col-span-2 sm:col-span-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Success Percentage</span>
                  <span className="text-2xl font-black text-slate-800 block">{localMetrics.reminderSuccessPercentage}%</span>
                  <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wide">{localMetrics.correctionsAchievedCount} of {localMetrics.remindersSentCount} alerts cleared</span>
                </div>
              </div>
            )}
          </motion.div>

          {/* 5. WEEKLY ACHIEVEMENTS SECTION (Calculated from real metrics) */}
          <div className="glass p-6 rounded-[40px] shadow-soft space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-sm font-black text-slate-800">Weekly Achievements</h4>
                <p className="text-xs text-slate-400">Calculated entirely from computed biomechanical telemetry logs</p>
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-100">
                {thisWeekCount} Session{thisWeekCount === 1 ? '' : 's'} Tracked
              </span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[
                { 
                  desc: loadReductionPercent > 0 ? `Reduced Upper Back Stress by ${loadReductionPercent}%` : `Maintained Upper Back Load at ${Math.round(thisWeekAvgLoad)} lbs`, 
                  sub: "Decreased active static loading on paraspinals" 
                },
                { 
                  desc: enduranceGainPercent > 0 ? `Improved Endurance by +${enduranceGainPercent}%` : `Endurance Index at ${localMetrics.dailyEnduranceScore}%`, 
                  sub: "Held longer unbroken upright stance during sessions" 
                },
                { 
                  desc: `Spine Stability Rating: ${localMetrics.stabilityScore}%`, 
                  sub: "Controlled paraspinal shivering and micro-drift" 
                },
                { 
                  desc: `Completed ${thisWeekCount} Healthy Sitting Session${thisWeekCount === 1 ? '' : 's'}`, 
                  sub: "Fully tracked alignment sessions in user history" 
                }
              ].map((ach, aIdx) => (
                <div key={aIdx} className="flex items-start gap-3 p-3.5 bg-indigo-50/20 border border-indigo-150 rounded-2xl">
                  <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11.5px] font-black text-indigo-950 block">{ach.desc}</span>
                    <span className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 block">{ach.sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 7. HISTORY SECTION */}
          <div className="space-y-6">
            <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none uppercase tracking-wide">composure timelines & history</h3>
            
            {/* Health Trend Timeline Chart */}
            <div className="glass p-6 sm:p-8 rounded-[48px] shadow-premium space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h4 className="text-sm font-black text-slate-800">Health Trend Timeline</h4>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">Track your upper back stability and load changes</p>
                </div>
                
                {/* Daily, Weekly, Monthly view toggles */}
                <div className="bg-slate-100/50 p-1 rounded-2xl flex gap-1 border border-slate-150 shrink-0">
                  {['daily', 'weekly', 'monthly'].map((type) => (
                    <button 
                      key={type}
                      onClick={() => setViewType(type as any)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-[9.5px] font-black uppercase tracking-widest transition-all",
                        viewType === type ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Metric focus selector to prevent chart clutter */}
              <div className="flex flex-wrap gap-2 pb-2">
                {[
                  { label: "Overall Health", key: "health", icon: Shield },
                  { label: "Stress Load", key: "load", icon: Activity },
                  { label: "Muscle Fatigue", key: "fatigue", icon: Flame },
                  { label: "Recovery Efficiency", key: "recovery", icon: RefreshCw },
                ].map((pill) => (
                  <button
                    key={pill.key}
                    onClick={() => setActiveTrendMetric(pill.key as any)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all active:scale-95",
                      activeTrendMetric === pill.key
                        ? "bg-slate-900 text-white border-slate-900 shadow-md"
                        : "bg-white text-slate-500 border-slate-150 hover:bg-slate-50"
                    )}
                  >
                    <pill.icon className="w-3.5 h-3.5" />
                    {pill.label}
                  </button>
                ))}
              </div>

              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" strokeOpacity={0.4} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94A3B8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94A3B8' }} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '16px',
                        border: 'none',
                        backgroundColor: '#1E293B',
                        color: '#FFF',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                      }}
                      formatter={(val) => [`${val}${getMetricUnit()}`, activeTrendMetric.toUpperCase()]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey={getMetricKey()} 
                      stroke={getMetricColor()} 
                      strokeWidth={3} 
                      dot={{ r: 4, strokeWidth: 2 }} 
                      activeDot={{ r: 6 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* INTERROGATE REPORT WITH GEMINI */}
          <div className="pt-2">
            <button 
              onClick={handleAskGemini}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-4 px-6 rounded-[24px] flex items-center justify-center gap-2.5 text-xs font-black uppercase tracking-[0.15em] shadow-lg shadow-indigo-100 active:scale-[0.98] transition-all border border-white/10"
            >
              <Sparkles size={15} className="animate-pulse text-amber-300 fill-amber-300/10" /> Interrogate Local Report with Gemini
            </button>
          </div>

          {/* 8. EXPANDABLE ADVANCED INSIGHTS PANEL */}
          <div className="glass rounded-[32px] overflow-hidden border border-slate-150">
            <button
              onClick={() => setAdvancedExpanded(!advancedExpanded)}
              className="w-full py-4.5 px-6 flex justify-between items-center bg-slate-50/50 hover:bg-slate-50 transition-colors text-left"
            >
              <span className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                🔧 View Advanced Biomechanical Calculations & Thresholds
              </span>
              {advancedExpanded ? <ChevronUp className="text-slate-400 w-4 h-4" /> : <ChevronDown className="text-slate-400 w-4 h-4" />}
            </button>

            <AnimatePresence initial={false}>
              {advancedExpanded && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="overflow-hidden bg-white border-t border-slate-150"
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <div className="p-6 space-y-6 text-xs text-slate-600 font-medium leading-relaxed">
                    
                    {/* Adaptive Thresholds */}
                    <div className="space-y-3">
                      <h5 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Adaptive Sitting Thresholds</h5>
                      <p className="text-slate-400 text-[10.5px]">
                        The local AI model recalculates alerting bounds dynamic relative to your paraspinal stamina history.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex justify-between items-center">
                          <span>Warning Level</span>
                          <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-black">{localMetrics.personalizedWarnThreshold}°</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex justify-between items-center">
                          <span>Good Standard Limit</span>
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-black">{localMetrics.personalizedGoodThreshold}°</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex justify-between items-center">
                          <span>Correction Reentry</span>
                          <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-black">{localMetrics.personalizedRecoveryThreshold}°</span>
                        </div>
                      </div>
                    </div>

                    {/* Biomechanical metrics breakdown */}
                    <div className="space-y-3 border-t border-slate-100 pt-5">
                      <h5 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Active Fiber Strain Calculations</h5>
                      <p className="text-slate-400 text-[10.5px]">
                        Spinal load calculations model trapezius eccentric tension using a trigonometric gravity lever formula.
                      </p>
                      <div className="space-y-2 text-[10.5px]">
                        <div className="flex justify-between border-b border-slate-50 pb-1.5">
                          <span>Static muscle holding pressure:</span>
                          <strong className="text-slate-800">{localMetrics.upperBackStaticLoadLbs} lbs</strong>
                        </div>
                        <div className="flex justify-between border-b border-slate-50 pb-1.5">
                          <span>Average paraspinal contraction velocity:</span>
                          <strong className="text-slate-800">+{localMetrics.fatigueGrowthRate}% per minute</strong>
                        </div>
                        <div className="flex justify-between border-b border-slate-50 pb-1.5">
                          <span>Warning compliance response rate:</span>
                          <strong className="text-slate-800">{localMetrics.dailyComplianceRate}%</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Time-of-day high stress window:</span>
                          <strong className="text-indigo-600 uppercase">{dp.highRiskTimeWindow}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Disclaimers & Advice */}
                    <div className="bg-slate-50 p-4 rounded-2xl space-y-2 border border-slate-100 mt-2">
                      <span className="font-black text-slate-700 block text-[9.5px] uppercase">Orthopedic Engineering Disclaimer</span>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        All load models and stress calculations are conducted strictly client-side. They represents sports-science biomechanical proxies designed for ergonomics training and wellness monitoring. These calculations are not intended for treatment or replacement of certified professional clinical diagnostics.
                      </p>
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      )}
    </div>
  );
};
