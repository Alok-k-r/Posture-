import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, setOnlineStatus, removeFromSyncQueue, updateAngle } from '../../store/store';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, handleFirestoreError, OperationType } from '../../lib/firebase';

import { doc, onSnapshot } from 'firebase/firestore';

export const SyncManager: React.FC = () => {
  const dispatch = useDispatch();
  const { isOnline, syncQueue } = useSelector((state: RootState) => state.sync);
  const { isSimulating, angle } = useSelector((state: RootState) => state.posture);
  const user = useSelector((state: RootState) => state.auth.user);

  // Simulation logic (Background persistence)
  useEffect(() => {
    let interval: any;
    if (isSimulating) {
      console.log('Simulation active in background...');
      interval = setInterval(() => {
        const randomChange = (Math.random() - 0.5) * 4;
        const newAngle = Math.min(95, Math.max(45, angle + randomChange));
        dispatch(updateAngle(newAngle));
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isSimulating, angle, dispatch]);

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

  // Real-time listener for ESP32 data
  useEffect(() => {
    if (!user?.id || !auth.currentUser) return;

    const devicePath = `devices/${user.id}`;
    const deviceRef = doc(db, 'devices', user.id);
    
    console.log('Attaching real-time listener for:', devicePath);
    
    const unsubscribe = onSnapshot(deviceRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (typeof data.angle === 'number') {
          dispatch(updateAngle(data.angle));
        }
      }
    }, (error) => {
      // Catch and handle insufficient permissions or other errors
      handleFirestoreError(error, OperationType.GET, devicePath);
    });

    return () => unsubscribe();
  }, [user?.id, auth.currentUser, dispatch]);

  // Sync logic when online
  useEffect(() => {
    if (isOnline && syncQueue.length > 0) {
      processSyncQueue();
    }
  }, [isOnline, syncQueue.length]);

  const processSyncQueue = async () => {
    console.log('Processing sync queue...', syncQueue);
    
    // Process one by one (simulated)
    for (const action of syncQueue) {
      try {
        await simulateBackendSync(action);
        dispatch(removeFromSyncQueue(action.id));
      } catch (error) {
        console.error('Failed to sync action:', action.id, error);
        break; // Stop and retry later
      }
    }
  };

  const simulateBackendSync = (action: any) => {
    return new Promise((resolve) => setTimeout(resolve, 1000));
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
