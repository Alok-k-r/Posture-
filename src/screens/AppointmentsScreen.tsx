import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Calendar, MapPin, Star, Plus, X, Check, User, Video, 
  Clock, AlertCircle, FileText, ChevronRight, RefreshCw, ExternalLink,
  ShieldCheck, ArrowRight, Ban, CheckCircle2, Building2, Stethoscope,
  CreditCard, MessageSquare, Sparkles, Activity
} from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  RootState, addAppointment, removeAppointment, addToSyncQueue, 
  setAppointmentStatus, rescheduleAppointment, cancelAppointment,
  approveAppointment, payAdvanceFee, startCall,
  Appointment, AppointmentStatus, ConsultationMode 
} from '../store/store';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { AdvancePaymentModal } from '../components/appointments/AdvancePaymentModal';
import { ConsultationWorkspaceModal } from '../components/appointments/ConsultationWorkspaceModal';
import { ScheduleService, generateMeetingLink, VirtualSlot, InClinicSlot } from '../services/scheduleService';

const SPECIALISTS = [
  { 
    name: 'Dr. Rahul Sharma', 
    specialty: 'Orthopedic Spine Specialist', 
    hospital: 'Apollo Spine & Rehab Center', 
    location: 'Building B, Floor 3, Apollo Healthcare, New Delhi',
    rating: 4.9, 
    exp: 14, 
    fee: '₹1200',
    category: 'Orthopedic'
  },
  { 
    name: 'Dr. Priya Verma', 
    specialty: 'Senior Physiotherapist', 
    hospital: 'Fortis Spine & Posture Clinic', 
    location: 'Fortis Health Care, OPD Block C, Gurugram',
    rating: 4.9, 
    exp: 9, 
    fee: '₹800',
    category: 'Physiotherapist'
  },
  { 
    name: 'Dr. Amit Patel', 
    specialty: 'Neuro-Muscular Specialist', 
    hospital: 'Max Healthcare Institute', 
    location: 'Max Spine Care Wing, Saket, New Delhi',
    rating: 4.8, 
    exp: 16, 
    fee: '₹2000',
    category: 'Neurologist'
  },
  { 
    name: 'Dr. Sneha Rao', 
    specialty: 'Spine Ergonomics Lead', 
    hospital: 'Global Spine & Joint Care', 
    location: 'Global Health City, Suite 501, Bengaluru',
    rating: 4.9, 
    exp: 11, 
    fee: '₹1500',
    category: 'Spine Specialist'
  },
  { 
    name: 'Dr. Vikram Malhotra', 
    specialty: 'Orthopedic Surgeon & Ergonomist', 
    hospital: 'Medanta Bone & Joint Institute', 
    location: 'Medanta Mediclinic, Cyber City, Gurugram',
    rating: 4.8, 
    exp: 20, 
    fee: '₹2500',
    category: 'Orthopedic'
  }
];

const CONSULTATION_TYPES = [
  'Postural Assessment',
  'Spine Rehabilitation',
  'Ergonomic Review',
  'General Orthopedic Consultation'
];

const TIME_SLOTS = [
  '09:00 AM',
  '10:30 AM',
  '12:00 PM',
  '02:30 PM',
  '04:00 PM',
  '05:30 PM'
];

const QUICK_SYMPTOMS = [
  'Thoracic stiffness',
  'Lower back discomfort',
  'Neck strain while sitting',
  'Postural fatigue after long work'
];

