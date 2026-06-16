import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, setOnlineStatus, removeFromSyncQueue, updateAngle, setThresholds, addAppointment } from '../../store/store';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, handleFirestoreError, OperationType } from '../../lib/firebase';
import { doc, onSnapshot, setDoc, collection, getDocs, query, limit } from 'firebase/firestore';

export const SyncManager: React.FC = () => {
  const dispatch = useDispatch();
  const { isOnline, syncQueue } = useSelector((state: RootState) => state.sync);
  const { isSimulating, angle, thresholds } = useSelector((state: RootState) => state.posture);
  const user = useSelector((state: RootState) => state.auth.user);

  // 1. Simulation logic (Real-time monitoring)
  useEffect(() => {
    let interval: any;
    if (isSimulating) {
      interval = setInterval(() => {
        const randomChange = (Math.random() - 0.5) * 4;
        const newAngle = Math.min(95, Math.max(45, angle + randomChange));
        dispatch(updateAngle(newAngle));
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isSimulating, angle, dispatch]);

  // 2. Connectivity Listeners
  useEffect(() => {
    const handleOnline = () => dispatch(setOnlineStatus(true));
    const handleOffline = () => dispatch(setOnlineStatus(false));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch]);

  // 3. Real-time Device Listener (ESP32 / Cloud sync)
  useEffect(() => {
    if (!user?.id || !auth.currentUser) return;

    const deviceRef = doc(db, 'devices', user.id);
    const unsubscribe = onSnapshot(deviceRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (typeof data.angle === 'number' && !isSimulating) { // Simulation takes priority locally
          dispatch(updateAngle(data.angle));
        }
      }
    }, (error) => {
      console.warn('Real-time listener paused (Permissions/Offline)');
    });

    return () => unsubscribe();
  }, [user?.id, auth.currentUser, dispatch, isSimulating]);

  // 4. Initial Data Fetch (Settings & Appointments)
  useEffect(() => {
    if (!user?.id || !auth.currentUser || !isOnline) return;

    const fetchProfile = async () => {
      try {
        // Sync Thresholds
        const tPath = `users/${user.id}/settings/thresholds`;
        const tRef = doc(db, 'users', user.id, 'settings', 'thresholds');
        const tSnap = await onSnapshot(tRef, (doc) => {
          if (doc.exists()) {
             dispatch(setThresholds(doc.data()));
          }
        });

        return () => tSnap();
      } catch (err) {
        console.error('Failed to initial fetch profile');
      }
    };

    fetchProfile();
  }, [user?.id, auth.currentUser, isOnline, dispatch]);

  // 5. Sync Queue Processor
  useEffect(() => {
    if (isOnline && syncQueue.length > 0 && auth.currentUser) {
      processSyncQueue();
    }
  }, [isOnline, syncQueue.length, auth.currentUser]);

  const processSyncQueue = async () => {
    const currentQueue = [...syncQueue];
    for (const action of currentQueue) {
      try {
        await executeSyncAction(action);
        dispatch(removeFromSyncQueue(action.id));
      } catch (error) {
        console.error('Sync failed for action:', action.type, error);
        // We stop to avoid out-of-order issues, but technically some could be independent
        break; 
      }
    }
  };

  const executeSyncAction = async (action: any) => {
    if (!auth.currentUser) return;
    const { type, payload } = action;
    const userId = auth.currentUser.uid;

    switch (type) {
      case 'SYNC_THRESHOLDS': {
        const ref = doc(db, 'users', userId, 'settings', 'thresholds');
        await setDoc(ref, payload);
        break;
      }
      case 'SYNC_APPOINTMENT': {
        const ref = doc(db, 'users', userId, 'appointments', payload.id);
        const { id, ...data } = payload;
        await setDoc(ref, data, { merge: true });
        break;
      }
      case 'DELETE_APPOINTMENT': {
        const ref = doc(db, 'users', userId, 'appointments', payload.id);
        await setDoc(ref, { _deleted: true }, { merge: true });
        break;
      }
      default:
        console.warn('Unknown sync action:', type);
    }
  };

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[200] bg-red text-white py-2 px-4 flex items-center justify-between shadow-lg"
        >
          <div className="flex items-center gap-2">
            <WifiOff size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Offline Mode</span>
          </div>
          <span className="text-[10px] font-medium opacity-80 italic">Changes will sync when reconnected</span>
        </motion.div>
      )}
      
      {isOnline && syncQueue.length > 0 && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[200] bg-blue text-white py-2 px-4 flex items-center justify-between shadow-lg"
        >
          <div className="flex items-center gap-2">
            <RefreshCw size={16} className="animate-spin" />
            <span className="text-xs font-bold uppercase tracking-wider">Syncing Changes...</span>
          </div>
          <span className="text-[10px] font-medium opacity-80">{syncQueue.length} items pending</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
