/**
 * Weather widget utilities — Open-Meteo backend
 * https://open-meteo.com — free, no API key required
 */
import {
  OPEN_METEO_WEATHER_API,
  OPEN_METEO_AQI_API,
} from '../../constants/urls.js';
import {
  SunFill,
  MoonStarsFill,
  CloudSunFill,
  CloudMoonFill,
  CloudFill,
  CloudsFill,
  CloudRainFill,
  CloudRainHeavyFill,
  CloudDrizzleFill,
  CloudSleetFill,
  CloudSnowFill,
  CloudLightningRainFill,
  CloudFogFill,
} from "react-bootstrap-icons";

/** No longer needed — kept so any lingering import doesn't crash. */
const API_KEY = null;

// ── WMO weather interpretation code → human description ──────────────────────
// (getCoords, reverseGeocode, getCoordsFromIP were removed — superseded by
// the centralized useLocationStore. See src/store/useLocationStore.js.)
const WMO = {
  0: "clear sky",
  1: "mainly clear",
  2: "partly cloudy",
  3: "overcast",
  45: "foggy",
  48: "rime fog",
  51: "light drizzle",
  53: "drizzle",
  55: "heavy drizzle",
  56: "freezing drizzle",
  57: "freezing drizzle",
  61: "light rain",
  63: "rain",
  65: "heavy rain",
  66: "freezing rain",
  67: "freezing rain",
  71: "light snow",
  73: "snow",
  75: "heavy snow",
  77: "snow grains",
  80: "rain showers",
  81: "showers",
  82: "heavy showers",
  85: "snow showers",
  86: "heavy snow showers",
  95: "thunderstorm",
  96: "thunderstorm · hail",
  99: "thunderstorm · hail",
};

export const wmoDescription = (code) => WMO[code] ?? "unknown";

// ── Icon mapping (WMO codes 0–99) ─────────────────────────────────────────────

const STATIC_ICONS = {
  3: CloudsFill, 45: CloudFogFill, 48: CloudFogFill,
  66: CloudSleetFill, 67: CloudSleetFill,
};
// Ranges mapped to single icons
const RANGE_ICONS = [
  [51, 57, CloudDrizzleFill], [71, 77, CloudSnowFill],
  [85, 86, CloudSnowFill], [95, 99, CloudLightningRainFill],
];
// Codes that share an icon
const SHARED_ICONS = [
  [[61, 80], CloudRainFill], [[63, 81], CloudRainFill], [[65, 82], CloudRainHeavyFill],
];

const resolveIcon = (code) => {
  if (STATIC_ICONS[code]) return STATIC_ICONS[code];
  for (const [lo, hi, Icon] of RANGE_ICONS) {
    if (code >= lo && code <= hi) return Icon;
  }
  for (const [codes, Icon] of SHARED_ICONS) {
    if (codes.includes(code)) return Icon;
  }
  return CloudFill;
};

export const getWeatherIcon = (code, isDay, size = 52) => {
  const p = { size, style: { color: 'var(--w-ink-4)', flexShrink: 0 } };
  if (code === 0) return isDay ? <SunFill {...p} /> : <MoonStarsFill {...p} />;
  if (code <= 2) return isDay ? <CloudSunFill {...p} /> : <CloudMoonFill {...p} />;
  const Icon = resolveIcon(code);
  return <Icon {...p} />;
};

// ── (getCoords, reverseGeocode, getCoordsFromIP removed — superseded by
//     the centralized useLocationStore in src/store/useLocationStore.js) ──

/**
 * Single Open-Meteo call — returns current + 12h hourly forecast.
 * No API key required.
 * @param {'metric'|'imperial'} units
 */
export const fetchOpenMeteo = (lat, lon, units = "metric") => {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current:
      "temperature_2m,apparent_temperature,weather_code,wind_gusts_10m,precipitation,is_day",
    hourly: "precipitation_probability,weather_code,wind_gusts_10m",
    forecast_hours: 12,
    temperature_unit: units === "imperial" ? "fahrenheit" : "celsius",
    wind_speed_unit: units === "imperial" ? "mph" : "kmh",
    timezone: "auto",
  });
  return fetch(`${OPEN_METEO_WEATHER_API}?${params}`).then((r) =>
    r.ok ? r.json() : Promise.reject(new Error(`Open-Meteo ${r.status}`)),
  );
};

// ── Data parsers ──────────────────────────────────────────────────────────────

/**
 * Extracts current conditions from an Open-Meteo response.
 * @param {string} cityName  pre-resolved city label (from settings or geolocation)
 */
