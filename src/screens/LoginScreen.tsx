import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useDispatch } from 'react-redux';
import { login } from '../store/store';
import { Mail, Lock, LogIn, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signInAnonymously } from 'firebase/auth';

export const LoginScreen: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [email, setEmail] = useState('rahul@posturecare.health');
  const [password, setPassword] = useState('demo123');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Try to sign in anonymously. If it fails (usually disabled in console), 
      // we still log the user in locally for the demo.
      try {
        await signInAnonymously(auth);
      } catch (err: any) {
        if (err.code === 'auth/admin-restricted-operation') {
          console.warn('Anonymous Auth is disabled in Firebase Console. Local demo mode active.');
        } else {
          throw err;
        }
      }
      
      dispatch(login({
        id: 'demo-123', 
        name: 'Rahul',
        email: email,
        photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul'
      }));
      setIsLoading(false);
      navigate('/');
    } catch (error) {
      console.error('Demo Login Error:', error);
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      dispatch(login({
        id: user.uid,
        name: user.displayName || 'User',
        email: user.email || '',
        photo: user.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=User'
      }));
      navigate('/');
    } catch (error: any) {
      console.error('Google Sign In Error:', error);
      if (error.code === 'auth/popup-closed-by-user') {
        alert('Sign in popup was closed. If you are using the embedded preview, please open the app in a new tab to sign in with Google.');
      } else {
        alert('Sign in failed. Check console for details.');
      }
    } finally {
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
        <div className="flex flex-col items-center mb-8">
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

        {/* Demo Box */}
        <div className="bg-greenPale p-4 rounded-2xl mb-6 border border-green100 text-center">
          <p className="text-xs text-greenDark font-medium">🔑 Demo credentials pre-filled — just tap Sign In</p>
        </div>

        {/* Form */}
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
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-green to-greenDark text-white py-4 rounded-2xl font-bold text-sm shadow-lg shadow-green/10 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-70 mt-6"
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

        <div className="relative my-8">
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

        <div className="mt-8 flex items-center justify-center gap-2 text-textMuted border-t border-border pt-6">
          <Shield size={14} className="text-green" />
          <span className="text-[10px] font-medium uppercase tracking-wider">Healthcare-grade security · HIPAA compliant</span>
        </div>
      </motion.div>
    </div>
  );
};
