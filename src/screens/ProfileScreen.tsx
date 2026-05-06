import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, logout, updateUser } from '../store/store';
import { User, LogOut, Shield, Settings, ChevronRight, Camera, Trophy, Star, Activity, Heart, XCircle, Check, Edit2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { PostureFigure } from '../components/posture/PostureFigure';
import { useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

const AVATAR_OPTIONS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Anya',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Max',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo',
];

export const ProfileScreen: React.FC = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const posture = useSelector((state: RootState) => state.posture);
  const score = posture.score;
  const angle = posture.angle;
  
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      dispatch(logout());
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    dispatch(updateUser({ name }));
    setIsEditing(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleSelectAvatar = (url: string) => {
    dispatch(updateUser({ photo: url }));
    setShowAvatarPicker(false);
  };

  return (
    <div className="p-6 space-y-8 pb-24 relative z-10">
      {/* Header with Photo */}
      <div className="flex flex-col items-center gap-4 text-center mt-6">
        <div className="relative">
          <motion.div 
             className={cn(
               "w-32 h-32 rounded-[40px] p-1.5 shadow-premium transition-colors duration-500",
               score > 80 ? "bg-emerald-500" : score > 65 ? "bg-orange" : "bg-red"
             )}
          >
            <div className="w-full h-full rounded-[36px] bg-white p-1 overflow-hidden relative group">
              <img 
                src={user?.photo || AVATAR_OPTIONS[0]} 
                alt="Profile" 
                className="w-full h-full rounded-[34px] object-cover"
              />
              <motion.button 
                whileHover={{ opacity: 1 }}
                onClick={() => setShowAvatarPicker(true)}
                className="absolute inset-0 bg-black/40 opacity-0 flex items-center justify-center transition-opacity"
              >
                <Camera className="text-white" size={24} />
              </motion.button>
            </div>
          </motion.div>
          <button 
            onClick={() => setShowAvatarPicker(true)}
            className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-2xl border border-slate-100 shadow-premium flex items-center justify-center text-indigo-500 active:scale-90 transition-all"
          >
            <Camera size={18} />
          </button>
        </div>
        
        <div className="space-y-1 w-full max-w-xs mx-auto">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="text-2xl font-extrabold text-slate-800 tracking-tight text-center bg-slate-100 rounded-xl px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                autoFocus
              />
              <button 
                onClick={handleSave}
                className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95"
              >
                <Check size={20} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 group">
              <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">{user?.name}</h2>
              <button 
                onClick={() => setIsEditing(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-indigo-500"
              >
                <Edit2 size={18} />
              </button>
            </div>
          )}
          <p className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full inline-block mt-2 uppercase tracking-[0.2em]">
            Verified User · {user?.id?.slice(-6).toUpperCase()}
          </p>
        </div>
      </div>

      {/* Avatar Picker Modal */}
      <AnimatePresence>
        {showAvatarPicker && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAvatarPicker(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white rounded-[40px] p-8 z-[101] shadow-2xl"
            >
              <h3 className="text-xl font-black text-slate-800 mb-6 text-center tracking-tight">Choose Avatar</h3>
              <div className="grid grid-cols-3 gap-4">
                {AVATAR_OPTIONS.map((url, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleSelectAvatar(url)}
                    className={cn(
                      "aspect-square rounded-2xl overflow-hidden border-4 transition-colors",
                      user?.photo === url ? "border-indigo-500" : "border-slate-50"
                    )}
                  >
                    <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover" />
                  </motion.button>
                ))}
              </div>
              <button 
                onClick={() => setShowAvatarPicker(false)}
                className="w-full mt-8 py-4 bg-slate-100 rounded-2xl text-slate-500 font-bold hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mini Figure Preview - Glass Enhancement */}
      <div className="glass p-6 rounded-[32px] shadow-soft flex items-center gap-6 border-indigo-50/50">
        <div className="w-24 h-24 flex-shrink-0 bg-white shadow-soft rounded-[24px] flex items-center justify-center border border-slate-100">
          <PostureFigure size={100} angle={angle} />
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-black text-slate-800 leading-tight">Live Monitor</h4>
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          </div>
          <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
            {angle < 65 ? "System detects significant slouching. Please recalibrate your seating position." : "Excellent alignment. Sustaining this position promotes spinal longevity."}
          </p>
        </div>
      </div>

      {/* Health Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Posture Rating', val: score > 80 ? 'Elite' : score > 60 ? 'Striving' : 'Critical', icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Session Time', val: '4.2h Today', icon: Activity, color: 'text-indigo-500', bg: 'bg-indigo-50' },
          { label: 'Alert Rate', val: '2.1 / Hr', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50' },
          { label: 'Integrity', val: `${Math.round(score)}%`, icon: Shield, color: 'text-emerald-500', bg: 'bg-emerald-50' },
        ].map((s, i) => (
          <div key={i} className="glass p-5 rounded-[28px] shadow-soft flex items-center gap-4 border-white/40">
             <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-soft", s.bg, s.color)}>
                <s.icon size={18} />
             </div>
             <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                <p className="text-sm font-black text-slate-800">{s.val}</p>
             </div>
          </div>
        ))}
      </div>

      {/* Settings Options */}
      <div className="space-y-4">
        <div className="pt-4 space-y-4">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4 leading-none">Account Security</h3>
          <div className="glass rounded-[40px] shadow-premium divide-y divide-border overflow-hidden border-white/40">
            <button className="w-full flex items-center justify-between p-6 hover:bg-white/40 transition-colors">
              <div className="flex items-center gap-5">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <User size={20} />
                </div>
                <div className="text-left leading-none">
                  <span className="text-sm font-extrabold text-slate-700 tracking-tight block">Clinical Settings</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 block">Device Calibration</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </button>
            <button className="w-full flex items-center justify-between p-6 hover:bg-white/40 transition-colors">
              <div className="flex items-center gap-5">
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                  <Shield size={20} />
                </div>
                <div className="text-left leading-none">
                  <span className="text-sm font-extrabold text-slate-700 tracking-tight block">Security Log</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 block">Session History</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </button>
          </div>
        </div>

        <div className="pt-6 space-y-3">
          <button 
            onClick={handleLogout}
            className="bg-slate-900 w-full p-6 rounded-[32px] flex items-center gap-5 active:scale-[0.98] transition-all shadow-premium"
          >
             <div className="w-12 h-12 rounded-2xl bg-white/10 text-white flex items-center justify-center">
                <LogOut size={20} />
             </div>
             <div className="text-left">
               <p className="text-base font-black text-white tracking-tight">Sign Out</p>
               <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">Exit secure session</p>
             </div>
          </button>
          
          <button 
            onClick={() => confirm("WARNING: Are you sure you want to delete your account? This action is irreversible.")}
            className="w-full p-6 rounded-[32px] flex items-center gap-5 hover:bg-rose-50 transition-colors border border-rose-100/50"
          >
             <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
                <XCircle size={20} className="lucide lucide-x-circle" />
             </div>
             <div className="text-left">
               <p className="text-sm font-black text-rose-500 tracking-tight">Delete Account</p>
               <p className="text-[10px] font-black text-rose-300 uppercase tracking-widest mt-1">Purge clinical data</p>
             </div>
          </button>
        </div>
      </div>
    </div>
  );
};
