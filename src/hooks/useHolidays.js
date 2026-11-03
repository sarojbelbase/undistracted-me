/**
 * useHolidays — Nepali + international holidays for the calendar widget.
 *
 * Fetches the committed `holidays.json` from the jsDelivr CDN (updated weekly
 * by a GitHub Actions workflow), caches the payload in localStorage, and
 * re-fetches only when the cache is older than 24h.  Returns two lookups so the
 * calendar can style Nepali and international holidays differently:
 *   {
 *     dates:      Set<'YYYY-MM-DD'>            — Nepali holiday dates
 *     names:      Map<'YYYY-MM-DD' → string[]> — Nepali names per date
 *     intlDates:  Set<'YYYY-MM-DD'>            — international holiday dates
 *     intlNames:  Map<'YYYY-MM-DD' → string[]> — international names per date
 *   }
 *
 * Falls back to empty lookups on any error so the calendar still renders.
 */
import { useState, useEffect } from 'react';
import { HOLIDAYS_URL } from '../constants/urls';

const CACHE_KEY = 'holidays_cache';
const FETCHED_AT_KEY = 'holidays_fetched_at';
const TTL_MS = 24 * 60 * 60 * 1000;

const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!Array.isArray(data?.holidays)) return null;
    const at = Number(localStorage.getItem(FETCHED_AT_KEY) || 0);
    return { data, at };
  } catch {
    return null;
  }
};

const empty = () => ({
  dates: new Set(),
  names: new Map(),
  intlDates: new Set(),
  intlNames: new Map(),
});

const toLookup = (data) => {
  const out = empty();
  for (const h of data?.holidays ?? []) {
    if (!h?.date || !h.name) continue;
    const intl = h.kind === 'international';
    const dates = intl ? out.intlDates : out.dates;
    const names = intl ? out.intlNames : out.names;
    dates.add(h.date);
    const prev = names.get(h.date);
    if (prev) prev.push(h.name);
    else names.set(h.date, [h.name]);
  }
  return out;
};

export function useHolidays() {
  const [lookup, setLookup] = useState(() => {
    const cached = readCache();
    return cached ? toLookup(cached.data) : empty();
  });

  useEffect(() => {
    const cached = readCache();
    if (cached && Date.now() - cached.at < TTL_MS) return; // fresh — skip network

    let cancelled = false;
    fetch(HOLIDAYS_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (cancelled || !Array.isArray(data?.holidays)) return;
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(data));
          localStorage.setItem(FETCHED_AT_KEY, String(Date.now()));
        } catch {
          /* storage unavailable */
        }
        setLookup(toLookup(data));
      })
      .catch(() => {
        /* keep cached/empty — calendar still renders */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return lookup;
}
