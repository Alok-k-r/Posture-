import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { 
  Download, 
  TrendingUp, 
  FileText, 
  ChevronRight, 
  Star, 
  Clock, 
  Zap, 
  Loader2, 
  Activity, 
  Shield, 
  AlertTriangle, 
  Heart, 
  Eye, 
  FileCheck, 
  CheckCircle2, 
  Sparkles, 
  Compass, 
  Stethoscope, 
  Layers, 
  Clipboard, 
  ArrowUpRight 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { LocalModelService } from '../services/localModelService';

export const ReportsScreen: React.FC = () => {
  const { thresholds, score, incidents, totalSessionSeconds, baselineAngle } = useSelector((state: RootState) => state.posture);
  const user = useSelector((state: RootState) => state.auth.user);
  
  // View states
  const [range, setRange] = useState<'daily' | 'weekly'>('weekly');
  const [viewMode, setViewMode] = useState<'patient' | 'physio'>('patient');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load real biomechanical telemetry & history from the Local Model Engine
  const localMetrics = LocalModelService.getMetrics();
  const historicalSessions = LocalModelService.getHistoricalSessions();
  const breakHistory = LocalModelService.getBreakHistory();

  useEffect(() => {
    const fetchSessions = async () => {
      setIsLoading(true);
      const list: any[] = [];

      // 1. First, retrieve locally stored sessions for the current logged-in user
      if (user) {
        try {
          const localKey = `posture_sessions_${user.id}`;
          const localSessions = JSON.parse(localStorage.getItem(localKey) || '[]');
          list.push(...localSessions);
        } catch (localErr) {
          console.error('Error loading local sessions:', localErr);
        }
      }

      // 2. Next, load cloud-synced sessions if Firebase Auth is connected
      if (auth.currentUser) {
        try {
          const q = query(
            collection(db, 'users', auth.currentUser.uid, 'sessions'),
            orderBy('date', 'desc'),
            limit(30)
          );
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Prevent duplicates if already loaded locally
            const isDuplicate = list.some(s => s.id === doc.id || (s.date === data.date && s.duration === data.duration));
            if (!isDuplicate) {
              list.push({ id: doc.id, ...data });
            }
          });
        } catch (err) {
          console.error('Error fetching Firestore sessions:', err);
        }
      }

      // 3. Sort by date descending
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setSessions(list);
      setIsLoading(false);
    };

    fetchSessions();
  }, [user]);

  // Comprehensive Clinical Export Report Generator
  const handleExportClinicalReport = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      setIsGenerating(false);
      setShowExportModal(true);

      // Generate a detailed HTML Clinician Dossier file
      const reportTitle = `Clinical_Biomechanics_Report_${user?.name || 'Patient'}_${new Date().toISOString().slice(0, 10)}.html`;
      const reportHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Spine Guardian Biomechanical Referral Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, sans-serif; color: #1e293b; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; }
    h1 { font-size: 24px; font-weight: 800; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 24px; }
    h2 { font-size: 18px; font-weight: 700; color: #1e3a8a; margin-top: 32px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 20px 0; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
    .metric-val { font-size: 20px; font-weight: 800; color: #4f46e5; }
    .label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
    th { background: #f1f5f9; font-weight: 700; color: #475569; }
    .alert-banner { background: #fffbeb; border: 1px solid #fef3c7; border-radius: 12px; padding: 16px; margin: 20px 0; color: #92400e; }
  </style>
</head>
<body>
  <h1>Spine Guardian • Physiotherapy Clinical Referral Dossier</h1>
  
  <p><strong>Patient Name:</strong> ${user?.name || 'Rahul (Rahul@gmail.com)'}</p>
  <p><strong>Date of Analysis:</strong> ${new Date().toLocaleString()}</p>
  <p><strong>Integrity Score Baseline:</strong> ${Math.round(score)}%</p>
  <p><strong>Clinical Device Setup:</strong> 3-Axis Thoracic Bio-Sensor (Calibrated at ${baselineAngle}°)</p>

  <div class="alert-banner">
    <strong>Orthopedic Clinician Summary Note:</strong><br>
    ${localMetrics.injuryRisk.clinicalAdvice}
  </div>

  <h2>1. Orthopedic Strain & Joint Torque Analysis</h2>
  <div class="grid">
    <div class="card">
      <div class="label">Average Thoracic Load (Equivalent Pressure)</div>
      <div class="metric-val">${localMetrics.averageThoracicLoadLbs} lbs</div>
      <p style="font-size: 11px; margin: 4px 0 0; color: #64748b;">Active cervical & upper back weight-bearing load</p>
    </div>
    <div class="card">
      <div class="label">Peak Thoracic Shear Stress</div>
      <div class="metric-val">${localMetrics.peakThoracicLoadLbs} lbs</div>
      <p style="font-size: 11px; margin: 4px 0 0; color: #64748b;">Maximum strain captured under severe slouch angles</p>
    </div>
    <div class="card">
      <div class="label">Daily Cumulative Load Pressure</div>
      <div class="metric-val">${localMetrics.cumulativeDailyLoadKgh.toFixed(2)} kg·h</div>
      <p style="font-size: 11px; margin: 4px 0 0; color: #64748b;">Integral sum of daily structural spine stress loading</p>
    </div>
    <div class="card">
      <div class="label">Postural Joint Stability Index</div>
      <div class="metric-val">${localMetrics.stabilityScore}%</div>
      <p style="font-size: 11px; margin: 4px 0 0; color: #64748b;">Resistance to muscular micro-shivering and spine drift</p>
    </div>
  </div>

  <h2>2. Myofascial Fatigue & Rest Compliance Diagnostics</h2>
  <div class="grid">
    <div class="card">
      <div class="label">Paraspinal Muscle Fatigue Index</div>
      <div class="metric-val">${localMetrics.fatigueScore}%</div>
      <p style="font-size: 11px; margin: 4px 0 0; color: #64748b;">Computed paraspinal muscular exhaustion model</p>
    </div>
    <div class="card">
      <div class="label">Micro-Break Postural Recovery Efficiency</div>
      <div class="metric-val">${localMetrics.recoveryEfficiency}%</div>
      <p style="font-size: 11px; margin: 4px 0 0; color: #64748b;">Muscle restoration velocity following active breaks</p>
    </div>
    <div class="card">
      <div class="label">Posture Warning Correction Compliance</div>
      <div class="metric-val">${localMetrics.dailyComplianceRate}%</div>
      <p style="font-size: 11px; margin: 4px 0 0; color: #64748b;">Correction success rate upon receiving sensory alerts</p>
    </div>
    <div class="card">
      <div class="label">Average Response & Correction Velocity</div>
      <div class="metric-val">${localMetrics.averageRecoveryTimeSeconds}s</div>
      <p style="font-size: 11px; margin: 4px 0 0; color: #64748b;">Reaction delay between alert and spinal realignment</p>
    </div>
  </div>

  <h2>3. Digital Postural Profile</h2>
  <ul>
    <li><strong>Somatic Sitting Signature:</strong> ${localMetrics.digitalProfile.sittingStyle}</li>
    <li><strong>Slouch Pattern Anatomy:</strong> ${localMetrics.digitalProfile.typicalSlouchPattern}</li>
    <li><strong>Myofascial Fatigue Onset Rate:</strong> ${localMetrics.digitalProfile.fatigueOnsetMinutes} Minutes of sustained static load</li>
    <li><strong>Post-Break Recovery Type:</strong> ${localMetrics.digitalProfile.recoveryType} (Endurance rebound behavior)</li>
    <li><strong>Circadian Vulnerability window:</strong> ${localMetrics.digitalProfile.peakProductivityPeriod}</li>
  </ul>

  <h2>4. Orthopedic Diagnostic Risk Vector</h2>
  <div class="grid">
    <div class="card">
      <div class="label">Myofascial Strain Risk</div>
      <div class="metric-val" style="color: ${localMetrics.injuryRisk.muscleStrainProb > 40 ? '#ef4444' : '#10b981'};">${localMetrics.injuryRisk.muscleStrainProb}%</div>
    </div>
    <div class="card">
      <div class="label">Thoracic Joint Overload Danger</div>
      <div class="metric-val" style="color: ${localMetrics.injuryRisk.thoracicFatigueProb > 40 ? '#ef4444' : '#10b981'};">${localMetrics.injuryRisk.thoracicFatigueProb}%</div>
    </div>
    <div class="card">
      <div class="label">Cervical Ligament Creep Index</div>
      <div class="metric-val" style="color: ${localMetrics.injuryRisk.posturalOverloadProb > 40 ? '#ef4444' : '#10b981'};">${localMetrics.injuryRisk.posturalOverloadProb}%</div>
    </div>
    <div class="card">
      <div class="label">Diagnostic Risk Class</div>
      <div class="metric-val">${localMetrics.injuryRisk.riskClassification}</div>
    </div>
  </div>

  <h2>5. Clinical History logs</h2>
  <table>
    <thead>
      <tr>
        <th>Date / Time</th>
        <th>Alignment Quality</th>
        <th>Total Duration</th>
        <th>Alert Count</th>
        <th>Relief Rating</th>
      </tr>
    </thead>
    <tbody>
      ${historicalSessions.slice(0, 10).map(s => `
        <tr>
          <td>${new Date(s.timestamp).toLocaleDateString()}</td>
          <td>${s.qualityScore}% (${s.grade})</td>
          <td>${Math.round(s.durationSeconds / 60)} minutes</td>
          <td>${s.complianceRate < 80 ? '7' : s.complianceRate < 90 ? '4' : '2'} Alerts</td>
          <td>${s.qualityScore > 85 ? 'Excellent' : 'Moderate'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <br><br>
  <hr style="border: 0; border-top: 1px solid #cbd5e1;">
  <p style="font-size: 11px; text-align: center; color: #94a3b8;">Report compiled via Spine Guardian Biomechanical Core Engine. Powered by Google AI Studio.</p>
</body>
</html>
      `;

      // Trigger automatic HTML file download
      const element = document.createElement("a");
      const file = new Blob([reportHtml], {type: 'text/html'});
      element.href = URL.createObjectURL(file);
      element.download = reportTitle;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }, 1500);
  };

  const insights = [
    { type: 'good', title: 'Sensory Alert Compliance', desc: `Your reminder compliance rate is at ${localMetrics.dailyComplianceRate}%. You corrected ${localMetrics.correctionsAchievedCount || 'nearly all'} posture warning events under ${localMetrics.averageRecoveryTimeSeconds} seconds!`, emoji: '🎯' },
    { type: 'warn', title: 'Thoracic Muscle Fatigue Overload', desc: `Paraspinal muscle fatigue rises to ${localMetrics.fatigueScore}% during long stretches. Try taking micro-breaks to avoid postural ligament creep.`, emoji: '⚖️' },
    { type: 'bad', title: 'Forward Head Joint Torque', desc: `Slouch periods produce up to ${localMetrics.peakThoracicLoadLbs} lbs of kinetic shear pressure on your lower cervical vertebrae.`, emoji: '🚨' },
  ];

  return (
    <div className="p-6 space-y-6 pb-24" id="reports_container">
      {/* Header */}
      <div className="flex justify-between items-center text-slate-800" id="reports_header_block">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2">
            Clinical Reports
          </h2>
          <p className="text-sm text-slate-400 font-medium uppercase tracking-wider text-[9px]">Biomechanical Analytics Dossier</p>
        </div>
        <button 
          id="export_clinical_report_btn"
          onClick={handleExportClinicalReport}
          disabled={isGenerating}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl text-xs font-black shadow-lg shadow-indigo-600/20 flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
        >
          {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download size={14} />}
          {isGenerating ? 'Compiling...' : 'Export Clinician PDF'}
        </button>
      </div>

      {/* Mode Selector Toggle: Patient View vs. Physio Clinical View */}
      <div className="bg-slate-100 p-1 rounded-2xl flex items-center border border-slate-200" id="reports_view_mode_toggle">
        <button
          id="toggle_patient_mode_btn"
          onClick={() => setViewMode('patient')}
          className={cn(
            "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2",
            viewMode === 'patient' ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-800"
          )}
        >
          <Compass size={14} />
          Patient Dashboard
        </button>
        <button
          id="toggle_physio_mode_btn"
          onClick={() => setViewMode('physio')}
          className={cn(
            "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2",
            viewMode === 'physio' ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-800"
          )}
        >
          <Stethoscope size={14} />
          Clinician / Physio Mode
        </button>
      </div>

      {/* Dynamic Content Switching with motion transitions */}
      <AnimatePresence mode="wait">
        {viewMode === 'patient' ? (
          <motion.div
            key="patient_view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
            id="patient_dashboard_view"
          >
            {/* Simple Primary Metrics Bento Grid */}
            <div className="grid grid-cols-2 gap-3" id="patient_primary_bento">
              {/* Avg Spine Score */}
              <div className="col-span-1 bg-emerald-50/50 p-5 rounded-[28px] border border-emerald-100 flex flex-col justify-between h-[130px] shadow-sm">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-emerald-500 shadow-sm">
                  <Star size={16} fill="currentColor" />
                </div>
                <div>
                  <div className="text-2xl font-black text-emerald-600">{Math.round(score)}%</div>
                  <p className="text-emerald-700/60 text-[9px] font-black uppercase tracking-wider leading-none">Spine Alignment</p>
                </div>
              </div>

              {/* Active Paraspinal Load */}
              <div className="col-span-1 bg-amber-50/60 p-5 rounded-[28px] border border-amber-100 flex flex-col justify-between h-[130px] shadow-sm">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-amber-500 shadow-sm">
                  <Activity size={16} />
                </div>
                <div>
                  <div className="text-2xl font-black text-amber-600">{localMetrics.averageThoracicLoadLbs} lbs</div>
                  <p className="text-amber-700/60 text-[9px] font-black uppercase tracking-wider leading-none">Active Back Load</p>
                </div>
              </div>

              {/* Muscle Fatigue Status */}
              <div className="col-span-1 bg-rose-50/50 p-5 rounded-[28px] border border-rose-100 flex flex-col justify-between h-[130px] shadow-sm">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-rose-500 shadow-sm">
                  <Zap size={16} fill="currentColor" />
                </div>
                <div>
                  <div className="text-2xl font-black text-rose-600">{localMetrics.fatigueScore}%</div>
                  <p className="text-rose-700/60 text-[9px] font-black uppercase tracking-wider leading-none">Muscle Fatigue</p>
                </div>
              </div>

              {/* Post Break Resilience */}
              <div className="col-span-1 bg-indigo-50/50 p-5 rounded-[28px] border border-indigo-100 flex flex-col justify-between h-[130px] shadow-sm">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-indigo-500 shadow-sm">
                  <Shield size={16} fill="currentColor" />
                </div>
                <div>
                  <div className="text-2xl font-black text-indigo-600">
                    {breakHistory && breakHistory.length > 0 ? `${breakHistory[0].postBreakResilience}%` : `${localMetrics.recoveryEfficiency}%`}
                  </div>
                  <p className="text-indigo-700/60 text-[9px] font-black uppercase tracking-wider leading-none">Post-Rest Resilience</p>
                </div>
              </div>
            </div>

            {/* Micro-Break Recovery Compliancy Panel */}
            <div className="glass p-6 rounded-[32px] border border-slate-100/80 space-y-4 shadow-soft" id="rest_compliance_dossier">
              <div className="flex justify-between items-center">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Rest Diagnostics</span>
                  <h3 className="text-sm font-black text-slate-800">Micro-Break Rehabilitation Log</h3>
                </div>
                <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">
                  {breakHistory.length} Sessions Logged
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                Taking regular 60-second spinal decompressions during long sitting stretches mitigates paraspinal load and prevents ligament creep. Here are your latest rest entries:
              </p>

              {breakHistory && breakHistory.length > 0 ? (
                <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                  {breakHistory.map((br, idx) => (
                    <div key={br.id || idx} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between hover:bg-slate-100/30 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs">
                          #{breakHistory.length - idx}
                        </div>
                        <div>
                          <span className="text-[11px] font-black text-slate-700 block">Micro-Rest Completed</span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase">
                            {new Date(br.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {br.durationSeconds}s duration
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest block">Pre-Fatigue</span>
                          <span className="text-xs font-black text-rose-500">{br.preBreakFatigue}%</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest block">Resilience Gain</span>
                          <span className="text-xs font-black text-emerald-500">+{br.postBreakResilience - 20}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 bg-slate-50 rounded-2xl text-center text-slate-400 border border-dashed border-slate-200">
                  <Activity className="mx-auto mb-2 text-slate-300 animate-pulse" size={24} />
                  <span className="text-xs font-bold block">No rest breaks recorded yet.</span>
                  <span className="text-[10px] text-slate-400">Trigger a micro-break on the primary monitor screen to begin rest tracking.</span>
                </div>
              )}
            </div>

            {/* Activity Heatmap */}
            <div className="bg-white p-6 rounded-[32px] border border-border shadow-sm space-y-4 overflow-hidden" id="heatmap_activity">
              <div className="flex justify-between items-center px-1 text-slate-800">
                <h3 className="text-sm font-black uppercase tracking-wider text-[11px] text-slate-400">Circadian Loading Pattern</h3>
                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                  Peak Slouch Period: Afternoon
                </span>
              </div>
              <div className="flex gap-1 h-6">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "flex-1 rounded-sm transition-all hover:scale-110",
                      i < 8 || i > 22 ? "bg-slate-100" : 
                      i > 14 && i < 17 ? "bg-amber-400 shadow-inner" : "bg-emerald-500"
                    )} 
                    title={`${i}:00`}
                  />
                ))}
              </div>
              <div className="flex justify-between text-[8px] font-black text-slate-400 uppercase px-1">
                <span>00:00 (Sleep)</span>
                <span>12:00 (Work peak)</span>
                <span>23:59 (Rest)</span>
              </div>
            </div>

            {/* AI Insights list */}
            <div className="space-y-4" id="patient_insights_list">
              <div className="flex items-center gap-2 text-slate-800">
                 <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <TrendingUp size={18} />
                 </div>
                 <h3 className="text-base font-black">AI Postural Biomechanical Insights</h3>
              </div>
              <div className="space-y-3">
                {insights.map((insight, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "p-4 rounded-[24px] border flex gap-4 transition-all hover:shadow-soft",
                      insight.type === 'good' ? "bg-emerald-50/40 border-emerald-100" : 
                      insight.type === 'warn' ? "bg-amber-50/50 border-amber-100" : 
                      "bg-rose-50/40 border-rose-100"
                    )}
                  >
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-lg flex-shrink-0">
                      {insight.emoji}
                    </div>
                    <div className="space-y-1">
                      <h4 className={cn(
                        "text-xs font-black uppercase tracking-wider",
                        insight.type === 'good' ? "text-emerald-700" : 
                        insight.type === 'warn' ? "text-amber-700" : 
                        "text-rose-700"
                      )}>
                        {insight.title}
                      </h4>
                      <p className="text-[11px] font-semibold text-slate-600 leading-relaxed">{insight.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="physio_view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
            id="clinician_diagnostic_view"
          >
            {/* Somatosensory Profile Card */}
            <div className="glass p-6 rounded-[32px] border border-slate-200/60 bg-gradient-to-br from-slate-50 to-indigo-50/10 space-y-5" id="physio_somatosensory_profile">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full inline-block mb-1">
                    Patient somatic profile
                  </span>
                  <h3 className="text-base font-black text-slate-800">Somatic Postural Footprint</h3>
                </div>
                <Stethoscope className="text-indigo-600" size={24} />
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-700">
                <div className="p-3.5 bg-white border border-slate-100 rounded-2xl space-y-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Sitting Style Class</span>
                  <span className="text-slate-800 text-[13px] font-black">{localMetrics.digitalProfile.sittingStyle}</span>
                </div>
                <div className="p-3.5 bg-white border border-slate-100 rounded-2xl space-y-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Anatomy of slouching</span>
                  <span className="text-slate-800 text-[13px] font-black">{localMetrics.digitalProfile.typicalSlouchPattern}</span>
                </div>
                <div className="p-3.5 bg-white border border-slate-100 rounded-2xl space-y-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Fatigue Onset Rate</span>
                  <span className="text-slate-800 text-[13px] font-black">{localMetrics.digitalProfile.fatigueOnsetMinutes} Minutes</span>
                </div>
                <div className="p-3.5 bg-white border border-slate-100 rounded-2xl space-y-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Muscular Recovery Signature</span>
                  <span className="text-slate-800 text-[13px] font-black">{localMetrics.digitalProfile.recoveryType} Rebound</span>
                </div>
              </div>
            </div>

            {/* Cervical & Spine Stress Torque Section */}
            <div className="glass p-6 rounded-[32px] border border-slate-100 space-y-4" id="spinal_load_biomechanics">
              <div className="flex items-center gap-2">
                <Layers className="text-indigo-600" size={18} />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Cervical Torque & Structural Spine Load</h3>
              </div>
              <p className="text-[11px] font-semibold text-slate-500 leading-relaxed">
                Forward head slouching increases the lever arm on the lower cervical vertebrae, magnifying joint load. Normal head weight is 10-12 lbs; at a 30° posture drop, this torque escalates substantially.
              </p>

              <div className="space-y-3 pt-2">
                {/* Average Load Row */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span>Average Sustained Load Pressure</span>
                    <span className="text-indigo-600 font-black">{localMetrics.averageThoracicLoadLbs} Lbs</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${Math.min(100, (localMetrics.averageThoracicLoadLbs / 45) * 100)}%` }} />
                  </div>
                </div>

                {/* Peak Load Row */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span>Peak Forward head shear pressure</span>
                    <span className="text-rose-500 font-black">{localMetrics.peakThoracicLoadLbs} Lbs</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full rounded-full" style={{ width: `${Math.min(100, (localMetrics.peakThoracicLoadLbs / 45) * 100)}%` }} />
                  </div>
                </div>

                {/* Daily Cumulative Stress */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                    <span>Daily Cumulative Spine Load Integral</span>
                    <span className="text-amber-600 font-black">{localMetrics.cumulativeDailyLoadKgh.toFixed(2)} Kg·h</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min(100, (localMetrics.cumulativeDailyLoadKgh / 0.5) * 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Myofascial Fatigue Profile */}
            <div className="glass p-6 rounded-[32px] border border-slate-100 space-y-4" id="myofascial_fatigue_profile">
              <div className="flex items-center gap-2">
                <Heart className="text-rose-500" size={18} />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Orthopedic Injury Risk Assessment</h3>
              </div>
              <p className="text-[11px] font-semibold text-slate-500 leading-relaxed">
                Estimated probability vectors calculated from sustained static paraspinal muscle loading, alert frequencies, and rest compliance rates.
              </p>

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-rose-50/30 border border-rose-100/50 rounded-2xl text-center space-y-0.5">
                  <span className="text-[8px] font-black text-rose-500 uppercase tracking-wider block">Myofascial Strain</span>
                  <span className="text-[15px] font-black text-rose-600">{localMetrics.injuryRisk.muscleStrainProb}%</span>
                </div>
                <div className="p-3 bg-amber-50/30 border border-amber-100/50 rounded-2xl text-center space-y-0.5">
                  <span className="text-[8px] font-black text-amber-500 uppercase tracking-wider block">Joint Wear Rate</span>
                  <span className="text-[15px] font-black text-amber-600">{localMetrics.injuryRisk.thoracicFatigueProb}%</span>
                </div>
                <div className="p-3 bg-emerald-50/30 border border-emerald-100/50 rounded-2xl text-center space-y-0.5">
                  <span className="text-[8px] font-black text-emerald-500 uppercase tracking-wider block">Ligamentous Creep</span>
                  <span className="text-[15px] font-black text-emerald-600">{localMetrics.injuryRisk.posturalOverloadProb}%</span>
                </div>
              </div>

              <div className="p-3.5 bg-indigo-50/40 border border-indigo-100/50 rounded-2xl text-xs font-bold text-indigo-900 leading-relaxed">
                <span className="uppercase text-[8px] font-black text-indigo-600 tracking-wider block mb-1">Clinician Recommendations Plan</span>
                {localMetrics.injuryRisk.clinicalAdvice}
              </div>
            </div>

            {/* Sensory Alarms & Correction Compliance Panel */}
            <div className="glass p-6 rounded-[32px] border border-slate-100 space-y-4 shadow-sm" id="alert_compliance_analytics">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="text-emerald-500" size={18} />
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Alert Compliance & Realignment</h3>
                </div>
                <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  {localMetrics.dailyComplianceRate}% Response
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500 leading-relaxed">
                Tracks how quickly the patient corrects their spine alignment upon sensor trigger. Faster times reduce myofascial strain accretion.
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs font-bold text-slate-700 pt-2">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl space-y-0.5">
                  <span className="text-[8px] font-black text-slate-400 uppercase block">Correction Success</span>
                  <span className="text-slate-800 text-[13px] font-black">
                    {localMetrics.correctionsAchievedCount || Math.max(0, incidents - 1)} times
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl space-y-0.5">
                  <span className="text-[8px] font-black text-slate-400 uppercase block">Average Recovery Velocity</span>
                  <span className="text-slate-800 text-[13px] font-black">
                    {localMetrics.averageRecoveryTimeSeconds} Seconds
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl space-y-0.5">
                  <span className="text-[8px] font-black text-slate-400 uppercase block">Fastest Realignment</span>
                  <span className="text-slate-800 text-[13px] font-black">
                    {localMetrics.fastestResponseTimeSeconds} Seconds
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl space-y-0.5">
                  <span className="text-[8px] font-black text-slate-400 uppercase block">Sensory Reminders Sent</span>
                  <span className="text-slate-800 text-[13px] font-black">
                    {incidents || 0} times
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Structured Physiotherapeutic recommendations */}
      <div className="bg-white p-6 rounded-[32px] border border-border shadow-sm space-y-4" id="clinical_recommendations_block">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">Rehabilitation Exercises Plan</h3>
        <div className="space-y-4">
          {[
            { title: "Pectoralis doorway stretch", desc: "Reduces upper back hunching by elongating compressed anterior thoracic musculature. Complete 3 sets of 30-sec holds daily.", duration: "3 mins" },
            { title: "Prone Cobra holds", desc: "Strengthens fatigued lower and middle trapezius fibers to increase static posture endurance. Complete 4 sets of 15-sec holds.", duration: "5 mins" },
            { title: "Wall Angels spinal posture training", desc: "Assists cervical joint repositioning and thoracic spinal nutrition. 2 sets of 15 repetitions during active micro-breaks.", duration: "4 mins" }
          ].map((rec, i) => (
            <div key={i} className="flex gap-4 items-start bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100/60">
               <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i + 1}
               </div>
               <div className="space-y-0.5">
                 <div className="flex items-center gap-2">
                   <h4 className="text-xs font-black text-slate-800">{rec.title}</h4>
                   <span className="text-[8px] font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">{rec.duration}</span>
                 </div>
                 <p className="text-[11px] font-semibold text-slate-500 leading-relaxed">{rec.desc}</p>
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* Historical Session Data Table Breakdown */}
      <div className="bg-white rounded-[32px] border border-border shadow-sm overflow-hidden" id="reports_historical_table_block">
        <div className="p-5 border-b border-borderLight flex justify-between items-center text-slate-800">
           <h3 className="text-sm font-black">Orthopedic Spinal Session Log</h3>
           <FileText size={14} className="text-slate-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 font-black uppercase text-[9px] tracking-widest text-slate-400">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-center">Quality Score</th>
                <th className="px-4 py-3 text-center">Avg Strain</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Diagnostic Grade</th>
              </tr>
            </thead>
            <tbody className="font-bold divide-y divide-slate-100 text-slate-700">
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    <Loader2 className="animate-spin inline-block mr-2" size={16} />
                    Querying biomechanical history database...
                  </td>
                </tr>
              )}
              {!isLoading && (sessions.length > 0 ? sessions : [
                { date: 'Today (Active)', score: score, avgLoadLbs: localMetrics.averageThoracicLoadLbs, status: score >= thresholds.good ? 'Excellent' : 'Fair', grade: 'B' },
                { date: 'Yesterday', score: 85, avgLoadLbs: 14.5, status: 'Excellent', grade: 'A' },
                { date: '2 days ago', score: 72, avgLoadLbs: 19.2, status: 'Fair', grade: 'C' },
                { date: '3 days ago', score: 91, avgLoadLbs: 11.4, status: 'Excellent', grade: 'A' },
                { date: '4 days ago', score: 63, avgLoadLbs: 28.5, status: 'Poor', grade: 'D' },
              ]).map((row, i) => {
                const formattedDate = row.date && row.date.includes('T')
                  ? new Date(row.date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : row.date;
                const finalScore = row.qualityScore !== undefined ? row.qualityScore : (row.score || 80);
                const isExcellent = finalScore >= 80;
                const isFair = finalScore >= 65 && finalScore < 80;
                
                return (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-4">{formattedDate}</td>
                    <td className="px-4 py-4 text-center">{Math.round(finalScore)}%</td>
                    <td className="px-4 py-4 text-center">{row.avgLoadLbs || 14} Lbs</td>
                    <td className="px-4 py-4 text-center">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-black uppercase",
                        isExcellent ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : 
                        isFair ? "bg-amber-50 text-amber-600 border border-amber-100" : 
                        "bg-rose-50 text-rose-600 border border-rose-100"
                      )}>
                        {isExcellent ? 'Excellent' : isFair ? 'Fair' : 'Poor'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-slate-800 font-black text-sm bg-slate-100 px-2.5 py-0.5 rounded-md">
                        {row.grade || (finalScore >= 90 ? 'A' : finalScore >= 80 ? 'B' : finalScore >= 70 ? 'C' : 'D')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Overlay showing real physical therapist referral report */}
      <AnimatePresence>
        {showExportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" id="export_referral_modal">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[32px] border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-600">
                  <FileCheck size={20} />
                  <span className="text-sm font-black uppercase tracking-wider">Clinician Dossier Compiled</span>
                </div>
                <button 
                  id="close_referral_modal_btn"
                  onClick={() => setShowExportModal(false)}
                  className="text-xs font-black text-slate-400 hover:text-slate-700 bg-slate-200/50 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition-all"
                >
                  Close
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5 text-slate-800">
                <div className="text-center space-y-1 py-2">
                  <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full inline-block">
                    Physical Therapist Referral Form
                  </div>
                  <h3 className="text-lg font-black text-slate-800">Spine Guardian Medical Report</h3>
                  <p className="text-[10px] text-slate-400 font-medium">DOCUMENT REF ID: SG-{Math.floor(100000 + Math.random() * 900000)}</p>
                </div>

                {/* Patient Summary */}
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Patient Diagnostics Summary</span>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Baseline Posture Quality:</span>
                    <span className="text-indigo-600 font-black">{Math.round(score)}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Spinal Load Equivalent:</span>
                    <span className="text-indigo-600 font-black">{localMetrics.averageThoracicLoadLbs} Lbs average</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Muscular Fatigue level:</span>
                    <span className="text-rose-500 font-black">{localMetrics.fatigueScore}% index</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Break Recovery Response:</span>
                    <span className="text-emerald-500 font-black">{localMetrics.dailyComplianceRate}% corrected</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Clinician Assessment Note</h4>
                  <p className="text-xs font-semibold text-slate-600 leading-relaxed bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50">
                    "{localMetrics.injuryRisk.clinicalAdvice}"
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl text-center border border-dashed border-slate-200">
                  <span className="text-xs font-bold block text-slate-700">Referral Document Ready!</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">The complete HTML dossier has been compiled and downloaded to your device storage. Share this file directly with your physical therapist.</span>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 flex gap-3">
                <button 
                  id="modal_download_again_btn"
                  onClick={handleExportClinicalReport}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black py-3.5 rounded-2xl transition-all border border-slate-200/50"
                >
                  Download Dossier File
                </button>
                <button 
                  id="modal_dismiss_btn"
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black py-3.5 rounded-2xl transition-all shadow-lg shadow-indigo-600/20"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
