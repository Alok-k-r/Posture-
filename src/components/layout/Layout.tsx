import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { TabBar } from './TabBar';
import { ChatAssistant } from '../chat/ChatAssistant';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { AlertCircle, Bluetooth, ArrowRight } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuth = useSelector((state: RootState) => state.auth.isAuth);
  const device = useSelector((state: RootState) => state.device);
  
  // Hide TabBar on Onboarding screens
  const isSetupOrLogin = location.pathname === '/login' || location.pathname === '/device-setup';
  const showNav = isAuth && !isSetupOrLogin;

  // Show a helpful warning banner if the user is signed in but has no hardware device paired yet
  const showBanner = isAuth && !device.hasPaired && !isSetupOrLogin;

  return (
    <div className="min-h-screen bg-bg flex flex-col font-sans pb-40">
      {showBanner && (
        <div className="bg-amber-50/95 backdrop-blur-md border-b border-amber-200/80 py-3.5 px-4 sticky top-0 z-40 shadow-sm animate-fade-in transition-all">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-left">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                <AlertCircle size={16} className="animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-800 leading-tight flex items-center gap-1.5">
                  PosturePal Smart Pod Not Connected 
                  <span className="text-[9px] font-black bg-amber-200/60 text-amber-800 px-1.5 py-0.5 rounded-md uppercase tracking-tight">Interactive Demo</span>
                </p>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                  LSM6DS3 real-time biofeedback is inactive. Connect your physical pod to initiate calibration and activate active feedback.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/device-setup')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-soft transition-all active:scale-95 flex-shrink-0"
              >
                <Bluetooth size={12} className="animate-pulse text-indigo-400" />
                Connect Device
                <ArrowRight size={10} />
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-x-hidden">
        {children}
      </main>
      
      {showNav && (
        <>
          <TabBar />
          <ChatAssistant />
        </>
      )}
    </div>
  );
};
