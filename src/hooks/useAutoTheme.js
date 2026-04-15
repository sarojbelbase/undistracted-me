/**
 * Canonical hook location: src/hooks/useAutoTheme.js
 *
 * Activates the auto dark/light theme based on sunrise and sunset.
 * See utilities/useAutoTheme.js (re-export stub) for historical context.
 */
import { useEffect, useState } from 'react';
import { applyTheme } from '../theme';
import {
  getSunTimes,
  getEffectiveMode,
  getCachedCoords,
  getCachedCoordsSource,
  requestAndCacheCoords,
  computeAutoMode,
} from '../utilities/sunTime';

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
  const [effectiveMode, setEffectiveMode] = useState(() => {
    if (mode !== 'auto') return mode;
    return computeAutoMode();
  });

  useEffect(() => {
    if (mode !== 'auto') {
      setEffectiveMode(mode);
      return;
    }

    requestAndCacheCoords();

    let timer;
    const mq = globalThis.window?.matchMedia?.('(prefers-color-scheme: dark)') ?? null;

    const applyEffective = (effective) => {
      setEffectiveMode(effective);
      applyTheme(accent, effective, cardStyle);
    };

    const computeAndSchedule = () => {
      const now = new Date();
      const source = getCachedCoordsSource();

      if (source === 'default') {
        applyEffective(mq?.matches ? 'dark' : 'light');
        timer = setTimeout(computeAndSchedule, 60 * 60 * 1000);
        return;
      }

      const { lat, lon } = getCachedCoords();
      const sunTimes = getSunTimes(lat, lon, now);
      const effective = getEffectiveMode(sunTimes, now);
      applyEffective(effective);

      timer = setTimeout(computeAndSchedule, msUntilNext(effective, sunTimes, lat, lon, now));
    };

    const handleMediaChange = () => {
      if (getCachedCoordsSource() === 'default') {
        applyEffective(mq.matches ? 'dark' : 'light');
      }
    };
    mq?.addEventListener('change', handleMediaChange);

    computeAndSchedule();

    return () => {
      clearTimeout(timer);
      mq?.removeEventListener('change', handleMediaChange);
    };
  }, [mode, accent, cardStyle]);

  return effectiveMode;
};
