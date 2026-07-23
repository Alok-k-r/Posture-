/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { Toaster } from 'react-hot-toast';
import { store, persistor, RootState, setAuthLoading, login, logout, checkDailyReset } from './store/store';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
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
import { TermsAcceptanceScreen } from './screens/TermsAcceptanceScreen';

// Guard for protected routes
const AuthGuard: React.FC<{ children: React.ReactNode; allowSetup?: boolean }> = ({ children, allowSetup = false }) => {
  const isAuth = useSelector((state: RootState) => state.auth.isAuth);
  const loading = useSelector((state: RootState) => state.auth.loading);
  const user = useSelector((state: RootState) => state.auth.user);
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

  // Force user to agree to the 35-clause ToS first before accessing any part of the app
  if (user && !user.hasAcceptedTerms) {
    return <TermsAcceptanceScreen />;
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
    dispatch(checkDailyReset());
  }, [dispatch]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (firebaseUser.isAnonymous) {
          const isDemo = localStorage.getItem('login_mode') === 'demo';
          const uid = firebaseUser.uid;
          const hasAcceptedLocal = localStorage.getItem(`terms_accepted_${uid}`) === 'true' ||
                                   localStorage.getItem(`terms_accepted_fallback_${uid}`) === 'true' ||
                                   localStorage.getItem('terms_accepted_demo-123') === 'true';
          
          if (isDemo) {
            dispatch(login({
              id: uid,
              name: 'Rahul',
              email: 'rahul@posturecare.health',
              photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul',
              age: 32,
              height: 178,
              weight: 74,
              hasAcceptedTerms: hasAcceptedLocal
            }));
          } else {
            dispatch(login({
              id: uid,
              name: 'Guest Explorer',
              email: 'guest@posturecare.health',
              photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
              hasAcceptedTerms: hasAcceptedLocal
            }));
          }
          dispatch(setAuthLoading(false));
        } else {
          try {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            let userDoc = await getDoc(userDocRef);

            // If user doc doesn't exist under this uid but the user has an email,
            // query if there's an existing user document registered under their email (e.g. from prior login/registration)
            if (!userDoc.exists() && firebaseUser.email) {
              try {
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where('email', '==', firebaseUser.email));
                const querySnapshot = await getDocs(q);
                
                if (!querySnapshot.empty) {
                  const existingDoc = querySnapshot.docs[0];
                  const existingData = existingDoc.data();
                  
                  // Copy and merge the existing user profile details to the new Google user uid
                  await setDoc(userDocRef, {
                    ...existingData,
                    uid: firebaseUser.uid,
                    id: firebaseUser.uid,
                    lastLoginAt: serverTimestamp()
                  }, { merge: true });
                  
                  // Re-fetch the newly created/merged userDoc
                  userDoc = await getDoc(userDocRef);
                }
              } catch (emailQueryErr) {
                console.warn('Error querying existing user by email in App.tsx:', emailQueryErr);
              }
            }

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
                  hasAcceptedTerms: data.hasAcceptedTerms || localStorage.getItem(`terms_accepted_${firebaseUser.uid}`) === 'true' || localStorage.getItem(`terms_accepted_fallback_${firebaseUser.uid}`) === 'true'
                }));
              } else {
                // User doc exists but lacks required biometrics. Keep isAuth=false to prompt LoginScreen to show the details collection view.
                dispatch(setAuthLoading(false));
                return;
              }
            } else {
              // No Firestore user document. Check if we have a local cached user profile for this uid or email
              let localProfileStr = localStorage.getItem(`user_profile_${firebaseUser.uid}`);
              if (!localProfileStr && firebaseUser.email) {
                const localAccounts = JSON.parse(localStorage.getItem('local_accounts') || '[]');
                const matchedLocal = localAccounts.find((acc: any) => acc.email?.toLowerCase() === firebaseUser.email?.toLowerCase());
                if (matchedLocal && matchedLocal.profile) {
                  localProfileStr = JSON.stringify(matchedLocal.profile);
                }
              }
              if (!localProfileStr) {
                localProfileStr = localStorage.getItem('local_user_profile');
              }

              if (localProfileStr) {
                try {
                  const localData = JSON.parse(localProfileStr);
                  const hasAcceptedLocal = localData.hasAcceptedTerms || 
                                           localStorage.getItem(`terms_accepted_${firebaseUser.uid}`) === 'true' || 
                                           localStorage.getItem(`terms_accepted_fallback_${firebaseUser.uid}`) === 'true';
                  dispatch(login({
                    id: firebaseUser.uid,
                    name: localData.name || firebaseUser.displayName || 'Rahul',
                    email: localData.email || firebaseUser.email || 'rahul@posturecare.health',
                    photo: localData.photo || firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
                    age: localData.age,
                    height: localData.height,
                    weight: localData.weight,
                    hasAcceptedTerms: hasAcceptedLocal
                  }));
                  dispatch(setAuthLoading(false));
                  return;
                } catch (e) {
                  console.warn('Error parsing local cached profile:', e);
                }
              }

              // No Firestore user document and no local profile either. Keep isAuth=false to prompt LoginScreen to show registration/details setup.
              dispatch(setAuthLoading(false));
              return;
            }
          } catch (err) {
            console.error('Error fetching user profile from Firestore:', err);
            // Offline/Local Mode fallback: Allow local login to maintain normal app experience
            const hasAcceptedLocal = localStorage.getItem(`terms_accepted_${firebaseUser.uid}`) === 'true' ||
                                     localStorage.getItem(`terms_accepted_fallback_${firebaseUser.uid}`) === 'true';
            dispatch(login({
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Rahul',
              email: firebaseUser.email || 'rahul@posturecare.health',
              photo: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
              hasAcceptedTerms: hasAcceptedLocal
            }));
          }
          dispatch(setAuthLoading(false));
        }
      } else {
        const loginMode = localStorage.getItem('login_mode');
        if (loginMode === 'demo' || loginMode === 'guest' || loginMode === 'local') {
          const cachedUser = localStorage.getItem('local_user_profile');
          if (cachedUser) {
            try {
              const parsed = JSON.parse(cachedUser);
              const hasAcceptedLocal = parsed.hasAcceptedTerms ||
                                       localStorage.getItem(`terms_accepted_${parsed.id}`) === 'true' ||
                                       localStorage.getItem(`terms_accepted_fallback_${parsed.id}`) === 'true' ||
                                       localStorage.getItem('terms_accepted_demo-123') === 'true';
              dispatch(login({
                ...parsed,
                hasAcceptedTerms: hasAcceptedLocal
              }));
              dispatch(setAuthLoading(false));
              return;
            } catch (e) {
              console.warn('Failed to parse cached local user profile:', e);
            }
          }
          
          // Reconstruct default mock profiles if they didn't have custom cached profile
          if (loginMode === 'demo') {
            const hasAcceptedLocal = localStorage.getItem('terms_accepted_demo-123') === 'true';
            dispatch(login({
              id: 'demo-123',
              name: 'Rahul',
              email: 'rahul@posturecare.health',
              photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul',
              age: 32,
              height: 178,
              weight: 74,
              hasAcceptedTerms: hasAcceptedLocal
            }));
          } else if (loginMode === 'guest') {
            const hasAcceptedLocal = localStorage.getItem('terms_accepted_fallback') === 'true';
            dispatch(login({
              id: 'guest-session',
              name: 'Guest Explorer',
              email: 'guest@posturecare.health',
              photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest-session',
              hasAcceptedTerms: hasAcceptedLocal
            }));
          } else {
            dispatch(logout());
          }
        } else {
          dispatch(logout());
        }
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
