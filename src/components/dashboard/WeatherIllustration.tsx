import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface WeatherIllustrationProps {
  isDay: boolean;
  conditionCode: number;
  prefersReducedMotion?: boolean;
  className?: string;
}

export const WeatherIllustration: React.FC<WeatherIllustrationProps> = ({
  isDay,
  conditionCode,
  prefersReducedMotion = false,
  className,
}) => {
  // Classification of weather categories
  const isClear = conditionCode === 0 || conditionCode === 1;
  const isPartlyCloudy = conditionCode === 2;
  const isOvercast = conditionCode === 3;
  const isFog = conditionCode === 45 || conditionCode === 48;
  const isDrizzle = conditionCode >= 51 && conditionCode <= 55;
  const isRain = (conditionCode >= 61 && conditionCode <= 65) || (conditionCode >= 80 && conditionCode <= 82);
  const isSnow = (conditionCode >= 71 && conditionCode <= 77) || conditionCode === 85 || conditionCode === 86;
  const isThunderstorm = conditionCode >= 95 && conditionCode <= 99;
  const hasPrecipitation = isDrizzle || isRain || isThunderstorm;

  // Cloud presence
  const showCloud = !isClear || isOvercast || hasPrecipitation || isSnow || isFog;

  return (
    <div
      className={cn(
        "relative w-12 h-12 sm:w-14 sm:h-14 shrink-0 flex items-center justify-center select-none",
        className
      )}
    >
      {/* 1. CELESTIAL BODY: SUN (Day) vs MOON (Night) */}
      {isDay ? (
        /* DAY: Radiant Golden Sun */
        <div
          className={cn(
            "flex items-center justify-center transition-all",
            showCloud
              ? "absolute top-0 right-1 sm:right-1.5 z-10"
              : "absolute inset-0 m-auto z-10"
          )}
        >
          {/* Corona Ambient Glow */}
          <div
            className={cn(
              "rounded-full bg-amber-400/25 blur-md pointer-events-none absolute",
              showCloud ? "w-8 h-8 sm:w-9 sm:h-9" : "w-10 h-10 sm:w-11 sm:h-11"
            )}
          />

          {/* Rotating Subtle Rays */}
          {!prefersReducedMotion && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
              className={cn(
                "absolute opacity-40 pointer-events-none",
                showCloud ? "w-8 h-8 sm:w-9 sm:h-9" : "w-9 h-9 sm:w-10 sm:h-10"
              )}
            >
              {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
                <div
                  key={deg}
                  className="absolute top-1/2 left-1/2 w-1 h-1 bg-amber-400 rounded-full -translate-x-1/2 -translate-y-1/2"
                  style={{
                    transform: `rotate(${deg}deg) translate(0, ${showCloud ? '-16px' : '-19px'})`,
                  }}
                />
              ))}
            </motion.div>
          )}

          {/* Golden Sun Sphere */}
          <motion.div
            animate={
              prefersReducedMotion
                ? {}
                : {
                    scale: [1, 1.05, 1],
                  }
            }
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            className={cn(
              "rounded-full shadow-[0_4px_16px_rgba(251,191,36,0.6)] relative z-10",
              showCloud ? "w-7 h-7 sm:w-8 sm:h-8" : "w-8.5 h-8.5 sm:w-9.5 sm:h-9.5"
            )}
            style={{
              background: 'radial-gradient(circle at 35% 35%, #FFFDF0 0%, #FBBF24 55%, #F59E0B 100%)',
            }}
          />
        </div>
      ) : (
        /* NIGHT: Mathematically Balanced 3D Silver Crescent Moon */
        <div
          className={cn(
            "flex items-center justify-center transition-all",
            showCloud
              ? "absolute top-0 right-1 sm:right-1.5 z-10"
              : "absolute inset-0 m-auto z-10"
          )}
        >
          {/* Lunar Silver-Indigo Aura Glow */}
          <div
            className={cn(
              "rounded-full bg-indigo-400/30 blur-md pointer-events-none absolute",
              showCloud ? "w-8 h-8 sm:w-9 sm:h-9" : "w-11 h-11 sm:w-12 sm:h-12"
            )}
          />

          {/* Twinkling ambient micro-stars around moon */}
          {!prefersReducedMotion && (
            <div
              className={cn(
                "absolute pointer-events-none",
                showCloud ? "-top-1 -left-1 w-9 h-9" : "-top-1 -right-1 w-11 h-11"
              )}
            >
              <motion.div
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute top-0.5 right-1 w-1 h-1 rounded-full bg-white shadow-[0_0_4px_#fff]"
              />
              <motion.div
                animate={{ opacity: [0.2, 0.9, 0.2], scale: [0.7, 1.1, 0.7] }}
                transition={{ duration: 3.1, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute bottom-1 left-0.5 w-0.5 h-0.5 rounded-full bg-indigo-200"
              />
            </div>
          )}

          {/* Glowing Mathematically Balanced Moon Crescent (Centered Arc) */}
          <motion.div
            animate={
              prefersReducedMotion
                ? {}
                : {
                    scale: [1, 1.04, 1],
                    rotate: [-1, 2, -1],
                  }
            }
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            className={cn(
              "relative z-10 flex items-center justify-center",
              showCloud ? "w-7 h-7 sm:w-8 sm:h-8" : "w-9 h-9 sm:w-10 sm:h-10"
            )}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-full h-full drop-shadow-[0_4px_12px_rgba(165,180,252,0.6)]"
            >
              <defs>
                <linearGradient id="moonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="45%" stopColor="#E2E8F0" />
                  <stop offset="100%" stopColor="#93C5FD" />
                </linearGradient>
                <linearGradient id="craterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#4338CA" stopOpacity="0.3" />
                </linearGradient>
              </defs>

              {/* Exact centered lunar crescent geometry */}
              <path
                d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"
                fill="url(#moonGrad)"
                stroke="#E2E8F0"
                strokeWidth="0.5"
              />

              {/* Subtle aesthetic craters embedded inside crescent width */}
              <circle cx="8.5" cy="11.5" r="1.1" fill="url(#craterGrad)" />
              <circle cx="10.2" cy="15.5" r="0.8" fill="url(#craterGrad)" />
              <circle cx="7.2" cy="15" r="0.6" fill="url(#craterGrad)" />
            </svg>
          </motion.div>
        </div>
      )}

      {/* 2. DIMENSIONAL CLOUDS (Positioned on lower-left foreground to layer with upper-right moon/sun) */}
      {showCloud && (
        <motion.div
          animate={
            prefersReducedMotion
              ? {}
              : {
                  x: [-1, 1, -1],
                  y: [0, -1, 0],
                }
          }
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-0 left-0 w-11 h-6.5 sm:w-12 sm:h-7 z-20"
        >
          <svg viewBox="0 0 64 36" className="w-full h-full drop-shadow-[0_4px_8px_rgba(15,23,42,0.22)]">
            <defs>
              {/* Day Cloud Gradient: Puffy clean white with soft sky-gray base */}
              <linearGradient id="dayCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="70%" stopColor={hasPrecipitation ? '#CBD5E1' : '#F8FAFC'} />
                <stop offset="100%" stopColor={hasPrecipitation ? '#94A3B8' : '#E2E8F0'} />
              </linearGradient>
              {/* Night Cloud Gradient: Moonlit silver-slate */}
              <linearGradient id="nightCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#64748B" />
                <stop offset="60%" stopColor="#334155" />
                <stop offset="100%" stopColor="#1E293B" />
              </linearGradient>
              {/* Storm Cloud: Deep dramatic slate-violet */}
              <linearGradient id="stormCloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#475569" />
                <stop offset="60%" stopColor="#1E293B" />
                <stop offset="100%" stopColor="#0F172A" />
              </linearGradient>
            </defs>
            <path
              d="M 18 32 L 50 32 A 10 10 0 0 0 50 16 A 14 14 0 0 0 24 12 A 11 11 0 0 0 14 22 A 9 9 0 0 0 18 32 Z"
              fill={
                isThunderstorm
                  ? 'url(#stormCloudGrad)'
                  : isDay
                  ? 'url(#dayCloudGrad)'
                  : 'url(#nightCloudGrad)'
              }
              stroke={isDay && !hasPrecipitation ? '#FFFFFF' : isDay ? '#E2E8F0' : '#475569'}
              strokeWidth="1.2"
            />
          </svg>
        </motion.div>
      )}

      {/* 3. RAIN DROPS & DRIZZLE ANIMATION (Falling directly from beneath the cloud) */}
      {hasPrecipitation && !isThunderstorm && (
        <div className="absolute -bottom-2 left-1.5 w-9 sm:w-10 h-4 z-30 pointer-events-none flex justify-around">
          {[
            { delay: 0, speed: 0.75 },
            { delay: 0.25, speed: 0.85 },
            { delay: 0.12, speed: 0.7 },
            { delay: 0.38, speed: 0.8 },
            { delay: 0.18, speed: 0.75 },
          ].map((drop, i) => (
            <motion.div
              key={i}
              animate={
                prefersReducedMotion
                  ? {}
                  : {
                      y: [-2, 12],
                      opacity: [0, 0.95, 0],
                    }
              }
              transition={{
                duration: drop.speed,
                repeat: Infinity,
                delay: drop.delay,
                ease: 'linear',
              }}
              className="w-0.5 h-2.5 rounded-full rotate-[15deg]"
              style={{
                background: isDay
                  ? 'linear-gradient(to bottom, #38BDF8, #0284C7)'
                  : 'linear-gradient(to bottom, #7DD3FC, #38BDF8)',
              }}
            />
          ))}
        </div>
      )}

      {/* 4. THUNDERSTORM: LIGHTNING BOLT + RAIN */}
      {isThunderstorm && (
        <>
          {/* Dynamic Lightning Flash Bolt */}
          <motion.div
            animate={
              prefersReducedMotion
                ? { opacity: 0.7 }
                : {
                    opacity: [0, 0, 1, 0, 1, 0, 0],
                    scale: [0.95, 0.95, 1.05, 0.95, 1.05, 0.95, 0.95],
                  }
            }
            transition={{
              duration: 3.2,
              repeat: Infinity,
              ease: 'easeInOut',
              times: [0, 0.6, 0.65, 0.7, 0.75, 0.8, 1],
            }}
            className="absolute -bottom-1.5 left-4.5 w-4 h-5 z-30 pointer-events-none"
          >
            <svg
              viewBox="0 0 24 24"
              fill="#FACC15"
              stroke="#EAB308"
              strokeWidth="1"
              className="w-full h-full drop-shadow-[0_0_8px_#FACC15]"
            >
              <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" />
            </svg>
          </motion.div>

          {/* Heavy Storm Rain */}
          <div className="absolute -bottom-2 left-1.5 w-9 sm:w-10 h-4 z-20 pointer-events-none flex justify-around">
            {[0, 0.2, 0.4, 0.1, 0.3].map((delay, i) => (
              <motion.div
                key={i}
                animate={
                  prefersReducedMotion
                    ? {}
                    : {
                        y: [-2, 14],
                        opacity: [0, 1, 0],
                      }
                }
                transition={{
                  duration: 0.55,
                  repeat: Infinity,
                  delay,
                  ease: 'linear',
                }}
                className="w-0.5 h-3 rounded-full bg-cyan-300 rotate-[20deg]"
              />
            ))}
          </div>
        </>
      )}

      {/* 5. SNOW: GENTLE DRIFTING SNOWFLAKES */}
      {isSnow && (
        <div className="absolute -bottom-2 left-1 right-1 h-4 z-30 pointer-events-none flex justify-around">
          {[
            { delay: 0, x: -2 },
            { delay: 0.5, x: 2 },
            { delay: 0.25, x: -1 },
            { delay: 0.75, x: 1 },
          ].map((flake, i) => (
            <motion.div
              key={i}
              animate={
                prefersReducedMotion
                  ? {}
                  : {
                      y: [-2, 11],
                      x: [flake.x, -flake.x, flake.x],
                      opacity: [0, 1, 0],
                      rotate: [0, 180],
                    }
              }
              transition={{
                duration: 2.2,
                repeat: Infinity,
                delay: flake.delay,
                ease: 'easeInOut',
              }}
              className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_4px_#fff]"
            />
          ))}
        </div>
      )}

      {/* 6. FOG / MIST: HORIZONTAL DRIFTING WAVES */}
      {isFog && (
        <div className="absolute -bottom-1 left-0 right-0 h-3 z-30 pointer-events-none flex flex-col justify-around opacity-70">
          <motion.div
            animate={prefersReducedMotion ? {} : { x: [-3, 3, -3] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="w-10 h-0.5 rounded-full bg-slate-300 mx-auto"
          />
          <motion.div
            animate={prefersReducedMotion ? {} : { x: [3, -3, 3] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            className="w-8 h-0.5 rounded-full bg-slate-400 mx-auto"
          />
        </div>
      )}
    </div>
  );
};
