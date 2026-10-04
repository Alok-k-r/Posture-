import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/store';
import { 
  setFallDetectionEnabled, 
  setCountdownDuration, 
  setSensitivity, 
  setAutomatedCloudDispatch,
  setVoiceBeaconEnabled,
  setCustomWebhookUrl,
  addEmergencyContact, 
  updateEmergencyContact, 
  removeEmergencyContact, 
  clearFallHistory,
  EmergencyContact 
} from '../store/fallDetectionSlice';
import { fallDetectionService } from '../services/fallDetectionService';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Clock, 
  Activity, 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  Play, 
  AlertTriangle, 
  CheckCircle2, 
  Phone, 
  Mail, 
  History, 
  Sliders, 
  Sparkles,
  ChevronLeft,
  Radio,
  Volume2,
  Globe,
  Send
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

export const FallDetectionScreen: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { 
    enabled, 
    countdownDuration, 
    sensitivity, 
    automatedCloudDispatch, 
    voiceBeaconEnabled, 
    customWebhookUrl,
    emergencyContacts, 
    fallHistory 
  } = useSelector((state: RootState) => state.fallDetection);

  // Modal / Form state for Add/Edit Contact
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState<Omit<EmergencyContact, 'id'>>({
    name: '',
    phone: '',
    relationship: 'Family Member',
    email: '',
    isPrimary: false
  });

  const [webhookInput, setWebhookInput] = useState(customWebhookUrl || '');
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);

  const handleRequestGps = async () => {
    setGpsStatus('requesting');
    const toastId = toast.loading('Acquiring high-accuracy satellite GPS fix...');
    try {
      const coords = await fallDetectionService.fetchCurrentLocation();
      if (coords) {
        setGpsCoords({
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy: coords.accuracy
        });
        setGpsStatus('granted');
        toast.success(`GPS Locked! Accuracy: ±${coords.accuracy.toFixed(0)}m`, { id: toastId });
      } else {
        setGpsStatus('denied');
        toast.error('Location access denied by browser permissions.', { id: toastId });
      }
    } catch {
      setGpsStatus('denied');
      toast.error('Could not acquire location.', { id: toastId });
    }
  };

  const handleToggleEnabled = () => {
    const nextState = !enabled;
    dispatch(setFallDetectionEnabled(nextState));
    toast.success(nextState ? 'Fall Detection & SOS Activated' : 'Fall Detection Paused', {
      icon: nextState ? '🛡️' : '⏸️'
    });
  };

  const handleOpenAddContact = () => {
    setEditingContactId(null);
    setContactForm({
      name: '',
      phone: '',
      relationship: 'Family Member',
      email: '',
      isPrimary: emergencyContacts.length === 0
    });
    setIsContactModalOpen(true);
  };

  const handleOpenEditContact = (contact: EmergencyContact) => {
    setEditingContactId(contact.id);
    setContactForm({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
      email: contact.email || '',
      isPrimary: !!contact.isPrimary
    });
    setIsContactModalOpen(true);
  };

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.phone.trim()) {
      toast.error('Please provide a contact name and phone number.');
      return;
    }

    if (editingContactId) {
      dispatch(updateEmergencyContact({
        id: editingContactId,
        ...contactForm
      }));
      toast.success('Emergency contact updated!');
    } else {
      dispatch(addEmergencyContact({
        id: 'contact-' + Date.now(),
        ...contactForm
      }));
      toast.success('Emergency contact added!');
    }
    setIsContactModalOpen(false);
  };

  const handleDeleteContact = (id: string, name: string) => {
    dispatch(removeEmergencyContact(id));
    toast.success(`Removed ${name} from emergency list.`);
  };

  const handleSaveWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWebhook(true);
    dispatch(setCustomWebhookUrl(webhookInput.trim()));
    setTimeout(() => {
      setIsSavingWebhook(false);
      toast.success('Automated SOS webhook saved!');
    }, 300);
  };

  const handleSimulateFall = () => {
    toast('Simulating 6-axis fall impact & zero-click SOS...', { icon: '⚡' });
    fallDetectionService.triggerConfirmedFall({
      ax: 0.1,
      ay: 0.25,
      az: 3.4,
      gx: 245,
      gy: 180,
      gz: 90,
      timestamp: Date.now()
    });
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 pb-28 relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/more')}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-xs font-bold uppercase tracking-wider transition-colors"
        >
          <ChevronLeft size={18} /> Back to Settings
        </button>
        <span className="text-[10px] font-black px-2.5 py-1 bg-rose-100 text-rose-700 rounded-full uppercase tracking-wider flex items-center gap-1">
          <ShieldAlert size={12} /> IMU Life Safety
        </span>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Fall Detection & Zero-Click SOS
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Automatically dispatches emergency alerts via Cloud Gateway if the user is unresponsive after a fall.
        </p>
      </div>

      {/* Main Activation Card */}
      <div className={cn(
        "glass p-6 rounded-[32px] shadow-soft border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4",
        enabled ? "border-rose-200/80 bg-gradient-to-r from-rose-50/70 to-white/90" : "border-slate-200 bg-slate-50/70"
      )}>
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center shadow-soft transition-all",
            enabled ? "bg-rose-500 text-white shadow-rose-200" : "bg-slate-200 text-slate-500"
          )}>
            {enabled ? <ShieldAlert size={28} /> : <ShieldCheck size={28} />}
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              Background Fall Monitoring
              <span className={cn(
                "text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider",
                enabled ? "bg-rose-500 text-white" : "bg-slate-300 text-slate-700"
              )}>
                {enabled ? 'Active' : 'Disabled'}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 max-w-md">
              Monitors 6-axis acceleration spikes, rotational tumble, and lying-flat immobility from your LSM6DS3 sensor.
            </p>
          </div>
        </div>

        <button
          onClick={handleToggleEnabled}
          className={cn(
            "px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-soft cursor-pointer flex-shrink-0",
            enabled 
              ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200" 
              : "bg-slate-900 hover:bg-slate-800 text-white"
          )}
        >
          {enabled ? 'Turn Off Protection' : 'Enable Protection'}
        </button>
      </div>

      {/* GPS Permission & Satellite Acquisition Card */}
      <div className="glass p-5 rounded-[28px] shadow-soft border-emerald-100 bg-gradient-to-r from-emerald-50/60 to-white space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md",
              gpsStatus === 'granted' ? "bg-emerald-500 text-white shadow-emerald-200" : "bg-slate-800 text-slate-200"
            )}>
              <Globe size={18} />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                Live GPS Location Lock
                <span className={cn(
                  "text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider",
                  gpsStatus === 'granted' ? "bg-emerald-500 text-white" :
                  gpsStatus === 'requesting' ? "bg-amber-500 text-white animate-pulse" : "bg-slate-200 text-slate-700"
                )}>
                  {gpsStatus === 'granted' ? 'Locked (Granted)' : gpsStatus === 'requesting' ? 'Acquiring...' : 'Pending Permission'}
                </span>
              </h4>
              <p className="text-[11px] text-slate-500">
                Grant and lock browser GPS access now so emergency coordinates are retrieved instantly during a real fall.
              </p>
            </div>
          </div>

          <button
            onClick={handleRequestGps}
            disabled={gpsStatus === 'requesting'}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-soft transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 flex-shrink-0"
          >
            <ShieldCheck size={14} />
            {gpsStatus === 'granted' ? 'Re-test GPS Fix' : 'Allow GPS Access'}
          </button>
        </div>

        {gpsCoords && (
          <div className="p-3 bg-emerald-100/60 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="font-mono text-emerald-950 font-bold">
              🛰️ Lat: {gpsCoords.lat.toFixed(5)}, Lng: {gpsCoords.lng.toFixed(5)} <span className="text-[10px] font-normal text-emerald-800 font-sans">(Accuracy: ±{gpsCoords.accuracy.toFixed(0)}m)</span>
            </div>
            <a
              href={`https://maps.google.com/?q=${gpsCoords.lat.toFixed(6)},${gpsCoords.lng.toFixed(6)}`}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-800 hover:text-emerald-950 font-bold underline flex items-center gap-1"
            >
              Verify on Google Maps →
            </a>
          </div>
        )}
      </div>

      {/* Interactive Simulation / Test Card */}
      <div className="glass p-5 rounded-[28px] shadow-soft border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-white flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-200">
            <Play size={18} className="ml-0.5" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-900">Zero-Click SOS Test Simulator</h4>
            <p className="text-[11px] text-slate-500">
              Triggers the 15s alarm siren, countdown ring, and automated zero-click cloud dispatch transmission.
            </p>
          </div>
        </div>
        <button
          onClick={handleSimulateFall}
          className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-soft transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 flex-shrink-0"
        >
          <Sparkles size={14} /> Test Fall Event
        </button>
      </div>

      {/* Automated Dispatch Channels & Voice Beacon Settings */}
      <div className="glass p-6 rounded-[32px] shadow-soft border-white/60 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <Radio size={16} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Automated Zero-Click Dispatch Engine</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Zero interaction required from fallen user</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Direct Cloud Dispatch Toggle */}
          <div className="p-4 rounded-2xl bg-white/80 border border-slate-100 shadow-sm flex items-start justify-between gap-3">
            <div>
              <h4 className="text-xs font-extrabold text-slate-900">Direct Cloud SOS Gateway</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Automatically pushes SMS & Email alerts over the cloud without bouncing the user to SMS apps.
              </p>
            </div>
            <button
              onClick={() => dispatch(setAutomatedCloudDispatch(!automatedCloudDispatch))}
              className={cn(
                "w-11 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0 mt-0.5",
                automatedCloudDispatch ? "bg-emerald-500" : "bg-slate-300"
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded-full bg-white transition-transform absolute top-1 shadow-sm",
                automatedCloudDispatch ? "left-6" : "left-1"
              )} />
            </button>
          </div>

          {/* Voice Beacon Toggle */}
          <div className="p-4 rounded-2xl bg-white/80 border border-slate-100 shadow-sm flex items-start justify-between gap-3">
            <div>
              <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-1">
                Audible Voice Distress Beacon <Volume2 size={13} className="text-indigo-600" />
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Device loudly announces the user's fall distress & GPS location out loud for nearby bystanders.
              </p>
            </div>
            <button
              onClick={() => dispatch(setVoiceBeaconEnabled(!voiceBeaconEnabled))}
              className={cn(
                "w-11 h-6 rounded-full transition-colors relative cursor-pointer flex-shrink-0 mt-0.5",
                voiceBeaconEnabled ? "bg-emerald-500" : "bg-slate-300"
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded-full bg-white transition-transform absolute top-1 shadow-sm",
                voiceBeaconEnabled ? "left-6" : "left-1"
              )} />
            </button>
          </div>
        </div>

        {/* Optional Custom Webhook Endpoint */}
        <form onSubmit={handleSaveWebhook} className="pt-2">
          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Globe size={13} /> Custom Emergency Webhook Endpoint (Optional)
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://your-webhook-endpoint.com/api/emergency-sos"
              value={webhookInput}
              onChange={(e) => setWebhookInput(e.target.value)}
              className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={isSavingWebhook}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-soft cursor-pointer flex-shrink-0"
            >
              Save URL
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Accepts automated JSON POST payload with GPS coordinates when a fall is confirmed.
          </p>
        </form>
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Countdown Duration Picker */}
        <div className="glass p-6 rounded-[32px] shadow-soft border-white/60 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <Clock size={16} />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">Countdown Window</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Before auto-SOS sends</p>
              </div>
            </div>
            <span className="text-sm font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-xl">
              {countdownDuration}s
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 pt-1">
            {[10, 15, 30, 45].map((sec) => (
              <button
                key={sec}
                onClick={() => dispatch(setCountdownDuration(sec))}
                className={cn(
                  "py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer",
                  countdownDuration === sec
                    ? "bg-slate-900 text-white shadow-md shadow-slate-200"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                )}
              >
                {sec}s {sec === 15 && '★'}
              </button>
            ))}
          </div>
        </div>

        {/* Sensitivity Selector */}
        <div className="glass p-6 rounded-[32px] shadow-soft border-white/60 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                <Activity size={16} />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">Detection Sensitivity</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Kinematic Thresholds</p>
              </div>
            </div>
            <span className={cn(
              "text-xs font-black px-2.5 py-1 rounded-xl uppercase tracking-wider",
              sensitivity === 'high' ? "bg-rose-100 text-rose-700" :
              sensitivity === 'medium' ? "bg-indigo-100 text-indigo-700" : "bg-emerald-100 text-emerald-700"
            )}>
              {sensitivity}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(['low', 'medium', 'high'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => dispatch(setSensitivity(lvl))}
                className={cn(
                  "py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                  sensitivity === lvl
                    ? "bg-slate-900 text-white shadow-md shadow-slate-200"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                )}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Emergency Contacts Management */}
      <div className="glass p-6 rounded-[32px] shadow-soft border-white/60 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
              <Users size={16} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Emergency Contacts</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Recipients of GPS SOS Alert</p>
            </div>
          </div>

          <button
            onClick={handleOpenAddContact}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-soft transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={14} /> Add Contact
          </button>
        </div>

        {emergencyContacts.length === 0 ? (
          <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
            <p className="text-xs font-bold text-slate-500">No emergency contacts configured yet.</p>
            <p className="text-[11px] text-slate-400 mt-1">Add at least one family member or physician for SOS dispatch.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {emergencyContacts.map((contact) => (
              <div 
                key={contact.id} 
                className="p-4 rounded-2xl bg-white/80 border border-slate-100 shadow-sm flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                      {contact.name}
                      {contact.isPrimary && (
                        <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase tracking-wider">
                          Primary
                        </span>
                      )}
                    </h4>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditContact(contact)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteContact(contact.id, contact.name)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] font-bold text-indigo-600 mt-0.5">{contact.relationship}</p>
                </div>

                <div className="space-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone size={12} className="text-slate-400" />
                    <span>{contact.phone}</span>
                  </div>
                  {contact.email && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <Mail size={12} className="text-slate-400" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                  )}
                </div>

                {/* Quick Test Links */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 text-[10px]">
                  {(() => {
                    const cleanPhone = contact.phone.replace(/[^0-9+]/g, '');
                    const digits = contact.phone.replace(/[^0-9]/g, '');
                    const testSos = encodeURIComponent(`🚨 POSTUREPAL EMERGENCY TEST: Testing distress channel for ${contact.name}. Live GPS Location: ${gpsCoords ? `https://maps.google.com/?q=${gpsCoords.lat.toFixed(6)},${gpsCoords.lng.toFixed(6)}` : 'GPS Acquired'}`);
                    const whatsappUrl = digits ? `https://api.whatsapp.com/send?phone=${digits}&text=${testSos}` : `https://api.whatsapp.com/send?text=${testSos}`;
                    const mailtoUrl = `mailto:${contact.email || ''}?subject=${encodeURIComponent('🚨 EMERGENCY TEST: Fall Alert Channel Check')}&body=${testSos}`;

                    return (
                      <>
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-center"
                        >
                          WhatsApp
                        </a>
                        <a
                          href={`sms:${cleanPhone}?body=${testSos}`}
                          className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-center"
                        >
                          SMS
                        </a>
                        {contact.email && (
                          <a
                            href={mailtoUrl}
                            className="flex-1 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-center"
                          >
                            Email
                          </a>
                        )}
                        <a
                          href={`tel:${cleanPhone}`}
                          className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg text-center"
                        >
                          Call
                        </a>
                      </>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fall History Log */}
      <div className="glass p-6 rounded-[32px] shadow-soft border-white/60 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <History size={16} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Incident History Log</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Previous motion triggers</p>
            </div>
          </div>

          {fallHistory.length > 0 && (
            <button
              onClick={() => {
                dispatch(clearFallHistory());
                toast.success('Incident history cleared');
              }}
              className="text-[11px] font-bold text-slate-400 hover:text-rose-600 transition-colors"
            >
              Clear Log
            </button>
          )}
        </div>

        {fallHistory.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-4">No recent fall events recorded.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {fallHistory.map((inc) => (
              <div key={inc.id} className="p-3 bg-white/60 border border-slate-100 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  {inc.status === 'sos_dispatched' ? (
                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                  <div>
                    <span className="font-bold text-slate-800">
                      {inc.status === 'sos_dispatched' ? '🚨 Cloud SOS Dispatched' : '✅ Alert Cancelled ("I am OK")'}
                    </span>
                    <p className="text-[10px] text-slate-400">{new Date(inc.timestamp).toLocaleString()}</p>
                  </div>
                </div>
                {inc.impactForce && (
                  <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    Impact: {inc.impactForce.toFixed(1)}g
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Contact Modal Dialog */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 border border-slate-100 animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-extrabold text-slate-900">
              {editingContactId ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
            </h3>

            <form onSubmit={handleSaveContact} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Sarah Mitchell / John Doe"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+1 (555) 000-0000"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
                  Relationship
                </label>
                <select
                  value={contactForm.relationship}
                  onChange={(e) => setContactForm({ ...contactForm, relationship: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Spouse / Partner">Spouse / Partner</option>
                  <option value="Family Member">Family Member</option>
                  <option value="Primary Physician">Primary Physician</option>
                  <option value="Caretaker">Caretaker</option>
                  <option value="Friend">Friend</option>
                  <option value="Neighbor">Neighbor</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="contact@example.com"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="primaryCheck"
                  checked={contactForm.isPrimary}
                  onChange={(e) => setContactForm({ ...contactForm, isPrimary: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <label htmlFor="primaryCheck" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Set as Primary Contact for Direct SMS & Call
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-soft"
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