export const parseWeather = (data, cityName = "") => ({
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
          description: "clearing up",
          code: codes[i],
          hours: i,
          type: "clearing",
          // Pass raw pop values so the widget can show the data that caused this
          popSlots: pops.slice(0, Math.min(i + 2, n)),
        };
      }
    }
    return {
      description: wmoDescription(codes[0]),
      code: codes[0],
      hours: n,
      type: "persist",
    };
  }

  // Case 2: clear/cloudy now → look for likely incoming precipitation
  for (let i = 1; i < Math.min(n, 8); i++) {
    if (pops[i] >= 50) {
      return {
        description: wmoDescription(codes[i]),
        code: codes[i],
        hours: i,
        type: "incoming",
        popSlots: pops.slice(0, Math.min(i + 2, n)),
      };
    }
  }

  // Case 3: mild probability → flag as possible
  for (let i = 1; i < Math.min(n, 8); i++) {
    if (pops[i] >= 30) {
      return {
        description: wmoDescription(codes[i]) + " possible",
        code: codes[i],
        hours: i,
        type: "incoming",
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
  const [bestCode, bestCount] = Object.entries(tally).sort(
    ([, a], [, b]) => b - a,
  )[0];
  return {
    description: wmoDescription(Number.parseInt(bestCode)),
    code: Number.parseInt(bestCode),
    hours: bestCount,
    type: "persist",
  };
};

// ── Weather result cache (localStorage) ──────────────────────────────────────
// Eliminates the loading skeleton on all subsequent new-tab opens.
// First open fetches normally; every open after that shows data instantly
// from the cache while a background refresh runs if the cache is stale.

const WEATHER_CACHE_KEY = "weather_cache_v1";
const CACHE_TTL_MS = 30 * 60_000; // 30 min — matches the widget's refresh interval

/**
 * Read cached weather result for a given location + unit combination.
 * Returns { weather, forecast, aqi, fresh } or null if no matching cache entry.
 * `fresh` is true when the entry is < 30 min old (no network fetch needed).
 */
export const readWeatherCache = (locationKey, unit) => {
  try {
    const raw = localStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (entry.locationKey !== locationKey || entry.unit !== unit) return null;
    return {
      weather: entry.weather,
      forecast: entry.forecast,
      aqi: entry.aqi ?? null,
      fresh: Date.now() - entry.ts < CACHE_TTL_MS,
    };
  } catch {
    return null;
  }
};

/**
 * Persist a weather + AQI result to localStorage so the next tab open can skip the fetch.
 * @param {object|null} aqi  parsed AQI object — { value, pm25 } — or null if unavailable
 */
export const writeWeatherCache = (
  weather,
  forecast,
  aqi,
  locationKey,
  unit,
) => {
  try {
    localStorage.setItem(
      WEATHER_CACHE_KEY,
      JSON.stringify({
        weather,
        forecast,
        aqi,
        locationKey,
        unit,
        ts: Date.now(),
      }),
    );
  } catch {
    /* storage unavailable — silent */
  }
};

// ── AQI (Air Quality Index) ───────────────────────────────────────────────────

/**
 * US AQI breakpoints — label, color, and health guidance.
 * Source: EPA AirNow — https://www.airnow.gov/aqi/aqi-basics/
 */
export const AQI_LEVELS = [
  { max: 50, label: "Good", color: "#22c55e" },
  { max: 100, label: "Moderate", color: "#eab308" },
  { max: 150, label: "Sensitive", color: "#f97316" },
  { max: 200, label: "Unhealthy", color: "#ef4444" },
  { max: 300, label: "Very Unhealthy", color: "#a855f7" },
  { max: Infinity, label: "Hazardous", color: "#dc2626" },
];

/**
 * Returns the AQI level descriptor for a given US AQI value, or null.
 * @returns {{ max: number, label: string, color: string } | null}
 */
export const getAQILevel = (value) => {
  if (value == null || value < 0) return null;
  return (
    AQI_LEVELS.find((l) => value <= l.max) ?? AQI_LEVELS.at(-1)
  );
};

/**
 * Fetches current US AQI + PM2.5 from the Open-Meteo air quality API.
 * Free — no API key required. Non-fatal: callers should .catch(() => null).
 */
export const fetchAQI = (lat, lon) => {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: "us_aqi,pm2_5",
    timezone: "auto",
  });
  return fetch(
    `${OPEN_METEO_AQI_API}?${params}`,
    { signal: AbortSignal.timeout(6000) },
  ).then((r) =>
    r.ok ? r.json() : Promise.reject(new Error(`AQI ${r.status}`)),
  );
};

/**
 * Extracts AQI value + PM2.5 from an Open-Meteo air quality response.
 * @returns {{ value: number|null, pm25: number|null }}
 */
export const parseAQI = (data) => ({
  value: data?.current?.us_aqi ?? null,
  pm25:
    data?.current?.pm2_5 == null
      ? Math.round(data.current.pm2_5 * 10) / 10
      : null,
});
