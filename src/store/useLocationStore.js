/**
 * Centralized location + sun-time store.
 *
 * Single source of truth for:
 *   - Current coordinates (lat/lon) + how they were obtained (source)
 *   - Reverse-geocoded city name
 *   - Detected timezone
 *   - Today's sunrise and sunset timestamps
 *   - Whether it's currently daytime (isDay)
 *
 * All consumers (auto-theme, weather widget, Focus Mode weather) read from here
 * instead of each running their own geolocation pipeline. VPN switches are
 * detected automatically when the store refreshes via IP every 30 minutes.
 *
 * Resolution pipeline (in priority order):
 *   1. navigator.geolocation — GPS/WiFi, most accurate
 *   2. freeipapi.com         — IP-based, works from extension origins
 *   3. Kathmandu hardcoded  — last resort (source = 'default')
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { getSunTimes, getEffectiveMode } from '../utilities/sunTime';

const KATHMANDU = { lat: 27.7172, lon: 85.324, city: 'Kathmandu', timezone: 'Asia/Kathmandu' };

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Haversine distance in km between two lat/lon points. */
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/** Compute sunrise/sunset/isDay fields from coordinates. */
const computeSunFields = (lat, lon) => {
  const sunTimes = getSunTimes(lat, lon);
  if (!sunTimes) return { sunrise: null, sunset: null, isDay: null };
  const now = new Date();
  return {
    sunrise: sunTimes.sunrise.getTime(),
    sunset: sunTimes.sunset.getTime(),
    isDay: getEffectiveMode(sunTimes, now) === 'light',
  };
};

