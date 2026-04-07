/**
 * Sunrise/Sunset calculation using the USNO algorithm.
 * Pure computation — no external API required. Works offline.
 *
 * Reference:
 * https://web.archive.org/web/20161202180207/http://williams.best.vwh.net/sunrise_sunset_algorithm.htm
 */

/** Kathmandu coordinates — used as fallback when geolocation is unavailable */
const KATHMANDU = { lat: 27.7172, lon: 85.324 };

/** localStorage key for cached user coordinates */
const COORDS_KEY = 'auto_theme_coords';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
/** Official solar zenith for sunrise/sunset (accounts for refraction + solar disc) */
const ZENITH = 90.833;

/** Returns the day-of-year (1-indexed) for a given Date */
const dayOfYear = (date) =>
  Math.ceil((date - new Date(date.getFullYear(), 0, 1)) / 86_400_000) + 1;

/**
 * Core solar equation — returns UTC decimal hours for sunrise or sunset.
 * Returns null when the sun never crosses the horizon (polar regions).
 */
const solarHour = (lat, lon, rising, date) => {
  const N = dayOfYear(date);
  const lngHour = lon / 15;
  const t = rising ? N + (6 - lngHour) / 24 : N + (18 - lngHour) / 24;

  const M = 0.9856 * t - 3.289;

  let L = M + 1.916 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 282.634;
  L = ((L % 360) + 360) % 360;

  let RA = DEG * Math.atan(0.91764 * Math.tan(L * RAD));
  RA = ((RA % 360) + 360) % 360;
  RA = (RA + Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90) / 15;

  const sinDec = 0.39782 * Math.sin(L * RAD);
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosH =
    (Math.cos(ZENITH * RAD) - sinDec * Math.sin(lat * RAD)) /
    (cosDec * Math.cos(lat * RAD));

  if (cosH > 1 || cosH < -1) return null; // polar night / midnight sun

  const H = rising ? (360 - DEG * Math.acos(cosH)) / 15 : (DEG * Math.acos(cosH)) / 15;
  const UT = H + RA - 0.06571 * t - 6.622 - lngHour;
  return ((UT % 24) + 24) % 24;
};

/**
 * Calculate sunrise and sunset times for a given date and location.
 *
 * @param {number} lat  Latitude in decimal degrees
 * @param {number} lon  Longitude in decimal degrees
 * @param {Date}   [date]  Date to compute for (defaults to today)
 * @returns {{ sunrise: Date, sunset: Date } | null}  null for polar regions
 */
export const getSunTimes = (lat, lon, date = new Date()) => {
  const riseUTC = solarHour(lat, lon, true, date);
  const setUTC = solarHour(lat, lon, false, date);
  if (riseUTC === null || setUTC === null) return null;

  const toDate = (utcHours) => {
    const totalMin = Math.round(utcHours * 60);
    const d = new Date(date);
    d.setUTCHours(Math.floor(totalMin / 60), totalMin % 60, 0, 0);
    return d;
  };

  return { sunrise: toDate(riseUTC), sunset: toDate(setUTC) };
};

/**
 * Returns 'light' during the day (after sunrise, before sunset) or 'dark' at night.
 *
 * @param {{ sunrise: Date, sunset: Date } | null} sunTimes
 * @param {Date} [now]
 * @returns {'light' | 'dark'}
 */
export const getEffectiveMode = (sunTimes, now = new Date()) => {
  if (!sunTimes) return 'dark';
  return now >= sunTimes.sunrise && now < sunTimes.sunset ? 'light' : 'dark';
};

/** localStorage flag: 'browser' | 'ip' | 'default' — tracks how coords were obtained */
const COORDS_SOURCE_KEY = 'auto_theme_coords_source';

const _saveCoords = (lat, lon, source) => {
  try {
    localStorage.setItem(COORDS_KEY, JSON.stringify({ lat, lon }));
    localStorage.setItem(COORDS_SOURCE_KEY, source);
  } catch { /* storage unavailable */ }
};

/**
 * Returns cached coordinates from localStorage, or Kathmandu as fallback.
 * Safe to call synchronously at module-init time.
 */
export const getCachedCoords = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(COORDS_KEY));
    if (typeof stored?.lat === 'number' && typeof stored?.lon === 'number') {
      return { lat: stored.lat, lon: stored.lon };
    }
  } catch { /* ignore */ }
  return KATHMANDU;
};

/**
 * Returns how the cached coordinates were determined, for transparency.
 * @returns {'browser'|'ip'|'default'}
 */
export const getCachedCoordsSource = () => {
  try { return localStorage.getItem(COORDS_SOURCE_KEY) || 'default'; }
  catch { return 'default'; }
};

/**
 * Tier 2 fallback: resolve coordinates from public IP via ipapi.co (no API key
 * required, HTTPS, 1000 req/day per IP). Accuracy is typically city-level
 * (~10–50 km), which causes ≤5 min error in sunrise/sunset — acceptable for
 * a day/night theme switch.
 *
 * Caveats: VPN users get the VPN exit node location; corporate networks may
 * route via a central office. In those cases the Kathmandu hardcoded fallback
 * is no worse.
 *
 * @returns {Promise<{lat:number,lon:number}|null>}
 */
const _coordsFromIP = async () => {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data?.latitude === 'number' && typeof data?.longitude === 'number') {
      return { lat: data.latitude, lon: data.longitude };
    }
  } catch { /* network error or timeout */ }
  return null;
};

/**
 * Requests coordinates using a three-tier priority chain, all non-blocking:
 *   1. Browser Geolocation API (most accurate — GPS/WiFi based)
 *   2. IP geolocation via ipapi.co (city-level, ~80% within 50 km)
 *   3. Kathmandu hardcoded fallback (last resort, implicit via getCachedCoords)
 *
 * Results are cached in localStorage for 24 h and reused on subsequent loads.
 * Already-cached coords skip the network entirely.
 */
export const requestAndCacheCoords = () => {
  // Skip if we already have browser-grade coords from this session
  if (getCachedCoordsSource() === 'browser') return;

  const tryIPFallback = async () => {
    // Only fetch IP geo if we have nothing cached yet
    if (localStorage.getItem(COORDS_KEY)) return;
    const coords = await _coordsFromIP();
    if (coords) _saveCoords(coords.lat, coords.lon, 'ip');
  };

  if (navigator?.geolocation) {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        _saveCoords(coords.latitude, coords.longitude, 'browser');
      },
      () => {
        // Geo denied/unavailable — try IP fallback
        tryIPFallback();
      },
      { maximumAge: 86_400_000 },
    );
  } else {
    tryIPFallback();
  }
};

/**
 * Synchronously compute the effective mode ('light' | 'dark') for 'auto' setting.
 * Uses cached coords (or Kathmandu fallback). Safe to call at module init.
 *
 * @param {Date} [date]
 * @returns {'light' | 'dark'}
 */
export const computeAutoMode = (date = new Date()) => {
  const { lat, lon } = getCachedCoords();
  return getEffectiveMode(getSunTimes(lat, lon, date), date);
};
