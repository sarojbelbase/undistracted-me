/**
 * useLocation — centralized location lifecycle hook.
 *
 * Call once at the App root. Responsibilities:
 *   1. Trigger an initial location resolve if data is absent or stale.
 *   2. Re-check IP-based location every 30 minutes (detects VPN switches).
 *   3. Recalculate isDay/sunrise/sunset at the exact sunrise/sunset boundary
 *      (no more 1-minute polling — sun times only change twice a day).
 *
 * TTL policy:
 *   - 'browser' source: refresh after 6 hours (GPS coords are stable)
 *   - 'ip' source: refresh after 30 minutes (VPN detection window)
 *   - 'idle' (no data yet): refresh immediately
 *
 * Power-saving: timers are paused when the tab is hidden (background /
 * laptop closed) and resumed on visibility change. This prevents useless
 * sun-recalculation and geo-refresh cycles on tabs the user isn't looking at.
 */
import { useEffect, useRef, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { useLocationStore } from "../store/useLocationStore";
import { getSunTimes } from "../utilities/sunTime";

const BROWSER_TTL_MS = 6 * 60 * 60_000; // 6 hours
const IP_TTL_MS = 30 * 60_000; // 30 minutes
const SUN_TICK_MS = 60_000; // fallback cadence when no boundary can be resolved
const SUN_REFRESH_BUFFER_MS = 30_000; // recheck 30s after the boundary

/**
 * Returns ms until the next sunrise/sunset boundary for the given coordinates,
 * or null when no coordinates are available yet.
 */
const msUntilNextSunBoundary = (lat, lon, now) => {
  if (lat == null || lon == null) return null;
  const today = getSunTimes(lat, lon, now);
  if (today?.sunrise && today.sunrise > now) return today.sunrise - now;
  if (today?.sunset && today.sunset > now) return today.sunset - now;
  // Past today's sunset — the next boundary is tomorrow's sunrise.
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tmr = getSunTimes(lat, lon, tomorrow);
  if (tmr?.sunrise) return tmr.sunrise - now;
  return null;
};

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

  // Refs to track timers so we can clear/reset them on visibility change.
  const geoTimerRef = useRef(null);
  const sunTimerRef = useRef(null);

  const stopSun = useCallback(() => {
    if (sunTimerRef.current) {
      clearTimeout(sunTimerRef.current);
      sunTimerRef.current = null;
    }
  }, []);

  /**
   * Recompute sun times now and schedule the NEXT refresh at the following
   * sunrise/sunset boundary (instead of every minute). Falls back to a 1-minute
   * retry while coordinates are unresolved.
   */
  const scheduleSunRefresh = useCallback(() => {
    stopSun();
    const { lat: l, lon: o } = useLocationStore.getState();
    const ms = msUntilNextSunBoundary(l, o, new Date());
    const delay = ms != null ? ms + SUN_REFRESH_BUFFER_MS : SUN_TICK_MS;
    sunTimerRef.current = setTimeout(() => {
      refreshSunTimes();
      scheduleSunRefresh();
    }, Math.max(delay, 1000));
  }, [refreshSunTimes, stopSun]);

  // ── Geo refresh + initial resolve + visibility pause/resume ─────────────────
  useEffect(() => {
    // Decide whether to refresh on mount
    const ttl = source === "browser" ? BROWSER_TTL_MS : IP_TTL_MS;
    const isStale = !lastUpdated || Date.now() - lastUpdated > ttl;

    if (status === "idle" || isStale) {
      refresh();
    }

    // Browser GPS coords are stable — refresh every 6 h, not every 30 min.
    // Read the live source so the interval tracks the resolved source.
    const geoInterval =
      useLocationStore.getState().source === "browser" ? BROWSER_TTL_MS : IP_TTL_MS;
    geoTimerRef.current = setInterval(refresh, geoInterval);

    // Pause timers when the tab is hidden — no need to recalculate the sun
    // or check geo-location for a tab the user can't see.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Immediately recalc sun times on return (they may have crossed sunrise/sunset)
        refreshSunTimes();
        scheduleSunRefresh();
      } else {
        stopSun();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (geoTimerRef.current) { clearInterval(geoTimerRef.current); geoTimerRef.current = null; }
      stopSun();
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Stable Zustand references — intentionally empty dep array

  // ── Sun boundary scheduler ──────────────────────────────────────────────────
  // Schedule the first refresh, and reschedule whenever coordinates resolve or
  // change (a VPN switch or a first GPS fix moves the sunrise/sunset boundary).
  useEffect(() => {
    scheduleSunRefresh();
    return stopSun;
  }, [lat, lon, scheduleSunRefresh, stopSun]);

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
