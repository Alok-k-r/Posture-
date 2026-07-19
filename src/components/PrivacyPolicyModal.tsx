import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ShieldCheck, 
  Database, 
  Sparkles, 
  Lock, 
  CheckCircle2, 
  ChevronDown,
  ChevronUp,
  Printer,
  Eye,
  Activity,
  Check
} from 'lucide-react';
import { cn } from '../lib/utils';
import { PRIVACY_SECTIONS, PRIVACY_TABLE_ROWS, PRIVACY_POLICY_META } from '../data/privacyPolicyData';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'data' | 'ai' | 'security'>('all');
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    intro: true,
    info_we_collect: true,
  });

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const filteredSections = PRIVACY_SECTIONS.filter(
    sec => activeTab === 'all' || sec.category === activeTab
  );

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>${PRIVACY_POLICY_META.appName} - Privacy Policy & Security Standards</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; padding: 40px; color: #1e293b; max-width: 850px; margin: 0 auto; }
            h1 { font-size: 24px; color: #0f172a; margin-bottom: 4px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; font-weight: 800; text-transform: uppercase; }
            h2 { font-size: 13px; color: #10b981; margin-top: 0; margin-bottom: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; }
            h3 { font-size: 14px; color: #065f46; margin-top: 24px; margin-bottom: 8px; font-weight: bold; border-left: 3px solid #10b981; padding-left: 10px; }
            p { font-size: 12.5px; margin-bottom: 16px; white-space: pre-line; color: #334155; text-align: justify; }
            .meta { font-size: 11px; color: #64748b; margin-bottom: 30px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; border-top: 1px solid #e2e8f0; padding-top: 10px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 11px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: bold; color: #1e293b; }
          </style>
        </head>
        <body>
          <h1>${PRIVACY_POLICY_META.appName} Privacy Policy</h1>
          <h2>Biomechanical Telemetry & Data Processing Standards</h2>
          <div class="meta">Last Updated: ${PRIVACY_POLICY_META.lastUpdated} | Governing Laws: ${PRIVACY_POLICY_META.governingLaws}</div>
          
          <p><strong>OUR SECURITY GUARANTEE:</strong> We strictly do not sell your personal details or posture records. We do not track location coordinates or capture secondary bio-metrics (heart rate, ECG, etc.). All communications with your sensor pod occur locally via Bluetooth.</p>

          <table>
            <thead>
              <tr>
                <th>Data Type</th>
                <th>Purpose</th>
                <th>Retention Period</th>
                <th>Shared With</th>
                <th>Required / Optional</th>
              </tr>
            </thead>
            <tbody>
              ${PRIVACY_TABLE_ROWS.map(row => `
                <tr>
                  <td><strong>${row.dataType}</strong></td>
                  <td>${row.purpose}</td>
                  <td>${row.retention}</td>
                  <td>${row.sharedWith}</td>
                  <td>${row.required}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          ${PRIVACY_SECTIONS.map(sec => `
            <h3>${sec.title}</h3>
            <p>${sec.content}</p>
          `).join('')}
          
          <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 11px; color: #94a3b8; text-align: center;">
            &copy; 2026 ${PRIVACY_POLICY_META.companyName}. All Rights Reserved.
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const getSectionIcon = (category: string) => {
    switch (category) {
      case 'data': return Activity;
      case 'ai': return Sparkles;
      case 'security': return Lock;
      default: return Activity;
    }
  };

  const getSectionColor = (category: string) => {
    switch (category) {
      case 'data': return 'text-emerald-600 bg-emerald-50';
      case 'ai': return 'text-purple-600 bg-purple-50';
      case 'security': return 'text-indigo-600 bg-indigo-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="privacy-policy-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.45 }}
            id="privacy-policy-modal-card"
            className="relative w-full max-w-4xl bg-white/95 rounded-[40px] shadow-2xl border border-white/80 overflow-hidden flex flex-col max-h-[85vh] z-10"
          >
            {/* Header */}
            <div className="p-6 sm:p-8 bg-gradient-to-b from-emerald-50/50 to-transparent border-b border-slate-100 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
                    Corporate Compliance
                  </span>
                  <span className="bg-blue-100 text-blue-800 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Lock size={8} /> GDPR, CCPA, & India DPDP 2023
                  </span>
                </div>
                <h3 id="privacy-modal-title" className="text-2xl font-black text-slate-800 tracking-tight mt-2 flex items-center gap-2">
                  <ShieldCheck className="text-emerald-600" size={24} />
                  Privacy & Security Policy
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">
                  Last Updated: <span className="font-mono text-[11px] text-emerald-600 font-extrabold">{PRIVACY_POLICY_META.lastUpdated}</span> • PostureCare Spinal Laboratories Private Limited
                </p>
              </div>
              <button
                id="close-privacy-modal-btn"
                onClick={onClose}
                className="p-2.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Sub-Filters */}
            <div id="privacy-modal-filters" className="px-6 sm:px-8 py-3 bg-slate-50/50 border-b border-slate-100 flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Sections:</span>
              <button
                id="btn-filter-all"
                onClick={() => setActiveTab('all')}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all",
                  activeTab === 'all' 
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" 
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                )}
              >
                Full Policy (23 Sections)
              </button>
              <button
                id="btn-filter-data"
                onClick={() => setActiveTab('data')}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1",
                  activeTab === 'data' 
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/10" 
                    : "bg-white text-emerald-600 hover:bg-emerald-50 border border-emerald-200"
                )}
              >
                <Activity size={10} />
                On-Device Telemetry
              </button>
              <button
                id="btn-filter-ai"
                onClick={() => setActiveTab('ai')}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1",
                  activeTab === 'ai' 
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/10" 
                    : "bg-white text-purple-600 hover:bg-purple-50 border border-purple-200"
                )}
              >
                <Sparkles size={10} />
                Anonymized Gemini AI
              </button>
              <button
                id="btn-filter-security"
                onClick={() => setActiveTab('security')}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1",
                  activeTab === 'security' 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" 
                    : "bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-200"
                )}
              >
                <Lock size={10} />
                Encryption & BLE
              </button>
            </div>

            {/* Document Body */}
            <div 
              onScroll={handleScroll}
              id="privacy-modal-scrollable"
              className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 scrollbar-thin bg-slate-50/20"
            >
              {/* Highlight summary banner */}
              <div className="p-5 rounded-3xl bg-emerald-50/40 border border-emerald-100/60 flex items-start gap-4">
                <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-700 flex-shrink-0">
                  <Eye className="animate-pulse" size={20} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wider leading-none">Biological Privacy Secured</h4>
                  <p className="text-[11px] text-emerald-850 font-semibold leading-relaxed">
                    By using PostureCare, your physical spinal angles, calibration constants, and accelerometer waveforms are processed locally. No real-time spatial motion streams are ever forwarded to remote cloud systems, giving you complete biological privacy. We explicitly exclude the collection of sensitive biometrics like heart rate, blood oxygen, ECG, or location coordinates.
                  </p>
                </div>
              </div>

              {/* Data Processing Table (Visible in All or Data tabs) */}
              {(activeTab === 'all' || activeTab === 'data') && (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-1">
                  <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Database size={11} className="text-emerald-500" />
                      Data Processing & Retention Registry
                    </h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/30">
                          <th className="p-4 font-black text-slate-700 uppercase tracking-wider w-1/4">Data Type</th>
                          <th className="p-4 font-black text-slate-700 uppercase tracking-wider w-1/4">Purpose</th>
                          <th className="p-4 font-black text-slate-700 uppercase tracking-wider w-1/5">Retention Period</th>
                          <th className="p-4 font-black text-slate-700 uppercase tracking-wider w-1/5">Shared With</th>
                          <th className="p-4 font-black text-slate-700 uppercase tracking-wider w-1/6">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                        {PRIVACY_TABLE_ROWS.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/40">
                            <td className="p-4 font-black text-slate-800">{row.dataType}</td>
                            <td className="p-4 leading-relaxed">{row.purpose}</td>
                            <td className="p-4 font-mono text-[10px] text-slate-500">{row.retention}</td>
                            <td className="p-4 text-slate-500">{row.sharedWith}</td>
                            <td className="p-4">
                              <span className={`inline-block text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider ${
                                row.required.toLowerCase().includes('optional') ? 'bg-slate-100 text-slate-600' : 'bg-indigo-50 text-indigo-700'
                              }`}>
                                {row.required.toLowerCase().includes('optional') ? 'Optional' : 'Required'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sections list */}
              <div className="space-y-4">
                {filteredSections.map((sec) => {
                  const IconComp = getSectionIcon(sec.category);
                  const isExpanded = expandedSections[sec.id] !== false;
                  return (
                    <div 
                      key={sec.id}
                      className="bg-white rounded-3xl border border-slate-200/60 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                    >
                      {/* Section Header */}
                      <button
                        onClick={() => toggleSection(sec.id)}
                        className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50/40 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", getSectionColor(sec.category))}>
                            <IconComp size={18} />
                          </div>
                          <span className="text-sm font-black text-slate-800 tracking-tight">{sec.title}</span>
                        </div>
                        <div className="text-slate-400">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </button>

                      {/* Section Content */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                          >
                            <div className="px-5 pb-5 pt-1 border-t border-slate-100">
                              <p className="text-xs text-slate-600 font-semibold whitespace-pre-line leading-relaxed pl-14">
                                {sec.content}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Security confirmation */}
              <div className="p-5 rounded-3xl bg-slate-100/75 border border-slate-200/60 flex items-start gap-4">
                <CheckCircle2 className="text-emerald-600 mt-0.5 flex-shrink-0" size={16} />
                <div className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                  Compliance Statement: PostureCare has implemented systematic technical and administrative controls to guarantee zero-transmission of medical coordinates. Our databases are secured strictly in accordance with local Digital Personal Data Protection standards.
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  id="print-privacy-inside-modal-btn"
                  onClick={handlePrint}
                  className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <Printer size={11} />
                  Print Privacy Policy
                </button>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md transition-colors hidden md:inline-block",
                  hasScrolledToBottom ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-500"
                )}>
                  {hasScrolledToBottom ? "Policy Reviewed" : "Scroll down to verify"}
                </span>

                <button
                  id="acknowledge-privacy-modal-btn"
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-slate-900/10 active:scale-95 transition-all"
                >
                  <Check size={14} />
                  Acknowledge & Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
