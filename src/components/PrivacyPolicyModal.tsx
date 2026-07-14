import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ShieldCheck, 
  Database, 
  Sparkles, 
  Lock, 
  CheckCircle2, 
  ServerCrash,
  ChevronDown,
  ChevronUp,
  Printer,
  Eye,
  Activity,
  Cpu
} from 'lucide-react';
import { cn } from '../lib/utils';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'data' | 'ai' | 'security'>('all');
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    priv1: true,
    priv2: true,
    priv3: true,
    priv4: true,
    priv5: true,
  });

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 40;
    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  const sections = [
    {
      id: 'priv1',
      category: 'data',
      title: '1. Strict On-Device Biomechanical Telemetry Policy',
      icon: Activity,
      iconColor: 'text-emerald-500 bg-emerald-50',
      content: `PostureCare is engineered with a strict local-first paradigm:
      
      • Local IMU Coordinate Sandbox: High-frequency posture coordinate telemetry, raw back angles, and IMU sensor data obtained from your physical ESP32 LSM6DS3 pod (or simulated virtual skeleton) are processed entirely in memory in your web browser.
      • No Raw Coordinates Transmitted: We never stream, transmit, or cache raw spatial coordinates on any remote servers. Your biological real-time orientation remains sandboxed in your browser runtime.`
    },
    {
      id: 'priv2',
      category: 'data',
      title: '2. Local IndexedDB, Redux, and Storage Sandbox',
      icon: Database,
      iconColor: 'text-blue-500 bg-blue-50',
      content: `All session historical patterns, day-to-day posture scores, muscle fatigue learning coefficients, and hardware settings are stored locally:
      
      • Local Database: We utilize IndexedDB via specialized services to store historic metrics.
      • Client state: Active profile metadata and session stats are stored securely in browser-bound state persistence (Redux).
      • User Control: You have full sovereign rights to purge your database entirely. Clearing browser cookies and site storage instantly purges all local logs.`
    },
    {
      id: 'priv3',
      category: 'ai',
      title: '3. Anonymized LLM Processing Policy (Google Gemini Flash)',
      icon: Sparkles,
      iconColor: 'text-purple-500 bg-purple-50',
      content: `Our "Clinician Reports" use the server-side Google Gemini Flash API to generate clinician summaries. To protect your biological security, we adhere to the following principles:
      
      • 100% Anonymized Telemetry: The prompt payload transmitted to the Gemini API is entirely free of Personally Identifiable Information (PII). No names, email addresses, or physical profiles are shared.
      • Mathematical Aggregates Only: The LLM processes only anonymous statistical aggregates (e.g., hourly slouch counts, weekly posture compliance percentages, session counts, and calibrated angles).
      • Non-Commercial Usage: Prompt payloads sent to Gemini are governed by secure enterprise endpoints and are not utilized to train public foundational AI models.`
    },
    {
      id: 'priv4',
      category: 'security',
      title: '4. HIPAA Alignment & Encryption Protocols',
      icon: Lock,
      iconColor: 'text-indigo-500 bg-indigo-50',
      content: `We deploy bank-grade cryptographic protections to secure your historic posture dashboards:
      
      • Encryption in Transit: All remote communication (cloud backups, clinician report requests, and appointments coordination) is encrypted using SSL/TLS 1.3.
      • HIPAA Alignment: While PostureCare is not a formal medical record keeper, we treat your spinal logs with HIPAA-aligned safeguards. Our cloud storage services run inside access-controlled environments featuring continuous threat prevention.`
    },
    {
      id: 'priv5',
      category: 'security',
      title: '5. Wireless IoT, BLE, and Connection Security',
      icon: Cpu,
      iconColor: 'text-amber-500 bg-amber-50',
      content: `When syncing with the hardware pod:
      
      • Web Bluetooth BLE: Connection details are negotiated peer-to-peer using standard browser sandboxed BLE channels. No Bluetooth keys or device telemetry are leaked online.
      • Local WebSocket: When connecting via Wi-Fi Websocket tunnels, any network credentials entered in the Device Setup screen remain on-device or are sent directly to the local ESP32 controller over peer-to-peer channels.`
    }
  ];

  const filteredSections = sections.filter(
    sec => activeTab === 'all' || sec.category === activeTab
  );

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>PostureCare - Privacy & Security Policy</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; }
            h1 { font-size: 24px; color: #0f172a; margin-bottom: 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
            h2 { font-size: 18px; color: #1e1b4b; margin-top: 24px; margin-bottom: 12px; }
            p { font-size: 14px; margin-bottom: 16px; white-space: pre-line; color: #334155; }
            .meta { font-size: 12px; color: #64748b; margin-bottom: 30px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; }
            .badge { display: inline-block; background: #ecfdf5; color: #065f46; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>PostureCare Privacy & Security Policy</h1>
          <div class="meta">Last Updated: July 2026 | HIPAA Aligned Architecture</div>
          <div class="badge">On-Device Local Sandbox Guaranteed</div>
          ${sections.map(sec => `
            <h2>${sec.title}</h2>
            <p>${sec.content}</p>
          `).join('')}
          <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 11px; color: #94a3b8; text-align: center;">
            &copy; 2026 PostureCare Spinal Laboratories. All Rights Reserved.
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative w-full max-w-3xl bg-white/95 rounded-[40px] shadow-2xl border border-white/80 overflow-hidden flex flex-col max-h-[85vh] z-10"
          >
            {/* Header */}
            <div className="p-6 sm:p-8 bg-gradient-to-b from-emerald-50/50 to-transparent border-b border-slate-100 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
                    Privacy Policy
                  </span>
                  <span className="bg-blue-100 text-blue-850 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Lock size={8} /> On-Device Data Protection
                  </span>
                </div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-2 flex items-center gap-2">
                  <ShieldCheck className="text-emerald-600" size={24} />
                  Privacy & Security Policy
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-1">
                  Last Updated: <span className="font-mono text-[11px] text-emerald-600">July 2026</span> • Local data protection sandbox guarantees
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Sub-Filters */}
            <div className="px-6 sm:px-8 py-3 bg-slate-50/50 border-b border-slate-100 flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Filters:</span>
              <button
                onClick={() => setActiveTab('all')}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all",
                  activeTab === 'all' 
                    ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" 
                    : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                )}
              >
                Full Privacy Document
              </button>
              <button
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
                onClick={() => setActiveTab('ai')}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1",
                  activeTab === 'ai' 
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/10" 
                    : "bg-white text-purple-600 hover:bg-purple-50 border border-purple-200"
                )}
              >
                <Sparkles size={10} />
                Anonymized Gemini LLM
              </button>
              <button
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
              className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 scrollbar-thin bg-slate-50/20"
            >
              {/* Highlight summary banner */}
              <div className="p-5 rounded-3xl bg-emerald-50/50 border border-emerald-100 flex items-start gap-4">
                <div className="p-2.5 rounded-2xl bg-emerald-100/55 text-emerald-700 flex-shrink-0">
                  <Eye className="animate-pulse" size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wider leading-none">Your Spinal Orientation is Private</h4>
                  <p className="text-[11px] text-emerald-850 font-bold mt-2 leading-relaxed">
                    By using PostureCare, your physical spinal angles, calibration constants, and accelerometer waveforms are processed purely locally. No real-time spatial motion streams are ever forwarded to remote cloud systems, giving you complete biological privacy.
                  </p>
                </div>
              </div>

              {/* Sections list */}
              <div className="space-y-4">
                {filteredSections.map((sec) => {
                  const IconComp = sec.icon;
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
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", sec.iconColor)}>
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
                            transition={{ duration: 0.2 }}
                          >
                            <div className="px-5 pb-5 pt-1 border-t border-slate-100">
                              <p className="text-xs text-slate-600 font-bold whitespace-pre-line leading-relaxed pl-14">
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
                <div className="text-[11px] text-slate-500 font-bold leading-relaxed">
                  Compliance Statement: PostureCare has implemented systematic technical and administrative controls to guarantee zero-transmission of medical coordinates. Our local databases are sandboxed strictly according to current security regulations.
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  title="Print privacy policy"
                >
                  <Printer size={11} />
                  Print Privacy Policy
                </button>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md transition-colors hidden md:inline-block",
                  hasScrolledToBottom ? "bg-emerald-100 text-emerald-800" : "bg-emerald-100 text-emerald-700"
                )}>
                  {hasScrolledToBottom ? "Verified & Read" : "Scroll to verify"}
                </span>

                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-slate-900/10 active:scale-95 transition-all"
                >
                  Acknowledge Privacy Policy
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
