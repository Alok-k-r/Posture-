// Open-Meteo Weather and Air Quality Service
// Zero API Key required. Real-time temperature, humidity, WMO weather condition & AQI.

export type WeatherStateCategory = 'pleasant' | 'warm' | 'heat_alert' | 'cold';

export interface WeatherData {
  city: string;
  temperature: number; // in °C
  humidity: number; // percentage e.g. 62
  condition: string; // e.g. "Partly Cloudy"
  conditionCode: number; // WMO code
  isDay: boolean;
  aqi: number; // US AQI e.g. 45
  aqiStatus: string; // e.g. "Good"
  category: WeatherStateCategory;
  lastFetched: number;
  latitude?: number;
  longitude?: number;
  pm25?: number;
}

const CACHE_KEY = 'posture_weather_cache_v1';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache

// Default fallback baseline matching Posture+ design reference
export const DEFAULT_WEATHER: WeatherData = {
  city: 'New Delhi',
  temperature: 28,
  humidity: 62,
  condition: 'Partly Cloudy',
  conditionCode: 2,
  isDay: true,
  aqi: 45,
  aqiStatus: 'Good',
  category: 'pleasant',
  lastFetched: Date.now()
};

// Map WMO weather code to clean readable label
export function getWmoCondition(code: number, isDay: boolean = true): string {
  switch (code) {
    case 0:
      return isDay ? 'Clear Sky' : 'Clear Night';
    case 1:
      return 'Mainly Clear';
    case 2:
      return 'Partly Cloudy';
    case 3:
      return 'Overcast';
    case 45:
    case 48:
      return 'Foggy';
    case 51:
    case 53:
    case 55:
      return 'Light Drizzle';
    case 61:
    case 63:
    case 65:
      return 'Rain';
    case 71:
    case 73:
    case 75:
      return 'Snow';
    case 80:
    case 81:
    case 82:
      return 'Rain Showers';
    case 95:
    case 96:
    case 99:
      return 'Thunderstorm';
    default:
      return 'Partly Cloudy';
  }
}

// Map US AQI value to category description
export function getAqiStatus(aqi: number): string {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Sensitive';
  if (aqi <= 200) return 'Unhealthy';
  return 'Hazardous';
}

// Categorize into Prompt Design States A, B, C, D
export function getWeatherCategory(temperature: number, aqi: number, conditionCode: number): WeatherStateCategory {
  if (temperature > 35 || aqi > 200) {
    return 'heat_alert';
  }
  if (temperature >= 29 && temperature <= 35) {
    return 'warm';
  }
  if (temperature < 10) {
    return 'cold';
  }
  return 'pleasant'; // 10°C to 28°C
}

