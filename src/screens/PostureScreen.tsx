import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, updateAngle, setIsSimulating } from '../store/store';
import { PostureFigure } from '../components/posture/PostureFigure';
import { Play, Square, Info, ChevronRight, Activity, Clock, Shield, Zap, Wind, User, Sparkles, X, Brain, Bot } from 'lucide-react';
import { cn } from '../lib/utils';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { generatePostureSummary } from '../services/geminiService';
import Markdown from 'react-markdown';

export const PostureScreen: React.FC = () => {
  const dispatch = useDispatch();
  const { angle, score, thresholds, history, isSimulating } = useSelector((state: RootState) => state.posture);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  const handleGenerateSummary = async () => {
    setIsSummarizing(true);
    try {
      const result = await generatePostureSummary(history, score);
      setSummary(result);
    } catch (error) {
      console.error('Summary generation failed:', error);
    } finally {
      setIsSummarizing(false);
    }
  };

  const getStatusColor = (val: number) => {
    if (val >= thresholds.good) return '#22C55E';
    if (val >= thresholds.warn) return '#F97316';
    return '#EF4444';
  };

  const chartData = history.slice().reverse().map((a, i) => ({ index: i, angle: a }));

  const metrics = [
    { label: 'Neck Angle', value: '14° Forward', icon: Wind, color: 'text-blue-500' },
    { label: 'Shoulder Balance', value: 'Stable', icon: Shield, color: 'text-green' },
    { label: 'Sitting Duration', value: '2h 14m', icon: Clock, color: 'text-orange' },
    { label: 'Fatigue Risk', value: 'Low', icon: Activity, color: 'text-blue-400' },
    { label: 'Focus Score', value: '89%', icon: zap => <Zap size={14} />, color: 'text-purple-500', isZap: true },
  ];

  return (
    <div className="min-h-screen bg-transparent p-6 space-y-8 pb-24 relative z-10">
      {/* Header */}
      <div className="flex justify-between items-end mb-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none">Diagnostic</h2>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Biometric Stream v2.8</p>
        </div>
        <div className="glass p-2 rounded-2xl flex items-center gap-2 shadow-soft">
           <button 
             onClick={() => dispatch(setIsSimulating(!isSimulating))}
             className={cn(
               "w-12 h-12 rounded-xl flex items-center justify-center transition-all active:scale-95",
               isSimulating ? "bg-slate-900 text-white shadow-lg" : "bg-white text-slate-400 border border-slate-100"
             )}
           >
             {isSimulating ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
           </button>
        </div>
      </div>

      {/* Central Visualizer Section */}
      <div className="relative flex flex-col items-center justify-center py-4">
        {/* Animated Posture Ring */}
        <div className="relative w-80 h-80 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90">
             <circle
               cx="160" cy="160" r="145"
               fill="none"
               stroke="#f1f5f9"
               strokeWidth="14"
               strokeOpacity={0.5}
             />
             <motion.circle
               cx="160" cy="160" r="145"
               fill="none"
               stroke={getStatusColor(angle)}
               strokeWidth="14"
               strokeLinecap="round"
               strokeDasharray="911"
               initial={{ strokeDashoffset: 911 }}
               animate={{ strokeDashoffset: 911 - (911 * score) / 100 }}
               transition={{ duration: 1.5, ease: "circOut" }}
               style={{ filter: `drop-shadow(0 0 15px ${getStatusColor(angle)}44)` }}
             />
          </svg>

          {/* Silhouette & Score */}
          <div className="relative z-10 flex flex-col items-center translate-y-2">
             <div className="relative group">
                <PostureFigure size={200} angle={angle} />
                {/* Floating Micro Score Badge */}
                <motion.div 
                   key={Math.round(score)}
                   initial={{ opacity: 0, scale: 0.8 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className="absolute -top-4 -right-4 bg-white/90 backdrop-blur-xl border border-white shadow-premium px-4 py-2 rounded-2xl flex items-center gap-2"
                >
                   <div className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: getStatusColor(angle) }} />
                   <span className="text-base font-black text-slate-800 tracking-tighter">{Math.round(score)}%</span>
                </motion.div>
             </div>
             <div className="mt-6 text-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] opacity-80">Stability Matrix</span>
             </div>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="mt-10">
           <div className="px-8 py-3 glass rounded-full shadow-soft flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getStatusColor(angle) }} />
              <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">
                {score >= thresholds.good ? 'Optimal State' : score >= thresholds.warn ? 'Minor Slouch' : 'Critical Failure'}
              </span>
           </div>
        </div>
      </div>

      {/* AI Posture Summary Action */}
      <div className="px-1">
        <button 
          onClick={handleGenerateSummary}
          disabled={isSummarizing}
          className="w-full bg-slate-900 border border-slate-800 text-white p-6 rounded-[32px] shadow-premium flex items-center justify-between group transition-all active:scale-[0.98] overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 -rotate-12 translate-x-4 translate-y-[-10px] group-hover:rotate-0 transition-transform">
            <Bot size={100} />
          </div>
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-premium-indigo flex items-center justify-center shadow-lg shadow-indigo-500/20">
              {isSummarizing ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Sparkles size={26} className="text-white" />
              )}
            </div>
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Intelligent Analysis</p>
              <h4 className="text-xl font-extrabold tracking-tight">Generate Summary</h4>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:translate-x-1 transition-transform relative z-10">
            <ChevronRight size={20} />
          </div>
        </button>
      </div>

      {/* AI Summary Modal */}
      <AnimatePresence>
        {summary && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 pb-24">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSummary(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-[40px] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-8 pb-4 flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-indigo-600">
                    <Brain size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Physician AI Report</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800">Session Insight</h3>
                </div>
                <button 
                  onClick={() => setSummary(null)}
                  className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="px-8 pb-8 overflow-y-auto custom-scrollbar">
                <div className="prose prose-slate prose-sm max-w-none">
                  <div className="markdown-body text-slate-600 font-medium leading-relaxed italic">
                    <Markdown>{summary}</Markdown>
                  </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-4 text-slate-400">
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                    <Shield size={18} />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider leading-tight">
                    Clinically generated based on your real-time spinal metrics.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Insights Panel */}
      <div className="space-y-4">
        <div className="px-2 flex justify-between items-center">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">AI Biometrics</h3>
          <Shield size={14} className="text-slate-300" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((m, i) => {
            const Icon = m.icon;
            return (
              <div key={i} className="bg-white/40 backdrop-blur-md border border-slate-100 p-4 rounded-[24px] shadow-sm space-y-3">
                <div className={cn("w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center", m.color)}>
                  {typeof Icon === 'function' && !('displayName' in Icon) ? (Icon as any)({ size: 14 }) : <Icon size={14} />}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5">{m.label}</p>
                  <h4 className="text-sm font-black text-slate-800">{m.value}</h4>
                </div>
              </div>
            );
          })}
          <div className="col-span-2 bg-slate-900 p-4 rounded-[24px] flex items-center justify-between group cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
                <Activity size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Recovery Suggestion</p>
                <p className="text-xs font-medium text-white">“Take a 2-minute stretch break”</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Trend Graph */}
      <div className="bg-white border border-slate-50 p-6 rounded-[32px] shadow-sm space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-sm font-black text-slate-800">Posture Trend</h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Live Session</span>
        </div>
        <div className="h-28 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="100%">
                  <stop offset="5%" stopColor={getStatusColor(angle)} stopOpacity={0.1}/>
                  <stop offset="95%" stopColor={getStatusColor(angle)} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="angle" 
                stroke={getStatusColor(angle)} 
                strokeWidth={2} 
                fillOpacity={1} 
                fill="url(#trendGradient)" 
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

