import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Droplets,
  Wind,
  AlertTriangle,
  RefreshCw,
  MapPin,
  Search,
  Navigation,
  Check,
  X,
  Moon,
  Sun,
  CloudSun,
  CloudRain,
  CloudLightning,
  Snowflake,
  Sparkles
} from 'lucide-react';
import { WeatherService, WeatherData, WeatherStateCategory } from '../../services/weatherService';
import { WeatherIllustration } from './WeatherIllustration';
import { cn } from '../../lib/utils';

// Atmospheric Theme Definition for comprehensive day, night, rain, and storm vibes
interface AtmosphericTheme {
  bgGradient: string;
  glowColor: string;
  textColor: string;
  subTextColor: string;
  metricLabelColor: string;
  cardBorder: string;
  metricBg: string;
  badgeBg: string;
  badgeText: string;
  isDarkTheme: boolean;
  isNight: boolean;
  isRaining: boolean;
  isStorm: boolean;
  isSnow: boolean;
}

function getAtmosphericTheme(
  isDay: boolean,
  conditionCode: number,
  category: WeatherStateCategory
): AtmosphericTheme {
  const isThunderstorm = conditionCode >= 95 && conditionCode <= 99;
  const isRaining =
    (conditionCode >= 51 && conditionCode <= 65) ||
    (conditionCode >= 80 && conditionCode <= 82);
  const isSnow =
    (conditionCode >= 71 && conditionCode <= 77) ||
    conditionCode === 85 ||
    conditionCode === 86;

  // NIGHT TIME VIBES
  if (!isDay) {
    if (isThunderstorm) {
      return {
        bgGradient: 'from-[#0D0B1C] via-[#1E173D] to-[#120F26]',
        glowColor: 'rgba(168, 85, 247, 0.3)',
        textColor: '#FFFFFF',
        subTextColor: '#CBD5E1',
        metricLabelColor: '#94A3B8',
        cardBorder: 'border-purple-500/20',
        metricBg: 'bg-purple-950/40 border-purple-800/30',
        badgeBg: 'bg-purple-900/60 text-purple-200 border-purple-700/40',
        badgeText: 'STORM NIGHT',
        isDarkTheme: true,
        isNight: true,
        isRaining: true,
        isStorm: true,
        isSnow: false,
      };
    }

    if (isRaining) {
      return {
        bgGradient: 'from-[#081124] via-[#0E1F3D] to-[#142A52]',
        glowColor: 'rgba(56, 189, 248, 0.25)',
        textColor: '#FFFFFF',
        subTextColor: '#CBD5E1',
        metricLabelColor: '#94A3B8',
        cardBorder: 'border-sky-500/25',
        metricBg: 'bg-sky-950/40 border-sky-800/30',
        badgeBg: 'bg-sky-900/60 text-sky-200 border-sky-700/40',
        badgeText: 'RAIN NIGHT',
        isDarkTheme: true,
        isNight: true,
        isRaining: true,
        isStorm: false,
        isSnow: false,
      };
    }

    if (isSnow) {
      return {
        bgGradient: 'from-[#0B1120] via-[#172033] to-[#1E293B]',
        glowColor: 'rgba(186, 230, 253, 0.22)',
        textColor: '#FFFFFF',
        subTextColor: '#CBD5E1',
        metricLabelColor: '#94A3B8',
        cardBorder: 'border-slate-700/50',
        metricBg: 'bg-slate-900/60 border-slate-800',
        badgeBg: 'bg-indigo-900/50 text-indigo-200 border-indigo-700/40',
        badgeText: 'SNOW NIGHT',
        isDarkTheme: true,
        isNight: true,
        isRaining: false,
        isStorm: false,
        isSnow: true,
      };
    }

    // Default Clear or Cloudy Night: Deep Celestial Midnight Indigo
    return {
      bgGradient: 'from-[#0A0F1D] via-[#131B2E] to-[#1A1E36]',
      glowColor: 'rgba(129, 140, 248, 0.28)',
      textColor: '#FFFFFF',
      subTextColor: '#CBD5E1',
      metricLabelColor: '#94A3B8',
      cardBorder: 'border-indigo-500/20',
      metricBg: 'bg-slate-900/50 border-slate-800/70',
      badgeBg: 'bg-indigo-900/50 text-indigo-200 border-indigo-700/40',
      badgeText: conditionCode === 0 ? 'CLEAR NIGHT' : 'NIGHT',
      isDarkTheme: true,
      isNight: true,
      isRaining: false,
      isStorm: false,
      isSnow: false,
    };
  }

  // DAY TIME VIBES
  if (isThunderstorm) {
    return {
      bgGradient: 'from-[#2D3748] via-[#3B475A] to-[#1A202C]',
      glowColor: 'rgba(250, 204, 21, 0.28)',
      textColor: '#FFFFFF',
      subTextColor: '#E2E8F0',
      metricLabelColor: '#CBD5E1',
      cardBorder: 'border-slate-600/40',
      metricBg: 'bg-slate-800/60 border-slate-700',
      badgeBg: 'bg-amber-950/70 text-amber-200 border-amber-800/60',
      badgeText: 'STORM',
      isDarkTheme: true,
      isNight: false,
      isRaining: true,
      isStorm: true,
      isSnow: false,
    };
  }

  if (isRaining) {
    return {
      bgGradient: 'from-[#D5E5F7] via-[#C5DBF2] to-[#B0CCE8]',
      glowColor: 'rgba(14, 165, 233, 0.3)',
      textColor: '#0F233A',
      subTextColor: '#334E68',
      metricLabelColor: '#486581',
      cardBorder: 'border-white/80',
      metricBg: 'bg-white/60 border-white/80',
      badgeBg: 'bg-sky-100/90 text-sky-800 border-sky-300/60',
      badgeText: 'RAINING',
      isDarkTheme: false,
      isNight: false,
      isRaining: true,
      isStorm: false,
      isSnow: false,
    };
  }

  if (isSnow) {
    return {
      bgGradient: 'from-[#E2F1FC] via-[#E8EDF9] to-[#F1F5F9]',
      glowColor: 'rgba(186, 230, 253, 0.35)',
      textColor: '#1E293B',
      subTextColor: '#475569',
      metricLabelColor: '#64748B',
      cardBorder: 'border-white/80',
      metricBg: 'bg-white/70 border-white/80',
      badgeBg: 'bg-blue-100/90 text-blue-800 border-blue-200',
      badgeText: 'SNOW',
      isDarkTheme: false,
      isNight: false,
      isRaining: false,
      isStorm: false,
      isSnow: true,
    };
  }

  if (category === 'heat_alert') {
    return {
      bgGradient: 'from-[#FFF1F1] via-[#FFEBEB] to-[#FFF7E8]',
      glowColor: 'rgba(239, 106, 106, 0.35)',
      textColor: '#3A2525',
      subTextColor: '#8B4545',
      metricLabelColor: '#9C5858',
      cardBorder: 'border-white/80',
      metricBg: 'bg-white/70 border-white/80',
      badgeBg: 'bg-rose-100/90 text-rose-800 border-rose-200',
      badgeText: 'HEAT ALERT',
      isDarkTheme: false,
      isNight: false,
      isRaining: false,
      isStorm: false,
      isSnow: false,
    };
  }

  if (category === 'warm') {
    return {
      bgGradient: 'from-[#FFF8EC] via-[#FFF3E0] to-[#FFE8D6]',
      glowColor: 'rgba(245, 158, 11, 0.3)',
      textColor: '#2D2A24',
      subTextColor: '#785934',
      metricLabelColor: '#8C6C48',
      cardBorder: 'border-white/80',
      metricBg: 'bg-white/70 border-white/80',
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200/60',
      badgeText: 'WARM SUN',
      isDarkTheme: false,
      isNight: false,
      isRaining: false,
      isStorm: false,
      isSnow: false,
    };
  }

  // Pleasant Daytime (Clean Cyan-Sky Atmosphere)
  return {
    bgGradient: 'from-[#C3E5FD] via-[#D6EFFD] to-[#E4F7FC]',
    glowColor: 'rgba(124, 199, 255, 0.35)',
    textColor: '#1B2540',
    subTextColor: '#475569',
    metricLabelColor: '#64748B',
    cardBorder: 'border-white/80',
    metricBg: 'bg-white/70 border-white/80',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    badgeText: 'COMFORTABLE',
    isDarkTheme: false,
    isNight: false,
    isRaining: false,
    isStorm: false,
    isSnow: false,
  };
}

