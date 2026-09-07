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

    // Applies a parsed payload and clears the loading flag. Kept outside `load`
    // so the cache tiers share one setter path without nesting complexity.
    const applyData = (weather, forecast, aqi) => {
      setWeather(weather);
      setForecast(forecast);
      setAqi(aqi);
      setLoading(false);
    };

    const load = async () => {
      // Tracks whether a cache tier already produced displayable data this
      // cycle — prevents the tier-3 fetch from re-arming the spinner after a
      // cache hit already cleared it (loading flicker).
      let hasData = false;

      // Tier 1: SW cache (instant, no network). Still falls through to a
      // background refresh below — SW data is metric, may not match the user's
      // unit preference, or may be slightly stale.
      const sw = await trySWCache();
      if (sw && !cancelled) {
        applyData(
          parseWeather(sw.data, cityName),
          parseForecast(sw.data),
          sw.aqiData && parseAQI(sw.aqiData),
        );
        hasData = true;
      }

      // Tier 2: localStorage cache (per-city, per-unit)
      const cached = readWeatherCache(locKey, unit);
      const hasCachedWeather = cached?.weather && !cancelled;
      if (hasCachedWeather) {
        applyData(cached.weather, cached.forecast ?? null, cached.aqi ?? null);
        hasData = true;
      }
      if (hasCachedWeather && cached.fresh) return; // still within TTL — skip network

      // Tier 3: live fetch — only show the loading spinner if no cache tier
      // produced data yet (avoids a flicker when background-refreshing).
      if (!cancelled && !hasData) setLoading(true);
      try {
        const fetches = full
          ? [fetchOpenMeteo(lat, lon, unit), fetchAQI(lat, lon).catch(() => null)]
          : [fetchOpenMeteo(lat, lon, unit)];
        const results = await Promise.all(fetches);
        if (cancelled) return;

        const data = results[0];
        // When `full` is false, fetches has length 1 so results[1] is
        // undefined → coalesces to null (no AQI requested).
        const aqiData = results[1] ?? null;
        const current = parseWeather(data, cityName);
        const forecast = parseForecast(data);
        const aqi = aqiData && parseAQI(aqiData);

        applyData(current, forecast, aqi);
        writeWeatherCache(current, forecast, aqi, locKey, unit);
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
