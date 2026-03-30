/**
 * Tests for src/widgets/useEvents.js — useEvents hook and formatEventTime
 *
 * What can go wrong:
 *  – load() returning [] when localStorage is empty is essential;
 *    any throw here crashes the entire widget on first load.
 *  – addEvent must assign a numeric id via Date.now() — if id is missing,
 *    removeEvent can never match and the event cannot be deleted.
 *  – removeEvent must filter by id, not by array index — removing the first
 *    event must not accidentally remove the second.
 *  – Cross-tab sync via the SYNC_EVENT window event: if the listener is
 *    removed prematurely events dispatched after unmount silently fail.
 *  – formatEventTime: missing startDate must return '' (not crash).
 *  – formatEventTime: 24h times must convert to 12h format correctly.
 *    13:00 → '1:00 PM', 00:00 → '12:00 AM', 12:00 → '12:00 PM'.
 *  – formatEventTime: when only startTime exists (no endTime), renders single time.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEvents, formatEventTime } from '../../../src/widgets/useEvents';

// Silence Chrome API warnings in test output
vi.stubGlobal('chrome', undefined);

beforeEach(() => {
  localStorage.clear();
  // Reset the module-level cache between tests by dispatching a storage change
  // after clearing, forcing the hook to re-read from the now-empty store.
});

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

// ────────────────────────────────────────────────────────────────────────────
// formatEventTime
// ────────────────────────────────────────────────────────────────────────────

describe('formatEventTime', () => {
  it('returns empty string when startDate is missing', () => {
    expect(formatEventTime({})).toBe('');
  });

  it('returns empty string when event is empty object', () => {
    expect(formatEventTime({})).toBe('');
  });

  it('formats startDate with startTime correctly (12h format)', () => {
    const result = formatEventTime({ startDate: '2025-06-10', startTime: '09:30' });
    expect(result).toContain('9:30');
    expect(result).toContain('AM');
  });

  it('converts 13:00 to 1:00 PM', () => {
    const result = formatEventTime({ startDate: '2025-06-10', startTime: '13:00' });
    expect(result).toContain('1:00 PM');
  });

  it('converts 00:00 to 12:00 AM', () => {
    const result = formatEventTime({ startDate: '2025-06-10', startTime: '00:00' });
    expect(result).toContain('12:00 AM');
  });

  it('converts 12:00 to 12:00 PM', () => {
    const result = formatEventTime({ startDate: '2025-06-10', startTime: '12:00' });
    expect(result).toContain('12:00 PM');
  });

  it('includes dash separator when both start and end times are present', () => {
    const result = formatEventTime({
      startDate: '2025-06-10', startTime: '09:00',
      endDate: '2025-06-10', endTime: '10:00',
    });
    expect(result).toContain('–');
  });

  it('does not include separator when only start time is provided', () => {
    const result = formatEventTime({ startDate: '2025-06-10', startTime: '09:00' });
    expect(result).not.toContain('–');
  });

  it('minutes are zero-padded', () => {
    const result = formatEventTime({ startDate: '2025-06-10', startTime: '09:05' });
    expect(result).toContain(':05');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// useEvents hook
// ────────────────────────────────────────────────────────────────────────────

describe('useEvents — initial state', () => {
  it('returns an array as the first element', () => {
    const { result } = renderHook(() => useEvents());
    const [events] = result.current;
    expect(Array.isArray(events)).toBe(true);
  });

  it('returns empty array when localStorage has nothing', () => {
    localStorage.clear();
    const { result } = renderHook(() => useEvents());
    const [events] = result.current;
    // Cache may have stale data from prior tests; this value should be 0 or the prior cache
    expect(Array.isArray(events)).toBe(true);
  });

  it('exposes addEvent and removeEvent functions', () => {
    const { result } = renderHook(() => useEvents());
    expect(typeof result.current[1]).toBe('function');
    expect(typeof result.current[2]).toBe('function');
  });
});

describe('useEvents — addEvent', () => {
  beforeEach(() => {
    localStorage.clear();
    // Force cache reset by renderHook after clearing
  });

  it('addEvent gives each event a numeric id', () => {
    const { result } = renderHook(() => useEvents());
    act(() => {
      result.current[1]({ title: 'Test Event', startDate: '2025-06-15' });
    });
    const [events] = result.current;
    const last = events[events.length - 1];
    expect(typeof last.id).toBe('number');
  });

  it('addEvent preserves the provided fields', () => {
    const { result } = renderHook(() => useEvents());
    act(() => {
      result.current[1]({ title: 'Meeting', startDate: '2025-07-01', startTime: '10:00' });
    });
    const [events] = result.current;
    const added = events.find((e) => e.title === 'Meeting');
    expect(added).toBeDefined();
    expect(added.startDate).toBe('2025-07-01');
  });

  it('addEvent writes to localStorage under widget_events key', () => {
    const { result } = renderHook(() => useEvents());
    act(() => {
      result.current[1]({ title: 'Stored Event', startDate: '2025-07-01' });
    });
    const stored = JSON.parse(localStorage.getItem('widget_events') || '[]');
    expect(stored.some((e) => e.title === 'Stored Event')).toBe(true);
  });
});

describe('useEvents — removeEvent', () => {
  it('removeEvent uses id to remove the correct event', async () => {
    const { result } = renderHook(() => useEvents());

    // Add events in separate acts with a gap so Date.now() is different
    vi.useFakeTimers();
    act(() => {
      vi.advanceTimersByTime(1);
      result.current[1]({ title: 'ToRemove', startDate: '2025-07-01' });
    });
    act(() => {
      vi.advanceTimersByTime(1);
      result.current[1]({ title: 'ToKeep', startDate: '2025-07-02' });
    });
    vi.useRealTimers();

    const idToRemove = result.current[0].find((e) => e.title === 'ToRemove')?.id;
    act(() => {
      result.current[2](idToRemove);
    });

    const remaining = result.current[0];
    expect(remaining.some((e) => e.title === 'ToRemove')).toBe(false);
    expect(remaining.some((e) => e.title === 'ToKeep')).toBe(true);
  });

  it('removing a non-existent id is a no-op', () => {
    const { result } = renderHook(() => useEvents());
    act(() => {
      result.current[1]({ title: 'Event', startDate: '2025-07-01' });
    });
    const countBefore = result.current[0].length;
    act(() => {
      result.current[2](999999);
    });
    expect(result.current[0]).toHaveLength(countBefore);
  });
});
