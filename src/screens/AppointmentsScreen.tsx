import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Calendar, MapPin, Star, Plus, Filter, ArrowUpDown, X, Loader2, Check, RefreshCw, User } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, addAppointment, removeAppointment, addToSyncQueue, setAppointmentStatus, AppointmentStatus } from '../store/store';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

const CLINICS = [
  { name: 'Dr. Rahul Sharma', specialty: 'Orthopedic', hospital: 'Apollo Hospital', rating: 4.8, exp: 12, fee: '₹1200' },
  { name: 'Dr. Priya Verma', specialty: 'Physiotherapist', hospital: 'Fortis Clinic', rating: 4.9, exp: 8, fee: '₹800' },
  { name: 'Dr. Amit Patel', specialty: 'Neurologist', hospital: 'Max Healthcare', rating: 4.7, exp: 15, fee: '₹2000' },
  { name: 'Dr. Sneha Rao', specialty: 'Spine Specialist', hospital: 'Global Spine Center', rating: 4.9, exp: 10, fee: '₹1500' },
  { name: 'Dr. Vikram Malhotra', specialty: 'Cardiologist', hospital: 'Medanta', rating: 4.8, exp: 20, fee: '₹2500' }
];

export const AppointmentsScreen: React.FC = () => {
  const dispatch = useDispatch();
  const appointments = useSelector((state: RootState) => state.appointments.list);
  const { isOnline, syncQueue } = useSelector((state: RootState) => state.sync);
  
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'Upcoming' | 'History'>('All');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('10:00');

  const filteredDocs = useMemo(() => {
    if (!query.trim()) return [];
    return CLINICS.filter(d => 
      d.name.toLowerCase().includes(query.toLowerCase()) || 
      d.specialty.toLowerCase().includes(query.toLowerCase())
    );
  }, [query]);

  const handleAdd = () => {
    if (!selectedDoc) return;
    const newAppointment = {
      id: Math.random().toString(36).substr(2, 9),
      doctorName: selectedDoc.name,
      specialty: selectedDoc.specialty,
      hospital: selectedDoc.hospital,
      date,
      time,
      status: 'pending' as const,
      fee: selectedDoc.fee
    };

    // Update local state immediately
    dispatch(addAppointment(newAppointment));
    setActiveTab('Pending');

    // If offline, queue it for backend sync
    if (!isOnline) {
      dispatch(addToSyncQueue({
        id: newAppointment.id,
        type: 'ADD_APPOINTMENT',
        payload: newAppointment,
        timestamp: new Date().toISOString()
      }));
    }

    setShowModal(false);
    setSelectedDoc(null);
    setQuery('');
  };

  return (
    <div className="p-6 space-y-6 pb-24 relative z-10">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div className="space-y-1">
          <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none">Visits</h2>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2">Clinical Management</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="w-12 h-12 rounded-2xl bg-slate-900 shadow-premium flex items-center justify-center text-white active:scale-90 transition-all"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search providers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="glass w-full rounded-[24px] py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-slate-100 placeholder:text-slate-400 font-bold border-white/50"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {['All', 'Pending', 'Upcoming', 'History'].map(f => (
            <button 
              key={f} 
              onClick={() => setActiveTab(f as any)}
              className={cn(
                "px-6 py-2.5 rounded-2xl glass border-white/40 text-[10px] font-black uppercase tracking-widest transition-all shadow-soft whitespace-nowrap",
                activeTab === f ? "bg-slate-900 text-white shadow-premium" : "text-slate-400 hover:text-slate-800"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-5 mt-4">
        <AnimatePresence mode="popLayout">
          {appointments
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .filter(a => {
              const matchesSearch = a.doctorName.toLowerCase().includes(search.toLowerCase());
              if (activeTab === 'All') return matchesSearch;
              if (activeTab === 'Pending') return matchesSearch && a.status === 'pending';
              if (activeTab === 'Upcoming') return matchesSearch && a.status === 'upcoming';
              if (activeTab === 'History') return matchesSearch && a.status === 'completed';
              return matchesSearch;
            })
            .map(app => {
              const isPendingSync = syncQueue.some(q => q.id === app.id);
              const statusConfig = {
                pending: { label: 'Waiting Approval', text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
                upcoming: { label: 'Confirmed', text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                completed: { label: 'Visited', text: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-300' },
              }[app.status];

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={app.id}
                  className="glass p-6 rounded-[40px] shadow-premium flex flex-col gap-6 relative overflow-hidden border-white/60"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-3xl bg-white border border-slate-100 flex items-center justify-center shadow-soft">
                      <User className="text-slate-300" size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-extrabold text-slate-800 leading-none tracking-tight">{app.doctorName}</h4>
                        <div className={cn("px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border", statusConfig.bg, statusConfig.text, statusConfig.border)}>
                          {statusConfig.label}
                        </div>
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5">{app.specialty}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-black text-slate-800 tracking-tighter">{app.fee}</div>
                      {isPendingSync && <span className="text-[8px] font-black text-indigo-500 uppercase tracking-tighter">Syncing...</span>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-white/40 p-4 rounded-[28px] border border-white/60 shadow-inner">
                    <div className="flex flex-col gap-1 sm:flex-row sm:gap-6">
                      <div className="flex items-center gap-2.5">
                        <Calendar size={16} className="text-slate-400" />
                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">{format(new Date(app.date), 'MMM dd, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Loader2 size={16} className="text-slate-400" />
                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-widest">{app.time}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {app.status === 'pending' && (
                        <div className="flex flex-col items-center gap-1">
                          <button 
                            onClick={() => dispatch(setAppointmentStatus({ id: app.id, status: 'upcoming' }))}
                            className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-200 active:scale-95 transition-all"
                          >
                            Approve
                          </button>
                          <span className="text-[7px] font-black text-emerald-600/50 uppercase tracking-tighter">Dr. Approval (Demo)</span>
                        </div>
                      )}
                      {app.status === 'upcoming' && (
                        <button 
                          onClick={() => dispatch(setAppointmentStatus({ id: app.id, status: 'completed' }))}
                          className="px-4 py-2 rounded-xl bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                        >
                          Complete
                        </button>
                      )}
                      {(app.status === 'pending' || app.status === 'upcoming') && (
                        <button 
                          onClick={() => dispatch(removeAppointment(app.id))}
                          className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 hover:bg-rose-100 transition-colors"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
        </AnimatePresence>

        {appointments.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-24 h-24 bg-slate-50 rounded-[40px] flex items-center justify-center text-slate-300 shadow-inner">
              <Calendar size={40} />
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-black text-slate-800 tracking-tight">No Visits Scheduled</h4>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest max-w-[200px] mx-auto leading-relaxed">Connect with top specialists to maintain your spinal health.</p>
            </div>
            <button 
              onClick={() => setShowModal(true)}
              className="bg-white border-2 border-slate-100 text-slate-800 px-8 py-4 rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-soft active:scale-95 transition-all"
            >
              Book First Appointment
            </button>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-text/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative w-full max-w-lg bg-white rounded-t-[40px] sm:rounded-[40px] shadow-2xl p-8 pb-10 flex flex-col gap-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black">Schedule Visit</h3>
                <button onClick={() => setShowModal(false)} className="p-2 bg-bg rounded-full"><X size={20} /></button>
              </div>

              <div className="space-y-4">
                {/* Doctor Search */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-textMuted uppercase ml-2">Select Specialist</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted w-4 h-4" />
                    <input 
                      type="text" 
                      placeholder="Search by name or specialty..."
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        if (selectedDoc) setSelectedDoc(null);
                      }}
                      className="w-full bg-borderLight rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none ring-2 ring-transparent focus:ring-green/20"
                    />
                    
                    {/* Autocomplete Dropdown */}
                    <AnimatePresence>
                      {query.length > 0 && !selectedDoc && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-[110%] left-0 right-0 bg-white rounded-2xl shadow-xl border border-border max-h-60 overflow-y-auto z-[110]"
                        >
                          {filteredDocs.map((doc) => (
                            <button
                              key={doc.name}
                              onClick={() => {
                                setSelectedDoc(doc);
                                setQuery(doc.name);
                              }}
                              className="w-full p-4 flex items-center justify-between hover:bg-bg transition-colors border-b border-borderLight last:border-0"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-green/10 text-green flex items-center justify-center font-bold">
                                  {doc.name[4]}
                                </div>
                                <div className="text-left">
                                  <p className="text-sm font-bold">{doc.name}</p>
                                  <p className="text-[10px] text-greenDark font-bold uppercase">{doc.specialty}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 text-yellow">
                                <Star size={12} fill="currentColor" />
                                <span className="text-xs font-bold">{doc.rating}</span>
                              </div>
                            </button>
                          ))}
                          {filteredDocs.length === 0 && (
                            <div className="p-6 text-center text-xs text-textMuted font-medium">No specialists found</div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {selectedDoc && (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-5 bg-emerald-50 rounded-[28px] border border-emerald-100 flex items-center gap-4 shadow-soft"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white border border-emerald-100 flex items-center justify-center text-emerald-500 shadow-soft">
                      <User size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest">Selected Expert</p>
                      <h4 className="font-black text-slate-800 text-sm tracking-tight">{selectedDoc.name}</h4>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{selectedDoc.specialty} · {selectedDoc.fee}</p>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-emerald-100">
                      <Check size={18} className="text-emerald-500" />
                    </div>
                  </motion.div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-textMuted uppercase ml-2">Date</label>
                    <input 
                      type="date" 
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-borderLight rounded-2xl py-4 px-4 text-sm focus:outline-none" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-textMuted uppercase ml-2">Time</label>
                    <input 
                      type="time" 
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full bg-borderLight rounded-2xl py-4 px-4 text-sm focus:outline-none" 
                    />
                  </div>
                </div>
              </div>

              <button
                disabled={!selectedDoc}
                onClick={handleAdd}
                className="w-full bg-slate-900 text-white py-5 rounded-[28px] font-black text-[11px] uppercase tracking-[0.2em] shadow-premium active:scale-95 transition-all disabled:opacity-50 disabled:grayscale mb-2"
              >
                Complete Booking
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
