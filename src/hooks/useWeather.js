/**
 * useWeather — single shared weather hook for all consumers.
 *
 * Cache waterfall (first hit wins):
 *   1. chrome.storage.local['weather_sw_cache'] — bg.js pre-fetch, ≤ 30 min old
 *   2. localStorage (readWeatherCache)            — per-city, per-unit cache
 *   3. fetchOpenMeteo / fetchAQI                  — live network call
 *
 * Consumers:
 *   - Weather widget    (needs weather + forecast + AQI)
 *   - Focus Mode        (needs weather only)
 *   - Extension popup   (needs weather only)
 *
 * All three now share ONE fetch cycle instead of three independent ones.
 */

import { useState, useEffect, useRef } from 'react';
import {
  fetchOpenMeteo,
  parseWeather,
  parseForecast,
  readWeatherCache,
  writeWeatherCache,
  fetchAQI,
  parseAQI,
} from '../widgets/weather/utils.jsx';
import { STORAGE_KEYS } from '../constants/storageKeys';

const SW_CACHE_KEY = STORAGE_KEYS.WEATHER_SW_CACHE;
const REFRESH_MS = 30 * 60_000; // 30 min

/**
 * @param {Object} opts
 * @param {number}  opts.lat          Latitude
 * @param {number}  opts.lon          Longitude
 * @param {string}  [opts.unit]       'metric' (default) | 'imperial'
 * @param {string}  [opts.cityName]   Pre-resolved city name
 * @param {boolean} [opts.full]       Fetch forecast + AQI too? (default false)
 */
export function useWeather({ lat, lon, unit = 'metric', cityName = '', full = false }) {
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [aqi, setAqi] = useState(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (lat == null || lon == null) return;

    let cancelled = false;
    const locKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;

    // ── Tier 1: SW background cache (metric only, coords must match ~1 km) ──
    const trySWCache = async () => {
      try {
        const result = await chrome?.storage?.local?.get?.(SW_CACHE_KEY);
        const sw = result?.[SW_CACHE_KEY];
        if (!sw) return null;
        if (Date.now() - sw.fetchedAt > REFRESH_MS) return null;
        if (Math.abs(sw.lat - lat) > 0.01 || Math.abs(sw.lon - lon) > 0.01) return null;
        return sw;
      } catch { return null; }
    };

    const load = async () => {
      // Tier 1: SW cache (instant, no network)
      const sw = await trySWCache();
      if (sw && !cancelled) {
        setWeather(parseWeather(sw.data, cityName));
        if (full) setForecast(parseForecast(sw.data));
        if (full && sw.aqiData) setAqi(parseAQI(sw.aqiData));
        setLoading(false);
        // Still schedule a background refresh — SW data is metric, may not match
        // user's unit preference, or may be slightly stale. Don't block on it.
      }

      // Tier 2: localStorage cache (per-city, per-unit)
      const cached = readWeatherCache(locKey, unit);
      if (cached?.weather && !cancelled) {
        setWeather(cached.weather);
        if (full) setForecast(cached.forecast ?? null);
        if (full) setAqi(cached.aqi ?? null);
        setLoading(false);
        if (cached.fresh) return; // still within TTL — skip network
      }

      // Tier 3: live fetch
      if (!cancelled && (!cached?.fresh)) setLoading(true);
      try {
        const fetches = [fetchOpenMeteo(lat, lon, unit)];
        if (full) fetches.push(fetchAQI(lat, lon).catch(() => null));
        const results = await Promise.all(fetches);

        if (cancelled) return;
        const data = results[0];
        const aqiData = full ? results[1] : null;

        const current = parseWeather(data, cityName);
        setWeather(current);
        if (full) setForecast(parseForecast(data));
        if (full && aqiData) setAqi(parseAQI(aqiData));

        writeWeatherCache(current, full ? parseForecast(data) : null, full && aqiData ? parseAQI(aqiData) : null, locKey, unit);
        setLoading(false);
      } catch {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    const timerId = setInterval(load, REFRESH_MS);
    return () => { cancelled = true; clearInterval(timerId); };
  }, [lat, lon, unit, cityName, full]);

  return { weather, forecast, aqi, loading };
}
