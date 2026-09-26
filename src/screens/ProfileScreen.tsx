import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, logout, updateUser, addToSyncQueue } from '../store/store';
import { User, LogOut, Shield, Settings, ChevronRight, Camera, Trophy, Star, Activity, Heart, XCircle, Check, Edit2, Ruler, Scale, Calendar, Upload, ImageIcon, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { PostureFigure } from '../components/posture/PostureFigure';
import { useNavigate } from 'react-router-dom';
import { auth, db, rtdb } from '../lib/firebase';
import { signOut, deleteUser } from 'firebase/auth';
import { doc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { ref as rtdbRef, remove as rtdbRemove } from 'firebase/database';
import { LocalModelService } from '../services/localModelService';
import { SessionService, UnifiedSession } from '../services/sessionService';
import toast from 'react-hot-toast';

// Helper to downscale and optimize user-uploaded gallery images
const compressImage = (file: File, maxSize = 512): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to parse image file'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

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

  const [sessions, setSessions] = useState<UnifiedSession[]>([]);

  // Subscribe to real-time session database updates across Firestore and LocalStorage
  useEffect(() => {
    const userId = user?.id || auth.currentUser?.uid || 'guest';
    const unsubscribe = SessionService.subscribeToSessions(userId, (fetched) => {
      setSessions(fetched);
    });
    return () => unsubscribe();
  }, [user?.id, auth.currentUser?.uid]);

  // Aggregate Today's Completed Sessions + Live Active Session
  const todayStr = new Date().toDateString();
  const todayCompletedSessions = sessions.filter(s => {
    if (!s.date) return false;
    return new Date(s.date).toDateString() === todayStr;
  });

  const activeDuration = posture.isRecordingSession ? posture.totalSessionSeconds || 0 : 0;
  const activeIncidents = posture.isRecordingSession ? posture.incidents || 0 : 0;

  const completedTodayTotalSecs = todayCompletedSessions.reduce((acc, s) => acc + (s.duration || 0), 0);
  const completedTodayIncidents = todayCompletedSessions.reduce((acc, s) => acc + (s.slouches || 0), 0);

  const combinedTodayTotalSecs = completedTodayTotalSecs + activeDuration;
  const totalTodayIncidents = completedTodayIncidents + activeIncidents;

  // All-time session aggregations as fallback
  const allTimeCompletedSecs = sessions.reduce((acc, s) => acc + (s.duration || 0), 0);
  const allTimeIncidents = sessions.reduce((acc, s) => acc + (s.slouches || 0), 0);
  const totalAllTimeSecs = allTimeCompletedSecs + activeDuration;
  const totalAllTimeIncidents = allTimeIncidents + activeIncidents;

  // 1. Session Time (Real time tracked today)
  let sessionTimeDisplay = '0m Today';
  if (combinedTodayTotalSecs > 0) {
    if (combinedTodayTotalSecs < 60) {
      sessionTimeDisplay = `${combinedTodayTotalSecs}s Today`;
    } else if (combinedTodayTotalSecs < 3600) {
      sessionTimeDisplay = `${Math.floor(combinedTodayTotalSecs / 60)}m Today`;
    } else {
      sessionTimeDisplay = `${(combinedTodayTotalSecs / 3600).toFixed(1)}h Today`;
    }
  } else {
    sessionTimeDisplay = '0m Today';
  }

  // 2. Alert Rate (Real slouch incidents per hour)
  let alertRateDisplay = '0 / Hr';
  if (combinedTodayTotalSecs >= 60) {
    const hours = combinedTodayTotalSecs / 3600;
    const rate = Math.round((totalTodayIncidents / hours) * 10) / 10;
    alertRateDisplay = `${rate} / Hr`;
  } else if (totalAllTimeSecs >= 60) {
    const hours = totalAllTimeSecs / 3600;
    const rate = Math.round((totalAllTimeIncidents / hours) * 10) / 10;
    alertRateDisplay = `${rate} / Hr`;
  } else {
    alertRateDisplay = '0 / Hr';
  }

  // 3. Integrity Score (Real alignment score percentage)
  let calculatedIntegrity: number | null = null;
  if (posture.isRecordingSession) {
    calculatedIntegrity = posture.integrityScore;
  } else if (todayCompletedSessions.length > 0 && completedTodayTotalSecs > 0) {
    const weightedSum = todayCompletedSessions.reduce((acc, s) => acc + ((s.score || 0) * (s.duration || 0)), 0);
    calculatedIntegrity = Math.round(weightedSum / completedTodayTotalSecs);
  } else if (sessions.length > 0) {
    const sum = sessions.reduce((acc, s) => acc + (s.score || 0), 0);
    calculatedIntegrity = Math.round(sum / sessions.length);
  }

  // 4. Posture Rating
  let postureRating = '--';
  let ratingColor = 'text-slate-400';
  let ratingBg = 'bg-slate-50';

  if (calculatedIntegrity !== null) {
    if (calculatedIntegrity >= 85) {
      postureRating = 'Elite';
      ratingColor = 'text-amber-500';
      ratingBg = 'bg-amber-50';
    } else if (calculatedIntegrity >= 70) {
      postureRating = 'Good';
      ratingColor = 'text-indigo-500';
      ratingBg = 'bg-indigo-50';
    } else if (calculatedIntegrity >= 55) {
      postureRating = 'Fair';
      ratingColor = 'text-orange-500';
      ratingBg = 'bg-orange-50';
    } else {
      postureRating = 'Needs Work';
      ratingColor = 'text-rose-500';
      ratingBg = 'bg-rose-50';
    }
  }
  
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  const userId = user?.id || auth.currentUser?.uid || 'guest';
  const savedCustomPhoto = typeof window !== 'undefined' ? localStorage.getItem(`user_custom_photo_${userId}`) : null;
  const isCurrentPhotoCustom = Boolean(user?.photo && !AVATAR_OPTIONS.includes(user.photo));
  const customPhoto = isCurrentPhotoCustom ? user?.photo : savedCustomPhoto;

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
      toast.success("Your account and all associated database records have been successfully deleted.");
    } catch (error: any) {
      console.error('Error during account deletion:', error);
      if (error?.code === 'auth/requires-recent-login') {
        toast.error("For security reasons, deleting your account requires a recent login. Please sign out and sign in again before attempting deletion.");
      } else {
        toast.error(`An error occurred while deleting your account: ${error?.message || error}`);
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
      toast.error('Please enter a valid age (1-120)');
      return;
    }
    if (isNaN(heightNum) || heightNum <= 30 || heightNum > 300) {
      toast.error('Please enter a valid height (30-300 cm)');
      return;
    }
    if (isNaN(weightNum) || weightNum <= 5 || weightNum > 500) {
      toast.error('Please enter a valid weight (5-500 kg)');
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file from your gallery');
      return;
    }

    try {
      setIsUploading(true);
      const loadingToast = toast.loading('Processing gallery photo...');
      const optimizedBase64 = await compressImage(file, 512);

      dispatch(updateUser({ photo: optimizedBase64 }));
      dispatch(addToSyncQueue({
        id: `profile_photo_${Date.now()}`,
        type: 'SYNC_USER_PROFILE',
        payload: { photo: optimizedBase64 },
        timestamp: new Date().toISOString()
      }));

      const activeUid = user?.id || auth.currentUser?.uid;
      if (activeUid) {
        try {
          const stored = localStorage.getItem(`user_profile_${activeUid}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            parsed.photo = optimizedBase64;
            localStorage.setItem(`user_profile_${activeUid}`, JSON.stringify(parsed));
          }
          localStorage.setItem(`user_custom_photo_${activeUid}`, optimizedBase64);
        } catch (e) {
          console.warn('Could not cache custom photo in localStorage:', e);
        }
      }

      toast.dismiss(loadingToast);
      toast.success('Profile picture updated from gallery!');
      setShowAvatarPicker(false);
    } catch (err) {
      console.error('Failed to process image:', err);
      toast.error('Failed to process image. Please try another photo.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSelectAvatar = (url: string) => {
    dispatch(updateUser({ photo: url }));
    dispatch(addToSyncQueue({
      id: `profile_photo_${Date.now()}`,
      type: 'SYNC_USER_PROFILE',
      payload: { photo: url },
      timestamp: new Date().toISOString()
    }));
    const activeUid = user?.id || auth.currentUser?.uid;
    if (activeUid) {
      try {
        const stored = localStorage.getItem(`user_profile_${activeUid}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.photo = url;
          localStorage.setItem(`user_profile_${activeUid}`, JSON.stringify(parsed));
        }
      } catch (e) {
        console.warn('Could not cache user photo in localStorage:', e);
      }
    }
    toast.success('Avatar updated!');
    setShowAvatarPicker(false);
  };

  return (
    <div className="p-6 space-y-8 pb-24 relative z-10">
      {/* Hidden file input for gallery DP uploads */}
      <input 
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
        id="profile-gallery-dp-input"
      />

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
                className="absolute inset-0 bg-black/40 opacity-0 flex items-center justify-center transition-opacity cursor-pointer"
                title="Change Profile Picture"
              >
                <Camera className="text-white" size={24} />
              </motion.button>
            </div>
          </motion.div>
          <button 
            onClick={() => setShowAvatarPicker(true)}
            className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-2xl border border-slate-100 shadow-premium flex items-center justify-center text-indigo-500 hover:text-indigo-600 active:scale-90 transition-all cursor-pointer"
            title="Change photo or avatar"
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
                className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95 cursor-pointer"
              >
                <Check size={20} />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 group">
              <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">{user?.name}</h2>
              <button 
                onClick={() => setIsEditing(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-indigo-500 cursor-pointer"
              >
                <Edit2 size={18} />
              </button>
            </div>
          )}
          <p className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full inline-block mt-2 uppercase tracking-[0.2em]">
            Verified User · {user?.id?.slice(-6).toUpperCase()}
          </p>

          {/* Quick Photo Actions */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer border border-indigo-100"
              title="Upload picture from your gallery"
            >
              <Upload size={13} />
              <span>Upload DP</span>
            </button>
            <button 
              onClick={() => setShowAvatarPicker(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs shadow-xs active:scale-95 transition-all cursor-pointer border border-slate-200"
              title="Browse avatar options"
            >
              <Sparkles size={13} />
              <span>Avatars</span>
            </button>
          </div>
        </div>
      </div>

      {/* Avatar & Photo Picker Modal */}
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
              <div className="text-center mb-4">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Profile Picture</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Upload your own photo or select an avatar</p>
              </div>

              {/* Upload DP from Gallery Option Card */}
              <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50/90 via-purple-50/70 to-indigo-50/90 border border-indigo-100 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 flex-shrink-0">
                    <Upload size={18} />
                  </div>
                  <div className="text-left truncate">
                    <div className="text-xs font-black text-slate-800 leading-tight">Upload from Gallery</div>
                    <div className="text-[10px] font-semibold text-slate-500 truncate">Pick custom photo from device</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-indigo-200 flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon size={14} />
                      <span>Browse</span>
                    </>
                  )}
                </button>
              </div>

              {/* User's custom photo if one was previously uploaded */}
              {customPhoto && (
                <div className="mb-4 p-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-indigo-500 relative flex-shrink-0 bg-white shadow-xs">
                      <img src={customPhoto} alt="Your Custom DP" className="w-full h-full object-cover" />
                      {user?.photo === customPhoto && (
                        <div className="absolute inset-0 bg-indigo-600/35 flex items-center justify-center">
                          <Check size={14} className="text-white drop-shadow stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold text-slate-800">Your Uploaded DP</div>
                      <div className="text-[10px] font-semibold text-indigo-600">
                        {user?.photo === customPhoto ? '● Active Profile Picture' : 'Click to select'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {user?.photo !== customPhoto && (
                      <button
                        type="button"
                        onClick={() => handleSelectAvatar(customPhoto)}
                        className="px-2.5 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
                      >
                        Use
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="h-px bg-slate-200 flex-1" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Or Choose Character Avatar</span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>
              
              {/* Scrollable grid container to fit perfectly on all screens */}
              <div className="overflow-y-auto pr-1 flex-1 min-h-0 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                <div className="grid grid-cols-3 gap-3 p-1">
                  {AVATAR_OPTIONS.map((url, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSelectAvatar(url)}
                      className={cn(
                        "aspect-square rounded-2xl overflow-hidden border-4 transition-all relative bg-slate-50 cursor-pointer",
                        user?.photo === url ? "border-indigo-500 shadow-md shadow-indigo-100 ring-2 ring-indigo-300" : "border-transparent hover:border-slate-200"
                      )}
                    >
                      <img src={url} alt={`Avatar ${i}`} className="w-full h-full object-cover" />
                      {user?.photo === url && (
                        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                          <Check size={10} className="stroke-[3]" />
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => setShowAvatarPicker(false)}
                className="w-full mt-4 py-3 bg-slate-100 rounded-2xl text-slate-500 font-bold hover:bg-slate-200 transition-colors cursor-pointer"
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
          { label: 'Posture Rating', val: postureRating, icon: Star, color: ratingColor, bg: ratingBg },
          { label: 'Session Time', val: sessionTimeDisplay, icon: Activity, color: 'text-indigo-500', bg: 'bg-indigo-50' },
          { label: 'Alert Rate', val: alertRateDisplay, icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50' },
          { label: 'Integrity', val: calculatedIntegrity !== null ? `${calculatedIntegrity}%` : '--', icon: Shield, color: calculatedIntegrity !== null && calculatedIntegrity >= 80 ? 'text-emerald-500' : 'text-indigo-500', bg: 'bg-emerald-50' },
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
