import React from 'react';
import { motion } from 'motion/react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';

interface PostureFigureProps {
  size?: number;
  angle?: number;
}

export const PostureFigure: React.FC<PostureFigureProps> = ({ 
  size = 280, 
  angle: manualAngle,
}) => {
  const currentAngle = useSelector((state: RootState) => state.posture.angle);
  const thresholds = useSelector((state: RootState) => state.posture.thresholds);
  
  const angle = manualAngle !== undefined ? manualAngle : currentAngle;

  // Color logic for zones
  const getZoneColor = (a: number) => {
    if (a >= thresholds.good) return '#22C55E'; // green
    if (a >= thresholds.warn) return '#F97316'; // amber
    return '#EF4444'; // red
  };

  const mainColor = getZoneColor(angle);

  // Calculate tilt based on angle (90 is vertical, smaller is more leaning)
  const neckBending = (90 - angle); 

  // Colors (Light Mode Default)
  const headFill = 'white';
  const eyeColor = '#475569';
  const refLineColor = '#f1f5f9';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Background Soft Glow */}
      <motion.div 
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.03, 0.06, 0.03]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 rounded-full blur-3xl transition-colors duration-700"
        style={{ backgroundColor: mainColor }}
      />

      <svg
        viewBox="0 0 200 200"
        className="w-full h-full relative z-10"
      >
        <defs>
          <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#f1f5f9" />
          </linearGradient>
        </defs>

        {/* Shoulder / Upper Torso (Side View) */}
        <path 
          d="M 60 180 Q 80 140 140 150 L 150 180 Z" 
          fill="#f1f5f9" 
          stroke="#cbd5e1" 
          strokeWidth="1"
        />

        {/* Neck & Head Group (Dynamic tilt) */}
        <motion.g
          animate={{ rotate: neckBending * 0.8, transformOrigin: '90px 145px' }}
          transition={{ type: "spring", stiffness: 40, damping: 12 }}
        >
          {/* Neck */}
          <path
            d="M 85 145 Q 85 110 95 90"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="18"
            strokeLinecap="round"
          />
          
          {/* Head (Side Cartoon Profile) */}
          <g transform="translate(95, 35)">
            {/* Main Head Shape */}
            <path 
              d="M 0 0 C 25 0, 45 20, 45 45 C 45 70, 30 90, 0 90 C -20 90, -35 70, -35 45 C -35 20, -20 0, 0 0 Z" 
              fill={headFill} 
              stroke="#e2e8f0" 
              strokeWidth="1.5"
            />
            {/* Ear */}
            <circle cx="-5" cy="50" r="5" fill={headFill} stroke="#e2e8f0" strokeWidth="1" />
            {/* Nose Profile (Subtle) */}
            <path d="M 45 50 Q 52 55 45 60" fill={headFill} stroke="#e2e8f0" strokeWidth="1" />
            {/* Eye (Side View dot) */}
            <circle cx="28" cy="45" r="2" fill={eyeColor} />
          </g>

          {/* Spine Segment Highlight */}
          <motion.path
            d="M 85 145 Q 85 110 95 90"
            fill="none"
            stroke={mainColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeOpacity="0.4"
            animate={{ stroke: mainColor }}
          />
        </motion.g>
      </svg>
    </div>
  );
};

