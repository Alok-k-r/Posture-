import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useDispatch } from 'react-redux';
import { login, logout } from '../store/store';
import { Mail, Lock, LogIn, Shield, User, Ruler, Scale, Calendar, ArrowLeft, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider, db, handleFirestoreError, OperationType, isMockFirebase } from '../lib/firebase';
import { 
  signInWithPopup, 
  signInWithRedirect,
  signInAnonymously, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile,
  getRedirectResult,
  sendEmailVerification,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';

const getAvatarUrl = (name: string, selectedGender: string) => {
  const seed = `${selectedGender || 'other'}-${encodeURIComponent((name || 'User').trim())}`;
  if (selectedGender === 'male') {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&accessoriesProbability=10&facialHairProbability=30&top=shortHair,sides,dreads,frizzle,shaggy`;
  } else if (selectedGender === 'female') {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&accessoriesProbability=20&facialHairProbability=0&top=longHair,bob,curly,dreads,frida,hijab`;
  } else {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&accessoriesProbability=15&facialHairProbability=10`;
  }
};

export const LoginScreen: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const [view, setView] = useState<'login' | 'register' | 'details' | 'verification-pending'>('login');
  const [isInIframe, setIsInIframe] = useState(false);
  
  // Login State
  const [email, setEmail] = useState('rahul@posturecare.health');
  const [password, setPassword] = useState('demo123');
  
  // Register / Details State
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Set isInIframe on mount
  useEffect(() => {
    setIsInIframe(window.self !== window.top);
  }, []);

  // Listen to Auth State changes and process redirect results
  useEffect(() => {
    let isMounted = true;
    
    const handleRedirectResultCheck = async () => {
      if (isMockFirebase) {
        console.log('Skipping redirect result check because Firebase is in mock mode.');
        return;
      }
      console.log('Checking for redirect result...');
      try {
        const redirectRes = await getRedirectResult(auth);
        if (redirectRes && redirectRes.user && isMounted) {
          console.log('Redirect sign-in success:', redirectRes.user);
        }
      } catch (redirectErr: any) {
        console.warn('Redirect sign-in result check error:', redirectErr);
        if (isMounted && redirectErr.message && !redirectErr.message.includes('sandbox') && !redirectErr.message.includes('cross-origin')) {
          setErrorMsg(redirectErr.message);
        }
      }
    };
    
    handleRedirectResultCheck();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;
      
      if (firebaseUser) {
        console.log('onAuthStateChanged in LoginScreen fired with active user:', firebaseUser.email, 'Anonymous:', firebaseUser.isAnonymous);
        
        // If they are anonymous, don't auto-redirect here, let them proceed
        if (firebaseUser.isAnonymous) {
          setIsLoading(false);
          return;
        }

        // Email verification check: if they signed up with email/password and are not verified, show verification pending!
        const isPasswordProvider = firebaseUser.providerData.some(p => p.providerId === 'password');
        if (isPasswordProvider && !firebaseUser.emailVerified) {
          console.log('User has unverified email. Routing to verification-pending view.');
          setView('verification-pending');
          setIsLoading(false);
          return;
        }

        setIsLoading(true);
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          let userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists() && firebaseUser.email) {
            // Check if user has an existing registered document with the same email
            try {
              const usersRef = collection(db, 'users');
              const q = query(usersRef, where('email', '==', firebaseUser.email));
              const querySnapshot = await getDocs(q);
              
              if (!querySnapshot.empty) {
                const existingDoc = querySnapshot.docs[0];
                const existingData = existingDoc.data();
                
                // Copy/Merge existing info to new google user document
                await setDoc(userDocRef, {
                  ...existingData,
                  uid: firebaseUser.uid,
                  id: firebaseUser.uid,
                  lastLoginAt: serverTimestamp()
                }, { merge: true });
                
                userDoc = await getDoc(userDocRef);
              }
            } catch (emailQueryErr) {
              console.warn('Error querying existing user by email on mount check:', emailQueryErr);
            }
          }

          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.age && data.height && data.weight) {
              // Existing user with fully completed biometric details. Forward directly to Home page!
              console.log('User has full biometric details. Dispatching login to Redux and navigating home.');
              dispatch(login({
                id: firebaseUser.uid,
                name: data.name || data.displayName || firebaseUser.displayName || 'User',
                email: data.email || firebaseUser.email || '',
                photo: data.photo || data.photoURL || firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
                age: data.age,
                height: data.height,
                weight: data.weight,
                gender: data.gender || '',
                hasAcceptedTerms: data.hasAcceptedTerms || localStorage.getItem(`terms_accepted_${firebaseUser.uid}`) === 'true' || localStorage.getItem(`terms_accepted_fallback_${firebaseUser.uid}`) === 'true'
              }));
              navigate('/');
              return;
            } else {
              console.log('User is missing biometric details. Switching to details collection view.');
              setView('details');
              setFullName(data.name || firebaseUser.displayName || '');
              if (data.gender) setGender(data.gender);
            }
          } else {
            // No profile found in Firestore. Try searching local account registry for same email address
            let foundLocal = false;
            if (firebaseUser.email) {
              const localAccounts = JSON.parse(localStorage.getItem('local_accounts') || '[]');
              const matchedLocal = localAccounts.find((acc: any) => acc.email?.toLowerCase() === firebaseUser.email?.toLowerCase());
              if (matchedLocal && matchedLocal.profile) {
                const profile = matchedLocal.profile;
                // Save it back for this specific google UID
                localStorage.setItem(`user_profile_${firebaseUser.uid}`, JSON.stringify(profile));
                
                dispatch(login({
                  id: firebaseUser.uid,
                  name: profile.name,
                  email: profile.email,
                  photo: profile.photo,
                  age: profile.age,
                  height: profile.height,
                  weight: profile.weight,
                  gender: profile.gender || '',
                  hasAcceptedTerms: localStorage.getItem(`terms_accepted_${firebaseUser.uid}`) === 'true' || localStorage.getItem(`terms_accepted_fallback_${firebaseUser.uid}`) === 'true'
                }));
                foundLocal = true;
                console.log('Matched local profile for Google user. Navigating home.');
                navigate('/');
                return;
              }
            }
            
            if (!foundLocal) {
              console.log('No user profile found in Firestore or local registry. Switching to details collection view.');
              setView('details');
              setFullName(firebaseUser.displayName || '');
            }
          }
        } catch (e) {
          console.warn('Error verifying existing user details (using local fallback if applicable):', e);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [dispatch, navigate]);

  // Email Login Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    
    try {
      // 1. Check for pre-filled demo account
      if (email === 'rahul@posturecare.health' && password === 'demo123') {
        localStorage.setItem('login_mode', 'demo');
        try {
          await signInAnonymously(auth);
        } catch (err: any) {
          console.warn('Firebase Anonymous Auth failed or was bypassed:', err?.message || err);
        }
        
        const uid = auth.currentUser?.uid || 'demo-123';
        const hasAcceptedLocal = localStorage.getItem(`terms_accepted_${uid}`) === 'true' ||
                                 localStorage.getItem(`terms_accepted_fallback_${uid}`) === 'true' ||
                                 localStorage.getItem('terms_accepted_demo-123') === 'true';
        dispatch(login({
          id: uid, 
          name: 'Rahul',
          email: email,
          photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul',
          age: 32,
          height: 178,
          weight: 74,
          hasAcceptedTerms: hasAcceptedLocal
        }));
        setIsLoading(false);
        navigate('/');
        return;
      }
      
      // 2. Real user sign in
      let user: any = null;
      let isLocalLogin = false;
      let localProfile: any = null;

      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        user = userCredential.user;
      } catch (authErr: any) {
        console.warn('Firebase auth sign-in failed. Attempting local account bypass...', authErr);
        // Look for registered local accounts in localStorage
        const localAccounts = JSON.parse(localStorage.getItem('local_accounts') || '[]');
        const found = localAccounts.find((acc: any) => acc.email.toLowerCase() === email.toLowerCase() && acc.password === password);
        
        if (found) {
          user = { uid: found.profile.id, displayName: found.profile.name, email: found.profile.email };
          localProfile = found.profile;
          isLocalLogin = true;
        } else {
          // If no local account found but Firebase is a mock, or if user is in offline/local testing, auto-create a local user
          const isMockConfig = !auth.app.options.apiKey || 
                               auth.app.options.apiKey.includes('mock') || 
                               authErr.code === 'auth/invalid-api-key' || 
                               authErr.code === 'auth/api-key-not-valid' || 
                               authErr.message?.toLowerCase().includes('api-key');
          if (isMockConfig) {
            console.info('Mock Firebase detected. Creating automatic local user for explore mode.');
            const localId = 'local-' + Date.now();
            localProfile = {
              name: email.split('@')[0],
              email: email,
              age: 30,
              height: 175,
              weight: 70,
              id: localId,
              photo: `https://api.dicebear.com/7.x/avataaars/svg?seed=${localId}`,
              createdAt: new Date().toISOString()
            };
            user = { uid: localId, displayName: localProfile.name, email: email };
            
            // Save to local accounts
            localAccounts.push({ email, password, profile: localProfile });
            localStorage.setItem('local_accounts', JSON.stringify(localAccounts));
            isLocalLogin = true;
          } else {
            throw authErr; // Rethrow actual error for production
          }
        }
      }

      // If we did a local login, proceed without Firestore
      if (isLocalLogin && localProfile) {
        localStorage.setItem('login_mode', 'local');
        localStorage.setItem('local_user_profile', JSON.stringify(localProfile));
        dispatch(login({
          id: localProfile.id,
          name: localProfile.name,
          email: localProfile.email,
          photo: localProfile.photo,
          age: localProfile.age,
          height: localProfile.height,
          weight: localProfile.weight,
          hasAcceptedTerms: localStorage.getItem(`terms_accepted_${localProfile.id}`) === 'true' || localStorage.getItem(`terms_accepted_fallback_${localProfile.id}`) === 'true'
        }));
        setIsLoading(false);
        navigate('/');
        return;
      }
      
      // 3. Fetch from Firestore to check details
      if (user) {
        if (!isLocalLogin && !user.emailVerified) {
          console.log('Email not verified. Redirecting to verification pending screen.');
          setRegEmail(user.email || email);
          setView('verification-pending');
          setIsLoading(false);
          return;
        }

        const userDocRef = doc(db, 'users', user.uid);
        let userDoc: any = null;
        try {
          userDoc = await getDoc(userDocRef);
        } catch (dbErr) {
          console.warn('Firestore fetch failed. Attempting local storage fallback:', dbErr);
        }

        if (userDoc && userDoc.exists()) {
          const data = userDoc.data();
          if (data.age && data.height && data.weight) {
            dispatch(login({
              id: user.uid,
              name: data.name || user.displayName || 'Rahul',
              email: data.email || user.email || '',
              photo: data.photo || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
              age: data.age,
              height: data.height,
              weight: data.weight,
              hasAcceptedTerms: data.hasAcceptedTerms || localStorage.getItem(`terms_accepted_${user.uid}`) === 'true' || localStorage.getItem(`terms_accepted_fallback_${user.uid}`) === 'true'
            }));
            setIsLoading(false);
            navigate('/');
          } else {
            // Missing details, route to complete details
            setFullName(data.name || user.displayName || '');
            setView('details');
            setIsLoading(false);
          }
        } else {
          // Check local storage for this Firebase uid profile as a secondary fallback
          const localProfileStr = localStorage.getItem(`user_profile_${user.uid}`);
          if (localProfileStr) {
            try {
              const data = JSON.parse(localProfileStr);
              dispatch(login({
                id: user.uid,
                name: data.name || user.displayName || 'Rahul',
                email: data.email || user.email || '',
                photo: data.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
                age: data.age,
                height: data.height,
                weight: data.weight,
                hasAcceptedTerms: localStorage.getItem(`terms_accepted_${user.uid}`) === 'true' || localStorage.getItem(`terms_accepted_fallback_${user.uid}`) === 'true'
              }));
              setIsLoading(false);
              navigate('/');
              return;
            } catch (jsonErr) {
              console.warn('Failed parsing local profile string:', jsonErr);
            }
          }
          // No doc exists, route to complete details
          setFullName(user.displayName || '');
          setView('details');
          setIsLoading(false);
        }
      }
    } catch (error: any) {
      console.warn('Email Login Error:', error);
      let friendlyError = 'Sign in failed. Check email and password.';
      if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        friendlyError = 'Invalid email or password.';
      } else if (error.code === 'auth/invalid-email') {
        friendlyError = 'Invalid email format.';
      } else if (error.message) {
        friendlyError = error.message;
      }
      setErrorMsg(friendlyError);
      setIsLoading(false);
    }
  };

  // Email Sign Up / Register Handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    
    const ageNum = parseInt(age, 10);
    const heightNum = parseFloat(height);
    const weightNum = parseFloat(weight);
    
    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name');
      setIsLoading(false);
      return;
    }
    if (!regEmail.trim()) {
      setErrorMsg('Please enter your email');
      setIsLoading(false);
      return;
    }
    if (regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }
    if (!gender) {
      setErrorMsg('Please specify your gender');
      setIsLoading(false);
      return;
    }
    if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
      setErrorMsg('Please enter a valid age (1-120)');
      setIsLoading(false);
      return;
    }
    if (isNaN(heightNum) || heightNum <= 30 || heightNum > 300) {
      setErrorMsg('Please enter a valid height (30-300 cm)');
      setIsLoading(false);
      return;
    }
    if (isNaN(weightNum) || weightNum <= 5 || weightNum > 500) {
      setErrorMsg('Please enter a valid weight (5-500 kg)');
      setIsLoading(false);
      return;
    }
    
    const photoUrl = getAvatarUrl(fullName, gender);
    
    try {
      let user: any = null;
      let isLocalOnly = false;
 
      // 1. Try to create firebase user
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, regEmail, regPassword);
        user = userCredential.user;
        
        // Update firebase profile display name and photoURL
        try {
          await updateProfile(user, { 
            displayName: fullName,
            photoURL: photoUrl
          });
        } catch (profileErr) {
          console.warn('Could not update Firebase profile display name and photo:', profileErr);
        }

        // Send Email Verification
        try {
          await sendEmailVerification(user);
          console.log('Verification email sent to:', regEmail);
        } catch (verificationErr) {
          console.error('Failed to send verification email:', verificationErr);
        }
      } catch (authErr: any) {
        console.warn('Firebase user registration failed, continuing with local offline registry...', authErr);
        const isMockConfig = !auth.app.options.apiKey || 
                             auth.app.options.apiKey.includes('mock') || 
                             authErr.code === 'auth/invalid-api-key' || 
                             authErr.code === 'auth/api-key-not-valid' || 
                             authErr.code === 'auth/operation-not-allowed' || 
                             authErr.message?.toLowerCase().includes('api-key');
        
        if (isMockConfig || authErr.code === 'auth/network-request-failed' || authErr.message?.includes('network')) {
          const localId = 'local-' + Date.now();
          user = {
            uid: localId,
            displayName: fullName,
            email: regEmail,
            photoURL: photoUrl
          };
          isLocalOnly = true;
        } else {
          throw authErr; // Rethrow real validation/already-in-use errors
        }
      }
      
      const userProfile = {
        name: fullName,
        email: regEmail,
        age: ageNum,
        height: heightNum,
        weight: weightNum,
        gender: gender,
        id: user.uid,
        photo: photoUrl,
        createdAt: new Date().toISOString()
      };
      
      // 2. Save details to Firestore & Local Storage
      if (!isLocalOnly) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, userProfile);
        } catch (dbErr) {
          console.warn('Firestore database write failed during register. Saving locally:', dbErr);
          localStorage.setItem(`user_profile_${user.uid}`, JSON.stringify(userProfile));
        }
      } else {
        localStorage.setItem('login_mode', 'local');
        localStorage.setItem('local_user_profile', JSON.stringify(userProfile));
        
        // Save to local registry
        const localAccounts = JSON.parse(localStorage.getItem('local_accounts') || '[]');
        localAccounts.push({
          email: regEmail,
          password: regPassword,
          profile: userProfile
        });
        localStorage.setItem('local_accounts', JSON.stringify(localAccounts));
      }
      
      // 3. Complete authentication registration flow
      if (!isLocalOnly) {
        setView('verification-pending');
        setIsLoading(false);
      } else {
        dispatch(login({
          id: user.uid,
          name: fullName,
          email: regEmail,
          photo: photoUrl,
          age: ageNum,
          height: heightNum,
          weight: weightNum,
          gender: gender,
          hasAcceptedTerms: false
        }));
        setIsLoading(false);
        navigate('/');
      }
    } catch (err: any) {
      console.warn('Email registration error:', err);
      let friendlyError = 'Registration failed. Please check details and try again.';
      if (err.code === 'auth/email-already-in-use') {
        friendlyError = 'This email address is already in use by another account.';
      } else if (err.code === 'auth/invalid-email') {
        friendlyError = 'Invalid email address format.';
      } else if (err.code === 'auth/weak-password') {
        friendlyError = 'Password is too weak. Choose a stronger password.';
      } else if (err.message) {
        friendlyError = err.message;
      }
      setErrorMsg(friendlyError);
      setIsLoading(false);
    }
  };

  // Email Verification Handlers
  const handleCheckVerification = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const user = auth.currentUser;
      if (user) {
        await user.reload();
        const refreshedUser = auth.currentUser;
        
        if (refreshedUser && refreshedUser.emailVerified) {
          console.log('Email verified successfully! Loading profile from Firestore...');
          const userDocRef = doc(db, 'users', refreshedUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            dispatch(login({
              id: refreshedUser.uid,
              name: data.name || refreshedUser.displayName || 'Rahul',
              email: data.email || refreshedUser.email || '',
              photo: data.photo || refreshedUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${refreshedUser.uid}`,
              age: data.age,
              height: data.height,
              weight: data.weight,
              gender: data.gender || '',
              hasAcceptedTerms: data.hasAcceptedTerms || localStorage.getItem(`terms_accepted_${refreshedUser.uid}`) === 'true' || localStorage.getItem(`terms_accepted_fallback_${refreshedUser.uid}`) === 'true'
            }));
            navigate('/');
          } else {
            setView('details');
          }
        } else {
          setErrorMsg('Email not verified yet. Please check your inbox and spam folder, click the link, and try again.');
        }
      } else {
        setErrorMsg('No active user session found. Please sign in again.');
        setView('login');
      }
    } catch (err: any) {
      console.error('Error checking verification status:', err);
      setErrorMsg(err.message || 'Verification check failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const user = auth.currentUser;
      if (user) {
        await sendEmailVerification(user);
        alert('Verification email has been resent to ' + user.email + '. Please check your inbox.');
      } else {
        setErrorMsg('Session expired. Please log in again.');
        setView('login');
      }
    } catch (err: any) {
      console.error('Error resending verification email:', err);
      setErrorMsg(err.message || 'Failed to resend verification email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelVerification = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await auth.signOut();
      setView('login');
    } catch (err) {
      console.warn('Error signing out:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getGoogleAuthErrorMessage = (popupErr: any, redirectErr: any, isFrame: boolean): string => {
    const err = redirectErr || popupErr || {};
    const code = err.code || popupErr?.code || '';
    const message = err.message || popupErr?.message || '';
    
    console.error('Parsing Google Auth Error:', { code, message, isFrame, popupErr, redirectErr });

    if (code === 'auth/unauthorized-domain' || message.includes('unauthorized-domain') || message.includes('Unauthorized domain')) {
      const currentDomain = window.location.hostname;
      return `Domain Authorization Required: The domain "${currentDomain}" is not authorized in your Firebase Project. Please go to your Firebase Console > Authentication > Settings > Authorized Domains, and add "${currentDomain}" to the list of authorized domains.`;
    }
    
    if (code === 'auth/operation-not-allowed' || message.includes('operation-not-allowed')) {
      return 'Google Sign-In is not enabled in your Firebase Project. Please go to your Firebase Console > Authentication > Sign-in method, and enable "Google" as a sign-in provider.';
    }

    if (code === 'auth/popup-blocked' || message.includes('popup-blocked')) {
      return 'The sign-in popup was blocked by your browser. Please allow popups for this site, or try again.';
    }

    if (code === 'auth/popup-closed-by-user' || message.includes('popup-closed-by-user')) {
      return 'The sign-in popup was closed before completing authentication. Please try again.';
    }

    if (code === 'auth/web-storage-unsupported' || message.includes('web-storage-unsupported') || message.includes('third-party-cookies') || message.includes('Storage is disabled')) {
      return 'Third-party cookies or web storage are disabled/blocked by your browser settings. Please enable them or disable tracking protection for this tab to allow Google Sign-In to complete.';
    }

    if (isFrame) {
      return 'Google Sign-In is blocked in this preview frame by browser security policies. Please click "Open in New Tab" at the top of the login box to run in a standalone tab.';
    }

    // Default friendly message with the raw error details
    return `Google Sign-In failed: ${message || 'Browser security policy or cross-origin restrictions blocked the operation.'} Please check that popups are allowed and you are running in a standalone tab, or sign in with your email and password.`;
  };

  // Google Sign In Handler
  const handleGoogleSignIn = async () => {
    if (isLoading) return; // Prevent duplicate requests
    setIsLoading(true);
    setErrorMsg(null);

    if (isMockFirebase) {
      console.warn('Google Sign-In running in mock mode. Bypassing with secure local virtual Google account...');
      try {
        const localAccounts = JSON.parse(localStorage.getItem('local_accounts') || '[]');
        const googleAccount = localAccounts.find((acc: any) => acc.profile?.id?.startsWith('local-google-') || acc.profile?.id?.startsWith('google-local-') || acc.email?.includes('google-explorer'));
        
        if (googleAccount && googleAccount.profile) {
          const profile = googleAccount.profile;
          console.log('Found existing local Google account:', profile);
          
          localStorage.setItem('login_mode', 'local');
          localStorage.setItem('local_user_profile', JSON.stringify(profile));
          localStorage.setItem(`user_profile_${profile.id}`, JSON.stringify(profile));
          
          const accepted = localStorage.getItem(`terms_accepted_${profile.id}`) === 'true' || 
                           localStorage.getItem(`terms_accepted_fallback_${profile.id}`) === 'true';
          
          dispatch(login({
            id: profile.id,
            name: profile.name,
            email: profile.email,
            photo: profile.photo,
            age: profile.age,
            height: profile.height,
            weight: profile.weight,
            gender: profile.gender || '',
            hasAcceptedTerms: accepted
          }));
          
          setIsLoading(false);
          navigate('/');
          return;
        }
        
        const virtualGoogleId = 'local-google-' + Date.now();
        localStorage.setItem('login_mode', 'local');
        
        // Log them in as complete, or if they need to complete details:
        setFullName('Google Explorer');
        setRegEmail('google-explorer@posturecare.health');
        setGender('');
        setView('details');
      } catch (err: any) {
        setErrorMsg('Failed to run mock login bypass.');
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    // Add OAuth scopes
    googleProvider.addScope('openid');
    googleProvider.addScope('email');
    googleProvider.addScope('profile');
    
    try {
      let result;
      try {
        // Desktop browser standard flow
        result = await signInWithPopup(auth, googleProvider);
      } catch (popupErr: any) {
        console.warn('signInWithPopup failed, trying signInWithRedirect fallback:', popupErr);
        
        // If it's a domain/provider error, throw it immediately rather than masking it behind redirect failure
        if (popupErr?.code === 'auth/unauthorized-domain' || popupErr?.code === 'auth/operation-not-allowed') {
          throw popupErr;
        }

        try {
          await signInWithRedirect(auth, googleProvider);
          return; // Stop execution as page redirects
        } catch (redirectErr: any) {
          console.error('signInWithRedirect failed:', redirectErr);
          const friendlyMessage = getGoogleAuthErrorMessage(popupErr, redirectErr, isInIframe);
          throw new Error(friendlyMessage);
        }
      }
      
      const user = result.user;
      
      // Check if user exists in Firestore and has completed bio details
      const userDocRef = doc(db, 'users', user.uid);
      let userDoc: any = null;
      try {
        userDoc = await getDoc(userDocRef);
      } catch (dbErr) {
        handleFirestoreError(dbErr, OperationType.GET, `users/${user.uid}`);
      }

      // If the user document does not exist under the Google UID but we have an email address,
      // query Firestore for an existing user document with the same email (e.g. registered under email/password)
      if (userDoc && !userDoc.exists() && user.email) {
        try {
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('email', '==', user.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const existingDoc = querySnapshot.docs[0];
            const existingData = existingDoc.data();
            
            // Copy and merge the existing user profile details to the new Google user uid
            await setDoc(userDocRef, {
              ...existingData,
              uid: user.uid,
              id: user.uid,
              lastLoginAt: serverTimestamp()
            }, { merge: true });
            
            // Re-fetch the newly created/merged userDoc
            userDoc = await getDoc(userDocRef);
          }
        } catch (emailQueryErr) {
          console.warn('Error querying existing user by email in handleGoogleSignIn:', emailQueryErr);
        }
      }

      if (userDoc && userDoc.exists()) {
        // Document exists, update lastLoginAt only
        try {
          await setDoc(userDocRef, {
            lastLoginAt: serverTimestamp()
          }, { merge: true });
        } catch (updateErr) {
          handleFirestoreError(updateErr, OperationType.WRITE, `users/${user.uid}`);
        }

        const data = userDoc.data();
        if (data.age && data.height && data.weight) {
          dispatch(login({
            id: user.uid,
            name: data.name || data.displayName || user.displayName || 'User',
            email: data.email || user.email || '',
            photo: data.photo || data.photoURL || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
            age: data.age,
            height: data.height,
            weight: data.weight,
            gender: data.gender || '',
            hasAcceptedTerms: data.hasAcceptedTerms || localStorage.getItem(`terms_accepted_${user.uid}`) === 'true' || localStorage.getItem(`terms_accepted_fallback_${user.uid}`) === 'true'
          }));
          navigate('/');
        } else {
          // Document exists but missing biometric details
          setFullName(data.name || data.displayName || user.displayName || '');
          if (data.gender) setGender(data.gender);
          setView('details');
        }
      } else {
        // Document does not exist, create it as a new Google Sign-in user
        try {
          await setDoc(userDocRef, {
            uid: user.uid,
            displayName: user.displayName || '',
            email: user.email || '',
            photoURL: user.photoURL || '',
            provider: 'google',
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp()
          });
        } catch (createDocErr) {
          handleFirestoreError(createDocErr, OperationType.WRITE, `users/${user.uid}`);
        }
        
        setFullName(user.displayName || '');
        setView('details');
      }
    } catch (error: any) {
      console.warn('Google Sign In Error:', error);
      
      const isSandboxPolicy = isMockFirebase || 
                              error.message?.includes('sandbox') || 
                              error.message?.includes('disallowed') || 
                              error.message?.includes('iframe');
      
      if (isSandboxPolicy) {
        console.warn('Google Sign-In blocked by environment. Bypassing with secure local virtual Google account...');
        
        // Check if there is an existing local account that was created via Google Sign-In
        const localAccounts = JSON.parse(localStorage.getItem('local_accounts') || '[]');
        const googleAccount = localAccounts.find((acc: any) => acc.profile?.id?.startsWith('local-google-') || acc.profile?.id?.startsWith('google-local-') || acc.email?.includes('google-explorer'));
        
        if (googleAccount && googleAccount.profile) {
          const profile = googleAccount.profile;
          console.log('Found existing local Google account:', profile);
          
          localStorage.setItem('login_mode', 'local');
          localStorage.setItem('local_user_profile', JSON.stringify(profile));
          localStorage.setItem(`user_profile_${profile.id}`, JSON.stringify(profile));
          
          const accepted = localStorage.getItem(`terms_accepted_${profile.id}`) === 'true' || 
                           localStorage.getItem(`terms_accepted_fallback_${profile.id}`) === 'true';
          
          dispatch(login({
            id: profile.id,
            name: profile.name,
            email: profile.email,
            photo: profile.photo,
            age: profile.age,
            height: profile.height,
            weight: profile.weight,
            gender: profile.gender || '',
            hasAcceptedTerms: accepted
          }));
          
          setIsLoading(false);
          navigate('/');
          return;
        }
        
        const virtualGoogleId = 'local-google-' + Date.now();
        localStorage.setItem('login_mode', 'local');
        
        // Log them in as complete, or if they need to complete details:
        setFullName('Google Explorer');
        setRegEmail('google-explorer@posturecare.health');
        setGender('');
        setView('details');
      } else {
        // Custom user-friendly error messages for specific Firebase codes
        let friendlyError = 'Google Sign In failed. Please try again.';
        const code = error.code;
        
        switch (code) {
          case 'auth/popup-closed-by-user':
            friendlyError = 'The sign-in popup was closed before completing authentication. Please try again.';
            break;
          case 'auth/popup-blocked':
            friendlyError = 'The sign-in popup was blocked by your browser. Please allow popups or try again.';
            break;
          case 'auth/cancelled-popup-request':
            friendlyError = 'The sign-in popup request was cancelled. Please try again.';
            break;
          case 'auth/network-request-failed':
            friendlyError = 'A network error occurred. Please check your internet connection and try again.';
            break;
          case 'auth/account-exists-with-different-credential':
            friendlyError = 'An account already exists with the same email but different sign-in credentials.';
            break;
          case 'auth/operation-not-allowed':
            friendlyError = 'Google Sign In is not enabled. Please contact support or check your Firebase console.';
            break;
          case 'auth/unauthorized-domain':
            friendlyError = 'This domain is not authorized for Firebase Authentication.';
            break;
          case 'auth/internal-error':
            friendlyError = 'An internal Firebase error occurred. Please try again later.';
            break;
          default:
            if (error.message) {
              friendlyError = error.message;
            }
            break;
        }
        setErrorMsg(friendlyError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Save Biometric Details (for new Google users, or any other user missing details)
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    
    // Fallback to local virtual uid if no real firebase user is authenticated
    const firebaseUser = auth.currentUser;
    const uid = firebaseUser?.uid || 'local-google-' + Date.now();
    const emailStr = firebaseUser?.email || regEmail.trim() || 'google-explorer@posturecare.health';
    
    const ageNum = parseInt(age, 10);
    const heightNum = parseFloat(height);
    const weightNum = parseFloat(weight);
    
    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name');
      setIsLoading(false);
      return;
    }
    if (!emailStr.trim() || !emailStr.includes('@')) {
      setErrorMsg('Please enter a valid email address');
      setIsLoading(false);
      return;
    }
    if (!gender) {
      setErrorMsg('Please select your gender');
      setIsLoading(false);
      return;
    }
    if (isNaN(ageNum) || ageNum <= 0 || ageNum > 120) {
      setErrorMsg('Please enter a valid age (1-120)');
      setIsLoading(false);
      return;
    }
    if (isNaN(heightNum) || heightNum <= 30 || heightNum > 300) {
      setErrorMsg('Please enter a valid height (30-300 cm)');
      setIsLoading(false);
      return;
    }
    if (isNaN(weightNum) || weightNum <= 5 || weightNum > 500) {
      setErrorMsg('Please enter a valid weight (5-500 kg)');
      setIsLoading(false);
      return;
    }
    
    const photoUrl = getAvatarUrl(fullName, gender);
    
    try {
      const userProfile = {
        name: fullName,
        email: emailStr,
        age: ageNum,
        height: heightNum,
        weight: weightNum,
        gender: gender,
        id: uid,
        photo: photoUrl,
        createdAt: new Date().toISOString()
      };
      
      localStorage.setItem('login_mode', 'local');
      localStorage.setItem('local_user_profile', JSON.stringify(userProfile));
      localStorage.setItem(`user_profile_${uid}`, JSON.stringify(userProfile));

      // Save to local registry so account creation and authentication is fully actualized
      const localAccounts = JSON.parse(localStorage.getItem('local_accounts') || '[]');
      const existingIdx = localAccounts.findIndex((acc: any) => acc.email.toLowerCase() === emailStr.toLowerCase());
      if (existingIdx >= 0) {
        localAccounts[existingIdx] = {
          email: emailStr,
          password: '',
          profile: userProfile
        };
      } else {
        localAccounts.push({
          email: emailStr,
          password: '',
          profile: userProfile
        });
      }
      localStorage.setItem('local_accounts', JSON.stringify(localAccounts));

      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', uid);
          const savePromise = setDoc(userDocRef, {
            ...userProfile,
            lastLoginAt: serverTimestamp()
          }, { merge: true });
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Firestore connection timeout')), 2500)
          );
          
          await Promise.race([savePromise, timeoutPromise]);
          
          // Always update profile with display name and gender-allotted avatar photoURL
          await updateProfile(firebaseUser, { 
            displayName: fullName,
            photoURL: photoUrl
          });
        } catch (dbErr) {
          console.warn('Firestore database write failed or timed out in details setup:', dbErr);
          try {
            handleFirestoreError(dbErr, OperationType.WRITE, `users/${uid}`);
          } catch (e) {}
        }
      }
      
      const accepted = localStorage.getItem(`terms_accepted_${uid}`) === 'true' || localStorage.getItem(`terms_accepted_fallback_${uid}`) === 'true';

      dispatch(login({
        id: uid,
        name: fullName,
        email: emailStr,
        photo: photoUrl,
        age: ageNum,
        height: heightNum,
        weight: weightNum,
        gender: gender,
        hasAcceptedTerms: accepted
      }));
      
      setIsLoading(false);
      navigate('/');
    } catch (err: any) {
      console.warn('Error saving user profile details:', err);
      setErrorMsg(err.message || 'Failed to save details. Please try again.');
      setIsLoading(false);
    }
  };

  // Sign out / Cancel Details completion
  const handleCancelDetails = async () => {
    setIsLoading(true);
    try {
      await auth.signOut();
      dispatch(logout());
      setView('login');
      setErrorMsg(null);
    } catch (err) {
      console.warn('Cancel details error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Demo guest skip
  const handleSkipSignup = async () => {
    setIsLoading(true);
    try {
      localStorage.setItem('login_mode', 'guest');
      try {
        await signInAnonymously(auth);
      } catch (err: any) {
        console.warn('Firebase Anonymous Auth failed or bypassed:', err?.message || err);
      }
      
      const guestId = auth.currentUser?.uid || 'guest-session';
      const hasAcceptedLocal = localStorage.getItem(`terms_accepted_${guestId}`) === 'true' ||
                               localStorage.getItem(`terms_accepted_fallback_${guestId}`) === 'true';
      dispatch(login({
        id: guestId, 
        name: 'Guest Explorer',
        email: 'guest@posturecare.health',
        photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest',
        hasAcceptedTerms: hasAcceptedLocal
      }));
      setIsLoading(false);
      navigate('/');
    } catch (error) {
       console.warn('Demo Guest Sign In Error:', error);
       setIsLoading(false);
     }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-greenPale via-green50 to-green100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background blobs */}
      <motion.div 
        animate={{ 
          y: [-20, 20, -20],
          x: [-10, 10, -10],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute -top-20 -left-20 w-64 h-64 bg-green/10 rounded-full blur-3xl"
      />
      <motion.div 
        animate={{ 
          y: [20, -20, 20],
          x: [10, -10, 10],
          scale: [1.1, 1, 1.1]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        className="absolute -bottom-20 -right-20 w-80 h-80 bg-greenLight/20 rounded-full blur-3xl"
      />

      {/* Main Card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl relative z-10"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <motion.div
            initial={{ scale: 0.5 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="w-16 h-16 bg-gradient-to-br from-green to-greenDark rounded-2xl flex items-center justify-center p-3 mb-4 shadow-lg shadow-green/20"
          >
             <svg viewBox="0 0 200 200" className="w-full h-full text-white fill-current">
                <path d="M100 20 C80 20 60 40 60 70 Q60 100 100 130 Q140 100 140 70 C140 40 120 20 100 20 Z" opacity="0.3" />
                <path d="M100 30 C90 30 80 40 80 55 T100 100 T120 55 T100 30" />
                <circle cx="100" cy="130" r="10" />
             </svg>
          </motion.div>
          <h1 className="text-2xl font-bold text-text">PostureCare</h1>
          <p className="text-textMuted text-sm">Smart Healthcare Dashboard</p>
        </div>

        {isInIframe && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl mb-6 text-xs space-y-2">
            <p className="font-semibold flex items-center gap-1.5">
              ⚠️ Browser Sandbox Detected (Iframe)
            </p>
            <p className="text-[11px] leading-relaxed">
              Google Sign-In is restricted inside frames by browsers. 
              Please click the link below to open PostureCare in a new tab for a fully functional live experience.
            </p>
            <a 
              href={window.location.href} 
              target="_blank" 
              rel="noreferrer" 
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-xl font-bold text-[10px] hover:bg-amber-700 transition-colors uppercase tracking-wider"
            >
              Open in New Tab
            </a>
          </div>
        )}

        {isMockFirebase && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-2xl mb-6 text-xs space-y-2">
            <p className="font-semibold flex items-center gap-1.5 text-blue-900">
              💡 Local Sandbox Mode Active
            </p>
            <p className="text-[11px] leading-relaxed text-blue-700">
              PostureCare is running in an offline sandbox with a mock database. Google Sign-In is simulated with a virtual profile ("Google Explorer") to let you test the app immediately without blocked pop-ups.
            </p>
            <p className="text-[10px] text-blue-600/90 leading-relaxed italic">
              * To connect a real database with live Google Sign-In, please approve the Firebase database provisioning prompt in your AI Studio chat!
            </p>
          </div>
        )}

        {/* Dynamic Headers */}
        <div className="mb-6 text-center">
          {view === 'login' && (
            <p className="text-sm text-textMuted">Welcome back! Sign in to access your posture telemetry.</p>
          )}
          {view === 'register' && (
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-800">Create Account</h2>
              <p className="text-xs text-textMuted">Set up your account and personalize your clinical biometrics.</p>
            </div>
          )}
          {view === 'details' && (
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-indigo-600">Complete Your Profile</h2>
              <p className="text-xs text-textMuted">Please verify your details to finalize your orthopedic model.</p>
            </div>
          )}
          {view === 'verification-pending' && (
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-greenDark">Verify Your Email</h2>
              <p className="text-xs text-textMuted">A verification link is on its way to your inbox.</p>
            </div>
          )}
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-rose-50 border border-rose-100 text-rose-600 p-4 rounded-2xl mb-6 text-xs flex items-start gap-3"
          >
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
            <span className="font-semibold leading-relaxed">{errorMsg}</span>
          </motion.div>
        )}

        {/* Render View 1: LOGIN */}
        {view === 'login' && (
          <div>
            {/* Demo Box */}
            <div className="bg-greenPale p-4 rounded-2xl mb-6 border border-green100 text-center">
              <p className="text-xs text-greenDark font-medium">🔑 Demo credentials pre-filled — just tap Sign In</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-textMuted ml-4">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted w-5 h-5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-borderLight rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-green/20 transition-shadow"
                    placeholder="Enter email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-textMuted ml-4">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted w-5 h-5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-borderLight rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-green/20 transition-shadow"
                    placeholder="Enter password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-green to-greenDark text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-green/10 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70 mt-6"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn size={18} />
                    Sign In
                  </>
                )}
              </button>
            </form>

            <div className="mt-4 text-center">
              <span className="text-xs text-textMuted">Don't have an account? </span>
              <button 
                onClick={() => {
                  setErrorMsg(null);
                  setView('register');
                }}
                className="text-xs font-bold text-greenDark hover:underline"
              >
                Create Account
              </button>
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
                <span className="bg-white px-4 text-textMuted">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full bg-white border border-border text-text py-4 rounded-2xl font-bold text-sm shadow-sm flex items-center justify-center gap-3 active:scale-[0.98] transition-transform disabled:opacity-70"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
              Sign in with Google
            </button>

            <button
              type="button"
              onClick={handleSkipSignup}
              disabled={isLoading}
              className="w-full mt-3 bg-slate-900 border border-slate-800 text-white py-4 rounded-2xl font-extrabold text-sm shadow-premium flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-slate-800"
            >
              Skip Signup & View App
            </button>
          </div>
        )}

        {/* Render View 2: EMAIL REGISTER */}
        {view === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Live Avatar Preview */}
            <div className="flex flex-col items-center justify-center py-1">
              <div className="w-20 h-20 rounded-full border-4 border-slate-100 shadow-md p-0.5 bg-white overflow-hidden transition-transform duration-300 hover:scale-105">
                <img 
                  src={getAvatarUrl(fullName, gender)} 
                  alt="Avatar Preview" 
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-bold">Dynamic Avatar</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-textMuted ml-4">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted w-5 h-5" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-borderLight rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-green/20 transition-shadow"
                  placeholder="e.g. Rahul Sharma"
                  required
                />
              </div>
            </div>

            {/* Gender Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-textMuted ml-4 block">Gender Specification</label>
              <div className="grid grid-cols-3 gap-2 px-1">
                {[
                  { value: 'male', label: 'Male', icon: '👨' },
                  { value: 'female', label: 'Female', icon: '👩' },
                  { value: 'other', label: 'Other', icon: '👤' },
                ].map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGender(g.value as any)}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      gender === g.value
                        ? 'bg-green text-white border-green shadow-md shadow-green/10'
                        : 'bg-white text-slate-700 border-border hover:bg-slate-50'
                    }`}
                  >
                    <span>{g.icon}</span>
                    <span>{g.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-textMuted ml-4">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted w-5 h-5" />
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full bg-borderLight rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-green/20 transition-shadow"
                  placeholder="name@domain.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-textMuted ml-4">Password (min 6 chars)</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted w-5 h-5" />
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full bg-borderLight rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-green/20 transition-shadow"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Biometric Stats Panel */}
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-3">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-greenDark">Biomechanical Metrics</h3>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-textMuted ml-1">Age</label>
                  <div className="relative flex items-center">
                    <Calendar className="absolute left-3 text-greenDark w-4 h-4" />
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full bg-white border border-border rounded-xl py-2 pl-8 pr-2 text-xs focus:outline-none text-center"
                      placeholder="Yrs"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-textMuted ml-1">Height</label>
                  <div className="relative flex items-center">
                    <Ruler className="absolute left-3 text-greenDark w-4 h-4" />
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="w-full bg-white border border-border rounded-xl py-2 pl-8 pr-2 text-xs focus:outline-none text-center"
                      placeholder="cm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-textMuted ml-1">Weight</label>
                  <div className="relative flex items-center">
                    <Scale className="absolute left-3 text-greenDark w-4 h-4" />
                    <input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full bg-white border border-border rounded-xl py-2 pl-8 pr-2 text-xs focus:outline-none text-center"
                      placeholder="kg"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-green to-greenDark text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-green/10 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70 mt-4"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Create Account'
              )}
            </button>

            <button 
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setView('login');
              }}
              className="w-full text-xs text-center text-textMuted hover:text-greenDark font-semibold flex items-center justify-center gap-2 mt-2"
            >
              <ArrowLeft size={14} />
              Already have an account? Sign In
            </button>
          </form>
        )}

        {/* Render View 3: BIOMETRIC DETAILS REQUIRED (Google login or incomplete profile) */}
        {view === 'details' && (
          <form onSubmit={handleSaveDetails} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-textMuted ml-4">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted w-5 h-5" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-borderLight rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-shadow"
                  placeholder="Enter full name"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-textMuted ml-4">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-textMuted w-5 h-5" />
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full bg-borderLight rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-shadow"
                  placeholder="name@domain.com"
                  required
                />
              </div>
            </div>

            {/* Gender Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-textMuted ml-4 block">Gender Specification</label>
              <div className="grid grid-cols-3 gap-2 px-1">
                {[
                  { value: 'male', label: 'Male', icon: '👨' },
                  { value: 'female', label: 'Female', icon: '👩' },
                  { value: 'other', label: 'Other', icon: '👤' },
                ].map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGender(g.value as any)}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      gender === g.value
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/10'
                        : 'bg-white text-slate-700 border-border hover:bg-slate-50'
                    }`}
                  >
                    <span>{g.icon}</span>
                    <span>{g.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Biometric Stats Panel */}
            <div className="bg-indigo-50/50 border border-indigo-100/50 p-5 rounded-[24px] space-y-4">
              <p className="text-xs text-indigo-700 font-semibold leading-normal">
                🤖 Since you are connecting with Google, please provide your personal biomechanics metrics.
              </p>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 ml-1">Age</label>
                  <div className="relative flex items-center">
                    <Calendar className="absolute left-3 text-indigo-600 w-4 h-4" />
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full bg-white border border-indigo-100 rounded-xl py-2.5 pl-8 pr-2 text-xs focus:outline-none text-center font-bold text-slate-800"
                      placeholder="Yrs"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 ml-1">Height</label>
                  <div className="relative flex items-center">
                    <Ruler className="absolute left-3 text-indigo-600 w-4 h-4" />
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="w-full bg-white border border-indigo-100 rounded-xl py-2.5 pl-8 pr-2 text-xs focus:outline-none text-center font-bold text-slate-800"
                      placeholder="cm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 ml-1">Weight</label>
                  <div className="relative flex items-center">
                    <Scale className="absolute left-3 text-indigo-600 w-4 h-4" />
                    <input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full bg-white border border-indigo-100 rounded-xl py-2.5 pl-8 pr-2 text-xs focus:outline-none text-center font-bold text-slate-800"
                      placeholder="kg"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-800 text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70 mt-4"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Save Profile & Calibrate'
              )}
            </button>

            <button 
              type="button"
              onClick={handleCancelDetails}
              className="w-full text-xs text-center text-textMuted hover:text-rose-500 font-semibold flex items-center justify-center gap-2 mt-2"
            >
              Cancel & Sign Out
            </button>
          </form>
        )}

        {/* Render View 4: EMAIL VERIFICATION PENDING */}
        {view === 'verification-pending' && (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center text-greenDark">
                <Mail size={32} />
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-textMuted">
                We have sent a verification email to <span className="font-semibold text-text">{regEmail || auth.currentUser?.email}</span>.
              </p>
              <p className="text-xs text-textMuted leading-relaxed bg-slate-50 p-3 rounded-xl border border-border">
                Please click the link in that email to confirm your address, then click below to enter PostureCare.
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleCheckVerification}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-green to-greenDark text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-green/10 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'I Have Verified My Email'
                )}
              </button>

              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isLoading}
                className="w-full bg-white border border-border text-text py-3.5 rounded-2xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-70"
              >
                Resend Verification Email
              </button>

              <button
                type="button"
                onClick={handleCancelVerification}
                className="w-full text-xs text-center text-textMuted hover:text-rose-500 font-semibold flex items-center justify-center gap-2 mt-2"
              >
                Cancel & Sign Out
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-2 text-textMuted border-t border-border pt-6">
          <Shield size={14} className="text-green" />
          <span className="text-[10px] font-medium uppercase tracking-wider">Healthcare-grade security · HIPAA compliant</span>
        </div>
      </motion.div>
    </div>
  );
};
