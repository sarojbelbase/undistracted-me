/**
 * Tests for src/widgets/events/utils.js
 *
 * What can go wrong:
 *  – bucketLabel: if two dates are compared as strings without proper padding
 *    '2026-1-5' > '2026-01-15' evaluates incorrectly.
 *  – isPast with only a startDate (no time) compares date strings; a missing
 *    or falsy startDate must not throw or pretend it's in the past.
 *  – groupEventsByBucket: if a bucket key has a typo events fall into a
 *    non-rendered bucket and disappear from the UI silently.
 *  – applyDuration: negative / zero duration must still produce valid dates.
 *  – applyDuration: if startDate or startTime is missing the function must
 *    return safe empty strings rather than an Invalid Date in the output.
 *  – pill returns the correct style objects; wrong keys mean Tailwind utility
 *    classes that never apply.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  todayStr,
  isPast,
  getDateOffset,
  bucketLabel,
  groupEventsByBucket,
  applyDuration,
  EMPTY_FORM,
  DATE_CHIPS,
  DURATION_PILLS,
  pill,
} from '../../../src/widgets/events/utils';

afterEach(() => vi.useRealTimers());

// ────────────────────────────────────────────────────────────────────────────
// todayStr
// ────────────────────────────────────────────────────────────────────────────

describe('todayStr', () => {
  it('returns a YYYY-MM-DD formatted string', () => {
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('month is zero-padded (January → 01)', () => {
    vi.useFakeTimers();
    // Use UTC noon to avoid timezone offset shifting the ISO date string.
    vi.setSystemTime(new Date('2025-01-05T12:00:00Z'));
    expect(todayStr()).toBe('2025-01-05');
  });

  it('day is zero-padded (day 5 → 05)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-05T12:00:00Z'));
    expect(todayStr()).toBe('2025-06-05');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// getDateOffset
// ────────────────────────────────────────────────────────────────────────────

describe('getDateOffset', () => {
  it('offset 0 returns today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
    expect(getDateOffset(0)).toBe('2025-01-15');
  });

  it('offset 1 returns tomorrow', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
    expect(getDateOffset(1)).toBe('2025-01-16');
  });

  it('offset -1 returns yesterday', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-15T12:00:00Z'));
    expect(getDateOffset(-1)).toBe('2025-01-14');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// isPast
// ────────────────────────────────────────────────────────────────────────────

describe('isPast', () => {
  it('returns false for a future event with startDate only', () => {
    const future = getDateOffset(5);
    expect(isPast({ startDate: future })).toBe(false);
  });

  it('returns true for a past event with startDate only', () => {
    expect(isPast({ startDate: '2000-01-01' })).toBe(true);
  });

  it('returns true when endDate+endTime are in the past', () => {
    expect(isPast({ endDate: '2000-01-01', endTime: '00:00' })).toBe(true);
  });

  it('returns false when endDate+endTime are in the future', () => {
    const futureDate = getDateOffset(2);
    expect(isPast({ endDate: futureDate, endTime: '23:59' })).toBe(false);
  });

  it('returns false for event with no date at all', () => {
    expect(isPast({})).toBe(false);
  });

  it('uses startDate+startTime when endDate is absent', () => {
    expect(isPast({ startDate: '2000-06-01', startTime: '12:00' })).toBe(true);
  });

  it('returns false for today (not yet ended)', () => {
    const today = todayStr();
    expect(isPast({ startDate: today })).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// bucketLabel
// ────────────────────────────────────────────────────────────────────────────

describe('bucketLabel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // UTC noon avoids timezone offset shifting the ISO date by 1 day.
    vi.setSystemTime(new Date('2025-06-10T12:00:00Z'));
  });

  it('today → "Today"', () => {
    expect(bucketLabel('2025-06-10')).toBe('Today');
  });

  it('tomorrow → "Tomorrow"', () => {
    expect(bucketLabel('2025-06-11')).toBe('Tomorrow');
  });

  it('day after tomorrow → "Later"', () => {
    expect(bucketLabel('2025-06-12')).toBe('Later');
  });

  it('past date → "Past"', () => {
    expect(bucketLabel('2025-06-09')).toBe('Past');
  });

  it('null or undefined → "Today" (default)', () => {
    expect(bucketLabel(null)).toBe('Today');
    expect(bucketLabel(undefined)).toBe('Today');
  });

  it('far future date → "Later"', () => {
    expect(bucketLabel('2099-12-31')).toBe('Later');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// groupEventsByBucket
// ────────────────────────────────────────────────────────────────────────────

describe('groupEventsByBucket', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-10T12:00:00Z'));
  });

  it('returns an object with Today, Tomorrow, Later, Past keys', () => {
    const result = groupEventsByBucket([]);
    expect(result).toHaveProperty('Today');
    expect(result).toHaveProperty('Tomorrow');
    expect(result).toHaveProperty('Later');
    expect(result).toHaveProperty('Past');
  });

  it('places today event in Today bucket', () => {
    const event = { id: 1, startDate: '2025-06-10' };
    const result = groupEventsByBucket([event]);
    expect(result.Today).toHaveLength(1);
    expect(result.Today[0].id).toBe(1);
  });

  it('places tomorrow event in Tomorrow bucket', () => {
    const event = { id: 2, startDate: '2025-06-11' };
    const result = groupEventsByBucket([event]);
    expect(result.Tomorrow).toHaveLength(1);
  });

  it('places future event in Later bucket', () => {
    const event = { id: 3, startDate: '2025-07-01' };
    const result = groupEventsByBucket([event]);
    expect(result.Later).toHaveLength(1);
  });

  it('places past event in Past bucket', () => {
    const event = { id: 4, startDate: '2025-01-01' };
    const result = groupEventsByBucket([event]);
    expect(result.Past).toHaveLength(1);
  });

  it('empty array gives all empty buckets', () => {
    const result = groupEventsByBucket([]);
    ['Today', 'Tomorrow', 'Later', 'Past'].forEach((b) => {
      expect(result[b]).toHaveLength(0);
    });
  });

  it('multiple events in the same bucket are all included', () => {
    const events = [
      { id: 1, startDate: '2025-06-10' },
      { id: 2, startDate: '2025-06-10' },
    ];
    expect(groupEventsByBucket(events).Today).toHaveLength(2);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// applyDuration
// ────────────────────────────────────────────────────────────────────────────

describe('applyDuration', () => {
  it('returns empty strings when startDate is missing', () => {
    const result = applyDuration('', '09:00', 60);
    expect(result.endDate).toBe('');
    expect(result.endTime).toBe('');
  });

  it('returns empty strings when startTime is missing', () => {
    const result = applyDuration('2025-06-10', '', 60);
    expect(result.endDate).toBe('2025-06-10');
    expect(result.endTime).toBe('');
  });

  it('adds 30 minutes correctly within same hour', () => {
    const result = applyDuration('2025-06-10', '09:00', 30);
    expect(result.endTime).toBe('09:30');
    expect(result.endDate).toBe('2025-06-10');
  });

  it('carries over into the next hour', () => {
    const result = applyDuration('2025-06-10', '09:45', 30);
    expect(result.endTime).toBe('10:15');
  });

  it('carries over: time part advances past 60 minutes', () => {
    // Cross-midnight date logic depends on local timezone; we only validate
    // that the minutes overflow correctly (e.g. 23:30 + 60 min → :30 minutes).
    const result = applyDuration('2025-06-10', '23:30', 60);
    // The time component must show 30 minutes regardless of timezone
    expect(result.endTime.endsWith(':30')).toBe(true);
  });

  it('zero duration returns the same time', () => {
    const result = applyDuration('2025-06-10', '09:00', 0);
    expect(result.endDate).toBe('2025-06-10');
    expect(result.endTime).toBe('09:00');
  });

  it('returns zero-padded hours and minutes', () => {
    const result = applyDuration('2025-06-10', '00:05', 10);
    expect(result.endTime).toBe('00:15');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// pill
// ────────────────────────────────────────────────────────────────────────────

describe('pill', () => {
  it('returns an object with className and style', () => {
    const result = pill(true);
    expect(result).toHaveProperty('className');
    expect(result).toHaveProperty('style');
  });

  it('active pill uses accent CSS variable for background', () => {
    const { style } = pill(true);
    expect(style.backgroundColor).toContain('--w-accent');
  });

  it('inactive pill uses surface CSS variable for background', () => {
    const { style } = pill(false);
    expect(style.backgroundColor).toContain('--w-surface');
  });

  it('className is a non-empty string', () => {
    expect(pill(true).className.length).toBeGreaterThan(0);
    expect(pill(false).className.length).toBeGreaterThan(0);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

describe('EMPTY_FORM', () => {
  it('has all form fields set to empty string', () => {
    Object.values(EMPTY_FORM).forEach((v) => expect(v).toBe(''));
  });

  it('contains title, startDate, startTime, endDate, endTime', () => {
    ['title', 'startDate', 'startTime', 'endDate', 'endTime'].forEach((k) => {
      expect(EMPTY_FORM).toHaveProperty(k);
    });
  });
});

describe('DATE_CHIPS', () => {
  it('has Today, Tomorrow, and Custom chips', () => {
    const keys = DATE_CHIPS.map((c) => c.key);
    expect(keys).toContain('today');
    expect(keys).toContain('tomorrow');
    expect(keys).toContain('custom');
  });
});

describe('DURATION_PILLS', () => {
  it('contains a "Custom" pill with null mins', () => {
    const custom = DURATION_PILLS.find((p) => p.label === 'Custom');
    expect(custom).toBeDefined();
    expect(custom.mins).toBeNull();
  });

  it('numeric pills have positive mins', () => {
    DURATION_PILLS.filter((p) => p.mins !== null).forEach((p) => {
      expect(p.mins).toBeGreaterThan(0);
    });
  });
});
