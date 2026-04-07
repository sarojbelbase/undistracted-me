import { useEffect, useState } from 'react';
import { applyTheme } from '../theme';
import {
  getSunTimes,
  getEffectiveMode,
  getCachedCoords,
  requestAndCacheCoords,
} from './sunTime';

/**
 * Activates the auto dark/light theme based on sunrise and sunset.
 *
 * When `mode` is 'auto':
 *   - Computes 'light' (day) or 'dark' (night) from the current time relative
 *     to today's sunrise and sunset (using cached/default coordinates).
 *   - Applies the correct theme CSS variables immediately.
 *   - Schedules a timeout to flip the theme precisely at the next transition
 *     (sunrise → light, sunset → dark). Falls back to hourly re-checks.
 *   - Requests the browser's Geolocation API once per session and caches the
 *     result in localStorage for subsequent page loads.
 *
 * When `mode` is 'light' or 'dark' the hook is a no-op and simply returns
 * that mode unchanged (the store's setMode already applied the theme).
 *
 * @param {'auto'|'light'|'dark'} mode   - From useSettingsStore
 * @param {string}                accent - From useSettingsStore
 * @returns {'light'|'dark'} effectiveMode - The currently applied visual mode
 */
export const useAutoTheme = (mode, accent) => {
  const [effectiveMode, setEffectiveMode] = useState(() => {
    if (mode !== 'auto') return mode;
    // Synchronous initial computation to match what themeInit.js already set.
    const { lat, lon } = getCachedCoords();
    return getEffectiveMode(getSunTimes(lat, lon));
  });

  useEffect(() => {
    if (mode !== 'auto') {
      setEffectiveMode(mode);
      return;
    }

    // Request fresh geolocation in the background; cached for 24 h.
    requestAndCacheCoords();

    let timer;

    const computeAndSchedule = () => {
      const now = new Date();
      const { lat, lon } = getCachedCoords();
      const sunTimes = getSunTimes(lat, lon, now);
      const effective = getEffectiveMode(sunTimes, now);

      setEffectiveMode(effective);
      applyTheme(accent, effective);

      // Schedule the next re-evaluation precisely at the upcoming transition.
      let msToNext = 60 * 60 * 1000; // fallback: re-check in 1 hour

      if (sunTimes) {
        if (effective === 'light') {
          // Currently day — flip to dark at sunset
          const ms = sunTimes.sunset - now;
          if (ms > 0) msToNext = ms + 30_000; // 30 s buffer past sunset
        } else {
          // Currently night — flip to light at tomorrow's sunrise
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowSun = getSunTimes(lat, lon, tomorrow);
          if (tomorrowSun?.sunrise) {
            const ms = tomorrowSun.sunrise - now;
            if (ms > 0 && ms < 30 * 60 * 60 * 1000) msToNext = ms + 30_000;
          }
        }
      }

      timer = setTimeout(computeAndSchedule, msToNext);
    };

    computeAndSchedule();

    return () => clearTimeout(timer);
  }, [mode, accent]);

  return effectiveMode;
};
