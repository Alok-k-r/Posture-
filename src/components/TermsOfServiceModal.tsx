import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ShieldAlert, 
  Radio, 
  FileText, 
  Database, 
  Lock, 
  CheckCircle2, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Printer,
  Scale,
  Package
} from 'lucide-react';
import { cn } from '../lib/utils';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'legal' | 'hardware' | 'components'>('all');
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    tos1: true,
    tos2: true,
    tos3: true,
    tos4: true,
    tos5: true,
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
      id: 'tos1',
      category: 'legal',
      title: '1. Spine Biomechanical Medical Disclaimer',
      icon: ShieldAlert,
      iconColor: 'text-rose-500 bg-rose-50',
      content: `PostureCare, including its interactive modules, on-device machine learning, alarm mechanisms, and paired hardware, is provided strictly as a self-coaching and educational reference tool. 
      
      PostureCare is NOT a certified medical device and has not been cleared or approved by the Food and Drug Administration (FDA) or any other healthcare regulatory authority. The system is not intended to diagnose, treat, cure, or prevent any acute or chronic spinal pathologies, spinal deformities (such as severe structural scoliosis, hyperkyphosis, or stenosis), herniated discs, or musculoskeletal disorders. 
      
      Always seek the advice of your physician, physical therapist, or qualified orthopedic professional with any questions regarding structural back pain, physical strain, or spine rehabilitation before embarking on postural conditioning.`
    },
    {
      id: 'tos2',
      category: 'legal',
      title: '2. User Agreement & Acceptable Usage',
      icon: Scale,
      iconColor: 'text-slate-700 bg-slate-100',
      content: `By accessing and using this application, you agree to:
      
      • Voluntary Participation: Engage in spinal posture training at your own risk. Muscle soreness in the upper back, rhomboids, and core is common during the initial adaptation period. If you feel acute or sharp pain, you must immediately terminate your monitoring session.
      • No Automated Abuse: Refrain from scraping, reverse engineering, or using automated scripts to interact with the clinician scheduling or database API endpoints.
      • Truthful Information: Enter accurate biological metrics (age, height, weight) to allow correct local biomechanical model parameters and threshold calibrations.`
    },
    {
      id: 'tos3',
      category: 'hardware',
      title: '3. IoT Sensor Pod Integration & Physical Alerts',
      icon: Radio,
      iconColor: 'text-amber-500 bg-amber-50',
      content: `PostureCare integrates with local physical IoT sensor pods equipped with the LSM6DS3 Inertial Measurement Unit (IMU) and ESP32 controllers:
      
      • Local Calibrations: Extreme body movements, stretching, or changing chairs will temporarily bias IMU sensor calculations. The user is responsible for performing a single-tap calibration whenever changing seating postures or active workspaces.
      • Alert Safeguards: Audio haptic warnings, voice posture commands, and device vibrations are designed to assist training. You remain fully responsible for managing active alert levels, warning thresholds, and volume states to prevent acoustic or vibrational discomfort.`
    },
    {
      id: 'tos4',
      category: 'components',
      title: '4. Software Components Bill of Materials (SBOM)',
      icon: Package,
      iconColor: 'text-indigo-500 bg-indigo-50',
      content: `In compliance with open-source transparency requirements and third-party notices, PostureCare is built utilizing the following high-grade production libraries and frameworks:
      
      • React & Vite: Fast, responsive declarative component engine running on Vite dev and build architectures.
      • Redux Toolkit: Sandboxed, persistent central client state management to secure active sessions and streaks.
      • Recharts & D3: High-performance data visualization engines to render local statistical telemetry.
      • Google Gemini API SDK: Enterprise-bound server-side @google/genai module used to summarize anonymized charts for clinician outputs.
      • Motion: Specialized spring physical layout animation engine to render screens and modal transitions smoothly.
      • Lucide React: Premium modern SVG vector icon package.
      • Tailwind CSS: Utility-first CSS compiling framework.`
    },
    {
      id: 'tos5',
      category: 'legal',
      title: '5. Limitation of Liability',
      icon: AlertTriangle,
      iconColor: 'text-orange-500 bg-orange-50',
      content: `PostureCare Spinal Laboratories, its developers, and contributors shall not be liable for any direct, indirect, incidental, special, or consequential damages resulting from the use of, or inability to use:
      
      • The physical ESP32 LSM6DS3 sensor pods.
      • The on-device personalized ML model or dynamic alert sensitivities.
      • The synthesized reports provided by server-side Gemini Flash.
      • Any physical injury or muscle strain associated with postural adjustment or correction.`
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
          <title>PostureCare - Terms of Service</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; }
            h1 { font-size: 24px; color: #0f172a; margin-bottom: 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
            h2 { font-size: 18px; color: #1e1b4b; margin-top: 24px; margin-bottom: 12px; }
            p { font-size: 14px; margin-bottom: 16px; white-space: pre-line; color: #334155; }
            .meta { font-size: 12px; color: #64748b; margin-bottom: 30px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; }
            .badge { display: inline-block; background: #f1f5f9; color: #334155; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>PostureCare Terms of Service</h1>
          <div class="meta">Last Updated: July 2026 | Legal & Biomechanical Policy</div>
          <div class="badge">Legal Agreement & Third-Party SBOM Notice</div>
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
            <div className="p-6 sm:p-8 bg-gradient-to-b from-indigo-50/50 to-transparent border-b border-slate-100 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
                    Terms of Service
                  </span>
                  <span className="bg-slate-100 text-slate-700 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1">
                    <FileText size={8} /> Legally Binding Agreement
                  </span>
                </div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-2 flex items-center gap-2">
                  <FileText className="text-indigo-600" size={24} />
                  Terms of Service
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-1">
                  Last Updated: <span className="font-mono text-[11px] text-indigo-600">July 2026</span> • Please read carefully before training
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
                Full Agreement
              </button>
              <button
                onClick={() => setActiveTab('legal')}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1",
                  activeTab === 'legal' 
                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/10" 
                    : "bg-white text-rose-600 hover:bg-rose-50 border border-rose-200"
                )}
              >
                <ShieldAlert size={10} />
                Medical & Legal disclaimers
              </button>
              <button
                onClick={() => setActiveTab('hardware')}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1",
                  activeTab === 'hardware' 
                    ? "bg-amber-600 text-white shadow-md shadow-amber-600/10" 
                    : "bg-white text-amber-600 hover:bg-amber-50 border border-amber-200"
                )}
              >
                <Radio size={10} />
                Hardware Rules
              </button>
              <button
                onClick={() => setActiveTab('components')}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1",
                  activeTab === 'components' 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" 
                    : "bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-200"
                )}
              >
                <Package size={10} />
                Software Components SBOM
              </button>
            </div>

            {/* Document Body */}
            <div 
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 scrollbar-thin bg-slate-50/20"
            >
              {/* Highlight summary banner */}
              <div className="p-5 rounded-3xl bg-indigo-50/50 border border-indigo-100 flex items-start gap-4">
                <div className="p-2.5 rounded-2xl bg-indigo-100/55 text-indigo-700 flex-shrink-0">
                  <Scale size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider leading-none">Binding Legal Agreement</h4>
                  <p className="text-[11px] text-indigo-750 font-bold mt-2 leading-relaxed">
                    By confirming or accessing the PostureCare coaching software, you explicitly accept the legal disclaimers, liability caps, and software open-source bill of materials contained in this agreement. If you do not agree to these terms, you must not proceed.
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

              {/* Legal Confirmation Notice */}
              <div className="p-5 rounded-3xl bg-slate-100/75 border border-slate-200/60 flex items-start gap-4">
                <CheckCircle2 className="text-slate-500 mt-0.5 flex-shrink-0" size={16} />
                <div className="text-[11px] text-slate-500 font-bold leading-relaxed">
                  Consent and Authorization: Continuous use of this application constitutes absolute acceptance of these terms. All system nodes (IndexedDB, local storage, cloud synchronization endpoints, and external hardware bridges) operate with full adherence to these parameters.
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  title="Print terms document"
                >
                  <Printer size={11} />
                  Print ToS
                </button>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md transition-colors hidden md:inline-block",
                  hasScrolledToBottom ? "bg-emerald-100 text-emerald-800" : "bg-indigo-100 text-indigo-700"
                )}>
                  {hasScrolledToBottom ? "Accept & Cleared" : "Scroll to verify"}
                </span>

                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-slate-900/10 active:scale-95 transition-all"
                >
                  Accept & Close Terms
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
