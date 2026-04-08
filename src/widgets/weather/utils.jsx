/**
 * Weather widget utilities — Open-Meteo backend
 * https://open-meteo.com — free, no API key required
 */
import {
  Sun, MoonStars,
  CloudSun, CloudMoon,
  Cloud, Clouds,
  CloudRain, CloudRainHeavy,
  CloudDrizzle, CloudSleet,
  CloudSnow, CloudLightningRain,
  CloudFog,
} from 'react-bootstrap-icons';

/** No longer needed — kept so any lingering import doesn't crash. */
export const API_KEY = null;

// ── WMO weather interpretation code → human description ──────────────────────
const WMO = {
  0: 'clear sky',
  1: 'mainly clear',
  2: 'partly cloudy',
  3: 'overcast',
  45: 'foggy',
  48: 'rime fog',
  51: 'light drizzle',
  53: 'drizzle',
  55: 'heavy drizzle',
  56: 'freezing drizzle',
  57: 'freezing drizzle',
  61: 'light rain',
  63: 'rain',
  65: 'heavy rain',
  66: 'freezing rain',
  67: 'freezing rain',
  71: 'light snow',
  73: 'snow',
  75: 'heavy snow',
  77: 'snow grains',
  80: 'rain showers',
  81: 'showers',
  82: 'heavy showers',
  85: 'snow showers',
  86: 'heavy snow showers',
  95: 'thunderstorm',
  96: 'thunderstorm · hail',
  99: 'thunderstorm · hail',
};

export const wmoDescription = (code) => WMO[code] ?? 'unknown';

// ── Icon mapping (WMO codes 0–99) ─────────────────────────────────────────────
export const getWeatherIcon = (code, isDay, size = 52) => {
  const p = { size, style: { color: 'var(--w-ink-4)', flexShrink: 0 } };
  if (code === 0) return isDay ? <Sun {...p} /> : <MoonStars {...p} />;
  if (code <= 2) return isDay ? <CloudSun {...p} /> : <CloudMoon {...p} />;
  if (code === 3) return <Clouds {...p} />;
  if (code === 45 || code === 48) return <CloudFog {...p} />;
  if (code >= 51 && code <= 57) return <CloudDrizzle {...p} />;
  if (code === 66 || code === 67) return <CloudSleet {...p} />;
  if (code === 61 || code === 80) return <CloudRain {...p} />;
  if (code === 63 || code === 81) return <CloudRain {...p} />;
  if (code === 65 || code === 82) return <CloudRainHeavy {...p} />;
  if (code >= 71 && code <= 77) return <CloudSnow {...p} />;
  if (code === 85 || code === 86) return <CloudSnow {...p} />;
  if (code >= 95) return <CloudLightningRain {...p} />;
  return <Cloud {...p} />;
};

/**
 * Requests the user's geolocation. Returns { lat, lon }.
 */
export const getCoords = () =>
  new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude: lat, longitude: lon } }) => resolve({ lat, lon }),
      reject,
      { timeout: 8_000 },
    ),
  );

/**
 * Reverse-geocode {lat, lon} → city name using OSM Nominatim (free, no key).
 * Returns the suburb/town/city/county closest to the point, or ''.
 */
