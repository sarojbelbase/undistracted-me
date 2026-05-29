/**
 * useLocation — centralized location lifecycle hook.
 *
 * Call once at the App root. Responsibilities:
 *   1. Trigger an initial location resolve if data is absent or stale.
 *   2. Re-check IP-based location every 30 minutes (detects VPN switches).
 *   3. Recalculate isDay/sunrise/sunset every minute (no network call).
 *
 * TTL policy:
 *   - 'browser' source: refresh after 6 hours (GPS coords are stable)
 *   - 'ip' source: refresh after 30 minutes (VPN detection window)
 *   - 'idle' (no data yet): refresh immediately
 *
 * Power-saving: intervals are paused when the tab is hidden (background /
 * laptop closed) and resumed on visibility change. This prevents useless
 * sun-recalculation and geo-refresh cycles on tabs the user isn't looking at.
 */
import { useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { useLocationStore } from "../store/useLocationStore";

const BROWSER_TTL_MS = 6 * 60 * 60_000; // 6 hours
const IP_TTL_MS = 30 * 60_000; // 30 minutes
const SUN_TICK_MS = 60_000; // 1 minute

export const useLocation = () => {
  const { refresh, refreshSunTimes, source, lastUpdated, status, lat, lon } =
    useLocationStore(useShallow(s => ({
      refresh: s.refresh,
      refreshSunTimes: s.refreshSunTimes,
      source: s.source,
      lastUpdated: s.lastUpdated,
      status: s.status,
      lat: s.lat,
      lon: s.lon,
    })));

  // Refs to track interval IDs so we can clear/reset them on visibility change.
  const geoTimerRef = useRef(null);
  const sunTimerRef = useRef(null);

  useEffect(() => {
    // Decide whether to refresh on mount
    const ttl = source === "browser" ? BROWSER_TTL_MS : IP_TTL_MS;
    const isStale = !lastUpdated || Date.now() - lastUpdated > ttl;

    if (status === "idle" || isStale) {
      refresh();
    }

    const startTimers = () => {
      stopTimers();
      geoTimerRef.current = setInterval(refresh, IP_TTL_MS);
      sunTimerRef.current = setInterval(refreshSunTimes, SUN_TICK_MS);
    };

    const stopTimers = () => {
      if (geoTimerRef.current) { clearInterval(geoTimerRef.current); geoTimerRef.current = null; }
      if (sunTimerRef.current) { clearInterval(sunTimerRef.current); sunTimerRef.current = null; }
    };

    startTimers();

    // Pause timers when the tab is hidden — no need to recalculate the sun
    // or check geo-location for a tab the user can't see.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Immediately recalc sun times on return (they may have crossed sunrise/sunset)
        refreshSunTimes();
        startTimers();
      } else {
        stopTimers();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stopTimers();
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Stable Zustand references — intentionally empty dep array

  // Send coords to the SW for background weather pre-fetch whenever they change
  useEffect(() => {
    if (!lat || !lon) return;
    if (typeof chrome !== "undefined" && chrome.runtime?.id) {
      chrome.runtime
        .sendMessage({ type: "PREFETCH_SYNC", lat, lon })
        .catch(() => { });
    }
  }, [lat, lon]);
};
