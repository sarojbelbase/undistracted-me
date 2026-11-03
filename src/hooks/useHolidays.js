/**
 * useHolidays — Nepali public holidays + festivals for the calendar widget.
 *
 * Fetches the server-side /api/holidays endpoint (which scrapes Wikipedia once
 * a day and returns AD-dated holidays), caches the payload in localStorage, and
 * re-fetches only when the cache is older than 24h.  Returns:
 *   { dates: Set<'YYYY-MM-DD'>, names: Map<'YYYY-MM-DD' → 'Name[, Name…]'> }
 *
 * Falls back to an empty set on any error so the calendar still renders.
 */
import { useState, useEffect } from 'react';
import { HOLIDAYS_API } from '../constants/urls';

const API_KEY = import.meta.env.VITE_API_KEY || null;
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

const toLookup = (data) => {
  const dates = new Set();
  const names = new Map();
  for (const h of data?.holidays ?? []) {
    if (!h?.date) continue;
    dates.add(h.date);
    if (h.name) {
      const prev = names.get(h.date);
      names.set(h.date, prev ? `${prev}, ${h.name}` : h.name);
    }
  }
  return { dates, names };
};

export function useHolidays() {
  const [lookup, setLookup] = useState(() => {
    const cached = readCache();
    return cached ? toLookup(cached.data) : { dates: new Set(), names: new Map() };
  });

  useEffect(() => {
    const cached = readCache();
    if (cached && Date.now() - cached.at < TTL_MS) return; // fresh — skip network

    let cancelled = false;
    fetch(HOLIDAYS_API, {
      headers: API_KEY ? { 'X-Api-Key': API_KEY } : {},
    })
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
