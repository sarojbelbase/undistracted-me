/**
 * Unit tests for useLookAwayScheduler and clearLookAwayDue.
 *
 * Strategy:
 *  - Tests that exercise the Chrome extension paths mock `global.chrome`.
 *  - Tests for the "dev mode" fallback (`setInterval`) leave `global.chrome` absent.
 *  - Fake timers make setInterval / setTimeout deterministic.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useLookAwayScheduler,
  clearLookAwayDue,
} from '../../../src/components/LookAway/hooks.js';

// ─── Test double builder ──────────────────────────────────────────────────────

/**
 * Build a minimal chrome mock. Individual tests can provide overrides for
 * specific sub-objects (`runtime`, `local`, `onChanged`) so they can capture
 * handlers or control resolved values.
 */
const buildChrome = ({
  sendMessage = vi.fn().mockResolvedValue(undefined),
  localGet = vi.fn(),
  localSet = vi.fn(),
  localRemove = vi.fn(),
  onChangedAddListener = vi.fn(),
  onChangedRemoveListener = vi.fn(),
} = {}) => ({
  runtime: {
    id: 'test-extension-id',
    sendMessage,
  },
  storage: {
    local: {
      get: localGet,
      set: localSet,
      remove: localRemove,
    },
    onChanged: {
      addListener: onChangedAddListener,
      removeListener: onChangedRemoveListener,
    },
  },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const advanceTick = (ms = 1000) => act(() => { vi.advanceTimersByTime(ms); });

// ═════════════════════════════════════════════════════════════════════════════
// useLookAwayScheduler — dev fallback (no Chrome API)
// ═════════════════════════════════════════════════════════════════════════════

describe('useLookAwayScheduler – dev fallback (no Chrome API)', () => {
  let onTrigger;

  beforeEach(() => {
    onTrigger = vi.fn();
    vi.useFakeTimers();
    delete global.chrome; // ensure no extension context
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    delete global.chrome;
  });

  it('fires onTrigger after intervalMins × 60 000 ms', () => {
    const { unmount } = renderHook(() =>
      useLookAwayScheduler({ enabled: true, intervalMins: 1, onTrigger })
    );
    expect(onTrigger).not.toHaveBeenCalled();
    advanceTick(60_000);
    expect(onTrigger).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('fires repeatedly at each full interval', () => {
    const { unmount } = renderHook(() =>
      useLookAwayScheduler({ enabled: true, intervalMins: 1, onTrigger })
    );
    advanceTick(60_000);
    expect(onTrigger).toHaveBeenCalledTimes(1);
    advanceTick(60_000);
    expect(onTrigger).toHaveBeenCalledTimes(2);
    advanceTick(60_000);
    expect(onTrigger).toHaveBeenCalledTimes(3);
    unmount();
  });

  it('does NOT fire when enabled=false', () => {
    const { unmount } = renderHook(() =>
      useLookAwayScheduler({ enabled: false, intervalMins: 1, onTrigger })
    );
    advanceTick(60_000);
    expect(onTrigger).not.toHaveBeenCalled();
    unmount();
  });

  it('clears the interval on unmount', () => {
    const clearSpy = vi.spyOn(global, 'clearInterval');
    const { unmount } = renderHook(() =>
      useLookAwayScheduler({ enabled: true, intervalMins: 1, onTrigger })
    );
    unmount();
    expect(clearSpy).toHaveBeenCalled();
  });

  it('stops firing after unmount', () => {
    const { unmount } = renderHook(() =>
      useLookAwayScheduler({ enabled: true, intervalMins: 1, onTrigger })
    );
    unmount();
    advanceTick(60_000);
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('restarts interval when intervalMins changes', () => {
    let intervalMins = 1;
    const { rerender, unmount } = renderHook(() =>
      useLookAwayScheduler({ enabled: true, intervalMins, onTrigger })
    );

    // Advance 30s — old timer (1 min) hasn't fired yet
    advanceTick(30_000);
    // Switch to 2-minute interval
    intervalMins = 2;
    rerender();
    // Old 1-min timer was cleared; new 2-min timer started from NOW (t=30s)
    // So next trigger is at t = 30s + 120s = 150s
    advanceTick(60_000); // t = 90s: not yet
    expect(onTrigger).not.toHaveBeenCalled();
    advanceTick(60_000); // t = 150s: fires!
    expect(onTrigger).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('stops the interval when enabled switches from true to false', () => {
    let enabled = true;
    const { rerender, unmount } = renderHook(() =>
      useLookAwayScheduler({ enabled, intervalMins: 1, onTrigger })
    );
    enabled = false;
    rerender();
    advanceTick(60_000);
    expect(onTrigger).not.toHaveBeenCalled();
    unmount();
  });

  it('resumes when enabled switches from false to true', () => {
    let enabled = false;
    const { rerender, unmount } = renderHook(() =>
      useLookAwayScheduler({ enabled, intervalMins: 1, onTrigger })
    );
    enabled = true;
    rerender();
    advanceTick(60_000);
    expect(onTrigger).toHaveBeenCalledTimes(1);
    unmount();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// useLookAwayScheduler — Chrome extension paths
// ═════════════════════════════════════════════════════════════════════════════

describe('useLookAwayScheduler – Chrome API paths', () => {
  let onTrigger;

  beforeEach(() => {
    onTrigger = vi.fn();
    vi.useFakeTimers();
    // Set a safe default chrome so that hook cleanup functions (which reference
    // `chrome` directly without re-checking hasChromeApi()) don't throw when
    // React's effect cleanup runs between our afterEach and RTL's cleanup.
    // Each test can override global.chrome with a more specific mock.
    global.chrome = buildChrome({ localGet: vi.fn((_, cb) => cb({})) });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    // NOTE: do NOT `delete global.chrome` here.
    // RTL's hookup cleanup runs effect teardown functions (which call chrome.storage…)
    // after this hook's afterEach. Deleting chrome first causes a ReferenceError.
    // global.chrome is overwritten by the next test's beforeEach, and removed in afterAll.
  });

  afterAll(() => {
    delete global.chrome;
  });

  // ── Service-worker SYNC ──────────────────────────────────────────────────

  it('sends LOOKAWAY_SYNC to service worker on mount', () => {
    const mock = buildChrome({ localGet: vi.fn((_, cb) => cb({})) });
    global.chrome = mock;
    renderHook(() =>
      useLookAwayScheduler({ enabled: true, intervalMins: 20, onTrigger })
    );
    expect(mock.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'LOOKAWAY_SYNC',
      enabled: true,
      intervalMins: 20,
      notify: true,
    });
  });

  it('re-sends LOOKAWAY_SYNC when intervalMins changes', () => {
    const mock = buildChrome({ localGet: vi.fn((_, cb) => cb({})) });
    global.chrome = mock;
    let intervalMins = 20;
    const { rerender } = renderHook(() =>
      useLookAwayScheduler({ enabled: true, intervalMins, onTrigger })
    );
    intervalMins = 30;
    rerender();
    expect(mock.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ intervalMins: 30 })
    );
  });

  it('re-sends LOOKAWAY_SYNC when enabled changes', () => {
    const mock = buildChrome({ localGet: vi.fn((_, cb) => cb({})) });
    global.chrome = mock;
    let enabled = true;
    const { rerender } = renderHook(() =>
      useLookAwayScheduler({ enabled, intervalMins: 20, onTrigger })
    );
    enabled = false;
    rerender();
    expect(mock.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false })
    );
  });

  it('does NOT start dev setInterval when chrome API is available', () => {
    const setIntervalSpy = vi.spyOn(global, 'setInterval');
    const mock = buildChrome({ localGet: vi.fn((_, cb) => cb({})) });
    global.chrome = mock;
    const { unmount } = renderHook(() =>
      useLookAwayScheduler({ enabled: true, intervalMins: 1, onTrigger })
    );
    advanceTick(60_000);
    expect(onTrigger).not.toHaveBeenCalled();
    unmount();
  });

  // ── storage.onChanged listener ────────────────────────────────────────────

  it('registers a storage.onChanged listener when enabled', () => {
    const mock = buildChrome({ localGet: vi.fn((_, cb) => cb({})) });
    global.chrome = mock;
    const { unmount } = renderHook(() =>
      useLookAwayScheduler({ enabled: true, intervalMins: 20, onTrigger })
    );
    expect(mock.storage.onChanged.addListener).toHaveBeenCalledWith(
      expect.any(Function)
    );
    unmount();
  });

  it('removes the storage.onChanged listener on unmount', () => {
    const mock = buildChrome({ localGet: vi.fn((_, cb) => cb({})) });
    global.chrome = mock;
    const { unmount } = renderHook(() =>
      useLookAwayScheduler({ enabled: true, intervalMins: 20, onTrigger })
    );
    unmount();
    expect(mock.storage.onChanged.removeListener).toHaveBeenCalled();
  });

  it('does NOT register storage.onChanged listener when disabled', () => {
    const mock = buildChrome({ localGet: vi.fn((_, cb) => cb({})) });
    global.chrome = mock;
    renderHook(() =>
      useLookAwayScheduler({ enabled: false, intervalMins: 20, onTrigger })
    );
    expect(mock.storage.onChanged.addListener).not.toHaveBeenCalled();
  });

  it('calls onTrigger when lookaway_due changes in local storage', () => {
    let capturedHandler;
    const mock = buildChrome({
      localGet: vi.fn((_, cb) => cb({})),
      onChangedAddListener: vi.fn((fn) => { capturedHandler = fn; }),
    });
    global.chrome = mock;
    renderHook(() =>
      useLookAwayScheduler({ enabled: true, intervalMins: 20, onTrigger })
    );
    act(() => {
      capturedHandler({ lookaway_due: { newValue: Date.now() } }, 'local');
    });
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onTrigger for a change to a different storage key', () => {
    let capturedHandler;
    const mock = buildChrome({
      localGet: vi.fn((_, cb) => cb({})),
      onChangedAddListener: vi.fn((fn) => { capturedHandler = fn; }),
    });
    global.chrome = mock;
    renderHook(() =>
      useLookAwayScheduler({ enabled: true, intervalMins: 20, onTrigger })
    );
    act(() => {
      capturedHandler({ unrelated_key: { newValue: 'x' } }, 'local');
    });
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('does NOT call onTrigger when storage area is not "local"', () => {
    let capturedHandler;
    const mock = buildChrome({
      localGet: vi.fn((_, cb) => cb({})),
      onChangedAddListener: vi.fn((fn) => { capturedHandler = fn; }),
    });
    global.chrome = mock;
    renderHook(() =>
      useLookAwayScheduler({ enabled: true, intervalMins: 20, onTrigger })
    );
    act(() => {
      capturedHandler({ lookaway_due: { newValue: Date.now() } }, 'sync');
    });
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('calls onTrigger on every lookaway_due change event', () => {
    let capturedHandler;
    const mock = buildChrome({
      localGet: vi.fn((_, cb) => cb({})),
      onChangedAddListener: vi.fn((fn) => { capturedHandler = fn; }),
    });
    global.chrome = mock;
    renderHook(() =>
      useLookAwayScheduler({ enabled: true, intervalMins: 20, onTrigger })
    );
    act(() => {
      capturedHandler({ lookaway_due: { newValue: Date.now() } }, 'local');
    });
    act(() => {
      capturedHandler({ lookaway_due: { newValue: Date.now() + 10_000 } }, 'local');
    });
    expect(onTrigger).toHaveBeenCalledTimes(2);
  });

  // ── Mount-time stale-flag check ───────────────────────────────────────────

  it('triggers immediately when a fresh lookaway_due flag exists on mount', () => {
    const freshTs = Date.now() - 5_000; // 5 seconds ago — well within any grace period
    const mock = buildChrome({
      localGet: vi.fn((_, cb) => cb({ lookaway_due: freshTs })),
    });
    global.chrome = mock;
    renderHook(() =>
      useLookAwayScheduler({ enabled: true, intervalMins: 20, onTrigger })
    );
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('does NOT trigger when lookaway_due is stale (age > 1.5× intervalMins)', () => {
    // Interval = 20 min → grace = 30 min. Timestamp 41 min ago → stale.
    const staleTs = Date.now() - 41 * 60_000;
    const mock = buildChrome({
      localGet: vi.fn((_, cb) => cb({ lookaway_due: staleTs })),
    });
    global.chrome = mock;
    renderHook(() =>
      useLookAwayScheduler({ enabled: true, intervalMins: 20, onTrigger })
    );
    expect(onTrigger).not.toHaveBeenCalled();
  });

  it('removes the stale flag from storage', () => {
    const staleTs = Date.now() - 41 * 60_000;
    const mock = buildChrome({
      localGet: vi.fn((_, cb) => cb({ lookaway_due: staleTs })),
    });
    global.chrome = mock;
    renderHook(() =>
      useLookAwayScheduler({ enabled: true, intervalMins: 20, onTrigger })
    );
    expect(mock.storage.local.remove).toHaveBeenCalledWith('lookaway_due');
  });

  it('does NOT remove a fresh lookaway_due from storage', () => {
    const freshTs = Date.now() - 5_000;
    const mock = buildChrome({
      localGet: vi.fn((_, cb) => cb({ lookaway_due: freshTs })),
    });
    global.chrome = mock;
    renderHook(() =>
      useLookAwayScheduler({ enabled: true, intervalMins: 20, onTrigger })
    );
    expect(mock.storage.local.remove).not.toHaveBeenCalled();
  });

  it('does nothing on mount when lookaway_due is absent', () => {
    const mock = buildChrome({
      localGet: vi.fn((_, cb) => cb({})),
    });
    global.chrome = mock;
    renderHook(() =>
      useLookAwayScheduler({ enabled: true, intervalMins: 20, onTrigger })
    );
    expect(onTrigger).not.toHaveBeenCalled();
    expect(mock.storage.local.remove).not.toHaveBeenCalled();
  });

  it('does NOT check storage when disabled', () => {
    const mock = buildChrome({
      localGet: vi.fn((_, cb) => cb({})),
    });
    global.chrome = mock;
    renderHook(() =>
      useLookAwayScheduler({ enabled: false, intervalMins: 20, onTrigger })
    );
    expect(mock.storage.local.get).not.toHaveBeenCalled();
  });

  it('boundary: exactly at 1.5× interval is treated as fresh (not stale)', () => {
    // age === gracePeriodMs (not strictly >) → treated as fresh → triggers
    const intervalMins = 10;
    const borderTs = Date.now() - intervalMins * 60_000 * 1.5;
    const mock = buildChrome({
      localGet: vi.fn((_, cb) => cb({ lookaway_due: borderTs })),
    });
    global.chrome = mock;
    renderHook(() =>
      useLookAwayScheduler({ enabled: true, intervalMins, onTrigger })
    );
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('uses the latest onTrigger ref even if the callback identity changed', () => {
    let capturedHandler;
    const mock = buildChrome({
      localGet: vi.fn((_, cb) => cb({})),
      onChangedAddListener: vi.fn((fn) => { capturedHandler = fn; }),
    });
    global.chrome = mock;

    const initial = vi.fn();
    const updated = vi.fn();
    let onTriggerRef = initial;

    const { rerender } = renderHook(() =>
      useLookAwayScheduler({ enabled: true, intervalMins: 20, onTrigger: onTriggerRef })
    );
    // Swap callback before the event fires
    onTriggerRef = updated;
    rerender();
    act(() => {
      capturedHandler({ lookaway_due: { newValue: Date.now() } }, 'local');
    });
    expect(initial).not.toHaveBeenCalled();
    expect(updated).toHaveBeenCalledTimes(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// clearLookAwayDue
// ═════════════════════════════════════════════════════════════════════════════

describe('clearLookAwayDue', () => {
  afterEach(() => {
    delete global.chrome;
    vi.restoreAllMocks();
  });

  it('calls chrome.storage.local.remove("lookaway_due") when chrome API is present', () => {
    const mock = buildChrome();
    global.chrome = mock;
    clearLookAwayDue();
    expect(mock.storage.local.remove).toHaveBeenCalledWith('lookaway_due');
  });

  it('does not throw when chrome is undefined', () => {
    delete global.chrome;
    expect(() => clearLookAwayDue()).not.toThrow();
  });

  it('does not throw when chrome.storage is missing', () => {
    global.chrome = { runtime: { id: 'x' } };
    expect(() => clearLookAwayDue()).not.toThrow();
  });

  it('does not throw when chrome.storage.local is missing', () => {
    global.chrome = { runtime: { id: 'x' }, storage: {} };
    expect(() => clearLookAwayDue()).not.toThrow();
  });

  it('calls remove exactly once per invocation', () => {
    const mock = buildChrome();
    global.chrome = mock;
    clearLookAwayDue();
    clearLookAwayDue();
    expect(mock.storage.local.remove).toHaveBeenCalledTimes(2);
  });
});
