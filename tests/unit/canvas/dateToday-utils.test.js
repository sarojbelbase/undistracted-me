/**
 * Tests for src/widgets/dateToday/utils.js
 *
 * What can go wrong:
 *  – getDateParts for English (default) returns incorrect weekday index because
 *    `dayjs().day()` is 0-based Sunday but the array is also 0-based Sunday —
 *    an off-by-one error would shift every day name by one.
 *  – Nepali mode calls convertEnglishToNepali; if the Nepali month index is
 *    off-by-one when looking up NEPALI_MONTH_NAMES the month label is wrong.
 *  – The day is zero-padded to 2 digits ("05" not "5") — the widget uses a
 *    fixed-width numeric display; a missing pad would cause a layout shift.
 *  – EN_MONTHS and EN_WEEKDAYS must have exactly 12 and 7 entries respectively.
 *  – For English date, year must be a string representation of the 4-digit year.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  EN_WEEKDAYS,
  EN_MONTHS,
  getDateParts,
} from '../../../src/widgets/dateToday/utils';

afterEach(() => vi.useRealTimers());

const mockDate = (isoString) => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(isoString));
};

// ────────────────────────────────────────────────────────────────────────────
// Static arrays
// ────────────────────────────────────────────────────────────────────────────

describe('EN_WEEKDAYS', () => {
  it('has exactly 7 entries', () => {
    expect(EN_WEEKDAYS).toHaveLength(7);
  });

  it('starts with Sunday', () => {
    expect(EN_WEEKDAYS[0]).toBe('Sunday');
  });

  it('ends with Saturday', () => {
    expect(EN_WEEKDAYS[6]).toBe('Saturday');
  });
});

describe('EN_MONTHS', () => {
  it('has exactly 12 entries', () => {
    expect(EN_MONTHS).toHaveLength(12);
  });

  it('starts with January', () => {
    expect(EN_MONTHS[0]).toBe('January');
  });

  it('ends with December', () => {
    expect(EN_MONTHS[11]).toBe('December');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// getDateParts — English
// ────────────────────────────────────────────────────────────────────────────

describe('getDateParts — English', () => {
  it('returns an object with weekday, month, day, year', () => {
    mockDate('2025-06-10T12:00:00Z');
    const result = getDateParts('en');
    expect(result).toHaveProperty('weekday');
    expect(result).toHaveProperty('month');
    expect(result).toHaveProperty('day');
    expect(result).toHaveProperty('year');
  });

  it('returns the correct month name for June', () => {
    mockDate('2025-06-15T12:00:00Z');
    const { month } = getDateParts('en');
    expect(month).toBe('June');
  });

  it('returns the correct month name for January', () => {
    mockDate('2025-01-15T12:00:00Z');
    const { month } = getDateParts('en');
    expect(month).toBe('January');
  });

  it('returns the correct 4-digit year as string', () => {
    mockDate('2025-06-15T12:00:00Z');
    const { year } = getDateParts('en');
    expect(year).toBe('2025');
  });

  it('day is zero-padded to 2 digits', () => {
    mockDate('2025-06-05T12:00:00Z');
    const { day } = getDateParts('en');
    expect(day).toBe('05');
  });

  it('day is not padded when already 2 digits', () => {
    mockDate('2025-06-15T12:00:00Z');
    const { day } = getDateParts('en');
    expect(day).toBe('15');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// getDateParts — Nepali
// ────────────────────────────────────────────────────────────────────────────

describe('getDateParts — Nepali', () => {
  it('returns an object with weekday, month, day, year', () => {
    mockDate('2025-06-15T12:00:00Z');
    const result = getDateParts('ne');
    expect(result).toHaveProperty('weekday');
    expect(result).toHaveProperty('month');
    expect(result).toHaveProperty('day');
    expect(result).toHaveProperty('year');
  });

  it('returns the English weekday name (not converted to Nepali)', () => {
    // The component itself renders the weekday — it's always English
    mockDate('2025-06-15T12:00:00Z'); // Sunday
    const { weekday } = getDateParts('ne');
    expect(EN_WEEKDAYS).toContain(weekday);
  });

  it('returns a Nepali month name (not an English month name)', () => {
    mockDate('2025-06-15T12:00:00Z');
    const { month } = getDateParts('ne');
    // Nepali month names are NOT in EN_MONTHS
    expect(EN_MONTHS).not.toContain(month);
  });

  it('returns a year in Bikram Sambat era (> 2080)', () => {
    // 2025 AD = ~2082 BS
    mockDate('2025-06-15T12:00:00Z');
    const { year } = getDateParts('ne');
    expect(parseInt(year)).toBeGreaterThan(2080);
  });

  it('day is a numeric string', () => {
    mockDate('2025-06-15T12:00:00Z');
    const { day } = getDateParts('ne');
    expect(isNaN(parseInt(day))).toBe(false);
  });
});
