/**
 * Weather widget utilities — Open-Meteo backend
 * https://open-meteo.com — free, no API key required
 */
import {
  OPEN_METEO_WEATHER_API,
  OPEN_METEO_AQI_API,
  NOMINATIM_REVERSE_API,
  IPAPI_GEO_URL,
  FREEIPAPI_GEO_URL,
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
export const API_KEY = null;

// ── WMO weather interpretation code → human description ──────────────────────
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
export const getWeatherIcon = (code, isDay, size = 52) => {
  const p = { size, style: { color: "var(--w-ink-4)", flexShrink: 0 } };
  if (code === 0) return isDay ? <SunFill {...p} /> : <MoonStarsFill {...p} />;
  if (code <= 2)
    return isDay ? <CloudSunFill {...p} /> : <CloudMoonFill {...p} />;
  if (code === 3) return <CloudsFill {...p} />;
  if (code === 45 || code === 48) return <CloudFogFill {...p} />;
  if (code >= 51 && code <= 57) return <CloudDrizzleFill {...p} />;
  if (code === 66 || code === 67) return <CloudSleetFill {...p} />;
  if (code === 61 || code === 80) return <CloudRainFill {...p} />;
  if (code === 63 || code === 81) return <CloudRainFill {...p} />;
  if (code === 65 || code === 82) return <CloudRainHeavyFill {...p} />;
  if (code >= 71 && code <= 77) return <CloudSnowFill {...p} />;
  if (code === 85 || code === 86) return <CloudSnowFill {...p} />;
  if (code >= 95) return <CloudLightningRainFill {...p} />;
  return <CloudFill {...p} />;
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
      `${NOMINATIM_REVERSE_API}?lat=${lat}&lon=${lon}&format=json&zoom=10`,
      {
        signal: AbortSignal.timeout(5000),
        headers: { "Accept-Language": "en" },
      },
    );
    if (!r.ok) return "";
    const d = await r.json();
    const a = d.address || {};
    return (
      a.suburb ||
      a.neighbourhood ||
      a.town ||
      a.city ||
      a.county ||
      a.state ||
      ""
    );
  } catch {
    return "";
  }
};

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

/**
 * Fallback auto-location via IP geolocation.
 * Tries ipapi.co first (consistent with sunTime.js), then freeipapi.com.
 * Returns { lat, lon, city } or null.
 */
export const getCoordsFromIP = async () => {
  const isExtension = typeof chrome !== "undefined" && !!chrome.runtime?.id;
  // ipapi.co — same service used by sunTime.js; skip for extension origins
  if (!isExtension) {
    try {
      const r = await fetch(IPAPI_GEO_URL, {
        signal: AbortSignal.timeout(5000),
      });
      if (r.ok) {
        const d = await r.json();
        if (typeof d.latitude === "number" && typeof d.longitude === "number") {
          return { lat: d.latitude, lon: d.longitude, city: d.city || "" };
        }
      }
    } catch {
      /* fall through */
    }
  }
  // freeipapi.com — CORS-enabled, also works from extension origins
  try {
    const r = await fetch(FREEIPAPI_GEO_URL, {
      signal: AbortSignal.timeout(5000),
    });
    if (r.ok) {
      const d = await r.json();
      if (typeof d.latitude === "number" && typeof d.longitude === "number") {
        return { lat: d.latitude, lon: d.longitude, city: d.cityName || "" };
      }
    }
  } catch {
    /* ignore */
  }
  return null;
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
    AQI_LEVELS.find((l) => value <= l.max) ?? AQI_LEVELS[AQI_LEVELS.length - 1]
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
    data?.current?.pm2_5 != null
      ? Math.round(data.current.pm2_5 * 10) / 10
      : null,
});
