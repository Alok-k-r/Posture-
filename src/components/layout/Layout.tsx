import React from 'react';
import { useLocation } from 'react-router-dom';
import { TabBar } from './TabBar';
import { ChatAssistant } from '../chat/ChatAssistant';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isAuth = useSelector((state: RootState) => state.auth.isAuth);
  
  // Hide TabBar on Login screen
  const showNav = isAuth && location.pathname !== '/login';

  return (
    <div className="min-h-screen bg-bg flex flex-col font-sans pb-24">
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
