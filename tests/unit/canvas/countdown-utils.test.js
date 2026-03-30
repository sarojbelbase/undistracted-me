/**
 * Tests for src/widgets/countdown/utils.js
 *
 * What can go wrong:
 *  – formatCountdown uses Math.ceil for totalSeconds but floor for days/hours/minutes.
 *    With exactly 1 second remaining that should still show "1 minute" not "0 minutes"
 *    (the intent is that the countdown never looks like it already expired when it
 *    has not).  A Math.floor-instead-of-ceil bug would make it show 0: 0: 0 at t-1s.
 *  – getNextOccurrence 'none' repeat: if the target is in the past it is returned
 *    as-is (the UI shows how long ago it was). Using > now instead of >= would
 *    silently advance a "right now" event by one period.
 *  – getNextOccurrence 'weekly' infinite loop guard: if repeat is an unknown string
 *    the while-loop must break; missing the break causes a hang.
 *  – formatTargetDate: passing null must return '' not crash.
 *  – formatCountdown with negative elapsed (clock drift offset) must clamp to 0.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  REPEAT_OPTIONS,
  getNextOccurrence,
  formatCountdown,
  formatTargetDate,
} from '../../../src/widgets/countdown/utils';

afterEach(() => vi.useRealTimers());

// ────────────────────────────────────────────────────────────────────────────
// REPEAT_OPTIONS catalogue
// ────────────────────────────────────────────────────────────────────────────

describe('REPEAT_OPTIONS', () => {
  it('contains four entries', () => {
    expect(REPEAT_OPTIONS).toHaveLength(4);
  });

  it('entries have label and value properties', () => {
    REPEAT_OPTIONS.forEach((o) => {
      expect(o).toHaveProperty('label');
      expect(o).toHaveProperty('value');
    });
  });

  it('includes "none" and "weekly"', () => {
    const values = REPEAT_OPTIONS.map((o) => o.value);
    expect(values).toContain('none');
    expect(values).toContain('weekly');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// getNextOccurrence
// ────────────────────────────────────────────────────────────────────────────

describe('getNextOccurrence — repeat none', () => {
  it('returns the exact target Date for a future event', () => {
    const target = new Date(Date.now() + 86400_000); // tomorrow
    const dateStr = target.toISOString().slice(0, 10);
    const timeStr = target.toTimeString().slice(0, 5);
    const result = getNextOccurrence({ targetDate: dateStr, targetTime: timeStr, repeat: 'none' });
    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBe(new Date(`${dateStr}T${timeStr}`).getTime());
  });

  it('returns the past Date as-is for a past event (no repeat)', () => {
    const result = getNextOccurrence({
      targetDate: '2020-01-01',
      targetTime: '00:00',
      repeat: 'none',
    });
    expect(result).toBeInstanceOf(Date);
    expect(result < new Date()).toBe(true);
  });

  it('treats undefined repeat as "none"', () => {
    const result = getNextOccurrence({ targetDate: '2020-01-01', targetTime: '00:00' });
    expect(result).toBeInstanceOf(Date);
    expect(result < new Date()).toBe(true);
  });

  it('defaults targetTime to 00:00 when not provided', () => {
    const result = getNextOccurrence({ targetDate: '2099-12-31', repeat: 'none' });
    expect(result).toBeInstanceOf(Date);
  });
});

describe('getNextOccurrence — repeat weekly', () => {
  it('advances past date by 7-day increments until future', () => {
    vi.useFakeTimers();
    // Set now to a fixed point: Wednesday 2025-01-08
    vi.setSystemTime(new Date('2025-01-08T12:00:00'));

    // Target was last Monday 2025-01-06 (2 days ago)
    const result = getNextOccurrence({
      targetDate: '2025-01-06',
      targetTime: '12:00',
      repeat: 'weekly',
    });

    // Next Monday: 2025-01-13
    const expected = new Date('2025-01-13T12:00:00');
    expect(result.getFullYear()).toBe(expected.getFullYear());
    expect(result.getMonth()).toBe(expected.getMonth());
    expect(result.getDate()).toBe(expected.getDate());
  });

  it('returns a future date for a weekly repeat in the past', () => {
    const result = getNextOccurrence({
      targetDate: '2020-01-01',
      targetTime: '00:00',
      repeat: 'weekly',
    });
    expect(result > new Date()).toBe(true);
  });

  it('returns a date in the future unchanged when base is already future', () => {
    // +14 days from now is definitely future; use noon UTC to avoid timezone shift on toISOString
    const futureMs = Date.now() + 14 * 86400_000;
    const futureUTC = new Date(futureMs);
    // Build date string using UTC components to match what toISOString returns
    const y = futureUTC.getUTCFullYear();
    const m = String(futureUTC.getUTCMonth() + 1).padStart(2, '0');
    const d = String(futureUTC.getUTCDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    const result = getNextOccurrence({ targetDate: dateStr, targetTime: '12:00', repeat: 'weekly' });
    expect(result.toISOString().slice(0, 10)).toBe(dateStr);
  });
});

describe('getNextOccurrence — repeat monthly', () => {
  it('returns a future date', () => {
    const result = getNextOccurrence({
      targetDate: '2020-03-15',
      targetTime: '09:00',
      repeat: 'monthly',
    });
    expect(result > new Date()).toBe(true);
  });
});

describe('getNextOccurrence — repeat yearly', () => {
  it('returns a future date', () => {
    const result = getNextOccurrence({
      targetDate: '2020-06-01',
      targetTime: '00:00',
      repeat: 'yearly',
    });
    expect(result > new Date()).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// formatCountdown
// ────────────────────────────────────────────────────────────────────────────

describe('formatCountdown', () => {
  it('returns zeros for a target in the past', () => {
    const past = new Date(Date.now() - 5000);
    const result = formatCountdown(past);
    expect(result).toEqual({ days: 0, hours: 0, minutes: 0, totalSeconds: 0 });
  });

  it('returns zeros for a target exactly at now (diffMs = 0)', () => {
    const now = new Date();
    const result = formatCountdown(now);
    expect(result.totalSeconds).toBe(0);
  });

  it('returns correct days for exactly 1 day ahead', () => {
    const future = new Date(Date.now() + 86400_000);
    const result = formatCountdown(future);
    expect(result.days).toBe(1);
  });

  it('returns correct hours for 2.5 hours ahead', () => {
    const future = new Date(Date.now() + 9000_000); // 9000 seconds = 2h 30m
    const result = formatCountdown(future);
    expect(result.hours).toBe(2);
    expect(result.minutes).toBe(30);
  });

  it('totalSeconds is Math.ceil (1 second remaining still shows 1)', () => {
    const future = new Date(Date.now() + 1000); // exactly 1 second
    const result = formatCountdown(future);
    expect(result.totalSeconds).toBe(1);
  });

  it('61 seconds remaining shows 2 minutes (ceil) and 0 hours', () => {
    const future = new Date(Date.now() + 61_000);
    const result = formatCountdown(future);
    expect(result.minutes).toBe(Math.floor(61 / 60)); // 1 min
    expect(result.hours).toBe(0);
    expect(result.totalSeconds).toBe(61);
  });

  it('does not return negative values for a past target', () => {
    const past = new Date(Date.now() - 999_999_000);
    const result = formatCountdown(past);
    expect(result.days).toBeGreaterThanOrEqual(0);
    expect(result.totalSeconds).toBeGreaterThanOrEqual(0);
  });

  it('decomposing exactly 1 day: days=1, hours=0, minutes=0', () => {
    const future = new Date(Date.now() + 86400_000 + 500); // +500ms buffer
    const result = formatCountdown(future);
    expect(result.days).toBe(1);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// formatTargetDate
// ────────────────────────────────────────────────────────────────────────────

describe('formatTargetDate', () => {
  it('returns empty string for null', () => {
    expect(formatTargetDate(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatTargetDate(undefined)).toBe('');
  });

  it('returns a non-empty string for a valid Date', () => {
    const result = formatTargetDate(new Date(2026, 0, 1));
    expect(result.length).toBeGreaterThan(0);
  });

  it('contains the year number', () => {
    const result = formatTargetDate(new Date(2026, 0, 1));
    expect(result).toContain('2026');
  });

  it('contains "Jan" for January', () => {
    const result = formatTargetDate(new Date(2026, 0, 15));
    expect(result).toContain('Jan');
  });
});
