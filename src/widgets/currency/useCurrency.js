/**
 * useCurrency — polling hook for NRB exchange rates + metals prices.
 *
 * Behaviour:
 *  1. On mount: immediately hydrate from localStorage cache (instant display).
 *  2. If cache is stale (> 30 min) or absent: fetch fresh data from Vercel proxy.
 *  3. Poll every 30 min to keep rates current (matches server CDN TTL).
 *  4. Expose a `refresh` callback for on-demand manual refreshes.
 *
 * Returns:
 *  { rates, gold, silver, loading, error, refreshedAt, refresh }
 *
 *   rates       – { USD: 134.00, EUR: 145.45, ... } | null
 *   gold        – { usd: 2345.67, nprPerTola: 150200 } | null
 *   silver      – { usd: 29.45, nprPerTola: 1850 } | null
 *   loading     – true while an in-flight fetch is running (false when cache hydrated)
 *   error       – error message string | null
 *   refreshedAt – Date.now() of last successful data load | null
 *   refresh()   – trigger an immediate re-fetch
 */

import { useState, useEffect, useCallback } from "react";
import { fetchRates, readCurrencyCache, writeCurrencyCache } from "./utils";

const POLL_INTERVAL = 30 * 60 * 1000; // 30 min

export function useCurrency() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshedAt, setRefreshedAt] = useState(null);

  // ── Core fetch ──────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchRates();
      writeCurrencyCache(result);
      setData(result);
      setRefreshedAt(Date.now());
    } catch (err) {
      setError(err.message ?? "rates_unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Mount: cache-first, then fetch if stale ─────────────────────────────────
  useEffect(() => {
    const cached = readCurrencyCache();

    if (cached?.data) {
      // Hydrate instantly from cache — eliminates skeleton on subsequent opens
      setData(cached.data);
      setRefreshedAt(Date.now());
      setLoading(false);
    }

    // Fetch if no cache or stale (> 30 min old)
    if (!cached?.fresh) {
      load();
    }

    // Keep polling every 30 min while the tab is open
    const timerId = setInterval(load, POLL_INTERVAL);
    return () => clearInterval(timerId);
  }, [load]);

  return {
    rates: data?.rates ?? null,
    gold: data?.gold ?? null,
    silver: data?.silver ?? null,
    date: data?.date ?? null, // NRB publication date ('YYYY-MM-DD')
    loading,
    error,
    refreshedAt,
    refresh: load,
  };
}
