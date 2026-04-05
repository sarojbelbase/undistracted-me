import { useEffect, useRef } from 'react';

// True when running inside the Chrome/Firefox extension (not plain browser dev)
const hasChromeApi = () =>
  typeof chrome !== 'undefined' && !!chrome.runtime?.id;

// Track the last time the page became hidden (laptop closed / tab switched away).
// We use this to detect laptop-wake scenarios where the alarm fired while the
// machine was asleep — the page was hidden for the whole interval, so we should
// NOT ambush the user with an overlay the moment they open their laptop.
let lastHiddenAt = null;
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      lastHiddenAt = Date.now();
    }
  });
}

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
export const useLookAwayScheduler = ({ enabled, intervalMins, notify = true, onTrigger }) => {
  const triggerRef = useRef(onTrigger);
  triggerRef.current = onTrigger;

  // ── Sync alarm with the service worker ───────────────────────────────────────
  useEffect(() => {
    if (!hasChromeApi()) return;
    // Write notify preference directly to storage so the SW alarm handler
    // always sees the latest value even before the message is processed.
    chrome.storage.local.set({ lookaway_notify: notify !== false });
    chrome.runtime.sendMessage({ type: 'LOOKAWAY_SYNC', enabled, intervalMins, notify })
      .catch(() => { }); // SW may still be activating
  }, [enabled, intervalMins, notify]);

  // ── React to alarm via chrome.storage.onChanged (works cross-tab) ────────
  useEffect(() => {
    if (!enabled || !hasChromeApi() || !chrome.storage?.onChanged) return;
    const handler = (changes, area) => {
      if (area !== 'local' || !changes.lookaway_due?.newValue) return;
      // Skip if the page is currently hidden or just became visible after a long absence
      if (document.visibilityState === 'hidden') return;
      if (lastHiddenAt !== null && (Date.now() - lastHiddenAt) < 3000) return;
      triggerRef.current();
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  }, [enabled]);

  // ── On mount: fire if a break was recently due (but skip stale ones) ────
  // "Stale" means the alarm fired but no one was actively at the machine:
  //  a) the flag is older than 1.5× the interval, OR
  //  b) the page was hidden (laptop closed/tab away) for more than half the
  //     interval — this catches the laptop-wake scenario where Chrome fires
  //     catch-up alarms the instant the machine wakes up.
  useEffect(() => {
    if (!enabled || !hasChromeApi() || !chrome.storage?.local) return;
    chrome.storage.local.get('lookaway_due', (result) => {
      const due = result.lookaway_due;
      if (!due) return;
      const ageMs = Date.now() - due;
      const intervalMs = intervalMins * 60_000;

      // Too old — definitely stale
      if (ageMs > intervalMs * 1.5) {
        chrome.storage.local.remove('lookaway_due');
        return;
      }

      // Page was hidden (laptop asleep / another app) for most of the interval
      // right before this mount — this is a wake-up, not an active-use break
      if (lastHiddenAt !== null) {
        const hiddenDurationMs = Date.now() - lastHiddenAt;
        if (hiddenDurationMs > intervalMs * 0.5) {
          chrome.storage.local.remove('lookaway_due');
          return;
        }
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
