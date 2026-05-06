import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, User, Calendar, BarChart2, MoreHorizontal, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

export const TabBar: React.FC = () => {
  const tabs = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Posture', path: '/posture', icon: User },
    { name: 'Calendar', path: '/appointments', icon: Calendar },
    { name: 'Stats', path: '/analytics', icon: BarChart2 },
    { name: 'More', path: '/more', icon: MoreHorizontal },
  ];

  return (
    <div className="fixed bottom-6 left-6 right-6 h-[76px] glass rounded-[32px] px-6 flex justify-between items-center z-50 shadow-premium border-white/20">
      {tabs.map((tab, i) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) =>
            cn(
              "relative flex flex-col items-center justify-center w-12 h-12 transition-all duration-500",
              isActive ? 'scale-110' : 'opacity-40 grayscale hover:opacity-100 hover:grayscale-0'
            )
          }
        >
          {({ isActive }) => (
            <>
              <div className={cn(
                "w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300",
                isActive 
                  ? "bg-slate-900 text-white shadow-lg" 
                  : "text-slate-400"
              )}>
                <tab.icon className={cn("w-5 h-5", isActive ? "stroke-[2.5]" : "stroke-[2]")} />
              </div>
              {isActive && (
                <motion.div
                  layoutId="tab-underline"
                  className="absolute -bottom-2 w-1 h-1 bg-slate-900 rounded-full"
                />
              )}
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
};
