import React, { useState } from 'react';
import { Download, CheckCircle2, Share, PlusSquare, X, Smartphone, AlertTriangle, Terminal, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { cn } from '../../lib/utils';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'full' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className,
  variant = 'compact'
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  const [modalTab, setModalTab] = useState<'android' | 'apk' | 'ios'>(isIOS ? 'ios' : 'android');

  const handleClick = async () => {
    if (isInstalled) return;

    if (isInstallable) {
      setIsInstalling(true);
      try {
        await install();
      } finally {
        setIsInstalling(false);
      }
    } else {
      setModalTab(isIOS ? 'ios' : 'android');
      setShowIOSModal(true);
    }
  };

  // If already installed as native standalone app, show small badge if variant is full
  if (isInstalled) {
    if (variant === 'compact') return null;
    return (
      <div className={cn("flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200/80 px-3 py-2 rounded-xl", className)}>
        <CheckCircle2 size={15} />
        <span>Mobile App Installed</span>
      </div>
    );
  }

  return (
    <>
      {variant === 'banner' && (
        <div className={cn("bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/20 text-white p-4 rounded-2xl shadow-md flex items-center justify-between gap-3", className)}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Download size={20} className="animate-bounce" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-indigo-200">Mobile Experience</p>
              <p className="text-sm font-bold text-white">Install PostureCare App</p>
              <p className="text-[11px] text-slate-300 font-medium">Install to your home screen for full offline posture monitoring</p>
            </div>
          </div>
          <button
            onClick={handleClick}
            disabled={isInstalling}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
          >
            {isInstalling ? 'Installing...' : 'Install'}
          </button>
        </div>
      )}

      {variant === 'full' && (
        <button
          onClick={handleClick}
          disabled={isInstalling}
          className={cn(
            "w-full flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-indigo-200 hover:bg-indigo-50/20 active:scale-[0.99] transition-all cursor-pointer text-left",
            className
          )}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Download size={18} />
            </div>
            <div>
              <span className="text-sm font-black text-slate-900 block">Install Mobile App</span>
              <span className="text-xs text-slate-500 font-medium block">
                {isIOS ? 'Add to iOS Home Screen' : 'Install for offline & native mobile experience'}
              </span>
            </div>
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
            {isInstalling ? 'Installing...' : 'Get App'}
          </span>
        </button>
      )}

      {variant === 'compact' && (
        <button
          onClick={handleClick}
          disabled={isInstalling}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-slate-900 text-white hover:bg-slate-800 active:scale-95 shadow-xs transition-all cursor-pointer select-none",
            className
          )}
          title="Install PostureCare to your home screen"
        >
          <Download size={12} className="stroke-[2.5]" />
          <span>Install App</span>
        </button>
      )}

      {/* Installation Guide Modal (Multi-Platform: Android Instant, Custom APK, iOS) */}
      <AnimatePresence>
        {showIOSModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-slate-100 text-left space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 leading-tight">Install on Mobile Phone</h3>
                    <p className="text-[11px] text-slate-500 font-bold mt-0.5">Android APK & Native App Setup</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIOSModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Platform Selector Tabs */}
              <div className="flex rounded-xl bg-slate-100 p-1 text-[11px] font-black uppercase tracking-wider">
                <button
                  onClick={() => setModalTab('android')}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg transition-all text-center",
                    modalTab === 'android' ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Android (WebAPK)
                </button>
                <button
                  onClick={() => setModalTab('apk')}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg transition-all text-center",
                    modalTab === 'apk' ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  CLI APK Guide
                </button>
                <button
                  onClick={() => setModalTab('ios')}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg transition-all text-center",
                    modalTab === 'ios' ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  iPhone (iOS)
                </button>
              </div>

              {/* TAB 1: ANDROID NATIVE WEBAPK (RECOMMENDED - 100% WORKING) */}
              {modalTab === 'android' && (
                <div className="space-y-3 text-xs text-slate-600">
                  <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3 flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black text-emerald-900 block text-[11px] uppercase tracking-wider">
                        Recommended 100% Functional Native Method
                      </span>
                      <p className="text-[11px] text-emerald-800 font-semibold mt-0.5 leading-snug">
                        Installs a genuine native Android APK via Google Play Services / Chrome WebAPK. Connects directly to the live backend, Gemini AI, and Firestore database!
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl">
                    <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shrink-0 font-black text-[11px]">
                      1
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">Open in Chrome on Android</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Open this web application URL in Google Chrome on your phone.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl">
                    <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shrink-0 font-black text-[11px]">
                      2
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">
                        Tap the 3 dots (⋮) menu in Chrome
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        In Chrome top-right, tap the menu and choose <strong className="text-slate-800">"Install app"</strong> (or <strong className="text-slate-800">"Add to Home screen"</strong>).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl">
                    <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shrink-0 font-black text-[11px]">
                      3
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">Tap "Install"</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Android generates the APK icon on your Home screen and App Drawer with full offline capability!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: WHY CLI APK FAILED & HOW TO FIX IT */}
              {modalTab === 'apk' && (
                <div className="space-y-3 text-xs text-slate-600">
                  <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 flex items-start gap-2.5">
                    <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-black text-amber-900 block text-[11px] uppercase tracking-wider">
                        Why the CLI APK didn't work
                      </span>
                      <p className="text-[11px] text-amber-800 font-semibold mt-0.5 leading-snug">
                        When you build a standard APK with Capacitor or Cordova CLI, it only copies static HTML files into the phone. The phone does not run the Node.js Express server, so `/api/*` calls fail unless configured to point to the live server URL!
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl space-y-1.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 block flex items-center gap-1.5">
                      <Terminal size={13} className="text-indigo-600" />
                      Fix in capacitor.config.ts
                    </span>
                    <p className="text-[11px] text-slate-600">
                      Set the <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px] font-mono">server.url</code> to your live web app URL:
                    </p>
                    <pre className="bg-slate-900 text-slate-200 p-2 rounded-xl text-[10px] font-mono overflow-x-auto leading-relaxed">
{`server: {
  url: window.location.origin,
  cleartext: true
}`}
                    </pre>
                  </div>

                  <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-1">
                    <span className="text-[11px] font-black uppercase tracking-wider text-indigo-900 block flex items-center gap-1.5">
                      <Globe size={13} className="text-indigo-600" />
                      Or use PWABuilder
                    </span>
                    <p className="text-[11px] text-indigo-800 font-semibold leading-relaxed">
                      Go to <strong className="text-slate-900">pwabuilder.com</strong>, paste this web app URL, and click "Package Android APK". It will generate a signed, ready-to-sideload APK that connects to this app's backend and database!
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 3: IPHONE / IOS */}
              {modalTab === 'ios' && (
                <div className="space-y-3 text-xs text-slate-600">
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl">
                    <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shrink-0 font-black text-[11px]">
                      1
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">
                        Tap the <Share size={13} className="inline mx-1 text-indigo-600" /> Share button
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Located in Safari's bottom toolbar.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl">
                    <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shrink-0 font-black text-[11px]">
                      2
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">
                        Select <PlusSquare size={13} className="inline mx-1 text-indigo-600" /> "Add to Home Screen"
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Scroll down the Safari share sheet options.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl">
                    <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shrink-0 font-black text-[11px]">
                      3
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">Tap "Add" in the top-right</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        PostureCare will open as a full-screen app without Safari browser bars.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowIOSModal(false)}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer active:scale-98"
              >
                Got It
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
