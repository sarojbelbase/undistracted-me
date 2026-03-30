/**
 * Tests for src/widgets/calendar/utils.js
 *
 * What can go wrong:
 *  – buildCalendarData('ad') must insert the correct offset blanks at the start
 *    of the month. If January's first day falls on Wednesday (index 3) but only
 *    2 blanks are inserted, all dates shift left by 1 and every event date
 *    correlation breaks.
 *  – buildCalendarData('bs') relies on convertEnglishToNepali; if the Nepali
 *    day-index into the month is wrong the calendar highlights the wrong day.
 *  – buildEventDateSet must return a Set (not Array) so the .has() call in the
 *    calendar widget is O(1), and events without startDate must not corrupt it.
 *  – AD mode: February in a leap year has 29 days; non-leap February has 28.
 *  – Every day entry must have a date (number or null) and an isCurrent boolean.
 *  – The total number of day entries = offset_blanks + days_in_month, so the
 *    grid fills exactly the right number of cells.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildCalendarData, buildEventDateSet, WEEK_DAYS, AD_MONTH_NAMES } from '../../../src/widgets/calendar/utils';

afterEach(() => vi.useRealTimers());

// Utility: get what the first weekday index of a year/month is (JS Date, 0=Sun)
const firstWeekdayOf = (year, month1based) =>
  new Date(year, month1based - 1, 1).getDay();

// ────────────────────────────────────────────────────────────────────────────
// Static constants
// ────────────────────────────────────────────────────────────────────────────

describe('WEEK_DAYS', () => {
  it('has 7 entries', () => {
    expect(WEEK_DAYS).toHaveLength(7);
  });

  it('starts with "Su" (Sunday)', () => {
    expect(WEEK_DAYS[0]).toBe('Su');
  });

  it('ends with "Sa" (Saturday)', () => {
    expect(WEEK_DAYS[6]).toBe('Sa');
  });
});

describe('AD_MONTH_NAMES', () => {
  it('has 12 entries', () => {
    expect(AD_MONTH_NAMES).toHaveLength(12);
  });

  it('starts with "January"', () => {
    expect(AD_MONTH_NAMES[0]).toBe('January');
  });

  it('ends with "December"', () => {
    expect(AD_MONTH_NAMES[11]).toBe('December');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// buildCalendarData('ad') — Gregorian calendar
// ────────────────────────────────────────────────────────────────────────────

describe('buildCalendarData("ad")', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
  });

  it('returns an object with label, sublabel, days, year, month', () => {
    const result = buildCalendarData('ad');
    expect(result).toHaveProperty('label');
    expect(result).toHaveProperty('sublabel');
    expect(result).toHaveProperty('days');
    expect(result).toHaveProperty('year');
    expect(result).toHaveProperty('month');
  });

  it('label is the month name for June', () => {
    const { label } = buildCalendarData('ad');
    expect(label).toBe('June');
  });

  it('sublabel is the year as string', () => {
    const { sublabel } = buildCalendarData('ad');
    expect(sublabel).toBe('2025');
  });

  it('every day entry has date and isCurrent properties', () => {
    const { days } = buildCalendarData('ad');
    days.forEach((d) => {
      expect(d).toHaveProperty('date');
      expect(d).toHaveProperty('isCurrent');
    });
  });

  it('blank pad entries have date=null and isCurrent=false', () => {
    const { days } = buildCalendarData('ad');
    const blanks = days.filter((d) => d.date === null);
    blanks.forEach((b) => {
      expect(b.isCurrent).toBe(false);
    });
  });

  it('exactly one day entry has isCurrent=true (today)', () => {
    const { days } = buildCalendarData('ad');
    const todayEntries = days.filter((d) => d.isCurrent);
    expect(todayEntries).toHaveLength(1);
    expect(todayEntries[0].date).toBe(15); // June 15
  });

  it('number of numbered days = days in June (30)', () => {
    const { days } = buildCalendarData('ad');
    const numbered = days.filter((d) => d.date !== null);
    expect(numbered).toHaveLength(30);
  });

  it('blank prefix count matches first weekday of June 2025', () => {
    const { days } = buildCalendarData('ad');
    const blanks = days.filter((d) => d.date === null).length;
    // June 1 2025 is a Sunday → offset = 0
    expect(blanks).toBe(firstWeekdayOf(2025, 6));
  });
});

describe('buildCalendarData("ad") — February leap year', () => {
  it('February 2024 (leap) has 29 day entries', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-02-15T12:00:00Z'));
    const { days } = buildCalendarData('ad');
    expect(days.filter((d) => d.date !== null)).toHaveLength(29);
  });

  it('February 2025 (non-leap) has 28 day entries', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-02-15T12:00:00Z'));
    const { days } = buildCalendarData('ad');
    expect(days.filter((d) => d.date !== null)).toHaveLength(28);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// buildCalendarData('bs') — Bikram Sambat calendar
// ────────────────────────────────────────────────────────────────────────────

describe('buildCalendarData("bs")', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
  });

  it('returns an object with label, sublabel, days, year, month', () => {
    const result = buildCalendarData('bs');
    expect(result).toHaveProperty('label');
    expect(result).toHaveProperty('sublabel');
    expect(result).toHaveProperty('days');
  });

  it('sublabel is a 4-digit Nepali year string', () => {
    const { sublabel } = buildCalendarData('bs');
    expect(sublabel).toMatch(/^\d{4}$/);
    expect(parseInt(sublabel)).toBeGreaterThan(2080); // BS year > 2080 in 2025 AD
  });

  it('exactly one day entry is current', () => {
    const { days } = buildCalendarData('bs');
    expect(days.filter((d) => d.isCurrent)).toHaveLength(1);
  });

  it('every numbered entry has an adDate property (for event correlation)', () => {
    const { days } = buildCalendarData('bs');
    days.filter((d) => d.date !== null).forEach((d) => {
      expect(d).toHaveProperty('adDate');
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// buildEventDateSet
// ────────────────────────────────────────────────────────────────────────────

describe('buildEventDateSet', () => {
  it('returns a Set', () => {
    expect(buildEventDateSet([])).toBeInstanceOf(Set);
  });

  it('empty input gives empty Set', () => {
    expect(buildEventDateSet([]).size).toBe(0);
  });

  it('includes startDate strings from events', () => {
    const events = [{ startDate: '2025-06-15' }, { startDate: '2025-06-20' }];
    const set = buildEventDateSet(events);
    expect(set.has('2025-06-15')).toBe(true);
    expect(set.has('2025-06-20')).toBe(true);
  });

  it('does not include events with no startDate', () => {
    const events = [{ title: 'No date event' }];
    const set = buildEventDateSet(events);
    expect(set.has(undefined)).toBe(false);
    expect(set.size).toBe(0);
  });

  it('deduplicates repeated startDate values', () => {
    const events = [
      { startDate: '2025-06-15' },
      { startDate: '2025-06-15' },
    ];
    expect(buildEventDateSet(events).size).toBe(1);
  });
});
