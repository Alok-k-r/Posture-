/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor, RootState, setAuthLoading, login, logout } from './store/store';
import { auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Layout } from './components/layout/Layout';
import { SyncManager } from './components/sync/SyncManager';
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

// Guard for protected routes
const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuth = useSelector((state: RootState) => state.auth.isAuth);
  const loading = useSelector((state: RootState) => state.auth.loading);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-10 h-10 border-4 border-green/20 border-t-green rounded-full animate-spin" />
      </div>
    );
  }

  return isAuth ? <>{children}</> : <Navigate to="/login" />;
};

function AppContent() {
  const dispatch = useDispatch();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // In this app, we trust Redux persist for the demo state
      // but we wait for Firebase to initialize to avoid rule errors
      dispatch(setAuthLoading(false));
    });

    return () => unsubscribe();
  }, [dispatch]);

  return (
    <Router>
      <SyncManager />
      <Layout>
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
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
