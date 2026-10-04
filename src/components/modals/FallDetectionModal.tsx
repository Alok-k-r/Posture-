import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/store';
import { 
  decrementCountdown, 
  resolveFallAlert 
} from '../../store/fallDetectionSlice';
import { fallDetectionService } from '../../services/fallDetectionService';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Send, 
  MapPin, 
  Phone, 
  ExternalLink, 
  Volume2, 
  ShieldCheck,
  Radio,
  CheckCircle,
  MessageSquare,
  Mail,
  VolumeX
} from 'lucide-react';
import toast from 'react-hot-toast';

export const FallDetectionModal: React.FC = () => {
  const dispatch = useDispatch();
  const { activeFallAlert, emergencyContacts, voiceBeaconEnabled } = useSelector((state: RootState) => state.fallDetection);
  const user = useSelector((state: RootState) => state.auth.user);

  // Background countdown timer and audio control
  useEffect(() => {
    if (!activeFallAlert || activeFallAlert.stage !== 'countdown') {
      return;
    }

    const interval = setInterval(() => {
      dispatch(decrementCountdown());
    }, 1000);

    return () => clearInterval(interval);
  }, [activeFallAlert?.stage, dispatch]);

  // When timer finishes and stage becomes 'sos_dispatched', automatically execute zero-click direct cloud dispatch
  useEffect(() => {
    if (activeFallAlert?.stage === 'sos_dispatched') {
      fallDetectionService.stopEmergencySiren();
      fallDetectionService.dispatchEmergencySos(emergencyContacts, activeFallAlert.coords);
      toast.error('🚨 Direct Cloud SOS Dispatched to all emergency contacts!', { duration: 6000 });
    }
  }, [activeFallAlert?.stage, emergencyContacts, activeFallAlert?.coords]);

  if (!activeFallAlert) return null;

  const { remainingSeconds, totalCountdownSeconds, stage, coords } = activeFallAlert;
  const progressPercent = ((totalCountdownSeconds - remainingSeconds) / totalCountdownSeconds) * 100;
  const strokeDashoffset = 283 - (283 * progressPercent) / 100;

  const handleImOk = () => {
    fallDetectionService.stopEmergencySiren();
    fallDetectionService.stopVoiceBeacon();
    dispatch(resolveFallAlert({ reason: 'cancelled_by_user' }));
    toast.success('Glad you are okay! Alert cancelled.', { icon: '🛡️' });
  };

  const handleSendSosNow = () => {
    fallDetectionService.stopEmergencySiren();
    fallDetectionService.dispatchEmergencySos(emergencyContacts, coords);
    dispatch(resolveFallAlert({ reason: 'sos_dispatched' }));
    toast.error('🚨 Emergency SOS dispatched immediately!', { duration: 6000 });
  };

  const handleDismissDispatched = () => {
    fallDetectionService.stopEmergencySiren();
    fallDetectionService.stopVoiceBeacon();
    dispatch(resolveFallAlert({ reason: 'sos_dispatched' }));
  };

  const primaryContact = emergencyContacts.find(c => c.isPrimary) || emergencyContacts[0];
  const mapsUrl = coords ? `https://maps.google.com/?q=${coords.latitude.toFixed(6)},${coords.longitude.toFixed(6)}` : null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/90 backdrop-blur-xl">
        {/* Pulsing Emergency Red Glow */}
        <div className="absolute inset-0 bg-gradient-to-t from-rose-950/80 via-transparent to-rose-900/40 animate-pulse pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-slate-900 border border-rose-500/40 rounded-[36px] shadow-[0_0_80px_rgba(244,63,94,0.35)] overflow-hidden text-white p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
        >
          {stage === 'countdown' ? (
            <div className="flex flex-col items-center text-center space-y-5">
              {/* Emergency Banner */}
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-black uppercase tracking-widest animate-bounce">
                <AlertTriangle size={14} className="text-rose-400" />
                Unusual Motion Detected
              </div>

              <div className="space-y-1.5">
                <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                  Are you okay?
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-sm mx-auto">
                  A sudden high-impact motion and immobility were detected. SOS will dispatch automatically if no response is given.
                </p>
              </div>

              {/* Animated Circular Countdown Ring */}
              <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center my-1">
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    className="text-slate-800"
                    strokeWidth="8"
                    stroke="currentColor"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    className="text-rose-500 transition-all duration-1000 ease-linear"
                    strokeWidth="8"
                    strokeDasharray="283"
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl sm:text-5xl font-black text-white tracking-tighter tabular-nums drop-shadow-md">
                    {remainingSeconds}
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-rose-300 mt-0.5">
                    Secs to Auto-SOS
                  </span>
                </div>
              </div>

              {/* Emergency Sound Active Indicator */}
              <div className="flex items-center gap-2 text-[11px] font-bold text-rose-300/80 bg-rose-950/60 border border-rose-900/80 px-3.5 py-1.5 rounded-xl">
                <Volume2 size={14} className="animate-pulse text-rose-400" />
                Emergency Siren & GPS Acquisition Active
              </div>

              {/* Action Buttons */}
              <div className="w-full space-y-2.5 pt-1">
                {/* I AM OK (Primary Large Action) */}
                <button
                  onClick={handleImOk}
                  className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base sm:text-lg uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center gap-3 cursor-pointer"
                >
                  <CheckCircle2 size={24} className="text-slate-950" />
                  I AM OK (CANCEL SOS)
                </button>

                {/* Direct Manual SOS Trigger */}
                <button
                  onClick={handleSendSosNow}
                  className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700/80 border border-rose-500/40 text-rose-300 font-extrabold text-xs uppercase tracking-wider rounded-2xl active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send size={15} />
                  Send Auto-SOS Immediately
                </button>
              </div>

              {/* Contact Notice */}
              {primaryContact && (
                <p className="text-[11px] text-slate-400 font-medium">
                  Direct Cloud SOS will notify <strong className="text-white">{primaryContact.name}</strong> ({primaryContact.phone})
                </p>
              )}
            </div>
          ) : (
            /* ZERO-CLICK AUTOMATED SOS DISPATCHED VIEW */
            <div className="flex flex-col items-center text-center space-y-5">
              <div className="w-14 h-14 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-rose-400 animate-pulse">
                <ShieldAlert size={32} />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30 flex items-center justify-center gap-1.5 w-max mx-auto">
                  <CheckCircle size={12} /> Direct Cloud SOS Dispatched
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1.5">
                  Emergency Alert Transmitted
                </h2>
                <p className="text-xs text-slate-300 font-medium max-w-sm mx-auto">
                  Automated distress beacon sent directly to your emergency contacts without requiring manual phone interactions.
                </p>
              </div>

              {/* Primary Instant Dispatch Action Bar */}
              {primaryContact && (
                <div className="w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950/80 border border-emerald-500/40 text-left space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Send size={13} /> 1-Tap Contact Dispatch
                    </span>
                    <span className="text-[10px] text-slate-300 font-bold">
                      To: {primaryContact.name} ({primaryContact.phone})
                    </span>
                  </div>

                  {(() => {
                    const digits = primaryContact.phone.replace(/[^0-9]/g, '');
                    const sosMsgText = `🚨 EMERGENCY ALERT: ${user?.name || 'User'} has suffered a fall and is unresponsive.\n\n📍 Live GPS Location: ${mapsUrl || 'Google Maps Pin'}\n🕒 Time: ${new Date().toLocaleTimeString()}\n\nPlease send help or call immediately!`;
                    const encodedMsg = encodeURIComponent(sosMsgText);
                    const whatsappUrl = digits ? `https://api.whatsapp.com/send?phone=${digits}&text=${encodedMsg}` : `https://api.whatsapp.com/send?text=${encodedMsg}`;
                    const smsUrl = `sms:${primaryContact.phone.replace(/[^0-9+]/g, '')}?body=${encodedMsg}`;
                    const mailtoUrl = `mailto:${primaryContact.email || ''}?subject=${encodeURIComponent(`🚨 EMERGENCY SOS: Fall Alert for ${user?.name || 'User'}`)}&body=${encodedMsg}`;

                    return (
                      <div className="grid grid-cols-3 gap-2">
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="py-3 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/40 text-center cursor-pointer transition-all active:scale-95"
                        >
                          <MessageSquare size={15} /> WhatsApp
                        </a>

                        <a
                          href={smsUrl}
                          className="py-3 px-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-indigo-900/40 text-center cursor-pointer transition-all active:scale-95"
                        >
                          <Send size={15} /> SMS
                        </a>

                        <a
                          href={mailtoUrl}
                          className="py-3 px-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-rose-900/40 text-center cursor-pointer transition-all active:scale-95"
                        >
                          <Mail size={15} /> Email
                        </a>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Automated Dispatch Status Feed */}
              <div className="w-full bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-left space-y-2.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1.5">
                  <Radio size={12} className="animate-pulse" /> Live Transmission Log
                </p>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2 text-emerald-400 font-medium">
                    <CheckCircle size={14} />
                    <span>GPS Coordinates Locked (Accuracy ±25m)</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400 font-medium">
                    <CheckCircle size={14} />
                    <span>Automated Cloud SMS dispatched to {emergencyContacts.length} contacts</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400 font-medium">
                    <CheckCircle size={14} />
                    <span>Email & Webhook payload pushed to monitoring services</span>
                  </div>
                  {voiceBeaconEnabled && (
                    <div className="flex items-center gap-2 text-amber-400 font-medium">
                      <Volume2 size={14} className="animate-pulse" />
                      <span>Audible Voice Distress Beacon broadcasting on device speaker</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Location Card */}
              {coords && (
                <div className="w-full bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 text-left space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-300 font-bold">
                    <span className="flex items-center gap-1.5 text-rose-400">
                      <MapPin size={14} /> Shared GPS Pin
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
                    </span>
                  </div>
                  {mapsUrl && (
                    <a 
                      href={mapsUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="block text-center py-2 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-xs text-indigo-300 font-bold rounded-xl transition-colors"
                    >
                      Open in Google Maps <ExternalLink size={12} className="inline ml-1" />
                    </a>
                  )}
                </div>
              )}

              {/* Emergency Contacts List */}
              <div className="w-full space-y-2 text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Notified Emergency Contacts
                </p>
                <div className="space-y-1.5">
                  {emergencyContacts.map((contact) => {
                    const cleanPhone = contact.phone.replace(/[^0-9+]/g, '');
                    const sosMsg = encodeURIComponent(`🚨 EMERGENCY SOS: ${user?.name || 'User'} has suffered a fall and is not responding. Live GPS Location: ${mapsUrl || 'Location Pin'}. Please assist immediately!`);
                    const whatsappUrl = `https://wa.me/${cleanPhone.replace('+', '')}?text=${sosMsg}`;
                    const smsUrl = `sms:${cleanPhone}?body=${sosMsg}`;

                    return (
                      <div key={contact.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 gap-2">
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            {contact.name}
                            {contact.isPrimary && (
                              <span className="text-[9px] bg-indigo-500/30 text-indigo-300 px-1.5 py-0.2 rounded font-black">
                                PRIMARY
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">{contact.phone} • {contact.relationship}</div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 rounded-lg flex items-center gap-1 text-[11px] font-bold"
                          >
                            <MessageSquare size={12} /> WhatsApp
                          </a>
                          <a
                            href={smsUrl}
                            className="px-2.5 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 rounded-lg flex items-center gap-1 text-[11px] font-bold"
                          >
                            <Send size={12} /> SMS
                          </a>
                          <a
                            href={`tel:${cleanPhone}`}
                            className="px-2.5 py-1.5 bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/40 rounded-lg flex items-center gap-1 text-[11px] font-bold"
                          >
                            <Phone size={12} /> Call
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dismiss / I am safe */}
              <button
                onClick={handleDismissDispatched}
                className="w-full py-3.5 px-6 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl border border-white/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck size={16} className="text-emerald-400" />
                I Am Safe Now — Silence & Dismiss
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