/** Reverse-geocode coordinates to a city name via OSM Nominatim. */
const reverseGeocodeCity = async (lat, lon) => {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`,
      { signal: AbortSignal.timeout(5000), headers: { 'Accept-Language': 'en' } },
    );
    if (!r.ok) return '';
    const d = await r.json();
    const a = d.address || {};
    return a.suburb || a.neighbourhood || a.town || a.city || a.county || a.state || '';
  } catch {
    return '';
  }
};

/** IP geolocation — tries freeipapi.com (works from extension origins). */
const getCoordsFromIP = async () => {
  const isExtension = typeof chrome !== 'undefined' && !!chrome.runtime?.id;

  // ipapi.co — blocked by CORS in extension origins; only try in web context
  if (!isExtension) {
    try {
      const r = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
      if (r.ok) {
        const d = await r.json();
        if (typeof d.latitude === 'number') {
          return {
            lat: d.latitude,
            lon: d.longitude,
            city: d.city || '',
            timezone: d.timezone || null,
          };
        }
      }
    } catch { /* fall through */ }
  }

  // freeipapi.com — CORS-enabled, works from extension origins
  try {
    const r = await fetch('https://freeipapi.com/api/json', { signal: AbortSignal.timeout(5000) });
    if (r.ok) {
      const d = await r.json();
      if (typeof d.latitude === 'number') {
        return {
          lat: d.latitude,
          lon: d.longitude,
          city: d.cityName || '',
          timezone: d.timeZone || null,
        };
      }
    }
  } catch { /* ignore */ }

  return null;
};

/** Dispatch the location_changed custom event when a significant shift occurs. */
const _dispatchLocationChanged = (lat, lon) => {
  try { globalThis.dispatchEvent(new CustomEvent('location_changed', { detail: { lat, lon } })); } catch { /* noop */ }
};

// ── Store ─────────────────────────────────────────────────────────────────────

export const useLocationStore = create(
  persist(
    (set, get) => ({
      // ── Position ──────────────────────────────────────────────────────────
      lat: null,
      lon: null,
      city: null,
      timezone: null,
      /** 'browser' | 'ip' | 'default' | null */
      source: null,

      // ── Sun times (Unix ms timestamps) ────────────────────────────────────
      sunrise: null,
      sunset: null,
      /** true during daytime (after sunrise, before sunset) */
      isDay: null,

      // ── Meta ──────────────────────────────────────────────────────────────
      /** 'idle' | 'loading' | 'ready' | 'error' */
      status: 'idle',
      lastUpdated: null,

      // ── Actions ───────────────────────────────────────────────────────────

      /**
       * Recalculate sunrise/sunset/isDay from current coords without fetching.
       * Called every minute by the useLocation hook so isDay stays accurate.
       */
      refreshSunTimes: () => {
        const { lat, lon } = get();
        if (lat == null) return;
        set(computeSunFields(lat, lon));
      },

      /**
       * Full location refresh. Runs the three-tier pipeline:
       *   browser geolocation → IP geolocation → Kathmandu fallback
       *
       * Detects VPN switches: when source was 'ip' and the new IP coords are
       * more than 100 km away, dispatches a 'location_changed' window event
       * so widgets can re-fetch their data immediately.
       */
      refresh: async () => {
        set({ status: 'loading' });
        const { lat: prevLat, lon: prevLon, source: prevSource } = get();

        // Tier 1 — Browser geolocation (GPS/WiFi, most accurate)
        const fromBrowser = await new Promise((resolve) => {
          if (!navigator?.geolocation) return resolve(null);
          navigator.geolocation.getCurrentPosition(
            ({ coords }) => resolve({ lat: coords.latitude, lon: coords.longitude }),
            () => resolve(null),
            { timeout: 8_000, maximumAge: 6 * 3_600_000 },
          );
        });

        if (fromBrowser) {
          const { lat, lon } = fromBrowser;
          const [city, detectedTz] = await Promise.all([
            reverseGeocodeCity(lat, lon),
            Promise.resolve(Intl.DateTimeFormat().resolvedOptions().timeZone),
          ]);
          set({
            lat, lon,
            city: city || '',
            timezone: detectedTz,
            source: 'browser',
            ...computeSunFields(lat, lon),
            status: 'ready',
            lastUpdated: Date.now(),
          });
          // Notify consumers if we just upgraded from a fallback/IP source
          // (first real GPS fix, or browser geo became available after denial)
          if (prevSource !== 'browser') {
            _dispatchLocationChanged(lat, lon);
          }
          return;
        }

        // Tier 2 — IP geolocation
        const fromIP = await getCoordsFromIP();
        if (fromIP) {
          const { lat, lon, timezone: ipTz } = fromIP;

          // Upgrade from fallback → first real IP fix, or VPN jump (>100 km).
          // Both are meaningful location changes that consumers should react to.
          const wasFallback = !prevSource || prevSource === 'default';
          const moved =
            !wasFallback && prevLat != null
              ? haversineKm(prevLat, prevLon, lat, lon) > 100
              : false;
          const locationChanged = wasFallback || moved;

          // Use city from IP response; fall back to Nominatim if empty
          let city = fromIP.city || '';
          if (!city) city = await reverseGeocodeCity(lat, lon);

          const timezone = ipTz || Intl.DateTimeFormat().resolvedOptions().timeZone;

          set({
            lat, lon,
            city,
            timezone,
            source: 'ip',
            ...computeSunFields(lat, lon),
            status: 'ready',
            lastUpdated: Date.now(),
          });

          if (locationChanged) {
            _dispatchLocationChanged(lat, lon);
          }
          return;
        }

        // Tier 3 — Kathmandu hardcoded fallback
        set({
          lat: KATHMANDU.lat,
          lon: KATHMANDU.lon,
          city: KATHMANDU.city,
          timezone: KATHMANDU.timezone,
          source: 'default',
          ...computeSunFields(KATHMANDU.lat, KATHMANDU.lon),
          status: 'ready',
          lastUpdated: Date.now(),
        });
      },
    }),
    {
      name: STORAGE_KEYS.LOCATION_STATE,
      // Do not persist status — always recalculate on next load
      partialize: (s) => ({
        lat: s.lat,
        lon: s.lon,
        city: s.city,
        timezone: s.timezone,
        source: s.source,
        sunrise: s.sunrise,
        sunset: s.sunset,
        isDay: s.isDay,
        lastUpdated: s.lastUpdated,
      }),
    },
  ),
);
