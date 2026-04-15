/**
 * Shared Clock — one setInterval drives all open new-tab pages.
 *
 * Problem solved
 * ──────────────
 * When the user has N new tabs open, each tab runs its own setInterval(1000).
 * With 4 tabs + FocusMode that's 5+ independent timers all slightly out of
 * phase with each other and with the wall clock.
 *
 * Solution
 * ────────
 * Leader election via Web Locks API:
 *   • Exactly ONE tab holds the exclusive "um:clock:leader" lock at any time.
 *   • That leader runs one second-aligned setInterval and broadcasts every tick
 *     to all other tabs via BroadcastChannel("um:clock").
 *   • Follower tabs subscribe to the channel and fire their update callbacks
 *     without running any interval of their own.
 *   • When the leader tab closes (pagehide), the lock is released. The next
 *     tab in the queue immediately acquires it and becomes the new leader.
 *
 * Alignment
 * ─────────
 * Instead of raw setInterval(1000) (which drifts from mount time), the leader
 * first waits until the next whole-second boundary before starting the interval.
 * Result: all clocks update at exactly :00, :01, :02 … of each minute — never
 * half a second late.
 *
 * Fallbacks
 * ─────────
 * • No BroadcastChannel (SSR / old browsers) → each tab runs its own aligned interval.
 * • No Web Locks (Safari < 17) → BroadcastChannel only, every tab runs its own
 *   interval (same as before, but second-aligned).
 *
 * API
 * ───
 * import { onClockTick } from './sharedClock';
 *
 * // In a useEffect:
 * useEffect(() => onClockTick(myUpdateFn), [myUpdateFn]);
 *   // onClockTick returns the unsubscribe function — perfect for useEffect cleanup.
 *   // myUpdateFn is called immediately (no stale first render) then every second.
 */

const CHANNEL_NAME = 'um:clock';
const LOCK_NAME = 'um:clock:leader';

/** All registered callbacks. Uses a Set so each fn is stored once. */
const listeners = new Set();

/** Timestamp of the last tick dispatch — used for the immediate-call in onClockTick. */
let lastTs = 0;

/** Call all listeners. Called by leader (directly) and followers (via BroadcastChannel). */
function _notify() {
  lastTs = Date.now();
  listeners.forEach(fn => fn());
}

/**
 * Start the one true setInterval. Aligns to the next whole second first,
 * then fires every 1000 ms.
 *
 * @param {BroadcastChannel|null} bc — channel to broadcast ticks to followers, or null.
 * @returns {() => void} cleanup function
 */
function _becomeLeader(bc) {
  let tid, iv;

  function tick() {
    _notify();
    bc?.postMessage(1);
  }

  // Align to next whole second so the clock always flips at :00, :01, :02 …
  const msToNext = 1000 - (Date.now() % 1000);
  tid = setTimeout(() => {
    tick();
    iv = setInterval(tick, 1000);
  }, msToNext);

  return () => { clearTimeout(tid); clearInterval(iv); };
}

/** Module-level initialiser — runs once when the module is first imported. */
function _init() {
  if (globalThis.window === undefined) return; // SSR guard

  if (typeof BroadcastChannel === 'undefined') {
    // No BroadcastChannel — each tab runs its own aligned interval (graceful degradation)
    _becomeLeader(null);
    return;
  }

  const bc = new BroadcastChannel(CHANNEL_NAME);

  // Followers receive ticks from whichever tab is currently the leader.
  bc.onmessage = _notify;

  if (!('locks' in navigator)) {
    // No Web Locks API (Safari < 17) — BroadcastChannel is available but no
    // leader election; every tab runs its own interval. Still second-aligned.
    _becomeLeader(null);
    return;
  }

  // ── Leader election ───────────────────────────────────────────────────────
  // navigator.locks.request queues this tab. The callback fires as soon as this
  // tab becomes the exclusive lock holder — immediately if no other tab has it,
  // or after the current leader releases it (on pagehide / crash).
  navigator.locks.request(LOCK_NAME, { mode: 'exclusive' }, () => {
    // === We are the leader ===
    // Stop listening to the channel (we generate ticks, not consume them).
    bc.onmessage = null;

    const cleanup = _becomeLeader(bc);

    // Hold the lock until this page is hidden (tab close, navigation, bfcache).
    // 'pagehide' is the correct event — 'unload' is deprecated and unreliable in MV3.
    return new Promise(resolve => {
      globalThis.window.addEventListener('pagehide', resolve, { once: true });
    }).finally(cleanup);

    // When the promise resolves, the lock is released and the next queued tab
    // (if any) automatically becomes the new leader. No manual re-request needed.
  }).catch(() => {
    // Lock request aborted or denied (e.g. Permissions-Policy) — stay as follower.
  });
}

_init();

/**
 * Subscribe to 1-second clock ticks.
 *
 * The callback is called immediately with the last known tick (so components
 * don't show stale data on first render), then every second thereafter.
 *
 * @param {() => void} fn   — callback, called every second
 * @returns {() => void}    — unsubscribe function (pass directly to useEffect return)
 *
 * @example
 * useEffect(() => onClockTick(update), [update]);
 */
export function onClockTick(fn) {
  listeners.add(fn);
  fn(); // call immediately — ensures no stale first render (mirrors old setInterval(update) + update() pattern)
  return () => listeners.delete(fn);
}