export type VibePreviewMode = 'live' | 'day' | 'night' | 'rain' | 'storm' | 'snow';

export const WeatherWidget: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData>(() => WeatherService.getCachedWeather());
  const [displayTemp, setDisplayTemp] = useState<number>(weather.temperature);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [previewVibe, setPreviewVibe] = useState<VibePreviewMode>('live');

  // Search in location modal
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    Array<{ name: string; country: string; admin1?: string; latitude: number; longitude: number }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);

  // Check accessibility reduced motion preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, []);

  // Compute active projected weather (either live real data or test preview vibe)
  const activeWeather: WeatherData = React.useMemo(() => {
    if (previewVibe === 'day') {
      return {
        ...weather,
        isDay: true,
        condition: 'Clear Sky',
        conditionCode: 0,
        temperature: Math.max(24, weather.temperature),
        category: 'pleasant',
      };
    }
    if (previewVibe === 'night') {
      return {
        ...weather,
        isDay: false,
        condition: 'Clear Starry Night',
        conditionCode: 0,
        temperature: Math.min(22, weather.temperature),
        category: 'pleasant',
      };
    }
    if (previewVibe === 'rain') {
      return {
        ...weather,
        isDay: weather.isDay,
        condition: 'Passing Rain Showers',
        conditionCode: 63,
        humidity: 88,
        category: 'pleasant',
      };
    }
    if (previewVibe === 'storm') {
      return {
        ...weather,
        isDay: false,
        condition: 'Night Thunderstorm',
        conditionCode: 95,
        humidity: 92,
        category: 'pleasant',
      };
    }
    if (previewVibe === 'snow') {
      return {
        ...weather,
        isDay: true,
        condition: 'Gentle Snowfall',
        conditionCode: 73,
        temperature: -2,
        category: 'cold',
      };
    }
    return weather;
  }, [previewVibe, weather]);

  // Real-time automatic location resolution
  const refreshWeatherData = async (forceGpsPrompt = false) => {
    setIsRefreshing(true);
    setLocationNotice(null);

    // 1. Try browser GPS if available
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      try {
        const getGpsPosition = () =>
          new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: forceGpsPrompt ? 10000 : 4000,
              maximumAge: 60000,
            });
          });

        const pos = await getGpsPosition();
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const cityName = await WeatherService.reverseGeocode(lat, lon);
        const liveData = await WeatherService.fetchCurrentWeather(lat, lon, cityName);
        setWeather(liveData);
        setIsRefreshing(false);
        if (forceGpsPrompt) {
          setLocationNotice(`Connected to GPS: ${cityName}`);
          setTimeout(() => setIsLocationModalOpen(false), 800);
        }
        return;
      } catch {
        if (forceGpsPrompt) {
          setLocationNotice('GPS permission unavailable. Falling back to Network IP...');
        }
      }
    }

    // 2. IP-based location fallback
    try {
      const ipLoc = await WeatherService.fetchIpLocation();
      if (ipLoc) {
        const liveData = await WeatherService.fetchCurrentWeather(ipLoc.lat, ipLoc.lon, ipLoc.city);
        setWeather(liveData);
        setIsRefreshing(false);
        if (forceGpsPrompt) {
          setLocationNotice(`Located via Network: ${ipLoc.city}`);
          setTimeout(() => setIsLocationModalOpen(false), 800);
        }
        return;
      }
    } catch {
      // IP geo fallback failed
    }

    // 3. Fallback to default
    const fallback = await WeatherService.fetchCurrentWeather();
    setWeather(fallback);
    setIsRefreshing(false);
  };

  useEffect(() => {
    refreshWeatherData(false);
    const interval = setInterval(() => {
      refreshWeatherData(false);
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Search cities debounce
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await WeatherService.searchCities(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectCity = async (city: {
    name: string;
    country: string;
    admin1?: string;
    latitude: number;
    longitude: number;
  }) => {
    setIsRefreshing(true);
    const liveData = await WeatherService.fetchCurrentWeather(city.latitude, city.longitude, city.name);
    setWeather(liveData);
    setIsRefreshing(false);
    setIsLocationModalOpen(false);
    setSearchQuery('');
  };

  // Smooth temperature count-up / count-down interpolation
  useEffect(() => {
    if (displayTemp === activeWeather.temperature) return;
    const diff = activeWeather.temperature - displayTemp;
    const step = diff > 0 ? 1 : -1;
    const timer = setTimeout(() => {
      setDisplayTemp((prev) => prev + step);
    }, 35);
    return () => clearTimeout(timer);
  }, [displayTemp, activeWeather.temperature]);

  const theme = getAtmosphericTheme(
    activeWeather.isDay,
    activeWeather.conditionCode,
    activeWeather.category
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0 }}
        whileTap={{ scale: prefersReducedMotion ? 1 : 0.985 }}
        className={cn(
          "relative rounded-[24px] sm:rounded-[26px] p-3 sm:p-4 overflow-hidden flex flex-col justify-between select-none shadow-[0_8px_24px_-6px_rgba(15,23,42,0.06),0_2px_8px_rgba(15,23,42,0.02)] transition-all hover:shadow-[0_12px_28px_-6px_rgba(15,23,42,0.08)] border",
          theme.cardBorder,
          "bg-gradient-to-br",
          theme.bgGradient
        )}
        style={{ minHeight: '172px' }}
      >
        {/* 1. Dynamic Ambient Living Background Effects */}
        {/* Living Radial Glow */}
        {!prefersReducedMotion && (
          <motion.div
            animate={{
              opacity: [0.18, 0.35, 0.18],
              scale: [1, 1.08, 1],
            }}
            transition={{
              duration: theme.isStorm ? 2.5 : 8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute -top-10 -left-10 w-36 h-36 sm:w-44 sm:h-44 rounded-full pointer-events-none blur-2xl"
            style={{ backgroundColor: theme.glowColor }}
          />
        )}

        {/* Night Sky: Twinkling Micro Stars */}
        {!prefersReducedMotion && theme.isNight && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[
              { top: '14%', left: '16%', size: 2, delay: 0 },
              { top: '24%', left: '74%', size: 1.5, delay: 1.2 },
              { top: '40%', left: '42%', size: 2, delay: 0.6 },
              { top: '68%', left: '85%', size: 1.5, delay: 1.8 },
              { top: '82%', left: '28%', size: 2, delay: 2.3 },
              { top: '18%', left: '88%', size: 1, delay: 0.9 },
            ].map((star, i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.2, 0.9, 0.2], scale: [0.8, 1.25, 0.8] }}
                transition={{
                  duration: 2.8,
                  repeat: Infinity,
                  delay: star.delay,
                  ease: 'easeInOut',
                }}
                className="absolute rounded-full bg-white shadow-[0_0_3px_#fff]"
                style={{
                  top: star.top,
                  left: star.left,
                  width: `${star.size}px`,
                  height: `${star.size}px`,
                }}
              />
            ))}
          </div>
        )}

        {/* Rain Ambiance: Falling Slanted Streaks */}
        {!prefersReducedMotion && theme.isRaining && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-25">
            {[
              { left: '12%', delay: 0, duration: 0.85 },
              { left: '32%', delay: 0.35, duration: 1.05 },
              { left: '52%', delay: 0.15, duration: 0.75 },
              { left: '72%', delay: 0.45, duration: 0.95 },
              { left: '88%', delay: 0.25, duration: 0.8 },
            ].map((streak, i) => (
              <motion.div
                key={i}
                animate={{ y: [-10, 180] }}
                transition={{
                  duration: streak.duration,
                  repeat: Infinity,
                  delay: streak.delay,
                  ease: 'linear',
                }}
                className="absolute w-px h-7 bg-gradient-to-b from-transparent via-cyan-300 to-transparent rotate-[15deg]"
                style={{ left: streak.left, top: 0 }}
              />
            ))}
          </div>
        )}

        {/* Thunderstorm: Ambient Electric Flash */}
        {!prefersReducedMotion && theme.isStorm && (
          <motion.div
            animate={{ opacity: [0, 0, 0.15, 0, 0.1, 0, 0] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              times: [0, 0.7, 0.73, 0.76, 0.8, 0.84, 1],
            }}
            className="absolute inset-0 bg-indigo-300 pointer-events-none"
          />
        )}

        {/* 2. Top Header: Weather Icon Pill + Title & Location selector */}
        <div className="flex items-start justify-between relative z-10 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 mr-1">
            {/* Dynamic Weather Icon Badge */}
            <div
              className={cn(
                "w-6 h-6 sm:w-7 sm:h-7 shrink-0 rounded-full backdrop-blur-md shadow-2xs border flex items-center justify-center transition-colors",
                theme.isDarkTheme
                  ? "bg-white/15 border-white/20 text-white"
                  : "bg-white/85 border-white/70 text-slate-700"
              )}
            >
              {theme.isNight ? (
                <Moon size={13} className="text-indigo-300 fill-indigo-300/30" />
              ) : theme.isStorm ? (
                <CloudLightning size={13} className="text-amber-400" />
              ) : theme.isRaining ? (
                <CloudRain size={13} className="text-sky-500" />
              ) : theme.isSnow ? (
                <Snowflake size={13} className="text-cyan-400" />
              ) : activeWeather.conditionCode === 0 ? (
                <Sun size={13} className="text-amber-500" />
              ) : (
                <CloudSun size={13} className="text-amber-500" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <span
                className="text-[9.5px] sm:text-[10.5px] font-black uppercase tracking-wider block leading-none"
                style={{ color: theme.textColor }}
              >
                WEATHER
              </span>

              {/* Clickable City Name opens Location & Vibe Picker */}
              <button
                type="button"
                onClick={() => setIsLocationModalOpen(true)}
                className="flex items-center gap-0.5 mt-0.5 group text-left min-w-0 max-w-full"
                title="Change location or test weather vibes"
              >
                <span
                  className="text-[9.5px] sm:text-[10.5px] font-semibold leading-tight truncate"
                  style={{ color: theme.subTextColor }}
                >
                  {activeWeather.city}
                </span>
                <MapPin
                  size={9}
                  className={cn(
                    "shrink-0 transition-colors",
                    theme.isDarkTheme
                      ? "text-slate-400 group-hover:text-indigo-300"
                      : "text-slate-400 group-hover:text-indigo-600"
                  )}
                />
              </button>
            </div>
          </div>

          {/* Right Status / Refresh button */}
          <div className="flex items-center gap-1 shrink-0">
            {activeWeather.category === 'heat_alert' ? (
              <motion.div
                animate={prefersReducedMotion ? {} : { scale: [1, 1.05, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-400/40 text-rose-700 text-[8.5px] font-black uppercase tracking-wider"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                <span>ALERT</span>
              </motion.div>
            ) : (
              <button
                type="button"
                onClick={() => refreshWeatherData(true)}
                disabled={isRefreshing}
                title="Refresh real-time data"
                className={cn(
                  "p-1 rounded-full transition-colors",
                  theme.isDarkTheme ? "hover:bg-white/15 text-slate-300" : "hover:bg-white/50 text-slate-500"
                )}
              >
                <RefreshCw size={11} className={cn(isRefreshing && "animate-spin text-indigo-400")} />
              </button>
            )}
          </div>
        </div>

        {/* 3. Middle Section: Dynamic Celestial Body (Sun / Moon) + Clouds / Rain + Temperature */}
        <div className="flex items-center justify-between my-1 sm:my-1.5 relative z-10 min-w-0">
          {/* Dynamic Weather Illustration */}
          <WeatherIllustration
            isDay={activeWeather.isDay}
            conditionCode={activeWeather.conditionCode}
            prefersReducedMotion={prefersReducedMotion}
          />

          {/* Temperature & Condition Text with zero-overflow protection */}
          <div className="text-right pl-1 min-w-0 flex-1">
            <div
              className={cn(
                "text-2xl sm:text-3xl font-black tracking-tight leading-none drop-shadow-2xs whitespace-nowrap",
                theme.isDarkTheme ? "text-white" : "text-slate-900"
              )}
            >
              {displayTemp}°C
            </div>
            <span
              className="text-[9px] sm:text-[10.5px] font-semibold block leading-tight mt-0.5 truncate max-w-full"
              title={activeWeather.condition}
              style={{ color: theme.subTextColor }}
            >
              {activeWeather.condition}
            </span>
          </div>
        </div>

        {/* 4. Bottom Metrics Bar: Humidity & AQI */}
        <div
          className={cn(
            "flex items-center justify-between pt-1 relative z-10 min-w-0 border-t",
            theme.isDarkTheme ? "border-white/15" : "border-white/50"
          )}
        >
          {/* Humidity */}
          <div className="flex items-center gap-1 min-w-0 shrink-0" style={{ color: theme.textColor }}>
            <Droplets
              size={11}
              className={cn(
                "stroke-[2.2] shrink-0",
                theme.isDarkTheme ? "text-sky-400 fill-sky-400/20" : "text-sky-500 fill-sky-500/20"
              )}
            />
            <span className="text-[8.5px] sm:text-[9.5px] opacity-75 font-normal" style={{ color: theme.metricLabelColor }}>
              Hum
            </span>
            <span className="font-bold text-[9.5px] sm:text-[10.5px]">{activeWeather.humidity}%</span>
          </div>

          {/* AQI */}
          <div className="flex items-center gap-1 min-w-0 shrink-0" style={{ color: theme.textColor }}>
            <Wind
              size={11}
              className={cn(
                "stroke-[2.2] shrink-0",
                theme.isDarkTheme ? "text-emerald-400" : "text-emerald-500"
              )}
            />
            <span className="text-[8.5px] sm:text-[9.5px] opacity-75 font-normal" style={{ color: theme.metricLabelColor }}>
              AQI
            </span>
            <span className="font-bold text-[9.5px] sm:text-[10.5px]">{activeWeather.aqi}</span>
            <span
              className={cn(
                "text-[8px] sm:text-[8.5px] font-bold px-1 py-0.5 rounded border truncate max-w-[42px] sm:max-w-none",
                theme.isDarkTheme
                  ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/40"
                  : "bg-white/70 text-emerald-700 border-emerald-200/50"
              )}
            >
              {activeWeather.aqiStatus}
            </span>
          </div>
        </div>

        {/* Contextual Warning in High Heat */}
        {activeWeather.category === 'heat_alert' && (
          <div className="mt-1 px-2 py-0.5 bg-amber-500/15 rounded-lg text-[8.5px] font-medium text-amber-900 border border-amber-400/30 flex items-center gap-1 truncate">
            <AlertTriangle size={10} className="text-amber-600 shrink-0" />
            <span className="truncate">Stay hydrated in high heat</span>
          </div>
        )}
      </motion.div>

      {/* LOCATION PICKER & ATMOSPHERIC VIBE MODAL */}
      <AnimatePresence>
        {isLocationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 flex flex-col gap-4 text-slate-800 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Weather & Atmosphere Hub</h3>
                  <p className="text-[11px] text-slate-500">Live Meteorology & Dynamic Day/Night/Rain Vibes</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(false)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
                >
                  <X size={16} />
                </button>
              </div>

              {/* VIBE PREVIEW SELECTOR */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <Sparkles size={12} className="text-amber-500" />
                    <span>Atmospheric Vibe Preview</span>
                  </div>
                  {previewVibe !== 'live' && (
                    <button
                      type="button"
                      onClick={() => setPreviewVibe('live')}
                      className="text-[10px] text-indigo-600 font-bold hover:underline"
                    >
                      Reset to Live
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPreviewVibe('live')}
                    className={cn(
                      "py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1",
                      previewVibe === 'live'
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <span>🛰️ Auto Live</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewVibe('day')}
                    className={cn(
                      "py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1",
                      previewVibe === 'day'
                        ? "bg-amber-500 text-white shadow-xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <Sun size={12} />
                    <span>Day Sun</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewVibe('night')}
                    className={cn(
                      "py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1",
                      previewVibe === 'night'
                        ? "bg-indigo-900 text-white shadow-xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <Moon size={12} />
                    <span>Night Moon</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewVibe('rain')}
                    className={cn(
                      "py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1",
                      previewVibe === 'rain'
                        ? "bg-sky-600 text-white shadow-xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <CloudRain size={12} />
                    <span>Raining</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewVibe('storm')}
                    className={cn(
                      "py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1",
                      previewVibe === 'storm'
                        ? "bg-purple-900 text-white shadow-xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <CloudLightning size={12} />
                    <span>Storm</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewVibe('snow')}
                    className={cn(
                      "py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1",
                      previewVibe === 'snow'
                        ? "bg-blue-500 text-white shadow-xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <Snowflake size={12} />
                    <span>Snowing</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons: Exact GPS vs IP Auto-Detect */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => refreshWeatherData(true)}
                  disabled={isRefreshing}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <Navigation size={15} className="text-indigo-600 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Use Exact GPS Location</div>
                      <div className="text-[10px] text-indigo-600/80">Prompts browser device GPS accuracy</div>
                    </div>
                  </div>
                  {isRefreshing && <RefreshCw size={13} className="animate-spin text-indigo-600" />}
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setIsRefreshing(true);
                    const ipLoc = await WeatherService.fetchIpLocation();
                    if (ipLoc) {
                      const data = await WeatherService.fetchCurrentWeather(ipLoc.lat, ipLoc.lon, ipLoc.city);
                      setWeather(data);
                      setLocationNotice(`Network location: ${ipLoc.city}`);
                      setTimeout(() => setIsLocationModalOpen(false), 800);
                    }
                    setIsRefreshing(false);
                  }}
                  disabled={isRefreshing}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin size={15} className="text-slate-500 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Auto-Detect via Network (IP)</div>
                      <div className="text-[10px] text-slate-500">Fast fallback without GPS prompt</div>
                    </div>
                  </div>
                </button>
              </div>

              {locationNotice && (
                <div className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200/60 flex items-center gap-1.5">
                  <Check size={13} />
                  <span>{locationNotice}</span>
                </div>
              )}

              {/* City Search Bar */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Or Search Any City
                </label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="e.g. New York, London, Delhi, Tokyo..."
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  {isSearching && (
                    <RefreshCw size={12} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400" />
                  )}
                </div>

                {/* City Results */}
                {searchResults.length > 0 && (
                  <div className="mt-2 divide-y divide-slate-100 max-h-36 overflow-y-auto rounded-xl border border-slate-100 bg-white">
                    {searchResults.map((res, idx) => (
                      <button
                        key={`${res.name}-${res.latitude}-${idx}`}
                        type="button"
                        onClick={() => selectCity(res)}
                        className="w-full px-3 py-2 text-left hover:bg-indigo-50 flex items-center justify-between text-xs transition-colors"
                      >
                        <span className="font-semibold text-slate-800">{res.name}</span>
                        <span className="text-[10px] text-slate-400">
                          {res.admin1 ? `${res.admin1}, ` : ''}
                          {res.country}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Data transparency & Live Readings Breakdown */}
              <div className="rounded-2xl bg-slate-50 p-3 border border-slate-200/70 space-y-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Live Meteorological Breakdown
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-xl bg-white border border-slate-100">
                    <div className="flex items-center gap-1 text-slate-500 text-[10px]">
                      <Droplets size={11} className="text-sky-500" />
                      <span>Rel. Humidity</span>
                    </div>
                    <div className="text-sm font-bold text-slate-800 mt-0.5">
                      {activeWeather.humidity}%
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5">WMO 2m surface level</div>
                  </div>

                  <div className="p-2 rounded-xl bg-white border border-slate-100">
                    <div className="flex items-center gap-1 text-slate-500 text-[10px]">
                      <Wind size={11} className="text-emerald-500" />
                      <span>Air Quality (AQI)</span>
                    </div>
                    <div className="text-sm font-bold text-slate-800 mt-0.5">
                      {activeWeather.aqi}{' '}
                      <span className="text-[10px] font-semibold text-emerald-600">
                        ({activeWeather.aqiStatus})
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5">
                      {activeWeather.pm25 ? `PM2.5: ${activeWeather.pm25} µg/m³` : 'US EPA CAMS Index'}
                    </div>
                  </div>
                </div>

                {activeWeather.latitude && activeWeather.longitude && (
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                    <span>
                      Coords: {activeWeather.latitude.toFixed(2)}°, {activeWeather.longitude.toFixed(2)}°
                    </span>
                    <span>
                      Updated{' '}
                      {new Date(activeWeather.lastFetched).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Authoritative source attribution */}
              <div className="text-[10px] text-slate-400 text-center border-t border-slate-100 pt-1">
                Authoritative Sources: Open-Meteo Meteorology & Copernicus Atmosphere Monitoring Service (CAMS)
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
