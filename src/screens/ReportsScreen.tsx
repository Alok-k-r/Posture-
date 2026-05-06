import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { Download, TrendingUp, Filter, FileText, ChevronRight, Star, Clock, Zap, Target } from 'lucide-react';
import { cn } from '../lib/utils';

export const ReportsScreen: React.FC = () => {
  const { thresholds, score } = useSelector((state: RootState) => state.posture);
  const [range, setRange] = useState<'daily' | 'weekly'>('weekly');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      alert('PDF Report generated! (Simulation)');
    }, 2000);
  };

  const insights = [
    { type: 'good', title: 'Excellent Morning Score', desc: 'Your posture before 12:00 PM is consistently above 85°. Great morning habits!', emoji: '🌅' },
    { type: 'warn', title: 'Afternoon Slump Detected', desc: 'We see a 15% drop in posture quality between 3:00 PM and 5:00 PM.', emoji: '☀️' },
    { type: 'bad', title: 'High Slouch Count', desc: 'You slouced 12 times yesterday after 6:00 PM. Try to take more evening breaks.', emoji: '🌙' },
  ];

  return (
    <div className="p-6 space-y-6 pb-24">
      {/* Header */}
      <div className="flex justify-between items-center text-slate-800">
        <div>
          <h2 className="text-2xl font-black">Health Reports</h2>
          <p className="text-sm text-slate-400 font-medium uppercase tracking-wider text-[10px]">Data as of {new Date().toLocaleDateString()}</p>
        </div>
        <button 
          onClick={handleDownload}
          disabled={isGenerating}
          className="bg-green text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-green/20 flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
        >
          {isGenerating ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Download size={14} />}
          {isGenerating ? 'Exporting...' : 'PDF'}
        </button>
      </div>

      {/* Range Toggle */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-border shadow-sm">
        <button 
          onClick={() => setRange('daily')}
          className={cn("flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all", range === 'daily' ? "bg-green text-white shadow-md shadow-green/20" : "text-slate-400")}
        >
          Daily
        </button>
        <button 
          onClick={() => setRange('weekly')}
          className={cn("flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all", range === 'weekly' ? "bg-green text-white shadow-md shadow-green/20" : "text-slate-400")}
        >
          Weekly
        </button>
      </div>

      {/* Streak Banner */}
      <div className="bg-gradient-to-r from-orange to-red p-5 rounded-[32px] text-white flex justify-between items-center shadow-lg shadow-orange/20 overflow-hidden relative">
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-white/10 skew-x-[-20deg] translate-x-12" />
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-tighter opacity-80">Current Streak</p>
          <h4 className="text-xl font-black">🔥 5-Day Warrior</h4>
          <p className="text-[10px] font-bold opacity-80 mt-0.5 whitespace-nowrap">Keep it up! Longest: 12 days</p>
        </div>
        <div className="flex gap-2 relative z-10">
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">🏆</div>
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">🔥</div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-1 bg-bento-green-bg p-5 rounded-[32px] border border-bento-green-border flex flex-col justify-between h-[120px]">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-green shadow-sm">
            <Star size={16} fill="currentColor" />
          </div>
          <div>
            <div className="text-2xl font-black text-green">{Math.round(score)}%</div>
            <p className="text-green-600/50 text-[10px] font-black uppercase tracking-widest leading-none">Avg Score</p>
          </div>
        </div>

        <div className="col-span-1 bg-bento-rose-bg p-5 rounded-[32px] border border-bento-rose-border flex flex-col justify-between h-[120px]">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-rose-500 shadow-sm">
            <Zap size={16} fill="currentColor" />
          </div>
          <div>
            <div className="text-2xl font-black text-rose-600">48</div>
            <p className="text-rose-400 text-[10px] font-black uppercase tracking-widest leading-none">Slouches</p>
          </div>
        </div>

        <div className="col-span-2 bg-bento-blue-bg p-5 rounded-[32px] border border-bento-blue-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-blue shadow-sm">
              <Clock size={20} />
            </div>
            <div>
              <div className="text-xl font-black text-blue">32h Total</div>
              <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest leading-none">Sitting Time This Week</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black text-blue bg-white/50 px-3 py-1 rounded-full">+12%</span>
          </div>
        </div>
      </div>

      {/* Hourly Heatmap */}
      <div className="bg-white p-6 rounded-[32px] border border-border shadow-sm space-y-4 overflow-hidden">
        <div className="flex justify-between items-center px-1 text-slate-800">
          <h3 className="text-sm font-bold">Hourly Activity</h3>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">24h Pattern</span>
        </div>
        <div className="flex gap-1 h-5">
          {Array.from({ length: 24 }).map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "flex-1 rounded-sm",
                i < 8 || i > 22 ? "bg-slate-100" : 
                i > 14 && i < 17 ? "bg-orange" : "bg-green"
              )} 
              title={`${i}:00`}
            />
          ))}
        </div>
        <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase px-1">
          <span>00:00</span>
          <span>12:00</span>
          <span>23:59</span>
        </div>
      </div>

      {/* AI Insights */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-slate-800">
           <div className="w-8 h-8 rounded-lg bg-green/10 flex items-center justify-center text-green">
              <TrendingUp size={18} />
           </div>
           <h3 className="text-lg font-bold">AI Insights</h3>
        </div>
        <div className="space-y-4">
          {insights.map((insight, i) => (
            <div 
              key={i} 
              className={cn(
                "p-4 rounded-3xl border flex gap-4 transition-all",
                insight.type === 'good' ? "bg-green/5 border-green/10" : 
                insight.type === 'warn' ? "bg-orange/5 border-orange/10" : 
                "bg-red/5 border-red/10"
              )}
            >
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-2xl flex-shrink-0">
                {insight.emoji}
              </div>
              <div className="space-y-0.5">
                <h4 className={cn(
                  "text-sm font-black",
                  insight.type === 'good' ? "text-green" : 
                  insight.type === 'warn' ? "text-orange" : 
                  "text-red"
                )}>
                  {insight.title}
                </h4>
                <p className="text-[11px] font-medium text-slate-800/70 leading-relaxed">{insight.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white p-6 rounded-[32px] border border-border shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-800">Recommendations</h3>
        <div className="space-y-4">
          {[
            "Wear a posture corrector for 2 hours during peak slump time (15:00-17:00).",
            "Set a 30-minute repeat timer on your desktop for a 'shoulder roll' check.",
            "Complete 3 sets of 15 reps of Cat-Cow stretches before bed."
          ].map((rec, i) => (
            <div key={i} className="flex gap-4 items-start">
               <div className="w-6 h-6 rounded-full bg-green text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
               </div>
               <p className="text-xs font-medium text-slate-800 leading-relaxed">{rec}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-[32px] border border-border shadow-sm overflow-hidden">
        <div className="p-5 border-b border-borderLight flex justify-between items-center text-slate-800">
           <h3 className="text-sm font-bold">Daily Breakdown</h3>
           <FileText size={14} className="text-slate-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 font-black uppercase text-[9px] tracking-widest text-slate-400">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-center">Score</th>
                <th className="px-4 py-3 text-center">Slouches</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="font-bold divide-y divide-slate-100 text-slate-700">
              {[
                { date: 'Apr 27', score: 85, slouches: 5, status: 'Excellent' },
                { date: 'Apr 26', score: 72, slouches: 12, status: 'Fair' },
                { date: 'Apr 25', score: 92, slouches: 2, status: 'Excellent' },
                { date: 'Apr 24', score: 65, slouches: 18, status: 'Poor' },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4">{row.date}</td>
                  <td className="px-4 py-4 text-center">{Math.round(row.score)}%</td>
                  <td className="px-4 py-4 text-center">{row.slouches}</td>
                  <td className="px-4 py-4 text-right">
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-black uppercase",
                      row.status === 'Excellent' ? "bg-green/10 text-green" : 
                      row.status === 'Fair' ? "bg-orange/10 text-orange" : 
                      "bg-red/10 text-red"
                    )}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="w-full py-4 text-xs font-bold text-greenDark bg-slate-50 flex items-center justify-center gap-2">
          View All History <ChevronRight size={14} />
        </button>
      </div>

    </div>
  );
};
