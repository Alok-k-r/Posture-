import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useDispatch } from 'react-redux';
import { login, logout } from '../store/store';
import { Mail, Lock, LogIn, Shield, User, Ruler, Scale, Calendar, ArrowLeft, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider, db } from '../lib/firebase';
import { 
  signInWithPopup, 
  signInAnonymously, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const LoginScreen: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const [view, setView] = useState<'login' | 'register' | 'details'>('login');
  
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
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Check on mount if there is already an active firebase user who was not logged in fully due to missing details
  useEffect(() => {
    const checkActiveUser = async () => {
      const firebaseUser = auth.currentUser;
      if (firebaseUser && !firebaseUser.isAnonymous) {
        setIsLoading(true);
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (!data.age || !data.height || !data.weight) {
              setView('details');
              setFullName(data.name || firebaseUser.displayName || '');
            }
          } else {
            setView('details');
            setFullName(firebaseUser.displayName || '');
          }
        } catch (e) {
          console.error('Error verifying existing user details:', e);
        } finally {
          setIsLoading(false);
        }
      }
    };
    checkActiveUser();
  }, []);

  // Email Login Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    
    try {
      // 1. Check for pre-filled demo account
      if (email === 'rahul@posturecare.health' && password === 'demo123') {
        try {
          await signInAnonymously(auth);
        } catch (err: any) {
          console.warn('Firebase Anonymous Auth failed or was bypassed:', err?.message || err);
        }
        
        dispatch(login({
          id: 'demo-123', 
          name: 'Rahul',
          email: email,
          photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul',
          age: 32,
          height: 178,
          weight: 74
        }));
        setIsLoading(false);
        navigate('/');
        return;
      }
      
      // 2. Real user sign in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // 3. Fetch from Firestore to check details
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.age && data.height && data.weight) {
          dispatch(login({
            id: user.uid,
            name: data.name || user.displayName || 'Rahul',
            email: data.email || user.email || '',
            photo: data.photo || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
            age: data.age,
            height: data.height,
            weight: data.weight
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
        // No doc exists, route to complete details
        setFullName(user.displayName || '');
        setView('details');
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('Email Login Error:', error);
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
    
    try {
      // 1. Create firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, regEmail, regPassword);
      const user = userCredential.user;
      
      // Update firebase profile display name
      try {
        await updateProfile(user, { displayName: fullName });
      } catch (profileErr) {
        console.warn('Could not update Firebase profile display name:', profileErr);
      }
      
      // 2. Save details to Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const photoUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`;
      const userProfile = {
        name: fullName,
        email: regEmail,
        age: ageNum,
        height: heightNum,
        weight: weightNum,
        id: user.uid,
        photo: photoUrl,
        createdAt: new Date().toISOString()
      };
      
      await setDoc(userDocRef, userProfile);
      
      // 3. Dispatch login to Redux
      dispatch(login({
        id: user.uid,
        name: fullName,
        email: regEmail,
        photo: photoUrl,
        age: ageNum,
        height: heightNum,
        weight: weightNum
      }));
      
      setIsLoading(false);
      navigate('/');
    } catch (err: any) {
      console.error('Email registration error:', err);
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

  // Google Sign In Handler
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user exists in Firestore and has completed bio details
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.age && data.height && data.weight) {
          dispatch(login({
            id: user.uid,
            name: data.name || user.displayName || 'User',
            email: data.email || user.email || '',
            photo: data.photo || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
            age: data.age,
            height: data.height,
            weight: data.weight
          }));
          navigate('/');
        } else {
          // Document exists but missing biometric details
          setFullName(data.name || user.displayName || '');
          setView('details');
        }
      } else {
        // Entirely new Google Sign-in user
        setFullName(user.displayName || '');
        setView('details');
      }
    } catch (error: any) {
      console.error('Google Sign In Error:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        alert('Sign in popup was closed. If you are using the embedded preview, please open the app in a new tab to sign in with Google.');
      } else {
        setErrorMsg('Sign in failed. Check console for details.');
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
    
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      setErrorMsg('No authenticated user found. Please try logging in again.');
      setIsLoading(false);
      setView('login');
      return;
    }
    
    const ageNum = parseInt(age, 10);
    const heightNum = parseFloat(height);
    const weightNum = parseFloat(weight);
    
    if (!fullName.trim()) {
      setErrorMsg('Please enter your full name');
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
    
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const photoUrl = firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`;
      const userProfile = {
        name: fullName,
        email: firebaseUser.email || '',
        age: ageNum,
        height: heightNum,
        weight: weightNum,
        id: firebaseUser.uid,
        photo: photoUrl,
        createdAt: new Date().toISOString()
      };
      
      await setDoc(userDocRef, userProfile);
      
      // Update display name if it's not set
      if (!firebaseUser.displayName) {
        try {
          await updateProfile(firebaseUser, { displayName: fullName });
        } catch (profileErr) {
          console.warn('Could not update profile name:', profileErr);
        }
      }
      
      dispatch(login({
        id: firebaseUser.uid,
        name: fullName,
        email: firebaseUser.email || '',
        photo: photoUrl,
        age: ageNum,
        height: heightNum,
        weight: weightNum
      }));
      
      setIsLoading(false);
      navigate('/');
    } catch (err: any) {
      console.error('Error saving user profile details:', err);
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
      console.error('Cancel details error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Demo guest skip
  const handleSkipSignup = async () => {
    setIsLoading(true);
    try {
      try {
        await signInAnonymously(auth);
      } catch (err: any) {
        console.warn('Firebase Anonymous Auth failed or bypassed:', err?.message || err);
      }
      
      dispatch(login({
        id: 'guest-' + Math.floor(Math.random() * 100000), 
        name: 'Guest Explorer',
        email: 'guest@posturecare.health',
        photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest'
      }));
      setIsLoading(false);
      navigate('/');
    } catch (error) {
      console.error('Demo Guest Sign In Error:', error);
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
                  className="w-full bg-borderLight rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-green/20 transition-shadow"
                  placeholder="Enter full name"
                  required
                />
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

        <div className="mt-8 flex items-center justify-center gap-2 text-textMuted border-t border-border pt-6">
          <Shield size={14} className="text-green" />
          <span className="text-[10px] font-medium uppercase tracking-wider">Healthcare-grade security · HIPAA compliant</span>
        </div>
      </motion.div>
    </div>
  );
};
