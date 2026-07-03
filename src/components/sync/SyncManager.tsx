import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, setOnlineStatus, removeFromSyncQueue, updateAngle, setThresholds, setHasPaired, setDeviceStatus, updateBattery, setPostureHistory, setIsRecordingSession } from '../../store/store';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, rtdb } from '../../lib/firebase';
import { doc, onSnapshot, setDoc, collection, query, limit, orderBy } from 'firebase/firestore';
import { ref as rtdbRef, onValue as onRtdbValue, query as rtdbQuery, limitToLast } from 'firebase/database';

export const SyncManager: React.FC = () => {
  const dispatch = useDispatch();
  const { isOnline, syncQueue } = useSelector((state: RootState) => state.sync);
  const { isSimulating, angle, isRecordingSession, autoRecordEnabled } = useSelector((state: RootState) => state.posture);
  const user = useSelector((state: RootState) => state.auth.user);

  // References to keep latest values inside asynchronous sockets
  const autoRecordRef = React.useRef(autoRecordEnabled);
  const isRecordingRef = React.useRef(isRecordingSession);

  useEffect(() => {
    autoRecordRef.current = autoRecordEnabled;
  }, [autoRecordEnabled]);

  useEffect(() => {
    isRecordingRef.current = isRecordingSession;
  }, [isRecordingSession]);

  // 1. Simulation logic has been removed as requested to use only the live Firebase RTDB stream.

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

  // 3. Real-time Device & History Listeners (ESP32 Integration - Firebase Realtime Database)
  useEffect(() => {
    const activeId = user?.id || auth.currentUser?.uid || 'demo-123';
    console.log('📡 Subscribing to real-time physical device streams for ID:', activeId);

    // A. Listen to the current device node on RTDB for live posture & status
    const currentRef = rtdbRef(rtdb, `devices/${activeId}/current`);
    const unsubscribeDevice = onRtdbValue(currentRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        
        // Auto-configure paired state
        dispatch(setHasPaired(true));
        dispatch(setDeviceStatus(true));

        if (typeof data.batteryLevel === 'number' || typeof data.battery === 'number') {
          dispatch(updateBattery(data.batteryLevel ?? data.battery));
        }
        
        if (typeof data.angle === 'number') {
          dispatch(updateAngle(data.angle));
        }

        // Auto-resume recording session when device goes online and sends data
        if (autoRecordRef.current && !isRecordingRef.current) {
          dispatch(setIsRecordingSession(true));
        }
      }
    }, (error) => {
      console.warn('RTDB current status listener offline/error: ', error.message);
    });

    // B. Fetch the history log from `/devices/{uid}/history` on RTDB, limited to last 50
    const historyRef = rtdbQuery(rtdbRef(rtdb, `devices/${activeId}/history`), limitToLast(50));
    const unsubscribeHistory = onRtdbValue(historyRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        if (!val) return;
        
        // Convert key-value object to array
        const list = Object.entries(val).map(([key, item]: [string, any]) => ({
          id: key,
          ...(typeof item === 'object' ? item : { angle: item })
        }));

        // Sort descending by numeric key/timestamp or alphanumeric push key
        list.sort((a, b) => {
          const numA = Number(a.id);
          const numB = Number(b.id);
          if (!isNaN(numA) && !isNaN(numB)) {
            return numB - numA; // Sort descending numerically
          }
          return b.id.localeCompare(a.id); // Lexicographical sort
        });

        const latest = list[0];
        if (latest && typeof latest.angle === 'number') {
          dispatch(updateAngle(latest.angle));
        }
        if (latest && (typeof latest.batteryLevel === 'number' || typeof latest.battery === 'number')) {
          dispatch(updateBattery(latest.batteryLevel ?? latest.battery));
        }

        const angles = list
          .map(d => d.angle)
          .filter((v): v is number => typeof v === 'number');

        if (angles.length > 0) {
          dispatch(setPostureHistory(angles));
        }
      }
    }, (error) => {
      console.warn('RTDB history listener offline/error: ', error.message);
    });

    return () => {
      unsubscribeDevice();
      unsubscribeHistory();
    };
  }, [dispatch, user?.id]);

  // 4. Initial Data Fetch (Settings & Appointments)
  useEffect(() => {
    if (!user?.id || !auth.currentUser || !isOnline) return;

    const fetchProfile = async () => {
      try {
        // Sync Thresholds
        const tRef = doc(db, 'users', user.id, 'settings', 'thresholds');
        const tSnap = onSnapshot(tRef, (doc) => {
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
