/**
 * Tests for the curated international holidays list (scripts/international-holidays.mjs).
 *
 * What can go wrong:
 *  – A fixed-date entry doesn't expand into every requested year.
 *  – Entries aren't tagged `kind: 'international'` (so the calendar can't
 *    distinguish them from Nepali holidays).
 *  – Output isn't date-sorted (breaks the calendar's binary-ish lookups).
 */
import { describe, it, expect } from 'vitest';
import {
  buildInternationalHolidays,
  INTERNATIONAL_HOLIDAY_COUNT,
} from '../../../scripts/international-holidays.mjs';

describe('buildInternationalHolidays', () => {
  it('expands every fixed holiday into each requested year', () => {
    const holidays = buildInternationalHolidays([2026, 2027]);
    expect(holidays.length).toBe(INTERNATIONAL_HOLIDAY_COUNT * 2);

    const christmas = holidays.filter((h) => h.name === 'Christmas Day');
    expect(christmas.map((h) => h.date)).toEqual(['2026-12-25', '2027-12-25']);
  });

  it('tags all entries as international and sorts by date', () => {
    const holidays = buildInternationalHolidays([2026]);
    expect(holidays.length).toBe(INTERNATIONAL_HOLIDAY_COUNT);
    for (const h of holidays) expect(h.kind).toBe('international');

    const dates = holidays.map((h) => h.date);
    expect([...dates].sort()).toEqual(dates);
  });
});
