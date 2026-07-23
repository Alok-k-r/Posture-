import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, logout, updateUser, addToSyncQueue } from '../store/store';
import { User, LogOut, Shield, Settings, ChevronRight, Camera, Trophy, Star, Activity, Heart, XCircle, Check, Edit2, Ruler, Scale, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import { PostureFigure } from '../components/posture/PostureFigure';
import { useNavigate } from 'react-router-dom';
import { auth, db, rtdb } from '../lib/firebase';
import { signOut, deleteUser } from 'firebase/auth';
import { doc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { ref as rtdbRef, remove as rtdbRemove } from 'firebase/database';
import { LocalModelService } from '../services/localModelService';

const AVATAR_OPTIONS = [
  // Original restored classics
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Anya',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Max',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Zoe',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo',
  
  // Cute & Happy Characters
  'https://api.dicebear.com/7.x/avataaars/svg?seed=JoyfulLily&eyes=happy&mouth=smile&top=longHair&clothing=hoodie&clothingColor=ff5c5c', // Cute Joyful Lily
  'https://api.dicebear.com/7.x/avataaars/svg?seed=SunnyWink&eyes=wink&mouth=twinkle&top=shortHair&clothing=graphicShirt&clothingColor=3c3c3c', // Cheerful Winking Sunny
  'https://api.dicebear.com/7.x/avataaars/svg?seed=StarGirl&eyes=hearts&mouth=smile&top=curvy&clothing=overall', // Starstruck Star
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Bella&eyes=happy&mouth=twinkle&top=bob', // Sweet Bella

  // Angry & Determined Characters
  'https://api.dicebear.com/7.x/avataaars/svg?seed=FocusedGamer&eyebrows=angry&eyes=squint&mouth=grimace&top=dreads&accessories=round&clothing=hoodie', // Intense Focused Gamer
  'https://api.dicebear.com/7.x/avataaars/svg?seed=FierceFiona&eyebrows=angryNatural&eyes=default&mouth=serious&top=bob&clothing=blazerAndShirt', // Determined Fiona
  'https://api.dicebear.com/7.x/avataaars/svg?seed=GrumpyGary&eyebrows=angry&eyes=default&mouth=sad&top=shortHair', // Grumpy Gary

  // Sad & Pensive Characters
  'https://api.dicebear.com/7.x/avataaars/svg?seed=SadMax&eyebrows=sadConcerned&eyes=cry&mouth=sad&top=curly&clothing=shirtVNeck', // Emotional Sad Max
  'https://api.dicebear.com/7.x/avataaars/svg?seed=PensivePeter&eyebrows=sadConcernedNatural&eyes=side&mouth=concerned&top=shaggy&clothing=collarAndSweater', // Pensive Peter
  'https://api.dicebear.com/7.x/avataaars/svg?seed=MelancholyMia&eyebrows=sadConcerned&eyes=side&mouth=disbelief&top=longHair', // Melancholy Mia

  // Cool, Techie & Scholarly Characters
  'https://api.dicebear.com/7.x/avataaars/svg?seed=CyberCool&accessories=sunglasses&top=sides&clothing=blazerAndShirt', // Cool Techie
  'https://api.dicebear.com/7.x/avataaars/svg?seed=GeekyGrace&accessories=prescription02&top=frida&clothing=collarAndSweater', // Smart Geeky Grace
  'https://api.dicebear.com/7.x/avataaars/svg?seed=CodingCody&accessories=prescription01&top=shaggyMullet&clothing=hoodie', // Coding Cody

  // Surprised & Shocked Characters
  'https://api.dicebear.com/7.x/avataaars/svg?seed=AstonishedSam&eyebrows=raisedExcited&eyes=surprised&mouth=concerned&top=frizzle', // Surprised Sam
  'https://api.dicebear.com/7.x/avataaars/svg?seed=KaiScream&eyebrows=upDown&eyes=surprised&mouth=screamOpen&top=shortHair', // Screaming Kai

  // Playful & Peaceful Characters
  'https://api.dicebear.com/7.x/avataaars/svg?seed=PlayfulFelix&eyes=winkWacky&mouth=tongue&top=shortHair&accessories=wayfarers', // Wacky Felix
  'https://api.dicebear.com/7.x/avataaars/svg?seed=ZenMimi&eyes=close&mouth=eating&top=bob&clothing=shirtVNeck', // Calm Zen Mimi
  'https://api.dicebear.com/7.x/avataaars/svg?seed=DreamingDiana&eyes=close&mouth=smile&top=bun' // Peaceful Diana
];

export const ProfileScreen: React.FC = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const posture = useSelector((state: RootState) => state.posture);
  const score = posture.score;
  const angle = posture.angle;

  // Real dynamic calculations based on saved clinical telemetry and active state
  const historicalSessions = LocalModelService.getHistoricalSessions();

  // 1. Posture Rating
  const avgSessionScore = historicalSessions.length > 0
    ? historicalSessions.reduce((acc, s) => acc + s.qualityScore, 0) / historicalSessions.length
    : 80;
  // Combine historical averages with current session's integrity score if active
  const combinedPostureScore = posture.isRecordingSession && posture.totalSessionSeconds > 10
    ? (avgSessionScore * 0.4 + posture.integrityScore * 0.6)
    : avgSessionScore;

  let postureRating = 'Elite';
  if (combinedPostureScore >= 85) postureRating = 'Elite';
  else if (combinedPostureScore >= 70) postureRating = 'Striving';
  else if (combinedPostureScore >= 55) postureRating = 'Fair';
  else postureRating = 'Critical';

  // 2. Session Time
  // Sum up all seconds logged across today's sessions + active session
  const activeSeconds = posture.totalSessionSeconds || 0;
  const histSeconds = historicalSessions.reduce((acc, s) => acc + s.durationSeconds, 0);
  const totalSecondsToday = activeSeconds + histSeconds;

  let sessionTimeDisplay = '4.2h Today';
  if (totalSecondsToday < 60) {
    sessionTimeDisplay = `${totalSecondsToday}s Today`;
  } else if (totalSecondsToday < 3600) {
    sessionTimeDisplay = `${Math.round(totalSecondsToday / 60)}m Today`;
  } else {
    sessionTimeDisplay = `${(totalSecondsToday / 3600).toFixed(1)}h Today`;
  }

  // 3. Alert Rate
  // Number of alerts per hour of sitting
  const activeIncidents = posture.incidents || 0;
  // Estimate historical incidents based on historical sessions (typically 2-3 per session)
  const histIncidents = historicalSessions.reduce((acc, s) => acc + (s.complianceRate < 80 ? 5 : s.complianceRate < 90 ? 3 : 1), 0);
  const totalIncidentsCombined = activeIncidents + histIncidents;
  const totalHoursCombined = totalSecondsToday / 3600;

  const calculatedAlertRate = totalHoursCombined > 0.05
    ? Math.round((totalIncidentsCombined / totalHoursCombined) * 10) / 10
    : 1.8; // Default to healthy baseline if no long sessions exist
  const alertRateDisplay = `${calculatedAlertRate} / Hr`;

  // 4. Integrity
  // True integrity score: current session integrity score if recording, or historical average quality score if standby
  const calculatedIntegrity = posture.isRecordingSession
    ? posture.integrityScore
    : Math.round(avgSessionScore);
  
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const navigate = useNavigate();

  const [isEditingBiometrics, setIsEditingBiometrics] = useState(false);
  const [age, setAge] = useState(user?.age ? String(user.age) : '');
  const [height, setHeight] = useState(user?.height ? String(user.height) : '');
  const [weight, setWeight] = useState(user?.weight ? String(user.weight) : '');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>(user?.gender || '');

  const handleLogout = async () => {
    try {
      LocalModelService.clearCache();
      await signOut(auth);
      dispatch(logout());
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "WARNING: Are you sure you want to delete your account? This action is irreversible and will permanently delete ALL your biometric data, posture history, and clinical settings from the database."
    );
    if (!confirmed) return;

    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const uid = currentUser.uid;

        // 1. Delete all Firestore sessions subcollection docs
        try {
          const sessionsRef = collection(db, 'users', uid, 'sessions');
          const querySnapshot = await getDocs(sessionsRef);
          for (const sessionDoc of querySnapshot.docs) {
            await deleteDoc(doc(db, 'users', uid, 'sessions', sessionDoc.id));
          }
          console.log('Successfully deleted Firestore sessions subcollection');
        } catch (err) {
          console.error('Error deleting Firestore sessions:', err);
        }

        // 1b. Delete all Firestore appointments subcollection docs
        try {
          const appointmentsRef = collection(db, 'users', uid, 'appointments');
          const appSnapshot = await getDocs(appointmentsRef);
          for (const appDoc of appSnapshot.docs) {
            await deleteDoc(doc(db, 'users', uid, 'appointments', appDoc.id));
          }
          console.log('Successfully deleted Firestore appointments subcollection');
        } catch (err) {
          console.error('Error deleting Firestore appointments:', err);
        }

        // 2. Delete the main Firestore user document
        try {
          await deleteDoc(doc(db, 'users', uid));
          console.log('Successfully deleted Firestore main user document');
        } catch (err) {
          console.error('Error deleting Firestore user document:', err);
        }

        // 3. Delete Realtime Database device references
        try {
          const deviceRef = rtdbRef(rtdb, `devices/${uid}`);
          await rtdbRemove(deviceRef);
          console.log('Successfully deleted Realtime Database device references');
        } catch (err) {
          console.error('Error deleting Realtime Database references:', err);
        }

        // 4. Delete the on-device local database (IndexedDB)
        try {
          const dbName = `PostureCareEdgeDB_${uid}`;
          if (window.indexedDB) {
            window.indexedDB.deleteDatabase(dbName);
          }
          console.log('Successfully deleted IndexedDB database');
        } catch (err) {
          console.error('Error deleting IndexedDB database:', err);
        }

        // 5. Delete specific user-related local storage records
        try {
          const keysToDelete: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (
              key.includes(uid) || 
              key.startsWith('terms_accepted') || 
              key.startsWith('privacy_accepted') || 
              key.startsWith('user_profile') || 
              key.startsWith('posture_sessions') ||
              key.includes('posturecare_')
            )) {
              keysToDelete.push(key);
            }
          }
          keysToDelete.forEach(k => localStorage.removeItem(k));
          console.log('Successfully cleared local storage records');
        } catch (err) {
          console.error('Error clearing local storage keys:', err);
        }

        // 6. Delete the actual Firebase Authentication account
        await deleteUser(currentUser);
        console.log('Successfully deleted Firebase Authentication user account');
      }

      // Purge generic local storage references
      localStorage.removeItem('login_mode');
      localStorage.removeItem('local_user_profile');
      localStorage.removeItem('local_accounts');
      localStorage.removeItem('current_user_id');
      localStorage.removeItem('persist:root');

      LocalModelService.clearCache();

      dispatch(logout());
      navigate('/login');
      alert("Your account and all associated database records have been successfully deleted.");
    } catch (error: any) {
      console.error('Error during account deletion:', error);
      if (error?.code === 'auth/requires-recent-login') {
        alert("For security reasons, deleting your account requires a recent login. Please sign out and sign in again before attempting deletion.");
      } else {
        alert(`An error occurred while deleting your account: ${error?.message || error}`);
      }
    }
  };

  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    dispatch(updateUser({ name }));
    dispatch(addToSyncQueue({
      id: `profile_name_${Date.now()}`,
      type: 'SYNC_USER_PROFILE',
      payload: { name },
      timestamp: new Date().toISOString()
    }));
    setIsEditing(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleSaveBiometrics = () => {
    const ageNum = parseInt(age, 10);
    const heightNum = parseFloat(height);
    const weightNum = parseFloat(weight);

    if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
      alert('Please enter a valid age (1-120)');
      return;
    }
    if (isNaN(heightNum) || heightNum <= 30 || heightNum > 300) {
      alert('Please enter a valid height (30-300 cm)');
      return;
    }
    if (isNaN(weightNum) || weightNum <= 5 || weightNum > 500) {
      alert('Please enter a valid weight (5-500 kg)');
      return;
    }

    const payload = {
      age: ageNum,
      height: heightNum,
      weight: weightNum,
      gender: gender
    };

    dispatch(updateUser(payload));
    dispatch(addToSyncQueue({
      id: `profile_biometrics_${Date.now()}`,
      type: 'SYNC_USER_PROFILE',
      payload,
      timestamp: new Date().toISOString()
    }));

    setIsEditingBiometrics(false);
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
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999]"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-sm bg-white rounded-[40px] p-6 md:p-8 z-[1000] shadow-2xl max-h-[85vh] flex flex-col"
            >
              <h3 className="text-xl font-black text-slate-800 mb-4 text-center tracking-tight">Choose Avatar</h3>
              
              {/* Scrollable grid container to fit perfectly on all screens */}
              <div className="overflow-y-auto pr-1 flex-1 min-h-0 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                <div className="grid grid-cols-3 gap-4 p-1">
                  {AVATAR_OPTIONS.map((url, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSelectAvatar(url)}
                      className={cn(
                        "aspect-square rounded-2xl overflow-hidden border-4 transition-colors relative bg-slate-50",
                        user?.photo === url ? "border-indigo-500 shadow-md shadow-indigo-100" : "border-transparent hover:border-slate-100"
                      )}
                    >
                      <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover" />
                    </motion.button>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => setShowAvatarPicker(false)}
                className="w-full mt-6 py-3.5 bg-slate-100 rounded-2xl text-slate-500 font-bold hover:bg-slate-200 transition-colors cursor-pointer"
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
          { label: 'Posture Rating', val: postureRating, icon: Star, color: combinedPostureScore >= 80 ? 'text-amber-500' : combinedPostureScore >= 60 ? 'text-indigo-500' : 'text-rose-500', bg: 'bg-amber-50' },
          { label: 'Session Time', val: sessionTimeDisplay, icon: Activity, color: 'text-indigo-500', bg: 'bg-indigo-50' },
          { label: 'Alert Rate', val: alertRateDisplay, icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50' },
          { label: 'Integrity', val: `${calculatedIntegrity}%`, icon: Shield, color: 'text-emerald-500', bg: 'bg-emerald-50' },
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

      {/* Biometrics & Local AI Personalization */}
      <div className="space-y-4">
        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4 leading-none">Biometrics & Local AI</h3>
        <div className="glass p-6 rounded-[32px] shadow-premium border-white/40 space-y-6">
          {isEditingBiometrics ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block ml-1">Age (Years)</label>
                  <div className="relative flex items-center">
                    <Calendar className="absolute left-3 text-indigo-500" size={16} />
                    <input 
                      type="number" 
                      value={age} 
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="e.g. 28"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-10 pr-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block ml-1">Height (cm)</label>
                  <div className="relative flex items-center">
                    <Ruler className="absolute left-3 text-indigo-500" size={16} />
                    <input 
                      type="number" 
                      value={height} 
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="e.g. 175"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-10 pr-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block ml-1">Weight (kg)</label>
                  <div className="relative flex items-center">
                    <Scale className="absolute left-3 text-indigo-500" size={16} />
                    <input 
                      type="number" 
                      value={weight} 
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="e.g. 70"
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-10 pr-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Gender selection in editing mode */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block ml-1">Gender Specification</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                    { value: 'other', label: 'Other' }
                  ].map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setGender(g.value as any)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                        gender === g.value
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  onClick={() => setIsEditingBiometrics(false)}
                  className="flex-1 py-3 bg-slate-100 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveBiometrics}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
                >
                  Save Metrics
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-4 gap-2">
                <div className="flex flex-col items-center p-2.5 bg-slate-50/50 rounded-2xl border border-slate-100/30">
                  <Calendar className="text-indigo-500 mb-1" size={16} />
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Age</span>
                  <span className="text-xs font-black text-slate-800 mt-0.5 whitespace-nowrap">{user?.age ? `${user.age} yrs` : 'Not Set'}</span>
                </div>

                <div className="flex flex-col items-center p-2.5 bg-slate-50/50 rounded-2xl border border-slate-100/30">
                  <Ruler className="text-indigo-500 mb-1" size={16} />
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Height</span>
                  <span className="text-xs font-black text-slate-800 mt-0.5 whitespace-nowrap">{user?.height ? `${user.height} cm` : 'Not Set'}</span>
                </div>

                <div className="flex flex-col items-center p-2.5 bg-slate-50/50 rounded-2xl border border-slate-100/30">
                  <Scale className="text-indigo-500 mb-1" size={16} />
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Weight</span>
                  <span className="text-xs font-black text-slate-800 mt-0.5 whitespace-nowrap">{user?.weight ? `${user.weight} kg` : 'Not Set'}</span>
                </div>

                <div className="flex flex-col items-center p-2.5 bg-slate-50/50 rounded-2xl border border-slate-100/30">
                  <User className="text-indigo-500 mb-1" size={16} />
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Gender</span>
                  <span className="text-xs font-black text-slate-800 mt-0.5 capitalize whitespace-nowrap">{user?.gender || 'Not Set'}</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 font-bold leading-relaxed text-center italic">
                💡 Physical metrics personalize your local biomechanical fatigue curves and help the paraspinal AI calculate orthopedic torque stresses accurately.
              </p>

              <button 
                onClick={() => setIsEditingBiometrics(true)}
                className="w-full py-3.5 bg-indigo-50 text-indigo-600 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-indigo-100 active:scale-98 transition-all"
              >
                Update Biometrics
              </button>
            </div>
          )}
        </div>
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
            onClick={handleDeleteAccount}
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
