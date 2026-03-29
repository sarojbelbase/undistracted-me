import { useEffect, useRef } from 'react';

// True when running inside the Chrome/Firefox extension (not plain browser dev)
const hasChromeApi = () =>
  typeof chrome !== 'undefined' && !!chrome.runtime?.id;

/**
 * Schedules LookAway breaks that survive tab switches and other apps.
 *
 * Strategy:
 *   - In extension: syncs a `chrome.alarm` via the service worker. When the
 *     alarm fires (even while the user is in VS Code), the SW sets
 *     `chrome.storage.local.lookaway_due`. The new tab page reacts instantly
 *     via `chrome.storage.onChanged`, or catches the pending flag on next mount.
 *   - In dev (no extension): falls back to a plain `setInterval`.
 */
export const useLookAwayScheduler = ({ enabled, intervalMins, onTrigger }) => {
  const triggerRef = useRef(onTrigger);
  triggerRef.current = onTrigger;

  // ── Sync alarm with the service worker ───────────────────────────────────
  useEffect(() => {
    if (!hasChromeApi()) return;
    chrome.runtime.sendMessage({ type: 'LOOKAWAY_SYNC', enabled, intervalMins })
      .catch(() => { }); // SW may still be activating
  }, [enabled, intervalMins]);

  // ── React to alarm via chrome.storage.onChanged (works cross-tab) ────────
  useEffect(() => {
    if (!enabled || !hasChromeApi() || !chrome.storage?.onChanged) return;
    const handler = (changes, area) => {
      if (area === 'local' && changes.lookaway_due?.newValue) {
        triggerRef.current();
      }
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  }, [enabled]);

  // ── On mount: fire if a break was recently due (but skip stale ones) ────
  // "Stale" = the alarm fired more than 2× the interval ago, meaning the
  // machine was asleep (or the user just unlocked after a long absence).
  // In that case silently clear the flag — no one wants a forced break the
  // second they sit back down at their computer.
  useEffect(() => {
    if (!enabled || !hasChromeApi() || !chrome.storage?.local) return;
    chrome.storage.local.get('lookaway_due', (result) => {
      const due = result.lookaway_due;
      if (!due) return;
      const ageMs = Date.now() - due;
      const gracePeriodMs = intervalMins * 60_000 * 2;
      if (ageMs > gracePeriodMs) {
        // Stale — machine was likely asleep. Dismiss quietly.
        chrome.storage.local.remove('lookaway_due');
        return;
      }
      triggerRef.current();
    });
  }, [enabled, intervalMins]);

  // ── Dev fallback: plain setInterval (no chrome extension context) ────────
  useEffect(() => {
    if (!enabled || hasChromeApi()) return;
    const id = setInterval(() => triggerRef.current(), intervalMins * 60_000);
    return () => clearInterval(id);
  }, [enabled, intervalMins]);
};

/**
 * Call when the LookAway overlay is dismissed — clears the pending flag so
 * the same break doesn't re-trigger on the next new tab open.
 */
export const clearLookAwayDue = () => {
  if (hasChromeApi() && chrome.storage?.local) {
    chrome.storage.local.remove('lookaway_due');
  }
};
