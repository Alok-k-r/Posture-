import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Cell as PieCell } from 'recharts';
import { TrendingUp, Target, Zap, Clock, Calendar, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';

export const AnalyticsScreen: React.FC = () => {
  const { thresholds, score: currentScore, history } = useSelector((state: RootState) => state.posture);
  const [selectedDayIndex, setSelectedDayIndex] = useState(4); 
  const [viewType, setViewType] = useState<'week' | 'month'>('month');

  // Calculate average score from history
  const historyAvg = history.length > 0 
    ? Math.round(history.reduce((acc, val) => acc + val, 0) / history.length) 
    : 82;

  const incidentCount = history.filter(a => a < thresholds.warn).length;

  const weeklyData = [
    { day: 'Mon', score: 85, slouches: 5, distribution: [{ name: 'Good', value: 70, color: '#22C55E' }, { name: 'Fair', value: 20, color: '#F97316' }, { name: 'Poor', value: 10, color: '#EF4444' }] },
    { day: 'Tue', score: 72, slouches: 12, distribution: [{ name: 'Good', value: 50, color: '#22C55E' }, { name: 'Fair', value: 30, color: '#F97316' }, { name: 'Poor', value: 20, color: '#EF4444' }] },
    { day: 'Wed', score: 88, slouches: 3, distribution: [{ name: 'Good', value: 80, color: '#22C55E' }, { name: 'Fair', value: 15, color: '#F97316' }, { name: 'Poor', value: 5, color: '#EF4444' }] },
    { day: 'Thu', score: 65, slouches: 15, distribution: [{ name: 'Good', value: 40, color: '#22C55E' }, { name: 'Fair', value: 40, color: '#F97316' }, { name: 'Poor', value: 20, color: '#EF4444' }] },
    { day: 'Fri', score: historyAvg, slouches: incidentCount, distribution: [
      { name: 'Good', value: Math.round((history.filter(a => a >= thresholds.good).length / (history.length || 1)) * 100) || 75, color: '#22C55E' },
      { name: 'Fair', value: Math.round((history.filter(a => (a < thresholds.good && a >= thresholds.warn)).length / (history.length || 1)) * 100) || 15, color: '#F97316' },
      { name: 'Poor', value: Math.round((history.filter(a => a < thresholds.warn).length / (history.length || 1)) * 100) || 10, color: '#EF4444' }
    ] },
    { day: 'Sat', score: 78, slouches: 8, distribution: [{ name: 'Good', value: 60, color: '#22C55E' }, { name: 'Fair', value: 30, color: '#F97316' }, { name: 'Poor', value: 10, color: '#EF4444' }] },
    { day: 'Sun', score: 82, slouches: 6, distribution: [{ name: 'Good', value: 75, color: '#22C55E' }, { name: 'Fair', value: 15, color: '#F97316' }, { name: 'Poor', value: 10, color: '#EF4444' }] },
  ];

  const selectedDayData = weeklyData[selectedDayIndex];

  const monthlyProgress = [
    { label: 'January', score: 68, trend: '+5%' },
    { label: 'February', score: 74, trend: '+6%' },
    { label: 'March', score: 81, trend: '+7%' },
    { label: 'April', score: historyAvg, trend: '+4%' },
  ];

  const weeklyProgress = [
    { label: 'Week 1', score: 70, trend: '+12%' },
    { label: 'Week 2', score: 78, trend: '+8%' },
    { label: 'Week 3', score: 75, trend: '-3%' },
    { label: 'Week 4', score: historyAvg, trend: '+6%' },
  ];

  const progressData = viewType === 'month' ? monthlyProgress : weeklyProgress;

  const getDayColor = (s: number) => {
    if (s >= thresholds.good) return '#22C55E';
    if (s >= thresholds.warn) return '#F97316';
    return '#EF4444';
  };

  return (
    <div className="p-6 space-y-6 pb-24 relative z-10">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none">Intelligence</h2>
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-3">Postural Trend Analysis</p>
      </div>

      {/* Analytics Summary Banner */}
      <div className="glass p-5 rounded-[40px] flex items-center gap-5 shadow-premium">
        <div className="w-14 h-14 bg-emerald-500 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
          <TrendingUp size={24} />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-black text-slate-800">Dynamic Progress</h4>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight mt-1">Real-time session avg: {historyAvg}%</p>
        </div>
        <div className="bg-slate-900 text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest">
          +{Math.round((historyAvg / 80) * 10 - 10)}%
        </div>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Session Slouches', value: incidentCount || '12', icon: Zap, color: 'text-orange', bg: 'bg-orange/10' },
          { label: 'Wellness Goal', value: '85%', icon: Target, color: 'text-violet-600', bg: 'bg-violet-100/50' },
        ].map((kpi, i) => (
          <div key={i} className="glass p-5 rounded-[32px] shadow-soft space-y-3">
            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shadow-soft", kpi.bg, kpi.color)}>
              <kpi.icon size={20} />
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</p>
              <h4 className="text-xl font-black text-slate-800">{kpi.value}</h4>
            </div>
          </div>
        ))}
      </div>

      {/* Main Bar Chart - Minimalist Glass */}
      <div className="glass p-8 rounded-[48px] shadow-premium space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-base font-black text-slate-800 tracking-tight">Daily Stability</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Weekly score distribution</p>
          </div>
          <Calendar size={20} className="text-slate-300" />
        </div>
        
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }} onClick={(data) => {
               if (data && data.activeTooltipIndex !== undefined) {
                 setSelectedDayIndex(Number(data.activeTooltipIndex));
               }
            }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" strokeOpacity={0.3} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94A3B8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94A3B8' }} domain={[0, 100]} />
              <Tooltip 
                cursor={{ fill: 'rgba(79, 70, 229, 0.05)', radius: 12 }}
                contentStyle={{ 
                  borderRadius: '24px', 
                  border: 'none', 
                  backgroundColor: '#1E293B', 
                  color: 'white',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', 
                  fontSize: '12px', 
                  fontWeight: 'bold',
                  padding: '12px 16px'
                }}
                itemStyle={{ color: 'white' }}
              />
              <Bar dataKey="score" radius={[8, 8, 8, 8]} barSize={24} className="cursor-pointer">
                {weeklyData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={selectedDayIndex === index ? '#4F46E5' : getDayColor(entry.score)} 
                    fillOpacity={selectedDayIndex === index ? 1 : 0.2}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Distribution Donut (Dynamic) */}
      <motion.div 
        key={selectedDayIndex}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass p-8 rounded-[40px] shadow-soft flex items-center gap-6 overflow-hidden relative"
      >
        <div className="flex-1 space-y-5">
          <div className="">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              Quality • {selectedDayData.day}
            </h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Consistency Analysis</p>
          </div>
          <div className="space-y-4">
            {selectedDayData.distribution.map(d => (
              <div key={d.name} className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest px-1 text-slate-500">
                  <span>{d.name}</span>
                  <span>{d.value}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100/50 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${d.value}%` }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="w-36 h-36 flex-shrink-0 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={selectedDayData.distribution}
                innerRadius={40}
                outerRadius={60}
                paddingAngle={8}
                dataKey="value"
                stroke="none"
              >
                {selectedDayData.distribution.map((entry, index) => (
                  <PieCell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none mt-0.5">
            <span className="text-lg font-black text-slate-800 leading-none tracking-tighter">{selectedDayData.score}%</span>
          </div>
        </div>
      </motion.div>

      {/* Progress Section with Toggle */}
      <div className="glass p-8 rounded-[48px] shadow-premium space-y-8">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-black text-slate-800 tracking-tight">Timeline</h3>
          <div className="bg-slate-100/50 p-1 rounded-2xl flex gap-1 border border-slate-200/50">
            <button 
              onClick={() => setViewType('week')}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                viewType === 'week' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"
              )}
            >
              Week
            </button>
            <button 
              onClick={() => setViewType('month')}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                viewType === 'month' ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"
              )}
            >
              Month
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <AnimatePresence mode="wait">
            <motion.div 
              key={viewType}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-6"
            >
              {progressData.map((item, i) => (
                <div key={i} className="flex flex-col gap-2.5">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">{item.label}</span>
                    <span className={cn(
                      "text-[9px] font-black px-2.5 py-1 rounded-xl",
                      item.trend.startsWith('+') ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
                    )}>
                      {item.trend}
                    </span>
                  </div>
                  <div className="relative h-2.5 bg-slate-100/50 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${item.score}%` }}
                      className={cn("h-full rounded-full", getDayColor(item.score))}
                      style={{ backgroundColor: getDayColor(item.score) }}
                    />
                  </div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        <button className="w-full bg-slate-50 border border-slate-100 py-5 rounded-3xl flex items-center justify-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-[0.15em] active:scale-[0.98] transition-transform">
          Export Full Report <ChevronRight size={14} />
        </button>
      </div>

    </div>
  );
};
