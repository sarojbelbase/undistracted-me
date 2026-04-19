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
 */
import { useEffect } from 'react';
import { useLocationStore } from '../store/useLocationStore';

const BROWSER_TTL_MS = 6 * 60 * 60_000;   // 6 hours
const IP_TTL_MS = 30 * 60_000;        // 30 minutes
const SUN_TICK_MS = 60_000;              // 1 minute

export const useLocation = () => {
  const refresh = useLocationStore(s => s.refresh);
  const refreshSunTimes = useLocationStore(s => s.refreshSunTimes);
  const source = useLocationStore(s => s.source);
  const lastUpdated = useLocationStore(s => s.lastUpdated);
  const status = useLocationStore(s => s.status);

  useEffect(() => {
    // Decide whether to refresh on mount
    const ttl = source === 'browser' ? BROWSER_TTL_MS : IP_TTL_MS;
    const isStale = !lastUpdated || (Date.now() - lastUpdated) > ttl;

    if (status === 'idle' || isStale) {
      refresh();
    }

    // Re-check every 30 min regardless of source — detects VPN switches for
    // IP-based locations; for browser-grade coords this is effectively a no-op
    // because getCurrentPosition will return the cached fix within the 6h maximumAge.
    const geoTimer = setInterval(refresh, IP_TTL_MS);

    // Recalculate isDay every minute so dark/light transitions happen on time
    const sunTimer = setInterval(refreshSunTimes, SUN_TICK_MS);

    return () => {
      clearInterval(geoTimer);
      clearInterval(sunTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Stable Zustand references — intentionally empty dep array
};