export const reverseGeocode = async (lat, lon) => {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`,
      { signal: AbortSignal.timeout(5000), headers: { 'Accept-Language': 'en' } },
    );
    if (!r.ok) return '';
    const d = await r.json();
    const a = d.address || {};
    return (a.suburb || a.neighbourhood || a.town || a.city || a.county || a.state || '');
  } catch {
    return '';
  }
};

/**
 * Single Open-Meteo call — returns current + 12h hourly forecast.
 * No API key required.
 * @param {'metric'|'imperial'} units
 */
export const fetchOpenMeteo = (lat, lon, units = 'metric') => {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,apparent_temperature,weather_code,wind_gusts_10m,precipitation,is_day',
    hourly: 'precipitation_probability,weather_code,wind_gusts_10m',
    forecast_hours: 12,
    temperature_unit: units === 'imperial' ? 'fahrenheit' : 'celsius',
    wind_speed_unit: units === 'imperial' ? 'mph' : 'kmh',
    timezone: 'auto',
  });
  return fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
    .then(r => r.ok ? r.json() : Promise.reject(new Error(`Open-Meteo ${r.status}`)));
};

// ── Data parsers ──────────────────────────────────────────────────────────────

/**
 * Extracts current conditions from an Open-Meteo response.
 * @param {string} cityName  pre-resolved city label (from settings or geolocation)
 */
export const parseWeather = (data, cityName = '') => ({
  temperature: Math.round(data.current.temperature_2m),
  feelsLike: Math.round(data.current.apparent_temperature),
  code: data.current.weather_code,
  description: wmoDescription(data.current.weather_code),
  isDay: data.current.is_day === 1,
  precipitation: data.current.precipitation,
  windGust: Math.round(data.current.wind_gusts_10m),
  city: cityName,
});

/**
 * Produces a plain-language forecast from Open-Meteo hourly data.
 *
 * Returns one of three types:
 *  - 'clearing'  currently raining; clears in `hours` h
 *  - 'incoming'  not raining now; rain arrives in `hours` h
 *  - 'persist'   dominant condition covers `hours` h of the next ~6 h
 *
 * @param {object} data  raw Open-Meteo response
 * @returns {{ description: string, code: number, hours: number, type: string } | null}
 */
export const parseForecast = (data) => {
  const hourly = data?.hourly;
  if (!hourly?.weather_code?.length) return null;

  const pops = hourly.precipitation_probability;
  const codes = hourly.weather_code;
  const n = Math.min(codes.length, 12);

  const precipNow = codes[0] >= 51; // WMO 51+ = drizzle / rain / snow / storm

  // Case 1: currently precipitating → look for when it clears
  if (precipNow) {
    for (let i = 1; i < n; i++) {
      if (codes[i] < 51 && pops[i] < 25) {
        return {
          description: 'clearing up',
          code: codes[i],
          hours: i,
          type: 'clearing',
          // Pass raw pop values so the widget can show the data that caused this
          popSlots: pops.slice(0, Math.min(i + 2, n)),
        };
      }
    }
    return { description: wmoDescription(codes[0]), code: codes[0], hours: n, type: 'persist' };
  }

  // Case 2: clear/cloudy now → look for likely incoming precipitation
  for (let i = 1; i < Math.min(n, 8); i++) {
    if (pops[i] >= 50) {
      return {
        description: wmoDescription(codes[i]),
        code: codes[i],
        hours: i,
        type: 'incoming',
        popSlots: pops.slice(0, Math.min(i + 2, n)),
      };
    }
  }

  // Case 3: mild probability → flag as possible
  for (let i = 1; i < Math.min(n, 8); i++) {
    if (pops[i] >= 30) {
      return {
        description: wmoDescription(codes[i]) + ' possible',
        code: codes[i],
        hours: i,
        type: 'incoming',
        popSlots: pops.slice(0, Math.min(i + 2, n)),
      };
    }
  }

  // Case 4: find dominant condition for the next ~6 h
  const tally = {};
  for (let i = 0; i < Math.min(n, 6); i++) {
    const c = codes[i];
    tally[c] = (tally[c] || 0) + 1;
  }
  const [bestCode, bestCount] = Object.entries(tally).sort(([, a], [, b]) => b - a)[0];
  return {
    description: wmoDescription(parseInt(bestCode)),
    code: parseInt(bestCode),
    hours: bestCount,
    type: 'persist',
  };
};

/**
 * Fallback auto-location via IP geolocation.
 * Tries ipapi.co first (consistent with sunTime.js), then freeipapi.com.
 * Returns { lat, lon, city } or null.
 */
export const getCoordsFromIP = async () => {
  const isExtension = typeof chrome !== 'undefined' && !!chrome.runtime?.id;
  // ipapi.co — same service used by sunTime.js; skip for extension origins
  if (!isExtension) {
    try {
      const r = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
      if (r.ok) {
        const d = await r.json();
        if (typeof d.latitude === 'number' && typeof d.longitude === 'number') {
          return { lat: d.latitude, lon: d.longitude, city: d.city || '' };
        }
      }
    } catch { /* fall through */ }
  }
  // freeipapi.com — CORS-enabled, also works from extension origins
  try {
    const r = await fetch('https://freeipapi.com/api/json', { signal: AbortSignal.timeout(5000) });
    if (r.ok) {
      const d = await r.json();
      if (typeof d.latitude === 'number' && typeof d.longitude === 'number') {
        return { lat: d.latitude, lon: d.longitude, city: d.cityName || '' };
      }
    }
  } catch { /* ignore */ }
  return null;
};
