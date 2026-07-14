/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { Toaster } from 'react-hot-toast';
import { store, persistor, RootState, setAuthLoading, login, logout } from './store/store';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Layout } from './components/layout/Layout';
import { SyncManager } from './components/sync/SyncManager';
import { SlouchAlarmManager } from './components/posture/SlouchAlarmManager';
import { LoginScreen } from './screens/LoginScreen';
import { DashboardScreen } from './screens/DashboardScreen';
import { PostureScreen } from './screens/PostureScreen';
import { AppointmentsScreen } from './screens/AppointmentsScreen';
import { AnalyticsScreen } from './screens/AnalyticsScreen';
import { MoreScreen } from './screens/MoreScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { ThresholdScreen } from './screens/ThresholdScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { DeviceScreen } from './screens/DeviceScreen';
import { DeviceSetupScreen } from './screens/DeviceSetupScreen';

// Guard for protected routes
const AuthGuard: React.FC<{ children: React.ReactNode; allowSetup?: boolean }> = ({ children, allowSetup = false }) => {
  const isAuth = useSelector((state: RootState) => state.auth.isAuth);
  const loading = useSelector((state: RootState) => state.auth.loading);
  const device = useSelector((state: RootState) => state.device);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-10 h-10 border-4 border-green/20 border-t-green rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuth) {
    return <Navigate to="/login" />;
  }

  // If user hasn't paired yet and hasn't explicitly skipped in this session, guide them to Onboarding Setup
  if (!device.hasPaired && !device.skippedSetup && !allowSetup) {
    return <Navigate to="/device-setup" />;
  }

  return <>{children}</>;
};

function AppContent() {
  const dispatch = useDispatch();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (firebaseUser.isAnonymous) {
          dispatch(login({
            id: firebaseUser.uid,
            name: 'Guest Explorer',
            email: 'guest@posturecare.health',
            photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`
          }));
          dispatch(setAuthLoading(false));
        } else {
          try {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const data = userDoc.data();
              if (data.age && data.height && data.weight) {
                dispatch(login({
                  id: firebaseUser.uid,
                  name: data.name || firebaseUser.displayName || 'Rahul',
                  email: data.email || firebaseUser.email || 'rahul@posturecare.health',
                  photo: data.photo || firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
                  age: data.age,
                  height: data.height,
                  weight: data.weight,
                }));
              } else {
                // User doc exists but lacks required biometrics. Keep isAuth=false to prompt LoginScreen to show the details collection view.
                dispatch(setAuthLoading(false));
                return;
              }
            } else {
              // No Firestore user document. Keep isAuth=false to prompt LoginScreen to show registration/details setup.
              dispatch(setAuthLoading(false));
              return;
            }
          } catch (err) {
            console.error('Error fetching user profile from Firestore:', err);
            // Offline/Local Mode fallback: Allow local login to maintain normal app experience
            dispatch(login({
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Rahul',
              email: firebaseUser.email || 'rahul@posturecare.health',
              photo: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`
            }));
          }
          dispatch(setAuthLoading(false));
        }
      } else {
        dispatch(logout());
        dispatch(setAuthLoading(false));
      }
    });

    return () => unsubscribe();
  }, [dispatch]);

  return (
    <Router>
      <Toaster position="top-center" />
      <SyncManager />
      <SlouchAlarmManager />
      <Layout>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/device-setup" element={<AuthGuard allowSetup={true}><DeviceSetupScreen /></AuthGuard>} />
          <Route path="/" element={<AuthGuard><DashboardScreen /></AuthGuard>} />
          <Route path="/posture" element={<AuthGuard><PostureScreen /></AuthGuard>} />
          <Route path="/appointments" element={<AuthGuard><AppointmentsScreen /></AuthGuard>} />
          <Route path="/analytics" element={<AuthGuard><AnalyticsScreen /></AuthGuard>} />
          <Route path="/more" element={<AuthGuard><MoreScreen /></AuthGuard>} />
          <Route path="/reports" element={<AuthGuard><ReportsScreen /></AuthGuard>} />
          <Route path="/thresholds" element={<AuthGuard><ThresholdScreen /></AuthGuard>} />
          <Route path="/profile" element={<AuthGuard><ProfileScreen /></AuthGuard>} />
          <Route path="/device" element={<AuthGuard><DeviceScreen /></AuthGuard>} />
          <Route path="/insights" element={<Navigate to="/posture" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AppContent />
      </PersistGate>
    </Provider>
  );
}
