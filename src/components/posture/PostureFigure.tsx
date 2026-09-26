import React from 'react';
import { motion } from 'motion/react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

interface PostureFigureProps {
  size?: number;
  angle?: number;
}

export const PostureFigure: React.FC<PostureFigureProps> = ({ 
  size = 220, 
  angle: manualAngle,
}) => {
  const currentAngle = useSelector((state: RootState) => state.posture.angle);
  const thresholds = useSelector((state: RootState) => state.posture.thresholds);
  
  const angle = manualAngle !== undefined ? manualAngle : currentAngle;

  // Dynamic Color Logic based on posture angle thresholds
  const getZoneColor = (a: number) => {
    if (a >= thresholds.good) return '#10b981'; // emerald green
    if (a >= thresholds.warn) return '#f59e0b'; // amber
    return '#ff2d55'; // vibrant rose red (exact match to screenshot)
  };

  const mainColor = getZoneColor(angle);

  // Clamp angle to safe visual bounds (strictly 0° to 90°)
  const clampedAngle = Math.max(0, Math.min(90, Math.round(angle)));
  const neckBending = (90 - clampedAngle); 

  return (
    <div className="relative flex items-center justify-center select-none" style={{ width: size, height: size }}>
      {/* Background Soft Dynamic Radial Ambience */}
      <motion.div 
        animate={{ 
          scale: [1, 1.05, 1],
          opacity: [0.05, 0.1, 0.05]
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-2 rounded-full blur-xl transition-colors duration-700 pointer-events-none"
        style={{ backgroundColor: mainColor }}
      />

      <svg
        viewBox="0 0 200 200"
        className="w-full h-full relative z-10 select-none pointer-events-none overflow-hidden"
      >
        <defs>
          {/* Wearable Clip Sensor Gradient */}
          <linearGradient id="sensorCordGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="60%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>
          
          {/* Torso Base Gradient */}
          <linearGradient id="torsoBaseGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>

          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.06" />
          </filter>
        </defs>

        {/* 1. Torso / Shoulder Dome (Base layer) */}
        <g filter="url(#softGlow)">
          <path 
            d="M 48 188 C 54 154, 146 154, 152 188 Z" 
            fill="url(#torsoBaseGrad)" 
            stroke="#cbd5e1" 
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </g>

        {/* 2. Neck & Head Group with dynamic rotation anchor from base of neck - smooth gentle transition */}
        <motion.g
          animate={{ rotate: neckBending * 0.65 }}
          style={{ transformOrigin: '88px 162px' }}
          transition={{ type: "spring", stiffness: 22, damping: 18, mass: 1.1 }}
        >
          {/* Neck Column */}
          <path
            d="M 85 162 Q 87 132 94 110"
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="19"
            strokeLinecap="round"
          />

          {/* Dynamic Spine Alignment Line Indicator */}
          <motion.path
            d="M 85 162 Q 87 132 94 110"
            fill="none"
            stroke={mainColor}
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeOpacity="0.45"
            animate={{ stroke: mainColor }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          />

          {/* Head & Facial Features Group */}
          <g transform="translate(98, 52)">
            {/* Head Silhouette */}
            <circle
              cx="0"
              cy="42"
              r="34"
              fill="#ffffff"
              stroke="#e2e8f0"
              strokeWidth="1.5"
            />

            {/* Nose Profile Contour */}
            <path
              d="M 32 41 Q 38 45 32 49"
              fill="#ffffff"
              stroke="#e2e8f0"
              strokeWidth="1.5"
              strokeLinecap="round"
            />

            {/* Eye Dot */}
            <circle cx="20" cy="39" r="2.2" fill="#334155" />

            {/* Ear Outer Ring */}
            <circle cx="-5" cy="42" r="5.5" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" />

            {/* Wearable Clip: Ear Hook Wire */}
            <path
              d="M -5 40 Q -3 36 -1 38 Q 2 40 -1 46 Q -4 52 -7 60"
              fill="none"
              stroke="url(#sensorCordGrad)"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            
            {/* Wearable Clip: Drop Cord */}
            <path
              d="M -7 60 Q -9 72 -12 84"
              fill="none"
              stroke="url(#sensorCordGrad)"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Wearable Clip: Sensor Pod Housing */}
            <rect
              x="-15.5"
              y="82"
              width="6"
              height="12"
              rx="2.5"
              fill="#94a3b8"
              stroke="#64748b"
              strokeWidth="0.8"
            />

            {/* Sensor Pod Status LED */}
            <motion.circle
              cx="-12.5"
              cy="88"
              r="1.8"
              fill={mainColor}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </g>
        </motion.g>
      </svg>
    </div>
  );
};
