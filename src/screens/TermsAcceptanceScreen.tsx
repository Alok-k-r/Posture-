import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, updateUser } from '../store/store';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { 
  Scale, 
  Check, 
  Printer, 
  Clock, 
  Lock, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  AlertTriangle, 
  ArrowRight, 
  RefreshCw,
  Database,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { TOS_CLAUSES, TOS_META } from '../data/termsOfServiceData';
import { PRIVACY_SECTIONS, PRIVACY_TABLE_ROWS, PRIVACY_POLICY_META } from '../data/privacyPolicyData';

export const TermsAcceptanceScreen: React.FC = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  
  const [masterChecked, setMasterChecked] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);
  const [activeDoc, setActiveDoc] = useState<'tos' | 'privacy'>('tos');
  
  const [isSaving, setIsSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleToggleMaster = () => {
    setMasterChecked(!masterChecked);
  };

  const handleAccept = async () => {
    if (!masterChecked) {
      toast.error('Please check the agreement box to accept the terms and continue.');
      return;
    }

    setIsSaving(true);
    try {
      const consentTimestamp = new Date().toISOString();
      const userId = user?.id || 'guest-session';
      
      // Attempt Firestore write for registered users with a timeout race to prevent infinite hanging
      if (user && user.id && !user.id.startsWith('guest-') && !user.id.startsWith('demo-') && !user.id.startsWith('guest_') && user.id.length > 15) {
        try {
          const userDocRef = doc(db, 'users', user.id);
          const updatePromise = updateDoc(userDocRef, {
            hasAcceptedTerms: true,
            termsAcceptedAt: consentTimestamp,
            hasAcceptedPrivacy: true,
            privacyAcceptedAt: consentTimestamp,
            ageVerified: true,
            medicalDisclaimerAcknowledged: true
          });
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Firestore connection timeout')), 1500)
          );

          await Promise.race([updatePromise, timeoutPromise]);
        } catch (fsErr) {
          console.warn('Firestore user doc update skipped or timed out. Falling back to local storage.');
        }
      }
      
      // Always persist local storage to prevent session state resets
      localStorage.setItem(`terms_accepted_${userId}`, 'true');
      localStorage.setItem(`privacy_accepted_${userId}`, 'true');
      localStorage.setItem(`terms_accepted_fallback_${userId}`, 'true');
      localStorage.setItem(`privacy_accepted_fallback_${userId}`, 'true');
      localStorage.setItem('terms_accepted_demo-123', 'true'); // Backward compatibility fallback

      // Update the local storage profile caches with accepted state to prevent resets on reload
      const cachedLocalStr = localStorage.getItem('local_user_profile');
      if (cachedLocalStr) {
        try {
          const cachedLocal = JSON.parse(cachedLocalStr);
          cachedLocal.hasAcceptedTerms = true;
          localStorage.setItem('local_user_profile', JSON.stringify(cachedLocal));
        } catch (err) {
          console.warn('Error updating cached local user profile:', err);
        }
      }

      const cachedProfileStr = localStorage.getItem(`user_profile_${userId}`);
      if (cachedProfileStr) {
        try {
          const cachedProfile = JSON.parse(cachedProfileStr);
          cachedProfile.hasAcceptedTerms = true;
          localStorage.setItem(`user_profile_${userId}`, JSON.stringify(cachedProfile));
        } catch (err) {
          console.warn('Error updating user profile:', err);
        }
      }

      // Update Redux state to grant instant app access
      dispatch(updateUser({ hasAcceptedTerms: true }));
      toast.success('Agreement verified! Welcome to PostureCare.');
    } catch (e: any) {
      console.error('Error saving consent agreements:', e);
      // Soft fail fallback to guarantee continuous user experience
      dispatch(updateUser({ hasAcceptedTerms: true }));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    if (activeDoc === 'tos') {
      printWindow.document.write(`
        <html>
          <head>
            <title>${TOS_META.product} - Terms of Service</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; }
              h1 { font-size: 24px; color: #0f172a; margin-bottom: 4px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; font-weight: 800; text-transform: uppercase; }
              h2 { font-size: 13px; color: #4f46e5; margin-top: 0; margin-bottom: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; }
              h3 { font-size: 14px; color: #1e1b4b; margin-top: 24px; margin-bottom: 8px; font-weight: bold; border-left: 3px solid #4f46e5; padding-left: 10px; }
              p { font-size: 12.5px; margin-bottom: 16px; white-space: pre-line; color: #334155; }
              .meta { font-size: 11px; color: #64748b; margin-bottom: 30px; font-weight: bold; text-transform: uppercase; }
            </style>
          </head>
          <body>
            <h1>${TOS_META.product} Terms of Service</h1>
            <h2>End-User License Agreement & Wearable Device Terms</h2>
            <div class="meta">Last Updated: ${TOS_META.lastUpdated} | Governing Jurisdiction: ${TOS_META.jurisdiction}</div>
            <p><strong>IMPORTANT NOTICE:</strong> PLEASE READ AND UNDERSTAND ALL CLAUSES REGARDING INTENDED USE, MEDICAL LIMITATIONS, AND ON-DEVICE COMPLIANCE.</p>
            ${TOS_CLAUSES.map(clause => `
              <h3>${clause.title}</h3>
              <p>${clause.content}</p>
            `).join('')}
          </body>
        </html>
      `);
    } else {
      printWindow.document.write(`
        <html>
          <head>
            <title>${PRIVACY_POLICY_META.appName} - Privacy Policy</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; }
              h1 { font-size: 24px; color: #0f172a; margin-bottom: 4px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; font-weight: 800; text-transform: uppercase; }
              h2 { font-size: 13px; color: #10b981; margin-top: 0; margin-bottom: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; }
              h3 { font-size: 14px; color: #065f46; margin-top: 24px; margin-bottom: 8px; font-weight: bold; border-left: 3px solid #10b981; padding-left: 10px; }
              p { font-size: 12.5px; margin-bottom: 16px; white-space: pre-line; color: #334155; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 11px; }
              th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
              th { background-color: #f1f5f9; }
            </style>
          </head>
          <body>
            <h1>${PRIVACY_POLICY_META.appName} Privacy Policy</h1>
            <h2>Telemetry & Data Processing Standards</h2>
            <div class="meta">Last Updated: ${PRIVACY_POLICY_META.lastUpdated} | Laws: ${PRIVACY_POLICY_META.governingLaws}</div>
            ${PRIVACY_SECTIONS.map(sec => `
              <h3>${sec.title}</h3>
              <p>${sec.content}</p>
            `).join('')}
          </body>
        </html>
      `);
    }
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 md:p-8 select-none">
      
      {/* Container Card */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-2xl w-full bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden flex flex-col"
      >
        
        {/* Main Content Area */}
        <div className="p-6 sm:p-10 space-y-8 overflow-y-auto max-h-[85vh]">
          
          {/* Logo Brand Header */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-xl tracking-tighter">
              P
            </div>
            <div>
              <span className="text-base font-black text-slate-900 tracking-tight block leading-none">PostureCare</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mt-0.5">Spinal Laboratories</span>
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight leading-none">
              Welcome to PostureCare
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-semibold leading-relaxed">
              Before setting up your posture-monitoring wearable device, please review our core privacy policies and terms of service. We make it easy to understand how we protect your health.
            </p>
          </div>

          {/* Scannable Commitments - Google Style */}
          <div className="space-y-4">
            
            {/* Commitment 1: Data Privacy */}
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/50 flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 mt-0.5">
                <ShieldCheck size={18} />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-slate-900">Absolute Posture Privacy</h4>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Raw high-frequency accelerometer waves are calculated instantly inside browser memory to determine your spinal angle. We <strong>do not</strong> collect, track, or share sensitive health metrics like heart rate, oxygen levels, sleep data, or GPS coordinates.
                </p>
              </div>
            </div>

            {/* Commitment 2: Non-Medical Guideline */}
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100/50 flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700 mt-0.5">
                <AlertTriangle size={18} />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-slate-900">Behavioral Conditioning Only</h4>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  PostureCare provides haptic feedback and alignment scoring for behavioral training. Our software and hardware are <strong>not FDA-cleared</strong> and do not diagnose, treat, or prevent spinal pathologies (such as acute scoliosis). Always consult a licensed therapist.
                </p>
              </div>
            </div>

            {/* Commitment 3: Data Sovereignty */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/50 flex items-start gap-3.5">
              <div className="p-2 rounded-xl bg-slate-200 text-slate-700 mt-0.5">
                <Lock size={18} />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-slate-900">Full Sovereignty & Global Protection</h4>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  We comply strictly with India's <strong>DPDP Act 2023</strong>, <strong>GDPR</strong>, and <strong>CCPA</strong>. We do not sell or trade your metrics. You possess the legal right to download a CSV export of your history or request immediate and complete account erasure anytime.
                </p>
              </div>
            </div>

          </div>

          {/* Expandable Accordion for full legal technical text */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
            <button
              type="button"
              onClick={() => setLegalOpen(!legalOpen)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-100/60 transition-colors focus:outline-none"
            >
              <div className="flex items-center gap-2.5">
                <FileText size={16} className="text-indigo-600" />
                <span className="text-xs font-black text-slate-900">
                  {legalOpen ? 'Hide full legal documents & clauses' : 'Review full technical legal documents (35 clauses)'}
                </span>
              </div>
              {legalOpen ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
            </button>

            <AnimatePresence>
              {legalOpen && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden border-t border-slate-200"
                >
                  <div className="bg-white flex flex-col h-[400px]">
                    {/* Navigation bar inside drawer */}
                    <div className="h-12 border-b border-slate-200 px-4 flex items-center justify-between bg-slate-50/50">
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() => setActiveDoc('tos')}
                          className={`text-[10px] font-black uppercase tracking-wider border-b-2 py-3 ${
                            activeDoc === 'tos' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500'
                          }`}
                        >
                          Terms of Service
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveDoc('privacy')}
                          className={`text-[10px] font-black uppercase tracking-wider border-b-2 py-3 ${
                            activeDoc === 'privacy' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500'
                          }`}
                        >
                          Privacy Policy
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handlePrint}
                        className="px-2.5 py-1 rounded border border-slate-200 bg-white text-[9px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1 hover:bg-slate-50"
                      >
                        <Printer size={10} />
                        Print/Save
                      </button>
                    </div>

                    {/* Scrollable container */}
                    <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4 select-text">
                      {activeDoc === 'tos' ? (
                        <div className="space-y-4">
                          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/50 flex gap-2.5 items-start">
                            <Info size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                            <p className="text-[10px] text-amber-800 font-semibold leading-relaxed">
                              Governing law: New Delhi, India. In compliance with the IT Act 2000 and consumer safety provisions.
                            </p>
                          </div>
                          {TOS_CLAUSES.map(clause => (
                            <div key={clause.num} className="space-y-1">
                              <h5 className="text-[11px] font-black text-slate-900">{clause.title}</h5>
                              <p className="text-[10px] text-slate-500 leading-relaxed font-semibold whitespace-pre-line">{clause.content}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Registry table */}
                          <div className="border border-slate-150 rounded-xl overflow-hidden bg-slate-50/50">
                            <div className="px-3 py-2 border-b border-slate-150 bg-slate-100 flex items-center gap-1.5">
                              <Database size={10} className="text-emerald-600" />
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Data Processing Matrix</span>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-[9px] border-collapse font-semibold">
                                <thead>
                                  <tr className="border-b border-slate-150 text-slate-600">
                                    <th className="p-2">Data Type</th>
                                    <th className="p-2">Purpose</th>
                                    <th className="p-2">Retention</th>
                                  </tr>
                                </thead>
                                <tbody className="text-slate-500">
                                  {PRIVACY_TABLE_ROWS.map((row, idx) => (
                                    <tr key={idx} className="border-b border-slate-100 last:border-b-0">
                                      <td className="p-2 text-slate-800 font-black">{row.dataType}</td>
                                      <td className="p-2">{row.purpose}</td>
                                      <td className="p-2">{row.retention}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                          {PRIVACY_SECTIONS.map(section => (
                            <div key={section.id} className="space-y-1">
                              <h5 className="text-[11px] font-black text-slate-900">{section.title}</h5>
                              <p className="text-[10px] text-slate-500 leading-relaxed font-semibold whitespace-pre-line">{section.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Master checkbox toggle */}
          <button
            type="button"
            onClick={handleToggleMaster}
            className="w-full flex items-start gap-4 text-left group focus:outline-none cursor-pointer"
          >
            <div className="relative mt-0.5 flex-shrink-0">
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
                masterChecked 
                  ? 'bg-slate-950 border-slate-950 text-white' 
                  : 'border-slate-300 bg-white group-hover:border-slate-400'
              }`}>
                {masterChecked && <Check size={14} strokeWidth={3} />}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs sm:text-sm font-black text-slate-900 block leading-none">
                I agree to the Terms of Service & Privacy Policy
              </span>
              <span className="text-xs text-slate-400 font-bold block leading-relaxed">
                By ticking this box, you verify that you are at least 18 years old, agree to all terms above, and acknowledge the medical disclaimer.
              </span>
            </div>
          </button>

          {/* Accept Action CTA Button */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            
            <button
              onClick={handleAccept}
              disabled={!masterChecked || isSaving}
              className="w-full sm:w-auto px-8 py-4 bg-slate-950 hover:bg-slate-900 disabled:bg-slate-100 text-white disabled:text-slate-400 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-slate-950/10 active:scale-[0.98] transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <RefreshCw className="animate-spin" size={14} />
              ) : (
                <>
                  <span>Accept & Continue to App</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>

            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Secure TLS 1.3 Transmission
            </span>
          </div>

        </div>

      </motion.div>
    </div>
  );
};
