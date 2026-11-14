/**
 * useWeather — single shared weather hook for all consumers.
 *
 * Data comes from the shared DataHub (`weather` namespace) written by the
 * background service worker's UM_PREFETCH alarm, plus a per-unit localStorage
 * cache for instant display.  There is NO page-side polling interval — the SW
 * stamps `updatedAt` on each write and the hub propagates changes live.
 *
 * Cache waterfall (first hit wins):
 *   1. localStorage (readWeatherCache)       — per-city, per-unit, instant
 *   2. DataHub `weather` (SW pre-fetch)      — metric only, coords ~1 km
 *   3. fetchOpenMeteo / fetchAQI             — live network call (first load)
 *
 * Consumers:
 *   - Weather widget    (needs weather + forecast + AQI)
 *   - Focus Mode        (needs weather only)
 *   - Extension popup   (needs weather only)
 *
 * All three share ONE fetch cycle instead of three independent ones.
 */

import { useState, useEffect } from "react";
import {
  fetchOpenMeteo,
  parseWeather,
  parseForecast,
  readWeatherCache,
  writeWeatherCache,
  fetchAQI,
  parseAQI,
} from "../widgets/weather/utils.jsx";
import { useDataHub } from "./useDataHub";

// Module-level in-flight dedup. useWeather is instantiated independently by the
// Weather widget (full: true), Focus Mode, and the popup — on a cold start with
// no SW/DataHub prefetch, all three would otherwise fire their own fetchOpenMeteo.
// This Map lets concurrent consumers share ONE fetch per (location, unit, full).
const inFlight = new Map();

/**
 * @param {Object} opts
 * @param {number}  opts.lat          Latitude
 * @param {number}  opts.lon          Longitude
 * @param {string}  [opts.unit]       'metric' (default) | 'imperial'
 * @param {string}  [opts.cityName]   Pre-resolved city name
 * @param {boolean} [opts.full]       Fetch forecast + AQI too? (default false)
 */
export function useWeather({ lat, lon, unit = "metric", cityName = "", full = false, refreshKey = 0 }) {
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [aqi, setAqi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // SW-prefetched raw Open-Meteo data (metric) from the DataHub.
  const {
    data: hubRaw,
    entry: hubEntry,
    hydrated,
    write: writeHub,
  } = useDataHub("weather");

  useEffect(() => {
    if (lat == null || lon == null) {
      setWeather(null);
      setForecast(null);
      setAqi(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const locKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;

    // Applies a parsed payload and clears the loading flag.
    const applyData = (w, f, a) => {
      if (cancelled) return;
      setWeather(w);
      setForecast(f);
      setAqi(a);
      setLoading(false);
      setError(null);
    };

    // ── Tier 1: localStorage cache (per-city, per-unit) ──────────────────
    const cached = readWeatherCache(locKey, unit);
    if (cached?.weather) {
      applyData(cached.weather, cached.forecast ?? null, cached.aqi ?? null);
      if (cached.fresh) return; // still within TTL — no network, no polling
    }

    // ── Tier 2: DataHub (SW pre-fetch, metric only) ──────────────────────
    // Wait for the hub snapshot to hydrate before deciding whether to fetch.
    if (!hydrated) return;

    const hubMatches =
      unit === "metric" &&
      hubRaw &&
      hubEntry?.lat != null &&
      hubEntry?.lon != null &&
      Math.abs(hubEntry.lat - lat) <= 0.01 &&
      Math.abs(hubEntry.lon - lon) <= 0.01;

    if (hubMatches) {
      const w = parseWeather(hubRaw, cityName);
      const f = parseForecast(hubRaw);
      const a = full && hubEntry.aqiData ? parseAQI(hubEntry.aqiData) : null;
      applyData(w, f, a);
      writeWeatherCache(w, f, a, locKey, unit);
      return;
    }

    // ── Tier 3: live fetch (first load, or unit/location mismatch) ──────
    setLoading(true);
    const fetchKey = `${locKey}|${unit}|${full ? 1 : 0}`;
    let fetchPromise = inFlight.get(fetchKey);
    if (!fetchPromise) {
      fetchPromise = (async () => {
        try {
          const fetches = full
            ? [fetchOpenMeteo(lat, lon, unit), fetchAQI(lat, lon).catch(() => null)]
            : [fetchOpenMeteo(lat, lon, unit)];
          const results = await Promise.all(fetches);
          return { raw: results[0], aqiRaw: results[1] ?? null };
        } finally {
          inFlight.delete(fetchKey);
        }
      })();
      inFlight.set(fetchKey, fetchPromise);
    }
    fetchPromise
      .then(({ raw, aqiRaw }) => {
        if (cancelled) return;
        const w = parseWeather(raw, cityName);
        const f = parseForecast(raw);
        const a = full && aqiRaw ? parseAQI(aqiRaw) : null;

        applyData(w, f, a);
        writeWeatherCache(w, f, a, locKey, unit);
        // Feed metric results back into the hub so the SW and other tabs reuse them.
        if (unit === "metric") writeHub(raw, { aqiData: aqiRaw, lat, lon });
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
          setError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lon, unit, cityName, full, hydrated, hubRaw, hubEntry, writeHub, refreshKey]);

  return { weather, forecast, aqi, loading, error };
}