export class WeatherService {
  public static getCachedWeather(): WeatherData {
    try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.lastFetched < CACHE_TTL_MS) {
          return parsed;
        }
      }
    } catch (e) {
      // Ignore storage errors
    }
    return DEFAULT_WEATHER;
  }

  public static async fetchCurrentWeather(lat?: number, lon?: number, cityName?: string): Promise<WeatherData> {
    const latitude = lat ?? 28.6139; // Default New Delhi if not provided
    const longitude = lon ?? 77.2090;
    const resolvedCity = cityName ?? (lat && lon ? 'Local Area' : 'New Delhi');

    try {
      // 1. Fetch Weather forecast (Open-Meteo)
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,is_day&timezone=auto`;
      const weatherPromise = fetch(weatherUrl).then(r => r.json());

      // 2. Fetch Air Quality (Open-Meteo AQI)
      const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi,pm2_5,pm10&timezone=auto`;
      const aqiPromise = fetch(aqiUrl).then(r => r.json()).catch(() => null);

      const [weatherRes, aqiRes] = await Promise.all([weatherPromise, aqiPromise]);

      const current = weatherRes?.current;
      const temperature = current ? Math.round(current.temperature_2m) : DEFAULT_WEATHER.temperature;
      const humidity = current ? Math.round(current.relative_humidity_2m) : DEFAULT_WEATHER.humidity;
      const conditionCode = current ? current.weather_code : DEFAULT_WEATHER.conditionCode;
      const isDay = current ? Boolean(current.is_day) : true;
      const condition = getWmoCondition(conditionCode, isDay);

      const rawAqi = aqiRes?.current?.us_aqi;
      const rawPm25 = aqiRes?.current?.pm2_5;
      let aqi = DEFAULT_WEATHER.aqi;

      if (typeof rawAqi === 'number' && !isNaN(rawAqi)) {
        aqi = Math.round(rawAqi);
      } else if (typeof rawPm25 === 'number' && !isNaN(rawPm25)) {
        // Standard US EPA AQI calculation formula based on PM2.5 breakpoints
        if (rawPm25 <= 12.0) {
          aqi = Math.round((50 / 12.0) * rawPm25);
        } else if (rawPm25 <= 35.4) {
          aqi = Math.round(((100 - 51) / (35.4 - 12.1)) * (rawPm25 - 12.1) + 51);
        } else if (rawPm25 <= 55.4) {
          aqi = Math.round(((150 - 101) / (55.4 - 35.5)) * (rawPm25 - 35.5) + 101);
        } else if (rawPm25 <= 150.4) {
          aqi = Math.round(((200 - 151) / (150.4 - 55.5)) * (rawPm25 - 55.5) + 151);
        } else if (rawPm25 <= 250.4) {
          aqi = Math.round(((300 - 201) / (250.4 - 150.5)) * (rawPm25 - 150.5) + 201);
        } else {
          aqi = Math.round(((500 - 301) / (500.4 - 250.5)) * (rawPm25 - 250.5) + 301);
        }
      }

      const aqiStatus = getAqiStatus(aqi);
      const category = getWeatherCategory(temperature, aqi, conditionCode);

      const weatherData: WeatherData = {
        city: resolvedCity,
        temperature,
        humidity,
        condition,
        conditionCode,
        isDay,
        aqi,
        aqiStatus,
        category,
        lastFetched: Date.now(),
        latitude,
        longitude,
        pm25: typeof rawPm25 === 'number' ? Math.round(rawPm25 * 10) / 10 : undefined,
      };

      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(weatherData));
      } catch (e) {
        // Storage full or restricted
      }

      return weatherData;
    } catch (err) {
      console.warn('Weather API fetch failed, utilizing cached/default baseline:', err);
      return WeatherService.getCachedWeather();
    }
  }

  // Reverse geocode coordinates using OpenStreetMap Nominatim
  public static async reverseGeocode(lat: number, lon: number): Promise<string> {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`, {
        headers: { 'Accept-Language': 'en' }
      });
      const data = await res.json();
      const city = data?.address?.city || data?.address?.town || data?.address?.village || data?.address?.suburb || data?.address?.county || data?.address?.state || 'My Location';
      return city;
    } catch (e) {
      return 'My Location';
    }
  }

  // Detect location via IP (Fallback when GPS permission is denied or pending)
  public static async fetchIpLocation(): Promise<{ city: string; lat: number; lon: number } | null> {
    try {
      const res = await fetch('https://ipwho.is/');
      const data = await res.json();
      if (data && data.success && data.latitude && data.longitude) {
        return {
          city: data.city || data.region || 'Local Area',
          lat: data.latitude,
          lon: data.longitude
        };
      }
    } catch (e) {
      // IP geo fallback failed
    }
    return null;
  }

  // Live city search using Open-Meteo Geocoding
  public static async searchCities(query: string): Promise<Array<{ name: string; country: string; admin1?: string; latitude: number; longitude: number }>> {
    if (!query || query.trim().length < 2) return [];
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=5&language=en&format=json`);
      const data = await res.json();
      if (data && Array.isArray(data.results)) {
        return data.results.map((item: any) => ({
          name: item.name,
          country: item.country || '',
          admin1: item.admin1 || '',
          latitude: item.latitude,
          longitude: item.longitude
        }));
      }
    } catch (e) {
      console.warn('City search failed:', e);
    }
    return [];
  }
}
