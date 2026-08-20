import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDispatch, useSelector } from 'react-redux';
import { X, Send, Share2, Calendar, Sparkles, MessageSquare, Stethoscope, Activity, FileText, CheckCircle2, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { Appointment, RootState, addChatMessage, shareReportWithDoctor } from '../../store/store';
import { Spine3DModel } from '../spine/Spine3DModel';

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
  const [activeTab, setActiveTab] = useState<'chat' | 'doctorView'>('chat');
  const [inputMessage, setInputMessage] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'Today' | 'Last 7 Days' | 'This Month'>('Today');

  // Fetch current posture state for live report metrics
  const posture = useSelector((state: RootState) => state.posture);

  if (!isOpen) return null;

  const messages = appointment.chatMessages || [];
  const sharedReports = appointment.sharedReports || [];

  // Current active report for Doctor 3D Spine view (use last shared or construct live fallback)
  const activeReport = sharedReports[0] || {
    id: 'live-default',
    timeframe: 'Today',
    sharedAt: 'Live Telemetry',
    avgAngle: posture.angle || 78,
    maxSlouch: 36,
    totalHours: 4.5,
    score: posture.sessionStats?.score || 85,
    incidents: posture.sessionStats?.slouchCount || 3,
    stabilityScore: posture.stabilityScore || 88,
    cervicalTorque: 18.2,
  };

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
      let doctorReply = `Thank you for your update. I am reviewing your biomechanical parameters.`;
      if (userText.toLowerCase().includes('neck') || userText.toLowerCase().includes('pain') || userText.toLowerCase().includes('head')) {
        doctorReply = `I noticed your cervical posture angle drops during afternoon sessions. Let's do a quick chin-tuck isometric stretch before our consultation.`;
      } else if (userText.toLowerCase().includes('report') || userText.toLowerCase().includes('share')) {
        doctorReply = `Your report is loaded on my 3D Spine Clinical Dashboard! Your C7-T1 vertebral torque is well within safe thresholds.`;
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

    // Compute metrics based on selected timeframe
    let angleVal = posture.angle || 78;
    let scoreVal = posture.sessionStats?.score || 85;
    let incidentsVal = posture.sessionStats?.slouchCount || 3;
    let hoursVal = 4.5;

    if (selectedTimeframe === 'Last 7 Days') {
      angleVal = 81;
      scoreVal = 89;
      incidentsVal = 14;
      hoursVal = 28.5;
    } else if (selectedTimeframe === 'This Month') {
      angleVal = 83;
      scoreVal = 91;
      incidentsVal = 48;
      hoursVal = 112.0;
    }

    dispatch(shareReportWithDoctor({
      appointmentId: appointment.id,
      report: {
        id: 'rep-' + Date.now(),
        timeframe: selectedTimeframe,
        sharedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        avgAngle: angleVal,
        maxSlouch: 38,
        totalHours: hoursVal,
        score: scoreVal,
        incidents: incidentsVal,
        stabilityScore: posture.stabilityScore || 88,
        cervicalTorque: Math.round((90 - angleVal) * 0.65 + 12),
      }
    }));
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-5xl h-[88vh] bg-slate-900 rounded-[32px] shadow-2xl overflow-hidden border border-slate-800 flex flex-col text-slate-100"
        >
          {/* Top Header */}
          <div className="p-3 sm:p-5 bg-slate-950/90 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-black text-base sm:text-lg shrink-0">
                <Stethoscope size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-sm sm:text-lg font-black text-white truncate">{appointment.doctorName}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
                    Confirmed
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">{appointment.specialty} • {appointment.hospital}</p>
              </div>

              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors sm:hidden shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* View Switcher Tabs */}
            <div className="flex items-center justify-between sm:justify-end gap-1.5 bg-slate-900 p-1 rounded-2xl border border-slate-800 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'chat'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare size={13} />
                <span>Patient Chat</span>
              </button>

              <button
                onClick={() => setActiveTab('doctorView')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'doctorView'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Activity size={13} />
                <span>Doctor 3D Spine</span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors hidden sm:block ml-1"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-hidden relative flex flex-col">
            {activeTab === 'chat' ? (
              /* TAB 1: PATIENT CHAT & REPORT SHARING */
              <div className="flex-1 flex flex-col h-full bg-slate-900">
                {/* Chat Action Header Banner */}
                <div className="p-3.5 bg-indigo-950/40 border-b border-indigo-900/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-indigo-300 font-medium">
                    <Sparkles size={16} className="text-indigo-400" />
                    <span>Unlocked Consultation Room: Chat with doctor & share posture telemetry reports before your visit.</span>
                  </div>

                  <button
                    onClick={() => setShowShareModal(true)}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0"
                  >
                    <Share2 size={13} />
                    <span>Share Report With Doctor</span>
                  </button>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.sender === 'patient' ? 'items-end' : 'items-start'}`}
                    >
                      <div className="text-[10px] text-slate-400 font-bold mb-1">
                        {msg.sender === 'patient' ? 'You (Patient)' : appointment.doctorName} • {msg.timestamp}
                      </div>

                      <div
                        className={`max-w-lg p-3.5 rounded-2xl text-xs font-medium ${
                          msg.sender === 'patient'
                            ? 'bg-indigo-600 text-white rounded-br-none shadow-md'
                            : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-bl-none'
                        }`}
                      >
                        <p>{msg.text}</p>

                        {/* If message has attached Report Card */}
                        {msg.reportAttachment && (
                          <div className="mt-2.5 p-3 bg-slate-900/80 rounded-xl border border-indigo-500/30 text-white space-y-2">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                              <span className="font-black text-[11px] text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                                <FileText size={12} />
                                {msg.reportAttachment.timeframe} Posture Diagnostic Report
                              </span>
                              <span className="text-[9px] text-slate-400">{msg.reportAttachment.sharedAt}</span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                              <div className="p-1.5 bg-slate-800 rounded-lg">
                                <span className="text-slate-400 block">Avg Angle</span>
                                <span className="font-extrabold text-emerald-400 text-xs">{msg.reportAttachment.avgAngle}°</span>
                              </div>
                              <div className="p-1.5 bg-slate-800 rounded-lg">
                                <span className="text-slate-400 block">Integrity</span>
                                <span className="font-extrabold text-indigo-400 text-xs">{msg.reportAttachment.score}%</span>
                              </div>
                              <div className="p-1.5 bg-slate-800 rounded-lg">
                                <span className="text-slate-400 block">Slouch Events</span>
                                <span className="font-extrabold text-amber-400 text-xs">{msg.reportAttachment.incidents}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Question Prompts */}
                <div className="px-4 py-2 border-t border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
                  {[
                    "Doctor, can you review my cervical angle?",
                    "What ergonomic chair height do you suggest?",
                    "Should I do neck stretches during work hours?",
                  ].map((promptText, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInputMessage(promptText)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full text-[10px] text-slate-300 whitespace-nowrap transition-all"
                    >
                      {promptText}
                    </button>
                  ))}
                </div>

                {/* Chat Input Bar */}
                <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message or clinical query to Dr. Sharma..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition-all shadow-md shrink-0"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            ) : (
              /* TAB 2: DOCTOR CLINICAL DASHBOARD & 3D SPINE MODEL */
              <div className="flex-1 p-5 overflow-y-auto bg-slate-950 space-y-5">
                {/* Banner */}
                <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Stethoscope size={16} className="text-indigo-400" />
                      Specialist Clinical Diagnostic Portal
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Reviewing patient posture trends, biomechanical flexion curves, and 3D spinal stress points.
                    </p>
                  </div>

                  {sharedReports.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-bold">Active Shared Report:</span>
                      <select className="bg-slate-800 border border-slate-700 text-indigo-400 text-xs font-bold rounded-xl px-3 py-1.5 focus:outline-none">
                        {sharedReports.map(r => (
                          <option key={r.id} value={r.id}>
                            {r.timeframe} (Shared at {r.sharedAt})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Main 2-Column Clinical Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Left Column: 3D Spine Visualizer */}
                  <div className="lg:col-span-7 space-y-4">
                    <Spine3DModel
                      avgAngle={activeReport.avgAngle}
                      slouchIncidents={activeReport.incidents}
                      stabilityScore={activeReport.stabilityScore}
                    />
                  </div>

                  {/* Right Column: Physio & Biomechanical Parameters Grid */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
                      <h5 className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                        <Activity size={14} />
                        Clinical Biomechanical Parameters
                      </h5>

                      <div className="grid grid-cols-2 gap-2.5">
                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-bold">Cervical Flexion (CTA)</span>
                          <span className="text-lg font-black text-emerald-400">{activeReport.avgAngle}°</span>
                          <span className="text-[9px] text-slate-500 block">Normal range: 85° - 90°</span>
                        </div>

                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-bold">Head Protraction Load</span>
                          <span className="text-lg font-black text-amber-400">{activeReport.cervicalTorque} lbs</span>
                          <span className="text-[9px] text-slate-500 block">C7 Vertebra vector</span>
                        </div>

                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-bold">Spine Integrity Score</span>
                          <span className="text-lg font-black text-indigo-400">{activeReport.score}%</span>
                          <span className="text-[9px] text-slate-500 block">Session fidelity rating</span>
                        </div>

                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-bold">Slouch Incidents</span>
                          <span className="text-lg font-black text-rose-400">{activeReport.incidents} events</span>
                          <span className="text-[9px] text-slate-500 block">Haptic alert triggers</span>
                        </div>
                      </div>
                    </div>

                    {/* Patient Ergonomic Settings & Parameters (Patient Side Sync) */}
                    <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2.5">
                      <h5 className="text-xs font-black uppercase tracking-widest text-slate-300 flex items-center gap-1.5">
                        <Layers size={14} className="text-slate-400" />
                        Patient Device & Baseline Config
                      </h5>

                      <div className="space-y-1.5 text-xs text-slate-300 font-medium">
                        <div className="flex justify-between p-2 bg-slate-950/60 rounded-lg">
                          <span className="text-slate-400">Calibration Baseline:</span>
                          <span className="font-extrabold text-white">{posture.baselineAngle}°</span>
                        </div>
                        <div className="flex justify-between p-2 bg-slate-950/60 rounded-lg">
                          <span className="text-slate-400">Slouch Alert Threshold:</span>
                          <span className="font-extrabold text-amber-400">{posture.thresholds.warn}° Warn / {posture.thresholds.good}° Good</span>
                        </div>
                        <div className="flex justify-between p-2 bg-slate-950/60 rounded-lg">
                          <span className="text-slate-400">Streak Progress:</span>
                          <span className="font-extrabold text-emerald-400">{posture.dailyStreak} Days Active</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Share Report Modal Dialog */}
        {showShareModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 text-white space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="font-black text-sm text-white flex items-center gap-2">
                  <Share2 size={16} className="text-indigo-400" />
                  Select Report Period
                </h4>
                <button onClick={() => setShowShareModal(false)} className="text-slate-400 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2">
                {[
                  { id: 'Today', title: "Today's Session", desc: 'Real-time telemetry, today posture score & slouch events' },
                  { id: 'Last 7 Days', title: 'Last 7 Days Trend', desc: 'Weekly average angle, cumulative slouch hours & integrity' },
                  { id: 'This Month', title: 'This Month Summary', desc: '30-day comprehensive posture breakdown & streak log' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedTimeframe(opt.id as any)}
                    className={`w-full p-3 rounded-2xl border text-left transition-all ${
                      selectedTimeframe === opt.id
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{opt.title}</span>
                      {selectedTimeframe === opt.id && <CheckCircle2 size={14} className="text-indigo-400" />}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>

              <button
                onClick={handleConfirmShareReport}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-lg transition-all"
              >
                Share {selectedTimeframe} Report with {appointment.doctorName}
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