export const AppointmentsScreen: React.FC = () => {
  const dispatch = useDispatch();
  const appointments = useSelector((state: RootState) => state.appointments.list);
  const { syncQueue } = useSelector((state: RootState) => state.sync);
  
  // UI States
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Upcoming' | 'Pending' | 'Completed' | 'Cancelled'>('All');
  const [selectedModeFilter, setSelectedModeFilter] = useState<'All' | 'In-Clinic' | 'Video Call'>('All');
  
  // Modals
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedAppointmentDetails, setSelectedAppointmentDetails] = useState<Appointment | null>(null);
  const [rescheduleItem, setRescheduleItem] = useState<Appointment | null>(null);
  const [cancelItem, setCancelItem] = useState<Appointment | null>(null);
  const [paymentModalItem, setPaymentModalItem] = useState<Appointment | null>(null);
  const [workspaceModalItem, setWorkspaceModalItem] = useState<Appointment | null>(null);

  // Booking Form States
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [doctorQuery, setDoctorQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [consultationMode, setConsultationMode] = useState<ConsultationMode>('In-Clinic');
  const [consultationType, setConsultationType] = useState<string>('Postural Assessment');
  const [bookingDate, setBookingDate] = useState(format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'));
  const [bookingTime, setBookingTime] = useState('09:40 AM');
  const [bookingSlotLabel, setBookingSlotLabel] = useState('09:40 AM - 10:10 AM');
  const [patientNotes, setPatientNotes] = useState('');
  const [paymentOption, setPaymentOption] = useState<'pay_later' | 'pay_now'>('pay_later');

  // Reschedule Form States
  const [rescheduleDate, setRescheduleDate] = useState(format(new Date(Date.now() + 86400000 * 2), 'yyyy-MM-dd'));
  const [rescheduleTime, setRescheduleTime] = useState('09:40 AM');
  const [rescheduleSlotLabel, setRescheduleSlotLabel] = useState('09:40 AM - 10:10 AM');

  // Cancel Form States
  const [cancelReason, setCancelReason] = useState('Schedule conflict');

  // Modal body scroll lock
  React.useEffect(() => {
    if (showBookingModal || selectedAppointmentDetails || rescheduleItem || cancelItem) {
      document.body.classList.add('modal-open-hide-tabbar');
    } else {
      document.body.classList.remove('modal-open-hide-tabbar');
    }
    return () => {
      document.body.classList.remove('modal-open-hide-tabbar');
    };
  }, [showBookingModal, selectedAppointmentDetails, rescheduleItem, cancelItem]);

  // Derived patient metrics
  const upcomingCount = useMemo(() => appointments.filter(a => a.status === 'upcoming').length, [appointments]);
  const pendingCount = useMemo(() => appointments.filter(a => a.status === 'pending').length, [appointments]);
  const completedCount = useMemo(() => appointments.filter(a => a.status === 'completed').length, [appointments]);

  // Doctor list filtering
  const filteredSpecialists = useMemo(() => {
    return SPECIALISTS.filter(doc => {
      const matchesCategory = categoryFilter === 'All' || doc.category === categoryFilter;
      const matchesQuery = !doctorQuery.trim() || 
        doc.name.toLowerCase().includes(doctorQuery.toLowerCase()) || 
        doc.specialty.toLowerCase().includes(doctorQuery.toLowerCase()) ||
        doc.hospital.toLowerCase().includes(doctorQuery.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [categoryFilter, doctorQuery]);

  // Appointment list filtering
  const displayedAppointments = useMemo(() => {
    return [...appointments]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .filter(app => {
        const matchesSearch = 
          app.doctorName.toLowerCase().includes(search.toLowerCase()) ||
          app.specialty.toLowerCase().includes(search.toLowerCase()) ||
          app.hospital.toLowerCase().includes(search.toLowerCase());

        const matchesMode = selectedModeFilter === 'All' || app.mode === selectedModeFilter;

        let matchesTab = true;
        if (activeTab === 'Upcoming') matchesTab = app.status === 'upcoming';
        else if (activeTab === 'Pending') matchesTab = app.status === 'pending';
        else if (activeTab === 'Completed') matchesTab = app.status === 'completed';
        else if (activeTab === 'Cancelled') matchesTab = app.status === 'cancelled';

        return matchesSearch && matchesMode && matchesTab;
      });
  }, [appointments, search, selectedModeFilter, activeTab]);

  // Dynamic available slots for Booking Modal
  const bookingVirtualSlots = useMemo(() => {
    return ScheduleService.getVirtualSlots(selectedDoc?.name || '', bookingDate, appointments);
  }, [selectedDoc?.name, bookingDate, appointments]);

  const bookingClinicSlots = useMemo(() => {
    return ScheduleService.getInClinicSlots(selectedDoc?.name || '', bookingDate, appointments);
  }, [selectedDoc?.name, bookingDate, appointments]);

  // Dynamic available slots for Reschedule Modal
  const rescheduleVirtualSlots = useMemo(() => {
    if (!rescheduleItem) return [];
    const others = appointments.filter(a => a.id !== rescheduleItem.id);
    return ScheduleService.getVirtualSlots(rescheduleItem.doctorName, rescheduleDate, others);
  }, [rescheduleItem, rescheduleDate, appointments]);

  const rescheduleClinicSlots = useMemo(() => {
    if (!rescheduleItem) return [];
    const others = appointments.filter(a => a.id !== rescheduleItem.id);
    return ScheduleService.getInClinicSlots(rescheduleItem.doctorName, rescheduleDate, others);
  }, [rescheduleItem, rescheduleDate, appointments]);

  // Handle Booking Submit
  const handleBookingSubmit = () => {
    if (!selectedDoc) {
      toast.error('Please select a specialist');
      return;
    }

    const isVideo = consultationMode === 'Video Call';
    const meetingLink = isVideo 
      ? generateMeetingLink(selectedDoc.name, bookingDate, bookingTime)
      : undefined;

    const newAppointment: Appointment = {
      id: 'app-' + Date.now(),
      doctorName: selectedDoc.name,
      specialty: selectedDoc.specialty,
      hospital: selectedDoc.hospital,
      location: selectedDoc.location,
      date: bookingDate,
      time: bookingTime,
      status: 'pending', // Patient requests -> Awaiting specialist confirmation
      fee: selectedDoc.fee,
      mode: consultationMode,
      consultationType: consultationType,
      notes: patientNotes.trim() || '',
      meetingUrl: meetingLink || '',
      scheduledSlot: isVideo ? bookingSlotLabel : `${bookingTime} (Clinic Slot)`,
      sessionDuration: isVideo ? 30 : 45,
      breakDuration: isVideo ? 10 : 15
    };

    dispatch(addAppointment(newAppointment));
    dispatch(addToSyncQueue({
      id: `add_${newAppointment.id}`,
      type: 'SYNC_APPOINTMENT',
      payload: newAppointment,
      timestamp: new Date().toISOString()
    }));

    toast.success(
      isVideo
        ? `Virtual Consultation scheduled at ${bookingSlotLabel}! Google Meet link generated.`
        : `In-Clinic appointment requested for ${bookingDate} at ${bookingTime}!`
    );
    setShowBookingModal(false);
    resetBookingForm();
    setActiveTab('Pending');
  };

  const resetBookingForm = () => {
    setSelectedDoc(null);
    setDoctorQuery('');
    setCategoryFilter('All');
    setConsultationMode('In-Clinic');
    setConsultationType('Postural Assessment');
    setBookingDate(format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'));
    setBookingTime('09:40 AM');
    setBookingSlotLabel('09:40 AM - 10:10 AM');
    setPatientNotes('');
    setPaymentOption('pay_later');
  };

  // Handle Reschedule Confirm
  const handleConfirmReschedule = () => {
    if (!rescheduleItem) return;

    const isVideo = rescheduleItem.mode === 'Video Call';
    const updatedMeetingLink = isVideo 
      ? generateMeetingLink(rescheduleItem.doctorName, rescheduleDate, rescheduleTime)
      : rescheduleItem.meetingUrl;

    dispatch(rescheduleAppointment({
      id: rescheduleItem.id,
      date: rescheduleDate,
      time: rescheduleTime
    }));

    dispatch(addToSyncQueue({
      id: `reschedule_${rescheduleItem.id}_${Date.now()}`,
      type: 'SYNC_APPOINTMENT',
      payload: { 
        ...rescheduleItem, 
        date: rescheduleDate, 
        time: rescheduleTime,
        scheduledSlot: isVideo ? rescheduleSlotLabel : rescheduleTime,
        meetingUrl: updatedMeetingLink
      },
      timestamp: new Date().toISOString()
    }));

    toast.success('Visit rescheduled successfully!');
    setRescheduleItem(null);
  };

  // Handle Cancel Confirm
  const handleConfirmCancel = () => {
    if (!cancelItem) return;

    dispatch(cancelAppointment({
      id: cancelItem.id,
      reason: cancelReason
    }));

    dispatch(addToSyncQueue({
      id: `cancel_${cancelItem.id}_${Date.now()}`,
      type: 'SYNC_APPOINTMENT',
      payload: { ...cancelItem, status: 'cancelled', cancellationReason: cancelReason },
      timestamp: new Date().toISOString()
    }));

    toast.success('Appointment cancelled');
    setCancelItem(null);
  };

  return (
    <div className="p-6 space-y-6 pb-28 relative z-10 max-w-5xl mx-auto">
      {/* Patient Header */}
      <div data-tour="tele-physio" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl bg-white/60 border border-slate-100 shadow-soft">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-1">
            <Stethoscope size={12} />
            Patient Portal
          </div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none">Clinical Visits</h2>
          <p className="text-xs font-semibold text-slate-400 mt-1">Manage posture evaluations, physio sessions & specialist appointments</p>
        </div>

        <button 
          onClick={() => { resetBookingForm(); setShowBookingModal(true); }}
          className="flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-premium hover:bg-slate-800 active:scale-95 transition-all"
        >
          <Plus size={18} />
          Book Specialist Visit
        </button>
      </div>

      {/* Patient Metrics Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50/80 p-4 rounded-[24px] border border-emerald-100/80 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700/70">Upcoming</span>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-700 leading-none">{upcomingCount}</span>
            <span className="text-[9px] font-bold text-emerald-600/80">Confirmed</span>
          </div>
        </div>

        <div className="bg-amber-50/80 p-4 rounded-[24px] border border-amber-100/80 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-amber-700/70">Pending</span>
            <Clock size={12} className="text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-700 leading-none">{pendingCount}</span>
            <span className="text-[9px] font-bold text-amber-600/80">Awaiting Clinic</span>
          </div>
        </div>

        <div className="bg-indigo-50/80 p-4 rounded-[24px] border border-indigo-100/80 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-700/70">Completed</span>
            <CheckCircle2 size={12} className="text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-indigo-700 leading-none">{completedCount}</span>
            <span className="text-[9px] font-bold text-indigo-600/80">Visited</span>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search by doctor, specialty, or clinic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full glass rounded-2xl py-3.5 pl-11 pr-4 text-xs font-bold text-slate-800 placeholder:text-slate-400 border border-white/60 focus:outline-none focus:ring-2 focus:ring-slate-900/10 shadow-soft"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Tab Buttons & Mode Selectors */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {(['All', 'Upcoming', 'Pending', 'Completed', 'Cancelled'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap shadow-soft",
                  activeTab === tab
                    ? "bg-slate-900 text-white shadow-premium"
                    : "bg-white/80 text-slate-500 hover:text-slate-800 hover:bg-white border border-slate-100"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Mode Selector */}
          <div className="flex items-center bg-slate-100/80 p-1 rounded-xl self-start sm:self-auto border border-slate-200/50">
            {(['All', 'In-Clinic', 'Video Call'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setSelectedModeFilter(mode)}
                className={cn(
                  "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                  selectedModeFilter === mode
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-400 hover:text-slate-700"
                )}
              >
                {mode === 'In-Clinic' ? '🏥 Clinic' : mode === 'Video Call' ? '📹 Virtual' : 'All Modes'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Appointment Cards List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {displayedAppointments.map((app) => {
            const isPendingSync = syncQueue.some(q => q.id.includes(app.id));

            const statusConfigs = {
              pending: {
                label: 'Awaiting Doctor Approval',
                badgeStyle: 'bg-amber-50 text-amber-700 border-amber-200',
                icon: Clock,
                desc: 'Specialist is reviewing your request.'
              },
              approved_payment_pending: {
                label: 'Doctor Approved • Pay ₹200 Advance',
                badgeStyle: 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold',
                icon: Sparkles,
                desc: 'Doctor accepted request! Pay ₹200 advance fee to confirm.'
              },
              upcoming: {
                label: 'Confirmed Visit • Advance Paid',
                badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                icon: CheckCircle2,
                desc: 'Appointment confirmed & advance paid.'
              },
              completed: {
                label: 'Visit Closed',
                badgeStyle: 'bg-slate-100 text-slate-600 border-slate-300',
                icon: Check,
                desc: 'Consultation completed.'
              },
              cancelled: {
                label: 'Cancelled',
                badgeStyle: 'bg-rose-50 text-rose-600 border-rose-200',
                icon: Ban,
                desc: app.cancellationReason ? `Reason: ${app.cancellationReason}` : 'Cancelled by patient.'
              }
            };

            const statusCfg = statusConfigs[app.status] || statusConfigs.pending;
            const StatusIcon = statusCfg.icon;

            return (
              <motion.div
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                key={app.id}
                className="bg-white/90 backdrop-blur-md rounded-[32px] p-5 sm:p-6 border border-slate-100 shadow-premium space-y-4 relative overflow-hidden"
              >
                {/* Top Row: Doctor Info & Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-md shrink-0">
                      {app.doctorName.replace('Dr. ', '').charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-base font-extrabold text-slate-800 tracking-tight leading-tight">
                          {app.doctorName}
                        </h4>
                        <div className={cn("px-2.5 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider border flex items-center gap-1", statusCfg.badgeStyle)}>
                          <StatusIcon size={10} />
                          {statusCfg.label}
                        </div>
                      </div>
                      <p className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest mt-0.5">
                        {app.specialty}
                      </p>
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                        <Building2 size={12} className="text-slate-400 shrink-0" />
                        {app.hospital}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-base font-black text-slate-900 block">{app.fee}</span>
                    {isPendingSync && (
                      <span className="text-[8px] font-black text-indigo-500 uppercase tracking-tight flex items-center justify-end gap-1">
                        <RefreshCw size={8} className="animate-spin" />
                        Syncing
                      </span>
                    )}
                  </div>
                </div>

                {/* Consultation Details Pill Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50/80 p-3 rounded-2xl border border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400 shrink-0" />
                    <span className="font-bold text-slate-700">
                      {format(new Date(app.date), 'EEEE, MMM dd, yyyy')}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-slate-400 shrink-0" />
                    <span className="font-bold text-slate-700">{app.time}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {app.mode === 'Video Call' ? (
                      <Video size={14} className="text-indigo-500 shrink-0" />
                    ) : (
                      <MapPin size={14} className="text-emerald-500 shrink-0" />
                    )}
                    <span className="font-bold text-slate-700">
                      {app.mode} · <span className="text-slate-500 font-normal">{app.consultationType}</span>
                    </span>
                  </div>

                  {app.location && app.mode === 'In-Clinic' && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 truncate">
                      <Building2 size={12} className="text-slate-400 shrink-0" />
                      <span className="truncate">{app.location}</span>
                    </div>
                  )}
                </div>

                {/* Doctor Approved - Advance Payment Banner */}
                {app.status === 'approved_payment_pending' && (
                  <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Sparkles size={16} />
                      </div>
                      <div>
                        <p className="font-extrabold text-indigo-950">
                          {app.doctorName} Approved Your Booking Request!
                        </p>
                        <p className="text-[11px] text-indigo-700 font-medium">
                          Pay ₹{app.advanceFeeAmount || 200} advance token fee to confirm slot & unlock direct doctor chat room & 3D spine report sharing.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setPaymentModalItem(app)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
                    >
                      <CreditCard size={14} />
                      <span>Pay ₹{app.advanceFeeAmount || 200} Now</span>
                    </button>
                  </div>
                )}

                {/* Patient Notes preview if present */}
                {app.notes && (
                  <div className="text-xs bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/60 text-slate-600 flex items-start gap-2">
                    <FileText size={13} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="line-clamp-2">
                      <strong className="font-bold text-amber-800">Your Symptoms/Notes: </strong> 
                      {app.notes}
                    </p>
                  </div>
                )}

                {/* Action Controls for Patient */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100/80 gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedAppointmentDetails(app)}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-slate-50"
                  >
                    View Full Details
                    <ChevronRight size={14} />
                  </button>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Unlocked Consultation Workspace & Chat Button */}
                    {app.status === 'upcoming' && (
                      <button
                        onClick={() => setWorkspaceModalItem(app)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-black uppercase tracking-wider shadow-md transition-all active:scale-95 border border-slate-700"
                      >
                        <MessageSquare size={13} className="text-indigo-400" />
                        <span>Consultation Workspace & Chat</span>
                      </button>
                    )}

                    {/* Pay Advance Button if approved_payment_pending */}
                    {app.status === 'approved_payment_pending' && (
                      <button
                        onClick={() => setPaymentModalItem(app)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-[11px] font-black uppercase tracking-wider shadow-md hover:bg-indigo-700 transition-all active:scale-95"
                      >
                        <CreditCard size={13} />
                        Pay ₹{app.advanceFeeAmount || 200} Advance
                      </button>
                    )}

                    {/* Simulate Doctor Approval Button for testing pending items */}
                    {app.status === 'pending' && (
                      <button
                        onClick={() => {
                          dispatch(approveAppointment({ id: app.id }));
                          toast.success(`${app.doctorName} accepted your request! Pay ₹200 advance deposit to confirm.`);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider transition-colors border border-emerald-200"
                      >
                        Simulate Doctor Approval
                      </button>
                    )}

                    {/* Join Virtual Call Button if Upcoming & Video Call */}
                    {app.status === 'upcoming' && app.mode === 'Video Call' && (
                      <button
                        onClick={() => dispatch(startCall(app))}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer"
                      >
                        <Video size={12} />
                        <span>Join Call (In-App)</span>
                      </button>
                    )}

                    {/* Reschedule Button if pending, approved, or upcoming */}
                    {(app.status === 'pending' || app.status === 'approved_payment_pending' || app.status === 'upcoming') && (
                      <button
                        onClick={() => {
                          setRescheduleItem(app);
                          setRescheduleDate(app.date);
                          setRescheduleTime(app.time);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider transition-colors active:scale-95"
                      >
                        Reschedule
                      </button>
                    )}

                    {/* Cancel Visit Button if pending, approved, or upcoming */}
                    {(app.status === 'pending' || app.status === 'approved_payment_pending' || app.status === 'upcoming') && (
                      <button
                        onClick={() => {
                          setCancelItem(app);
                          setCancelReason('Schedule conflict');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-wider transition-colors active:scale-95"
                      >
                        Cancel
                      </button>
                    )}

                    {/* Book Again if completed or cancelled */}
                    {(app.status === 'completed' || app.status === 'cancelled') && (
                      <button
                        onClick={() => {
                          resetBookingForm();
                          const matchDoc = SPECIALISTS.find(d => d.name === app.doctorName) || SPECIALISTS[0];
                          setSelectedDoc(matchDoc);
                          setShowBookingModal(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider shadow-sm hover:bg-slate-800 active:scale-95 transition-all"
                      >
                        Book Again
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {displayedAppointments.length === 0 && (
          <div className="py-16 bg-white/60 rounded-[32px] border border-slate-100 text-center space-y-4 p-6 shadow-soft">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto">
              <Calendar size={28} />
            </div>
            <div>
              <h4 className="text-base font-extrabold text-slate-800">No Appointments Found</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto font-medium">
                No clinical visits match your current filter or search criteria.
              </p>
            </div>
            <button
              onClick={() => {
                setSearch('');
                setActiveTab('All');
                setSelectedModeFilter('All');
              }}
              className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* MODAL 1: Book New Appointment */}
      <AnimatePresence>
        {showBookingModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBookingModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-xl bg-white rounded-t-[36px] sm:rounded-[36px] shadow-2xl p-6 sm:p-8 max-h-[90vh] flex flex-col z-[110]"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
                <div>
                  <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">Schedule Specialist Visit</h3>
                  <p className="text-xs text-slate-400 font-medium">Patient Consultation & Assessment Request</p>
                </div>
                <button 
                  onClick={() => setShowBookingModal(false)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={18} className="text-slate-600" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-6 no-scrollbar">
                {/* Step 1: Select Specialist */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700">1. Choose Specialist</label>
                    <span className="text-[10px] font-bold text-slate-400">Verified Medical Directory</span>
                  </div>

                  {/* Category Pills */}
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-1">
                    {['All', 'Orthopedic', 'Physiotherapist', 'Spine Specialist', 'Neurologist'].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all",
                          categoryFilter === cat
                            ? "bg-slate-900 text-white shadow-sm"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Specialist Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="text"
                      placeholder="Search specialist name or hospital..."
                      value={doctorQuery}
                      onChange={(e) => setDoctorQuery(e.target.value)}
                      className="w-full bg-slate-50 rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-slate-800 border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>

                  {/* Specialist Selection List */}
                  <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                    {filteredSpecialists.map(doc => {
                      const isSelected = selectedDoc?.name === doc.name;
                      return (
                        <div
                          key={doc.name}
                          onClick={() => setSelectedDoc(doc)}
                          className={cn(
                            "p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3",
                            isSelected 
                              ? "bg-indigo-50/80 border-indigo-200 shadow-sm" 
                              : "bg-white hover:bg-slate-50 border-slate-100"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0",
                              isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"
                            )}>
                              {doc.name.replace('Dr. ', '').charAt(0)}
                            </div>
                            <div>
                              <h4 className="font-extrabold text-xs text-slate-800">{doc.name}</h4>
                              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{doc.specialty}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{doc.hospital}</p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="flex items-center gap-1 justify-end text-amber-500">
                              <Star size={12} fill="currentColor" />
                              <span className="text-xs font-bold text-slate-800">{doc.rating}</span>
                            </div>
                            <span className="text-xs font-black text-slate-900 block">{doc.fee}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Step 2: Consultation Mode & Type */}
                <div className="space-y-3">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">2. Consultation Settings</label>
                  
                  {/* Mode Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setConsultationMode('In-Clinic')}
                      className={cn(
                        "p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all",
                        consultationMode === 'In-Clinic'
                          ? "bg-emerald-50 border-emerald-300 text-emerald-800 ring-2 ring-emerald-500/20"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      <div className={cn("p-2 rounded-xl", consultationMode === 'In-Clinic' ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600")}>
                        <Building2 size={16} />
                      </div>
                      <div>
                        <span className="font-bold text-xs block">In-Clinic Visit</span>
                        <span className="text-[9px] text-slate-400 font-medium">Physical Examination</span>
                      </div>
                    </button>

                    <button
                      onClick={() => setConsultationMode('Video Call')}
                      className={cn(
                        "p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all",
                        consultationMode === 'Video Call'
                          ? "bg-indigo-50 border-indigo-300 text-indigo-800 ring-2 ring-indigo-500/20"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      <div className={cn("p-2 rounded-xl", consultationMode === 'Video Call' ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600")}>
                        <Video size={16} />
                      </div>
                      <div>
                        <span className="font-bold text-xs block">Virtual Tele-Consult</span>
                        <span className="text-[9px] text-slate-400 font-medium">Online Video Session</span>
                      </div>
                    </button>
                  </div>

                  {/* Consultation Type Select */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Purpose / Type</label>
                    <select
                      value={consultationType}
                      onChange={(e) => setConsultationType(e.target.value)}
                      className="w-full bg-slate-50 rounded-2xl p-3 text-xs font-bold text-slate-800 border border-slate-200/80 focus:outline-none"
                    >
                      {CONSULTATION_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Step 3: Date & Available Slots */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                      3. Select Date & Available Slot
                    </label>
                    {consultationMode === 'Video Call' ? (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                        <Video size={10} />
                        30m Video • 10m Buffer
                      </span>
                    ) : (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        In-Person OPD
                      </span>
                    )}
                  </div>
                  
                  {/* Date Input */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Consultation Date</label>
                    <input 
                      type="date"
                      min={format(new Date(), 'yyyy-MM-dd')}
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full bg-slate-50 rounded-2xl p-3 text-xs font-bold text-slate-800 border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {/* Available Slot Picker */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Available Slots for {selectedDoc?.name || 'Selected Doctor'}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400">
                        {consultationMode === 'Video Call' 
                          ? `${bookingVirtualSlots.filter(s => !s.isBooked && !s.isPast).length} open slots`
                          : `${bookingClinicSlots.filter(s => !s.isBooked && !s.isPast).length} open slots`}
                      </span>
                    </div>

                    {consultationMode === 'Video Call' ? (
                      /* Virtual Consultation Sequential 30-min Slot Grid */
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                          {bookingVirtualSlots.map((slot) => {
                            const isSelected = bookingTime === slot.start;
                            const isUnavailable = slot.isBooked || slot.isPast;

                            return (
                              <button
                                key={slot.id}
                                type="button"
                                disabled={isUnavailable}
                                onClick={() => {
                                  setBookingTime(slot.start);
                                  setBookingSlotLabel(slot.label);
                                }}
                                className={cn(
                                  "p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-1",
                                  isSelected
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-200"
                                    : isUnavailable
                                    ? "bg-slate-100/70 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed"
                                    : "bg-white hover:bg-indigo-50/50 border-slate-200/80 text-slate-800 cursor-pointer"
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <span className={cn("text-xs font-black", isSelected ? "text-white" : "text-slate-900")}>
                                    {slot.start}
                                  </span>
                                  {isUnavailable ? (
                                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-500">
                                      {slot.isPast ? 'Passed' : 'Booked'}
                                    </span>
                                  ) : (
                                    <span className={cn(
                                      "text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full",
                                      isSelected ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    )}>
                                      Open
                                    </span>
                                  )}
                                </div>
                                <span className={cn("text-[9px] font-medium", isSelected ? "text-indigo-100" : "text-slate-400")}>
                                  until {slot.end} (30m)
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Doctor Series Break Visualizer */}
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-600 flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1 font-bold text-slate-700">
                            <Clock size={12} className="text-indigo-600" />
                            Doctor Workflow:
                          </span>
                          <span className="font-medium text-slate-500 text-[9.5px]">
                            30-min Video Consultation ➔ 10-min Doctor Break ➔ Next Scheduled Patient
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* In-Clinic Slot Grid */
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1 no-scrollbar">
                        {bookingClinicSlots.map((slot) => {
                          const isSelected = bookingTime === slot.time;
                          const isUnavailable = slot.isBooked || slot.isPast;

                          return (
                            <button
                              key={slot.id}
                              type="button"
                              disabled={isUnavailable}
                              onClick={() => {
                                setBookingTime(slot.time);
                                setBookingSlotLabel(`${slot.time} (In-Clinic)`);
                              }}
                              className={cn(
                                "p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1",
                                isSelected
                                  ? "bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-200"
                                  : isUnavailable
                                  ? "bg-slate-100/70 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed"
                                  : "bg-white hover:bg-emerald-50/50 border-slate-200/80 text-slate-800 cursor-pointer"
                              )}
                            >
                              <span className={cn("text-xs font-black", isSelected ? "text-white" : "text-slate-900")}>
                                {slot.time}
                              </span>
                              <span className={cn(
                                "text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full",
                                isSelected 
                                  ? "bg-white/20 text-white" 
                                  : isUnavailable 
                                  ? "bg-slate-200 text-slate-500" 
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              )}>
                                {isUnavailable ? (slot.isPast ? 'Passed' : 'Booked') : 'Available'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 4: Symptoms & Patient Notes */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">4. Symptoms & Patient Notes (Optional)</label>
                  
                  {/* Quick Symptoms Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_SYMPTOMS.map(symptom => (
                      <button
                        key={symptom}
                        type="button"
                        onClick={() => {
                          if (patientNotes.includes(symptom)) return;
                          setPatientNotes(prev => prev ? `${prev}, ${symptom}` : symptom);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[9.5px] font-extrabold transition-colors border border-amber-200/60"
                      >
                        + {symptom}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={2}
                    placeholder="Describe any postural pain, duration of symptoms, or previous diagnosis..."
                    value={patientNotes}
                    onChange={(e) => setPatientNotes(e.target.value)}
                    className="w-full bg-slate-50 rounded-2xl p-3 text-xs font-medium text-slate-800 border border-slate-200/80 focus:outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Submit Action */}
              <div className="pt-4 border-t border-slate-100 shrink-0 space-y-2">
                <button
                  disabled={!selectedDoc}
                  onClick={handleBookingSubmit}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-premium hover:bg-slate-800 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <ShieldCheck size={16} />
                  Confirm & Submit Appointment Request
                </button>
                <p className="text-[10px] text-center text-slate-400 font-medium">
                  Your request will be sent to the specialist for confirmation. No payment required upfront.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Appointment Details Drawer */}
      <AnimatePresence>
        {selectedAppointmentDetails && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAppointmentDetails(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-lg bg-white rounded-t-[36px] sm:rounded-[36px] shadow-2xl p-6 sm:p-8 space-y-6 z-[110]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                  Appointment Card
                </span>
                <button 
                  onClick={() => setSelectedAppointmentDetails(null)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={18} className="text-slate-600" />
                </button>
              </div>

              {/* Doctor Details */}
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-lg">
                  {selectedAppointmentDetails.doctorName.replace('Dr. ', '').charAt(0)}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">{selectedAppointmentDetails.doctorName}</h3>
                  <p className="text-xs font-extrabold text-indigo-600 uppercase tracking-wider">{selectedAppointmentDetails.specialty}</p>
                  <p className="text-xs text-slate-500">{selectedAppointmentDetails.hospital}</p>
                </div>
              </div>

              {/* Information Grid */}
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Consultation Type</span>
                  <span className="font-bold text-slate-800">{selectedAppointmentDetails.consultationType}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Mode</span>
                  <span className="font-bold text-slate-800">{selectedAppointmentDetails.mode}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Scheduled Date & Time</span>
                  <span className="font-bold text-slate-800">
                    {format(new Date(selectedAppointmentDetails.date), 'MMM dd, yyyy')} at {selectedAppointmentDetails.time}
                  </span>
                </div>

                {selectedAppointmentDetails.mode === 'Video Call' && (
                  <div className="py-2.5 px-3.5 bg-indigo-50/80 rounded-2xl border border-indigo-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Video size={14} className="text-indigo-600" />
                        Virtual Consultation Room
                      </span>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        30m Call + 10m Buffer
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                      Google Meet room link is active. Both patient and doctor can join at the scheduled time:
                    </p>

                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={selectedAppointmentDetails.meetingUrl || generateMeetingLink(selectedAppointmentDetails.doctorName, selectedAppointmentDetails.date, selectedAppointmentDetails.time)}
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-[11px] text-slate-700 font-mono select-all"
                      />
                      <button
                        onClick={() => {
                          const target = selectedAppointmentDetails;
                          setSelectedAppointmentDetails(null);
                          dispatch(startCall(target));
                        }}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                      >
                        <Video size={13} />
                        <span>Join In-App</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Fee</span>
                  <span className="font-black text-slate-900 text-sm">{selectedAppointmentDetails.fee}</span>
                </div>

                {selectedAppointmentDetails.location && (
                  <div className="py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium block mb-0.5">Clinic Location / Address</span>
                    <span className="font-bold text-slate-800">{selectedAppointmentDetails.location}</span>
                  </div>
                )}

                {selectedAppointmentDetails.notes && (
                  <div className="py-2">
                    <span className="text-slate-500 font-medium block mb-1">Patient Symptoms / Notes</span>
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-slate-700 font-medium">
                      {selectedAppointmentDetails.notes}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setSelectedAppointmentDetails(null)}
                  className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-bold text-xs uppercase tracking-wider"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: Reschedule Appointment */}
      <AnimatePresence>
        {rescheduleItem && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRescheduleItem(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-md bg-white rounded-t-[36px] sm:rounded-[36px] shadow-2xl p-6 space-y-5 z-[110]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-extrabold text-base text-slate-800">Reschedule Visit</h3>
                  <p className="text-xs text-slate-400">Select new date & time for {rescheduleItem.doctorName}</p>
                </div>
                <button onClick={() => setRescheduleItem(null)} className="p-2 bg-slate-100 rounded-full">
                  <X size={16} className="text-slate-600" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">New Date</label>
                  <input
                    type="date"
                    min={format(new Date(), 'yyyy-MM-dd')}
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full bg-slate-50 rounded-2xl p-3 text-xs font-bold text-slate-800 border border-slate-200"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Select Available Slot ({rescheduleItem.mode === 'Video Call' ? '30m Series' : 'In-Clinic'})
                  </label>
                  
                  {rescheduleItem.mode === 'Video Call' ? (
                    <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1 no-scrollbar">
                      {rescheduleVirtualSlots.map((slot) => {
                        const isSelected = rescheduleTime === slot.start;
                        const isUnavailable = slot.isBooked || slot.isPast;

                        return (
                          <button
                            key={slot.id}
                            type="button"
                            disabled={isUnavailable}
                            onClick={() => {
                              setRescheduleTime(slot.start);
                              setRescheduleSlotLabel(slot.label);
                            }}
                            className={cn(
                              "p-2 rounded-xl border text-left text-xs transition-all",
                              isSelected
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm font-bold"
                                : isUnavailable
                                ? "bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed"
                                : "bg-white hover:bg-indigo-50/50 border-slate-200 text-slate-800 cursor-pointer font-medium"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span>{slot.start}</span>
                              <span className="text-[8px] font-bold uppercase">
                                {isUnavailable ? (slot.isPast ? 'Passed' : 'Booked') : 'Open'}
                              </span>
                            </div>
                            <span className="text-[9px] opacity-75 block">until {slot.end}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1 no-scrollbar">
                      {rescheduleClinicSlots.map((slot) => {
                        const isSelected = rescheduleTime === slot.time;
                        const isUnavailable = slot.isBooked || slot.isPast;

                        return (
                          <button
                            key={slot.id}
                            type="button"
                            disabled={isUnavailable}
                            onClick={() => {
                              setRescheduleTime(slot.time);
                              setRescheduleSlotLabel(`${slot.time} (In-Clinic)`);
                            }}
                            className={cn(
                              "p-2 rounded-xl border text-center text-xs transition-all",
                              isSelected
                                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm font-bold"
                                : isUnavailable
                                ? "bg-slate-100 text-slate-400 opacity-50 cursor-not-allowed"
                                : "bg-white hover:bg-emerald-50/50 border-slate-200 text-slate-800 cursor-pointer font-medium"
                            )}
                          >
                            <span>{slot.time}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setRescheduleItem(null)}
                  className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-2xl font-bold text-xs uppercase"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmReschedule}
                  className="flex-1 bg-slate-900 text-white py-3 rounded-2xl font-bold text-xs uppercase shadow-md"
                >
                  Confirm Reschedule
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: Cancel Appointment */}
      <AnimatePresence>
        {cancelItem && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCancelItem(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-md bg-white rounded-t-[36px] sm:rounded-[36px] shadow-2xl p-6 space-y-5 z-[110]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                    <AlertCircle size={18} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-800">Cancel Appointment</h3>
                    <p className="text-xs text-slate-400">Cancel visit with {cancelItem.doctorName}</p>
                  </div>
                </div>
                <button onClick={() => setCancelItem(null)} className="p-2 bg-slate-100 rounded-full">
                  <X size={16} className="text-slate-600" />
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Reason for cancellation</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-slate-50 rounded-2xl p-3 text-xs font-bold text-slate-800 border border-slate-200"
                >
                  <option value="Schedule conflict">Schedule conflict</option>
                  <option value="Health condition improved">Health condition improved</option>
                  <option value="Selected another specialist">Selected another specialist</option>
                  <option value="Financial reasons">Financial reasons</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setCancelItem(null)}
                  className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-2xl font-bold text-xs uppercase"
                >
                  Keep Visit
                </button>
                <button
                  onClick={handleConfirmCancel}
                  className="flex-1 bg-rose-600 text-white py-3 rounded-2xl font-bold text-xs uppercase shadow-md hover:bg-rose-700 transition-colors"
                >
                  Confirm Cancellation
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: Advance Payment Gateway (₹200) */}
      {paymentModalItem && (
        <AdvancePaymentModal
          isOpen={!!paymentModalItem}
          onClose={() => setPaymentModalItem(null)}
          appointment={paymentModalItem}
          onPaymentSuccess={(txnId) => {
            dispatch(payAdvanceFee({ id: paymentModalItem.id, transactionId: txnId, amount: paymentModalItem.advanceFeeAmount || 200 }));
            toast.success('Payment of ₹200 Successful! Appointment Confirmed.');
            const targetApp = { ...paymentModalItem, status: 'upcoming' as const, advancePaid: true };
            setPaymentModalItem(null);
            setWorkspaceModalItem(targetApp);
          }}
        />
      )}

      {/* MODAL 6: Direct Doctor Consultation Workspace & 3D Spine Dashboard */}
      {workspaceModalItem && (
        <ConsultationWorkspaceModal
          isOpen={!!workspaceModalItem}
          onClose={() => setWorkspaceModalItem(null)}
          appointment={workspaceModalItem}
        />
      )}
    </div>
  );
};
