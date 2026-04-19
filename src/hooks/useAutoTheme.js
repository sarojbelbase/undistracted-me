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

      // Fall back to OS color-scheme when location is unavailable or defaulted
      if (!source || source === 'default' || !sunrise || !sunset) {
        applyEffective(mq?.matches ? 'dark' : 'light');
        timer = setTimeout(computeAndSchedule, 60 * 60 * 1000);
        return;
      }

      const sunTimes = { sunrise: new Date(sunrise), sunset: new Date(sunset) };
      const effective = getEffectiveMode(sunTimes, now);
      applyEffective(effective);

      timer = setTimeout(computeAndSchedule, msUntilNext(effective, sunTimes, lat, lon, now));
    };

    const handleMediaChange = () => {
      if (!source || source === 'default') {
        applyEffective(mq.matches ? 'dark' : 'light');
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
