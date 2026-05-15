/**
 * Canonical hook location: src/hooks/useAutoTheme.js
 *
 * Activates the auto dark/light theme based on sunrise and sunset.
 * Coordinates and sun times come from useLocationStore (single source of truth).
 * See utilities/useAutoTheme.js (re-export stub) for historical context.
 */
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { applyTheme } from '../theme';
import { getSunTimes, getEffectiveMode, computeAutoMode } from '../utilities/sunTime';
import { useLocationStore } from '../store/useLocationStore';

/** Pure helper — no React. Computes ms until the next dark↔light transition. */
const msUntilNext = (effective, sunTimes, lat, lon, now) => {
  if (!sunTimes) return 60 * 60 * 1000;
  if (effective === 'light') {
    const ms = sunTimes.sunset - now;
    return ms > 0 ? ms + 30_000 : 60 * 60 * 1000;
  }
  // Night — next transition is tomorrow's sunrise.
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowSun = getSunTimes(lat, lon, tomorrow);
  if (tomorrowSun?.sunrise) {
    const ms = tomorrowSun.sunrise - now;
    if (ms > 0 && ms < 30 * 60 * 60 * 1000) return ms + 30_000;
  }
  return 60 * 60 * 1000;
};

export const useAutoTheme = (mode, accent, cardStyle = 'glass') => {
  // Read location + sun data from the centralized store
  const { lat, lon, source, sunrise, sunset } = useLocationStore(
    useShallow(s => ({ lat: s.lat, lon: s.lon, source: s.source, sunrise: s.sunrise, sunset: s.sunset })),
  );

  const [effectiveMode, setEffectiveMode] = useState(() => {
    if (mode !== 'auto') return mode;
    return computeAutoMode();
  });

  useEffect(() => {
    if (mode !== 'auto') {
      setEffectiveMode(mode);
      return;
    }

    let timer;
    const mq = globalThis.window?.matchMedia?.('(prefers-color-scheme: dark)') ?? null;

    const applyEffective = (effective) => {
      setEffectiveMode(effective);
      applyTheme(accent, effective, cardStyle);
    };

    const computeAndSchedule = () => {
      const now = new Date();

      // Guard: location store sun times may be absent (Zustand not yet hydrated)
      // or from a previous calendar day (persisted from yesterday's session and
      // the async location refresh hasn't completed yet). In either case, use
      // computeAutoMode() — the same fresh, localStorage-based computation that
      // themeInit.js and the useState initializer use — so we never flash the
      // wrong mode while waiting for the async refresh to land.
      const sunriseDate = sunrise ? new Date(sunrise) : null;
      const sunsetDate = sunset ? new Date(sunset) : null;
      const stale =
        !sunriseDate ||
        !sunsetDate ||
        sunriseDate.toDateString() !== now.toDateString();

      if (stale) {
        // If we have lat/lon from the Zustand store, compute today's sun times
        // directly — this is instant and immune to the async refresh delay.
        if (lat != null && lon != null) {
          const freshSunTimes = getSunTimes(lat, lon, now);
          if (freshSunTimes) {
            const effective = getEffectiveMode(freshSunTimes, now);
            applyEffective(effective);
            timer = setTimeout(computeAndSchedule, msUntilNext(effective, freshSunTimes, lat, lon, now));
            return;
          }
        }
        // No coords yet — use computeAutoMode() which reads from localStorage directly.
        applyEffective(computeAutoMode(now));
        timer = setTimeout(computeAndSchedule, 60 * 60 * 1000);
        return;
      }

      const sunTimes = { sunrise: sunriseDate, sunset: sunsetDate };
      const effective = getEffectiveMode(sunTimes, now);
      applyEffective(effective);

      timer = setTimeout(computeAndSchedule, msUntilNext(effective, sunTimes, lat, lon, now));
    };

    const handleMediaChange = () => {
      // OS color-scheme changed — re-derive mode using the same stale-guard logic
      // so we only apply OS preference when there are no valid sun times.
      const now = new Date();
      const sunriseDate = sunrise ? new Date(sunrise) : null;
      const sunsetDate = sunset ? new Date(sunset) : null;
      const stale =
        !sunriseDate ||
        !sunsetDate ||
        sunriseDate.toDateString() !== now.toDateString();
      if (stale) {
        applyEffective(computeAutoMode(now));
      }
    };
    mq?.addEventListener('change', handleMediaChange);

    computeAndSchedule();

    return () => {
      clearTimeout(timer);
      mq?.removeEventListener('change', handleMediaChange);
    };
  }, [mode, accent, cardStyle, source, sunrise, sunset, lat, lon]);

  return effectiveMode;
};
