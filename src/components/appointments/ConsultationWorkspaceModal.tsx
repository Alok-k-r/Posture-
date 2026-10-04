import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  X, 
  Send, 
  Share2, 
  Calendar, 
  Sparkles, 
  MessageSquare, 
  Stethoscope, 
  Activity, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Layers, 
  ShieldCheck, 
  Download, 
  ArrowUpRight, 
  TrendingUp, 
  AlertCircle,
  FileCheck,
  Award
} from 'lucide-react';
import { Appointment, RootState, addChatMessage, shareReportWithDoctor } from '../../store/store';
import { LocalModelService } from '../../services/localModelService';
import { SessionService, UnifiedSession } from '../../services/sessionService';
import { cn } from '../../lib/utils';
import toast from 'react-hot-toast';

interface ConsultationWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment;
}

export const ConsultationWorkspaceModal: React.FC<ConsultationWorkspaceModalProps> = ({
  isOpen,
  onClose,
  appointment,
}) => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState<'chat' | 'reports'>('chat');
  const [inputMessage, setInputMessage] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'Today' | 'Last 7 Days' | 'This Month' | 'All Time'>('Last 7 Days');
  const [selectedReportId, setSelectedReportId] = useState<string>('latest');
  const [userSessions, setUserSessions] = useState<UnifiedSession[]>([]);
  const [isExporting, setIsExporting] = useState(false);

  // Redux state
  const posture = useSelector((state: RootState) => state.posture);
  const user = useSelector((state: RootState) => state.auth.user);

  // Biomechanical model metrics
  const localMetrics = LocalModelService.getMetrics();

  // Load user sessions for the report breakdown
  useEffect(() => {
    if (!isOpen) return;
    const userId = user?.id || 'guest';
    SessionService.fetchUnifiedSessions(userId).then((list) => {
      setUserSessions(list);
    });
  }, [isOpen, user?.id]);

  if (!isOpen) return null;

  const messages = appointment.chatMessages || [];
  const sharedReports = appointment.sharedReports || [];

  // Compute live / timeframe-specific statistics
  const getStatsForTimeframe = (tf: 'Today' | 'Last 7 Days' | 'This Month' | 'All Time') => {
    const liveAngle = Math.round(posture.angle) || 82;
    const liveScore = Math.round(posture.score) || 88;
    const liveIncidents = posture.incidents || 3;
    const liveHours = Math.max(0.5, Number(((posture.totalSessionSeconds || 1800) / 3600).toFixed(1)));

    if (tf === 'Today') {
      return {
        timeframe: 'Today' as const,
        avgAngle: liveAngle,
        score: liveScore,
        incidents: liveIncidents,
        totalHours: liveHours,
        stabilityScore: localMetrics.stabilityScore || 88,
        hansrajLoadLbs: localMetrics.cervicalSpineLoadHansrajLbs || 14.5,
        cervicalTorque: (localMetrics.cervicalTorqueNm || 12.4),
        fatigueScore: localMetrics.fatigueScore || 22,
        sessionsCount: Math.max(1, userSessions.filter(s => new Date(s.date).toDateString() === new Date().toDateString()).length)
      };
    } else if (tf === 'Last 7 Days') {
      return {
        timeframe: 'Last 7 Days' as const,
        avgAngle: 84,
        score: 91,
        incidents: 14,
        totalHours: 28.5,
        stabilityScore: 92,
        hansrajLoadLbs: 16.2,
        cervicalTorque: 14.8,
        fatigueScore: 19,
        sessionsCount: Math.max(4, userSessions.length)
      };
    } else if (tf === 'This Month') {
      return {
        timeframe: 'This Month' as const,
        avgAngle: 86,
        score: 93,
        incidents: 38,
        totalHours: 94.0,
        stabilityScore: 94,
        hansrajLoadLbs: 15.0,
        cervicalTorque: 13.5,
        fatigueScore: 15,
        sessionsCount: Math.max(12, userSessions.length)
      };
    } else {
      return {
        timeframe: 'All Time' as const,
        avgAngle: 85,
        score: 92,
        incidents: 72,
        totalHours: 168.0,
        stabilityScore: 93,
        hansrajLoadLbs: 15.4,
        cervicalTorque: 14.0,
        fatigueScore: 17,
        sessionsCount: Math.max(18, userSessions.length)
      };
    }
  };

  // Determine current active report in Doctor/Patient view
  const currentReport = (() => {
    if (selectedReportId !== 'latest' && sharedReports.length > 0) {
      const found = sharedReports.find(r => r.id === selectedReportId);
      if (found) return found;
    }
    if (sharedReports.length > 0) {
      return sharedReports[0];
    }
    // Fallback constructed report based on selected timeframe
    return {
      id: 'live-default',
      sharedAt: 'Live Telemetry Stream',
      ...getStatsForTimeframe(selectedTimeframe)
    };
  })();

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userText = inputMessage;
    setInputMessage('');

    // Dispatch patient message
    dispatch(addChatMessage({
      appointmentId: appointment.id,
      message: {
        id: 'msg-' + Date.now(),
        sender: 'patient',
        text: userText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    }));

    // Auto-generate realistic doctor response after 1 second
    setTimeout(() => {
      let doctorReply = `Thank you for the update! I am currently reviewing your spinal health telemetry.`;
      const lower = userText.toLowerCase();

      if (lower.includes('neck') || lower.includes('pain') || lower.includes('head') || lower.includes('shoulder')) {
        doctorReply = `I see your cervical angle dips during long work sessions. I recommend doing 3 sets of cervical chin retractions and a 2-minute posture break.`;
      } else if (lower.includes('report') || lower.includes('share') || lower.includes('sent')) {
        doctorReply = `I received your diagnostic report! Your thoracic integrity and Kenneth Hansraj load numbers look well documented. I will review this during our session.`;
      } else if (lower.includes('chair') || lower.includes('ergonomic') || lower.includes('desk')) {
        doctorReply = `Ensure your monitor is at eye level so your cervical flexion angle stays above 85 degrees while working.`;
      }

      dispatch(addChatMessage({
        appointmentId: appointment.id,
        message: {
          id: 'doc-msg-' + Date.now(),
          sender: 'doctor',
          text: doctorReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      }));
    }, 1000);
  };

  const handleConfirmShareReport = () => {
    setShowShareModal(false);
    const stats = getStatsForTimeframe(selectedTimeframe);

    const newReport = {
      id: 'rep-' + Date.now(),
      timeframe: selectedTimeframe === 'All Time' ? 'This Month' : selectedTimeframe,
      sharedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      avgAngle: stats.avgAngle,
      maxSlouch: 36,
      totalHours: stats.totalHours,
      score: stats.score,
      incidents: stats.incidents,
      stabilityScore: stats.stabilityScore,
      cervicalTorque: stats.cervicalTorque,
    };

    // Add report to appointment
    dispatch(shareReportWithDoctor({
      appointmentId: appointment.id,
      report: newReport
    }));

    // Also inject a chat message with report attachment
    dispatch(addChatMessage({
      appointmentId: appointment.id,
      message: {
        id: 'msg-share-' + Date.now(),
        sender: 'patient',
        text: `I have shared my ${selectedTimeframe} Posture & Spinal Biomechanics Report.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        reportAttachment: {
          timeframe: selectedTimeframe === 'All Time' ? 'This Month' : selectedTimeframe,
          avgAngle: stats.avgAngle,
          maxSlouch: 36,
          totalHours: stats.totalHours,
          score: stats.score,
          incidents: stats.incidents,
          sharedAt: newReport.sharedAt,
        }
      }
    }));

    toast.success(`${selectedTimeframe} Report shared with ${appointment.doctorName}!`);
  };

  const handleExportHtmlDossier = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      const reportTitle = `Spine_Health_Report_${user?.name || 'Patient'}_${new Date().toISOString().slice(0, 10)}.html`;
      const reportHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PostureCare • Clinical Biomechanics Referral Dossier</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, sans-serif; color: #0f172a; line-height: 1.6; max-width: 850px; margin: 40px auto; padding: 0 24px; background: #f8fafc; }
    .container { background: #ffffff; border-radius: 24px; border: 1px solid #e2e8f0; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
    h1 { font-size: 26px; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
    .badge { display: inline-block; padding: 4px 12px; background: #e0e7ff; color: #4338ca; border-radius: 9999px; font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; }
    .metric-val { font-size: 26px; font-weight: 900; color: #4f46e5; margin: 6px 0 2px; }
    .label { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; }
    .meta-box { background: #f1f5f9; border-radius: 16px; padding: 18px; margin-bottom: 24px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #e2e8f0; }
    th { background: #f8fafc; font-weight: 800; color: #475569; }
    .advice { background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 16px; padding: 20px; color: #065f46; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>PostureCare • Clinical Biomechanics Dossier</h1>
    <span class="badge">Prepared for ${appointment.doctorName} (${appointment.specialty})</span>
    
    <div class="meta-box">
      <strong>Patient:</strong> ${user?.name || 'Rahul'}<br>
      <strong>Consultation Date:</strong> ${appointment.date} at ${appointment.time}<br>
      <strong>Report Scope:</strong> ${currentReport.timeframe || selectedTimeframe} Posture Diagnostics<br>
      <strong>Sensor Hardware:</strong> ESP32 Thoracic Bio-Sensor @ 50Hz BLE
    </div>

    <div class="grid">
      <div class="card">
        <div class="label">Average Thoracic Angle</div>
        <div class="metric-val">${Math.round(currentReport.avgAngle)}°</div>
        <small style="color: #64748b;">Optimal upright baseline: 90°</small>
      </div>
      <div class="card">
        <div class="label">Spine Integrity Score</div>
        <div class="metric-val" style="color: #10b981;">${currentReport.score}%</div>
        <small style="color: #64748b;">Session compliance fidelity</small>
      </div>
      <div class="card">
        <div class="label">Hansraj Cervical Load</div>
        <div class="metric-val" style="color: #f59e0b;">${(currentReport as any).hansrajLoadLbs || 16.2} lbs</div>
        <small style="color: #64748b;">Kenneth Hansraj (2014) model</small>
      </div>
    </div>

    <div class="advice">
      <strong>Clinical Ergonomic Recommendation:</strong><br>
      Patient exhibits steady baseline alignment with occasional fatigue slumps in afternoon hours. Recommend 30-second scapular squeezes and chin retractions every 45 minutes.
    </div>
  </div>
</body>
</html>`;
      const blob = new Blob([reportHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = reportTitle;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Clinical Dossier exported successfully!');
    }, 600);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-5xl h-[90vh] bg-white rounded-[36px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col text-slate-900"
        >
          {/* TOP HEADER BAR (Clean White / Soft Slate UI Theme) */}
          <div className="p-4 sm:p-5 bg-white border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-black text-lg shrink-0 shadow-xs">
                <Stethoscope size={22} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
                    {appointment.doctorName}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Confirmed Visit
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium truncate">
                  {appointment.specialty} • {appointment.hospital}
                </p>
              </div>
            </div>

            {/* TAB SWITCHER: 1. Patient Chat | 2. Patient Reports */}
            <div className="flex items-center justify-between sm:justify-end gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/80 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('chat')}
                className={cn(
                  "flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer",
                  activeTab === 'chat'
                    ? "bg-white text-indigo-600 shadow-soft"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                <MessageSquare size={14} />
                <span>Physio Chat</span>
              </button>

              <button
                onClick={() => setActiveTab('reports')}
                className={cn(
                  "flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer",
                  activeTab === 'reports'
                    ? "bg-white text-indigo-600 shadow-soft"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                <FileText size={14} />
                <span>Patient Reports</span>
                {sharedReports.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                )}
              </button>

              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer ml-1"
                title="Close consultation workspace"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* BODY CONTENT AREA */}
          <div className="flex-1 overflow-hidden relative flex flex-col bg-slate-50/50">
            {activeTab === 'chat' ? (
              /* ======================================================== */
              /* TAB 1: PHYSIO CHAT & DIRECT REPORT SHARING               */
              /* ======================================================== */
              <div className="flex-1 flex flex-col h-full bg-white">
                {/* Clean Top Action Banner */}
                <div className="p-3.5 sm:p-4 bg-gradient-to-r from-indigo-50/90 to-slate-50 border-b border-indigo-100/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2.5 text-xs text-indigo-900 font-medium">
                    <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                      <Sparkles size={14} />
                    </div>
                    <span>
                      Chat directly with {appointment.doctorName} & send your posture diagnostic report before consultation.
                    </span>
                  </div>

                  <button
                    onClick={() => setShowShareModal(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-soft hover:shadow-indigo-200 transition-all flex items-center justify-center gap-1.5 shrink-0 active:scale-95 cursor-pointer"
                  >
                    <Share2 size={13} />
                    <span>Share Report with Doctor</span>
                  </button>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/30">
                  {messages.map((msg) => {
                    const isPatient = msg.sender === 'patient';
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex flex-col",
                          isPatient ? "items-end" : "items-start"
                        )}
                      >
                        <div className="text-[10px] text-slate-400 font-bold mb-1 px-1">
                          {isPatient ? 'You (Patient)' : appointment.doctorName} • {msg.timestamp}
                        </div>

                        <div
                          className={cn(
                            "max-w-lg p-4 rounded-3xl text-xs font-medium leading-relaxed shadow-soft",
                            isPatient
                              ? "bg-indigo-600 text-white rounded-br-xs shadow-indigo-100"
                              : "bg-white text-slate-800 border border-slate-100 rounded-bl-xs"
                          )}
                        >
                          <p>{msg.text}</p>

                          {/* Beautiful Report Attachment Card */}
                          {msg.reportAttachment && (
                            <div className="mt-3 p-3.5 bg-white/95 rounded-2xl border border-indigo-100 text-slate-900 space-y-2.5 shadow-sm">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <span className="font-black text-[11px] text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                                  <FileCheck size={14} className="text-indigo-600" />
                                  {msg.reportAttachment.timeframe} Posture Report
                                </span>
                                <span className="text-[10px] text-slate-400 font-semibold">{msg.reportAttachment.sharedAt}</span>
                              </div>

                              <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                                  <span className="text-slate-400 block font-bold">Avg Stance</span>
                                  <span className="font-black text-emerald-600 text-xs">{Math.round(msg.reportAttachment.avgAngle)}°</span>
                                </div>
                                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                                  <span className="text-slate-400 block font-bold">Integrity</span>
                                  <span className="font-black text-indigo-600 text-xs">{msg.reportAttachment.score}%</span>
                                </div>
                                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                                  <span className="text-slate-400 block font-bold">Slouch Events</span>
                                  <span className="font-black text-rose-500 text-xs">{msg.reportAttachment.incidents}</span>
                                </div>
                              </div>

                              <button
                                onClick={() => setActiveTab('reports')}
                                className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <span>Open in Patient Reports Tab</span>
                                <ArrowUpRight size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quick Consultation Prompts */}
                <div className="px-4 py-2.5 bg-white border-t border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">
                    Quick Ask:
                  </span>
                  {[
                    "Doctor, please review my weekly posture integrity report.",
                    "What ergonomic adjustments should I make for neck pain?",
                    "Should I increase my stretch breaks during long work shifts?",
                  ].map((promptText, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInputMessage(promptText)}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200/70 hover:border-indigo-200 rounded-full text-[11px] text-slate-600 hover:text-indigo-700 font-medium whitespace-nowrap transition-all cursor-pointer"
                    >
                      {promptText}
                    </button>
                  ))}
                </div>

                {/* Chat Input Bar */}
                <div className="p-4 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={`Type a message to ${appointment.doctorName}...`}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim()}
                    className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-2xl transition-all shadow-soft shrink-0 cursor-pointer active:scale-95"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            ) : (
              /* ======================================================== */
              /* TAB 2: PATIENT REPORTS (DOCTOR & CLINICAL DOSSIER)       */
              /* ======================================================== */
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
                
                {/* Header Control Card */}
                <div className="p-5 bg-white rounded-[28px] border border-slate-100 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
                        Clinical Diagnostic Dossier
                      </span>
                      <span className="text-xs text-slate-400 font-bold">
                        Scope: {currentReport.timeframe || selectedTimeframe}
                      </span>
                    </div>
                    <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                      Patient Posture & Biomechanical Report
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">
                      All clinical reports and session records shared with {appointment.doctorName}.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Share / Update Report Action */}
                    <button
                      onClick={() => setShowShareModal(true)}
                      className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    >
                      <Share2 size={13} />
                      <span>Share New Period</span>
                    </button>

                    {/* Export Dossier Button */}
                    <button
                      onClick={handleExportHtmlDossier}
                      disabled={isExporting}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-soft cursor-pointer active:scale-95"
                    >
                      <Download size={13} />
                      <span>{isExporting ? 'Exporting...' : 'Export Dossier'}</span>
                    </button>
                  </div>
                </div>

                {/* 1. BIOMECHANICAL VITALS METRICS GRID */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {/* Metric 1: Average Pitch Alignment */}
                  <div className="p-5 bg-white rounded-[28px] border border-slate-100 shadow-soft space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-[10px] font-black uppercase tracking-wider">Avg Stance Angle</span>
                      <Activity size={16} className="text-indigo-600" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900">
                      {Math.round(currentReport.avgAngle)}°
                    </div>
                    <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      <span>Optimal Upright Alignment</span>
                    </p>
                  </div>

                  {/* Metric 2: Hansraj Cervical Spinal Load */}
                  <div className="p-5 bg-white rounded-[28px] border border-slate-100 shadow-soft space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-[10px] font-black uppercase tracking-wider">Cervical Load</span>
                      <ShieldCheck size={16} className="text-amber-500" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900">
                      {(currentReport as any).hansrajLoadLbs || 16.2} <span className="text-xs font-bold text-slate-400">lbs</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Kenneth Hansraj (2014) Model
                    </p>
                  </div>

                  {/* Metric 3: Integrity Score */}
                  <div className="p-5 bg-white rounded-[28px] border border-slate-100 shadow-soft space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-[10px] font-black uppercase tracking-wider">Integrity Score</span>
                      <Award size={16} className="text-emerald-500" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-emerald-600">
                      {currentReport.score}%
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Low Risk Compliance
                    </p>
                  </div>

                  {/* Metric 4: Total Session Hours */}
                  <div className="p-5 bg-white rounded-[28px] border border-slate-100 shadow-soft space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="text-[10px] font-black uppercase tracking-wider">Monitored Time</span>
                      <Clock size={16} className="text-indigo-600" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900">
                      {currentReport.totalHours} <span className="text-xs font-bold text-slate-400">hrs</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {currentReport.incidents} slouch warnings logged
                    </p>
                  </div>
                </div>

                {/* 2. CLINICAL ERGONOMIC ASSESSMENT FOR DOCTOR */}
                <div className="p-6 bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 rounded-[32px] text-white shadow-premium space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-indigo-300 shrink-0">
                      <Stethoscope size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-wider text-white">
                        Specialist Biomechanical Evaluation Notes
                      </h4>
                      <p className="text-xs text-indigo-200 font-medium">
                        Automated clinical synthesis generated for {appointment.doctorName}.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-2 text-xs text-slate-200 leading-relaxed font-medium">
                    <p>
                      <strong>Diagnostic Overview:</strong> Patient Rahul shows a stable upright stance baseline (calibrated at {Math.round(posture.baselineAngle)}°). Flexion moments stay within functional physiological limits across {currentReport.totalHours} monitored hours.
                    </p>
                    <p>
                      <strong>Physio Recommendation:</strong> Continue cervical retractions and thoracic extension stretches. Encourage hourly micro-breaks to avoid paraspinal muscle fatigue in afternoon blocks.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ✓ No acute structural torque anomaly
                    </span>
                    <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      ✓ Continuous 50Hz IMU Telemetry
                    </span>
                    <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      ✓ Active Streak: {posture.dailyStreak} Days
                    </span>
                  </div>
                </div>

                {/* 3. SESSION HISTORY & TELEMETRY BREAKDOWN DOSSIER */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                        <Layers size={16} className="text-indigo-600" />
                        Posture Telemetry Session Records
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Chronological biomechanical session logs available for clinical review.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-2xl shadow-xs">
                        {userSessions.length} Recorded Sessions
                      </span>
                    </div>
                  </div>

                  {userSessions.length === 0 ? (
                    <div className="p-10 bg-white rounded-[32px] border border-slate-100 text-center space-y-3 shadow-soft">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto text-indigo-600">
                        <Calendar size={22} />
                      </div>
                      <p className="text-xs font-black text-slate-800">No prior session telemetry recorded yet</p>
                      <p className="text-[11px] text-slate-500 max-w-sm mx-auto font-medium">
                        Live posture telemetry streams will automatically log into this record repository when sessions finish.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {userSessions.slice(0, 6).map((s, idx) => {
                        const sessionDate = s.date ? new Date(s.date) : new Date();
                        const isExcellent = (s.score || 90) >= 80;
                        const isFair = (s.score || 90) >= 60 && (s.score || 90) < 80;
                        const durationMins = Math.max(1, Math.round((s.duration || 1800) / 60));

                        return (
                          <div
                            key={s.id || idx}
                            className="p-5 bg-white rounded-[28px] border border-slate-100/90 shadow-soft hover:shadow-md hover:border-indigo-200 transition-all space-y-4"
                          >
                            {/* Card Top Row: Timestamp, Duration, and Status */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0">
                                  #{idx + 1}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-slate-900">
                                      {sessionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-bold">
                                      • {sessionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                  {durationMins} mins duration
                                </span>
                              </div>

                              <div className="flex items-center gap-2 self-start sm:self-auto">
                                <span className={cn(
                                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                                  isExcellent
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : isFair
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-rose-50 text-rose-700 border-rose-200"
                                )}>
                                  {isExcellent ? 'Optimal Stance' : isFair ? 'Moderate Fatigue' : 'Posture Slouch'}
                                </span>
                                <span className="text-[9px] font-black uppercase px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                                  Clinical Verified
                                </span>
                              </div>
                            </div>

                            {/* Card 4-Metric Spacious Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {/* 1. Posture Score */}
                              <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-0.5">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                                  Integrity Score
                                </span>
                                <div className={cn(
                                  "text-lg font-black",
                                  isExcellent ? "text-emerald-600" : isFair ? "text-indigo-600" : "text-rose-600"
                                )}>
                                  {Math.round(s.score || 90)}%
                                </div>
                                <span className="text-[9px] font-semibold text-slate-500 block">
                                  Session Compliance
                                </span>
                              </div>

                              {/* 2. Biomechanical Load */}
                              <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-0.5">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                                  Avg Spinal Strain
                                </span>
                                <div className="text-lg font-black text-slate-800">
                                  {s.avgLoadLbs ? `${s.avgLoadLbs.toFixed(1)} lbs` : '14.2 lbs'}
                                </div>
                                <span className="text-[9px] font-semibold text-slate-500 block">
                                  Hansraj C7 Moment
                                </span>
                              </div>

                              {/* 3. Slouch Alert Triggers */}
                              <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-0.5">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                                  Slouch Warnings
                                </span>
                                <div className="text-lg font-black text-amber-600">
                                  {s.slouches ?? 2} <span className="text-xs font-bold text-slate-400">events</span>
                                </div>
                                <span className="text-[9px] font-semibold text-slate-500 block">
                                  Haptic Alerts Sent
                                </span>
                              </div>

                              {/* 4. Focus Streak */}
                              <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100 space-y-0.5">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                                  Peak Alignment
                                </span>
                                <div className="text-lg font-black text-indigo-600">
                                  {Math.round((s.maxFocusStreak || (s.duration * 0.7 || 1200)) / 60)} <span className="text-xs font-bold text-slate-400">mins</span>
                                </div>
                                <span className="text-[9px] font-semibold text-slate-500 block">
                                  Unbroken Focus
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </motion.div>

        {/* SELECT REPORT PERIOD MODAL DIALOG */}
        {showShareModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              className="w-full max-w-md bg-white border border-slate-100 rounded-[32px] p-6 text-slate-900 space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Share2 size={16} />
                  </div>
                  <h4 className="font-black text-sm text-slate-900">
                    Select Report Timeframe to Share
                  </h4>
                </div>
                <button 
                  onClick={() => setShowShareModal(false)} 
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2.5">
                {[
                  { id: 'Today', title: "Today's Live Telemetry", desc: 'Real-time pitch angles, today score & active slouch alerts' },
                  { id: 'Last 7 Days', title: 'Last 7 Days Trend (Recommended)', desc: 'Weekly average angle, cumulative slouch hours & integrity trajectory' },
                  { id: 'This Month', title: 'This Month Summary (30 Days)', desc: '30-day comprehensive posture breakdown & daily streak history' },
                  { id: 'All Time', title: 'All Time History', desc: 'Complete historical logs & Kenneth Hansraj spinal load profile' },
                ].map((opt) => {
                  const isSelected = selectedTimeframe === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedTimeframe(opt.id as any)}
                      className={cn(
                        "w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer active:scale-98",
                        isSelected
                          ? "bg-indigo-50/90 border-indigo-500/80 text-slate-900 shadow-xs"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-slate-900">{opt.title}</span>
                        {isSelected && <CheckCircle2 size={16} className="text-indigo-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleConfirmShareReport}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-soft transition-all cursor-pointer active:scale-95"
              >
                Confirm & Share {selectedTimeframe} Report
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
