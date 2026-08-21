import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Sparkles, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Target, 
  BrainCircuit, 
  Zap, 
  ShieldCheck, 
  RefreshCw, 
  ChevronRight, 
  Info, 
  Activity, 
  Flame, 
  ArrowUpRight 
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ReferenceLine, 
  BarChart, 
  Bar, 
  Cell 
} from 'recharts';
import { cn } from '../../lib/utils';
import { UnifiedSession } from '../../services/sessionService';
import { 
  PostureMlForecastService, 
  PostureForecastData, 
  CircadianSlot 
} from '../../services/postureMlForecastService';
import { generatePosturePredictionAnalysis } from '../../services/geminiService';
import Markdown from 'react-markdown';

interface PosturePredictionViewProps {
  currentScore: number;
  recentSessions: UnifiedSession[];
  userProfile?: { age?: number; height?: number; weight?: number; name?: string };
}

export const PosturePredictionView: React.FC<PosturePredictionViewProps> = ({
  currentScore,
  recentSessions,
  userProfile
}) => {
  const [selectedTarget, setSelectedTarget] = useState<number>(90);
  const [isConsultingAi, setIsConsultingAi] = useState<boolean>(false);
  const [aiPrognosis, setAiPrognosis] = useState<string | null>(null);

  // Re-run ML model whenever target or session history updates
  const forecast: PostureForecastData = useMemo(() => {
    return PostureMlForecastService.calculateForecast(
      recentSessions,
      currentScore,
      selectedTarget,
      userProfile
    );
  }, [recentSessions, currentScore, selectedTarget, userProfile]);

  const handleConsultAi = async () => {
    setIsConsultingAi(true);
    try {
      const response = await generatePosturePredictionAnalysis(forecast, recentSessions);
      setAiPrognosis(response);
    } catch (error) {
      console.error('Failed to fetch AI prognosis:', error);
    } finally {
      setIsConsultingAi(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Critical': return '#e11d48';
      case 'High': return '#f97316';
      case 'Moderate': return '#f59e0b';
      default: return '#10b981';
    }
  };

  const TrajectoryIcon = forecast.improvementVelocityPerDay > 0.3 
    ? TrendingUp 
    : forecast.improvementVelocityPerDay < -0.2 
    ? TrendingDown 
    : Minus;

  return (
    <div className="space-y-6">
      {/* Target Goal Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-[28px] border border-slate-100 shadow-soft">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Target size={16} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Predictive Target Alignment
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Simulate recovery trajectory based on desired posture standard
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl">
          {[
            { label: 'Good (80%)', value: 80 },
            { label: 'Ideal (90%)', value: 90 },
            { label: 'Mastery (95%)', value: 95 }
          ].map((t) => (
            <button
              key={t.value}
              onClick={() => setSelectedTarget(t.value)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-black transition-all",
                selectedTarget === t.value 
                  ? "bg-white text-indigo-600 shadow-xs" 
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hero Prediction Headline Card */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 rounded-[36px] shadow-premium relative overflow-hidden space-y-6">
        {/* Soft Background Accent Glows */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 border border-white/10">
                <BrainCircuit size={12} className="text-indigo-400" />
                ML Biomechanical Forecast Engine
              </span>
              <span className="text-[10px] font-bold text-slate-300">
                {forecast.confidenceScore}% Confidence (±{forecast.confidenceMarginDays}d)
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {forecast.daysToTarget === 0 ? (
                <span>🎉 Ideal Posture Standard Achieved!</span>
              ) : (
                <span>
                  Projected to reach <span className="text-emerald-400">{selectedTarget}% Ideal Posture</span> in{' '}
                  <span className="text-indigo-300 underline decoration-indigo-400 decoration-wavy decoration-2">
                    {forecast.daysToTarget} Days
                  </span>
                </span>
              )}
            </h2>

            <p className="text-xs text-indigo-100/90 font-medium flex items-center gap-1.5">
              <Calendar size={13} className="text-indigo-300" />
              Target Achievement Date:{' '}
              <strong className="text-white font-black">{forecast.projectedTargetDate}</strong>{' '}
              at your ongoing session rate
            </p>
          </div>

          {/* Improvement Velocity Metric Pill */}
          <div className="bg-white/10 backdrop-blur-md border border-white/15 p-4 rounded-3xl text-right shrink-0 flex flex-col justify-center min-w-[140px]">
            <div className="flex items-center justify-end gap-1.5">
              <TrajectoryIcon size={16} style={{ color: forecast.trajectoryStatusColor }} />
              <span className="text-lg font-black text-white">
                {forecast.improvementVelocityPerDay > 0 ? '+' : ''}
                {forecast.improvementVelocityPerDay}%
              </span>
              <span className="text-[10px] text-slate-300 font-bold">/ day</span>
            </div>
            <span 
              className="text-[10px] font-black uppercase tracking-wider block mt-0.5"
              style={{ color: forecast.trajectoryStatusColor }}
            >
              {forecast.trajectoryStatus}
            </span>
          </div>
        </div>

        {/* 4 Quick Prognostic Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 relative z-10 border-t border-white/10">
          <div className="p-3 bg-white/5 rounded-2xl border border-white/5 space-y-0.5">
            <span className="text-[9px] font-black uppercase text-indigo-300 tracking-wider block">
              Current Baseline
            </span>
            <div className="text-xl font-black text-white">{forecast.currentScore}%</div>
            <span className="text-[10px] text-slate-300 font-medium">
              Goal gap: {Math.max(0, selectedTarget - forecast.currentScore)} pts
            </span>
          </div>

          <div className="p-3 bg-white/5 rounded-2xl border border-white/5 space-y-0.5">
            <span className="text-[9px] font-black uppercase text-indigo-300 tracking-wider block">
              Peak Slouch Hour
            </span>
            <div className="text-xl font-black text-rose-300">{forecast.peakSlouchWindow.split(' - ')[0]}</div>
            <span className="text-[10px] text-rose-200 font-medium">
              {forecast.peakSlouchPercentage}% daily slouches
            </span>
          </div>

          <div className="p-3 bg-white/5 rounded-2xl border border-white/5 space-y-0.5">
            <span className="text-[9px] font-black uppercase text-indigo-300 tracking-wider block">
              Habit Solidification
            </span>
            <div className="text-xl font-black text-white">~{forecast.habitConsolidationWeeks} wks</div>
            <span className="text-[10px] text-slate-300 font-medium">
              Motor reflex lock
            </span>
          </div>

          <div className="p-3 bg-white/5 rounded-2xl border border-white/5 space-y-0.5">
            <span className="text-[9px] font-black uppercase text-indigo-300 tracking-wider block">
              Analyzed Sessions
            </span>
            <div className="text-xl font-black text-white">{forecast.totalAnalyzedSessions} logs</div>
            <span className="text-[10px] text-slate-300 font-medium">
              ~{forecast.averageSlouchesPerSession} slouches/sess
            </span>
          </div>
        </div>
      </div>

      {/* Live Data Feeding & Neuro-Muscular ML Ingestion Banner */}
      <div className="bg-white p-6 rounded-[36px] border border-slate-100 shadow-soft space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
              <BrainCircuit size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900">Continuous ML Data Ingestion & Neuro-Training</h3>
                <span className="flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Telemetry
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Live feedback loop continuously feeding session logs, exercise drills, and ergonomic breaks into the predictive engine.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Drill Interventions
            </span>
            <div className="text-lg font-black text-indigo-600">
              {forecast.drillsCompletedToday} logged today
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              +{forecast.drillVelocityBoost}% / day improvement rate boost applied to trajectory
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Ergonomic Breaks
            </span>
            <div className="text-lg font-black text-emerald-600">
              {forecast.breaksLoggedToday} logged today
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              -{forecast.breakFatigueReductionPercent}% circadian paraspinal fatigue dampening
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Learning Algorithm
            </span>
            <div className="text-lg font-black text-slate-800">
              Dynamic OLS + Biometrics
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              Real-time mathematical adaptation on each new sensor session
            </p>
          </div>
        </div>
      </div>

      {/* 2-Column Section: 14-Day Trajectory Curve + Circadian Peak Slouch Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ML Forecast Trajectory Chart */}
        <div className="bg-white p-6 rounded-[36px] border border-slate-100 shadow-soft space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-indigo-600" />
              <div>
                <h3 className="text-sm font-black text-slate-900">14-Day Predictive Posture Path</h3>
                <p className="text-[11px] text-slate-500 font-medium">Historical baseline & projected ML curve</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-bold">
              <span className="flex items-center gap-1 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-indigo-600" /> Historical
              </span>
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Projected
              </span>
            </div>
          </div>

          {/* Recharts Area Chart */}
          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={forecast.forecastCurve} 
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="100%">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="dayLabel" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis domain={[40, 100]} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-2.5 rounded-xl text-[11px] shadow-lg border border-slate-800 space-y-0.5">
                          <div className="font-bold text-slate-300">{data.date} ({data.dayLabel})</div>
                          <div className="text-sm font-black text-emerald-400">
                            {data.isHistorical ? 'Actual' : 'Projected'}: {data.projectedScore}%
                          </div>
                          {!data.isHistorical && (
                            <div className="text-[9px] text-slate-400">
                              95% CI: {data.lowerConfidenceBound}% – {data.upperConfidenceBound}%
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine 
                  y={selectedTarget} 
                  stroke="#6366f1" 
                  strokeDasharray="4 4" 
                  label={{ value: `Goal (${selectedTarget}%)`, fill: '#6366f1', fontSize: 10, position: 'insideTopRight' }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="projectedScore" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#projectedGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl text-[11px] text-emerald-900 font-medium flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
            <span>
              <strong>Confidence Rating:</strong> Based on OLS regression of {forecast.totalAnalyzedSessions} session data points with a steady +{forecast.improvementVelocityPerDay}% daily velocity.
            </span>
          </div>
        </div>

        {/* Circadian Peak Slouch Time Window & Hourly Heatmap */}
        <div className="bg-white p-6 rounded-[36px] border border-slate-100 shadow-soft space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-rose-500" />
              <div>
                <h3 className="text-sm font-black text-slate-900">Peak Slouch Time Window</h3>
                <p className="text-[11px] text-slate-500 font-medium">Circadian postural fatigue distribution</p>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-black uppercase">
              Peak: {forecast.peakSlouchWindow}
            </span>
          </div>

          {/* Peak Warning Banner */}
          <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-100 space-y-1.5">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-rose-600 shrink-0" />
              <h4 className="text-xs font-black text-rose-900">
                Critical Slouch Concentration Detected ({forecast.peakSlouchPercentage}%)
              </h4>
            </div>
            <p className="text-[11px] text-rose-800 leading-relaxed font-medium">
              {forecast.circadianAdvice}
            </p>
          </div>

          {/* Circadian Distribution Bars */}
          <div className="space-y-2 pt-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              24-Hour Slouch Vulnerability Heatmap
            </span>

            <div className="space-y-2">
              {forecast.circadianBreakdown.map((slot) => {
                const isPeak = slot.range === forecast.peakSlouchWindow;
                return (
                  <div key={slot.label} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={cn("font-bold", isPeak ? "text-rose-600 font-black" : "text-slate-700")}>
                        {slot.label} ({slot.range})
                      </span>
                      <span className="font-bold text-slate-500">
                        {slot.percentage}% ({slot.slouchCount} slouches)
                      </span>
                    </div>

                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${Math.max(4, slot.percentage)}%`,
                          backgroundColor: getRiskColor(slot.riskLevel)
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 3-Stage Neuro-Muscular Adaptation Roadmap */}
      <div className="bg-white p-6 sm:p-7 rounded-[36px] border border-slate-100 shadow-soft space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <ShieldCheck size={16} className="text-indigo-600" />
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
            Neuro-Muscular Adaptation & Milestone Roadmap
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {forecast.milestones.map((m, idx) => {
            const isAchieved = m.status === 'Achieved';
            const isInProgress = m.status === 'In Progress';
            return (
              <div 
                key={m.title}
                className={cn(
                  "p-4 rounded-3xl border transition-all space-y-2 flex flex-col justify-between",
                  isAchieved 
                    ? "bg-emerald-50/50 border-emerald-200" 
                    : isInProgress 
                    ? "bg-indigo-50/40 border-indigo-200 ring-2 ring-indigo-300/30" 
                    : "bg-slate-50/60 border-slate-200 opacity-80"
                )}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full",
                      isAchieved ? "bg-emerald-100 text-emerald-800" : isInProgress ? "bg-indigo-100 text-indigo-800" : "bg-slate-200 text-slate-600"
                    )}>
                      Stage 0{idx + 1} • {m.status}
                    </span>
                    <span className="text-xs font-black text-slate-700">{m.targetScore}% Score</span>
                  </div>

                  <h4 className="text-xs font-black text-slate-900">{m.title}</h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                    {m.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span>Timeline:</span>
                  <span className={isAchieved ? "text-emerald-600 font-black" : "text-indigo-600 font-black"}>
                    {isAchieved ? "Completed ✓" : `~${m.estimatedDays} days`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Deep AI Biomechanical Prognosis Section */}
      <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-6 sm:p-7 rounded-[36px] text-white shadow-premium space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Sparkles size={18} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">AI Biomechanist Clinical Prognosis</h3>
              <p className="text-xs text-indigo-200 font-medium">
                Deep neural review of your score trajectory and circadian peak fatigue points.
              </p>
            </div>
          </div>

          <button
            onClick={handleConsultAi}
            disabled={isConsultingAi}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 shrink-0 disabled:opacity-60"
          >
            {isConsultingAi ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>Synthesizing ML Telemetry...</span>
              </>
            ) : (
              <>
                <BrainCircuit size={14} />
                <span>{aiPrognosis ? "Regenerate AI Prognosis" : "Consult AI Biomechanist"}</span>
              </>
            )}
          </button>
        </div>

        {aiPrognosis && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 bg-white/5 border border-white/10 rounded-2xl text-xs text-slate-200 leading-relaxed max-h-80 overflow-y-auto space-y-2"
          >
            <div className="markdown-body text-slate-200">
              <Markdown>{aiPrognosis}</Markdown>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
