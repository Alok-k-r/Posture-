import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, User, Calendar, BarChart2, MoreHorizontal } from 'lucide-react';
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

  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  // Always reveal TabBar on route changes
  useEffect(() => {
    setIsVisible(true);
    lastScrollY.current = window.scrollY || 0;
  }, [location.pathname]);

  // Smooth & stable scroll detection with requestAnimationFrame & hysteresis
  useEffect(() => {
    const minThreshold = 18; // minimum px scroll delta before toggling to prevent jitter

    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0;

          // Always stay visible near top of page
          if (currentScrollY <= 40) {
            setIsVisible(true);
            lastScrollY.current = currentScrollY;
            ticking.current = false;
            return;
          }

          const delta = currentScrollY - lastScrollY.current;

          // Only toggle when scroll delta exceeds threshold
          if (Math.abs(delta) >= minThreshold) {
            if (delta > 0) {
              // Scrolling down -> hide navbar smoothly
              setIsVisible(false);
            } else {
              // Scrolling up -> show navbar smoothly
              setIsVisible(true);
            }
            lastScrollY.current = currentScrollY;
          }
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.div 
      initial={false}
      animate={{ 
        y: isVisible ? 0 : 96, 
        opacity: isVisible ? 1 : 0,
        scale: isVisible ? 1 : 0.96
      }}
      transition={{ 
        duration: 0.45, 
        ease: [0.16, 1, 0.3, 1] // Smooth native iOS easing curve
      }}
      style={{ willChange: 'transform, opacity' }}
      className={cn(
        "fixed bottom-6 left-6 right-6 h-[76px] glass rounded-[32px] px-6 flex justify-between items-center z-50 shadow-premium border-white/20",
        !isVisible && "pointer-events-none"
      )}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          className={({ isActive }) =>
            cn(
              "relative flex flex-col items-center justify-center w-12 h-12 transition-all duration-300",
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
    </motion.div>
  );
};

