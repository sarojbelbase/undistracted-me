/**
 * Tests for src/widgets/dayProgress/utils.js
 *
 * What can go wrong:
 *  – getDayProgress divides by 24*60. If someone changes TOTAL_DOTS to a
 *    different value without updating the denominator the percentage is wrong.
 *  – Midnight should be 0 %, not a crash or negative number.
 *  – 23:59 should be just below 100 %, not over 100 %.
 *  – Math.floor means 12:00 noon is exactly 50 % (720/1440 = 0.5 → floor(50) = 50).
 *  – TOTAL_DOTS is used as the dot-count in the rendering loop; if it is not 24
 *    the grid of dots won't match the hour markings.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
// The dayProgress widget API is getProgress(period, calendar)
// period: 'day'|'week'|'month'|'year'  calendar: 'ad'|'bs'
import { getProgress, PERIOD_TYPES, CALENDAR_TYPES, DEFAULT_PERIOD, DEFAULT_CALENDAR } from '../../../src/widgets/dayProgress/utils';

afterEach(() => vi.useRealTimers());

describe('PERIOD_TYPES / CALENDAR_TYPES constants', () => {
  it('PERIOD_TYPES has 4 entries: day, week, month, year', () => {
    expect(PERIOD_TYPES).toHaveLength(4);
    const ids = PERIOD_TYPES.map(p => p.id);
    expect(ids).toContain('day');
    expect(ids).toContain('week');
    expect(ids).toContain('month');
    expect(ids).toContain('year');
  });

  it('CALENDAR_TYPES has ad and bs', () => {
    const ids = CALENDAR_TYPES.map(c => c.id);
    expect(ids).toContain('ad');
    expect(ids).toContain('bs');
  });

  it('DEFAULT_PERIOD is "day"', () => {
    expect(DEFAULT_PERIOD).toBe('day');
  });

  it('DEFAULT_CALENDAR is "ad"', () => {
    expect(DEFAULT_CALENDAR).toBe('ad');
  });
});

describe('getProgress("day")', () => {
  const mockTime = (h, m) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 1, h, m, 0));
  };

  it('returns an object with percentage, filledDots, label, subtitle', () => {
    mockTime(9, 0);
    const result = getProgress('day');
    expect(result).toHaveProperty('percentage');
    expect(result).toHaveProperty('filledDots');
    expect(result).toHaveProperty('label');
    expect(result).toHaveProperty('subtitle');
  });

  it('midnight (0:00) returns percentage 0', () => {
    mockTime(0, 0);
    expect(getProgress('day').percentage).toBe(0);
  });

  it('filledDots at midnight is 0', () => {
    mockTime(0, 0);
    expect(getProgress('day').filledDots).toBe(0);
  });

  it('noon (12:00) returns percentage 50', () => {
    mockTime(12, 0);
    expect(getProgress('day').percentage).toBe(50);
  });

  it('noon (12:00) filledDots is 12 (half of 24)', () => {
    mockTime(12, 0);
    expect(getProgress('day').filledDots).toBe(12);
  });

  it('23:59 returns percentage less than 100', () => {
    mockTime(23, 59);
    const { percentage } = getProgress('day');
    expect(percentage).toBeLessThan(100);
    expect(percentage).toBeGreaterThanOrEqual(99);
  });

  it('percentage never exceeds 100', () => {
    for (let h = 0; h < 24; h++) {
      mockTime(h, 0);
      expect(getProgress('day').percentage).toBeLessThanOrEqual(100);
    }
  });

  it('percentage is never negative', () => {
    for (let h = 0; h < 24; h++) {
      mockTime(h, 0);
      expect(getProgress('day').percentage).toBeGreaterThanOrEqual(0);
    }
  });

  it('percentage is an integer (Math.floor result)', () => {
    mockTime(9, 30);
    const { percentage } = getProgress('day');
    expect(Number.isInteger(percentage)).toBe(true);
  });

  it('6am filledDots is 6 (quarter of 24)', () => {
    mockTime(6, 0);
    expect(getProgress('day').filledDots).toBe(6);
  });

  it('6am returns ~25% (quarter of the day)', () => {
    mockTime(6, 0);
    expect(getProgress('day').percentage).toBe(25);
  });

  it('18:00 returns ~75%', () => {
    mockTime(18, 0);
    expect(getProgress('day').percentage).toBe(75);
  });

  it('label is "Day" for the day period', () => {
    mockTime(12, 0);
    expect(getProgress('day').label).toBe('Day');
  });

  it('subtitle is null for day period', () => {
    mockTime(12, 0);
    expect(getProgress('day').subtitle).toBeNull();
  });
});

describe('getProgress("week")', () => {
  afterEach(() => vi.useRealTimers());

  it('returns label "Week"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 8, 12, 0, 0)); // Wednesday
    expect(getProgress('week').label).toBe('Week');
  });

  it('returns percentage between 0 and 100', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 8, 12, 0, 0));
    const { percentage } = getProgress('week');
    expect(percentage).toBeGreaterThanOrEqual(0);
    expect(percentage).toBeLessThanOrEqual(100);
  });

  it('filledDots is in range [0, 24]', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 8, 12, 0, 0));
    const { filledDots } = getProgress('week');
    expect(filledDots).toBeGreaterThanOrEqual(0);
    expect(filledDots).toBeLessThanOrEqual(24);
  });
});

describe('getProgress("month", "ad")', () => {
  afterEach(() => vi.useRealTimers());

  it('returns label "Month"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 5, 10, 12, 0, 0)); // June 10
    expect(getProgress('month', 'ad').label).toBe('Month');
  });

  it('subtitle contains the month name', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 5, 10, 12, 0, 0));
    const { subtitle } = getProgress('month', 'ad');
    expect(subtitle).toContain('June');
  });

  it('mid-month percentage is between 25 and 75', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 5, 15, 12, 0, 0)); // June 15
    const { percentage } = getProgress('month', 'ad');
    expect(percentage).toBeGreaterThan(25);
    expect(percentage).toBeLessThan(75);
  });
});

describe('getProgress("year", "ad")', () => {
  afterEach(() => vi.useRealTimers());

  it('returns label "Year"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 5, 10, 12, 0, 0));
    expect(getProgress('year', 'ad').label).toBe('Year');
  });

  it('subtitle contains the year', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 5, 10, 12, 0, 0));
    const { subtitle } = getProgress('year', 'ad');
    expect(subtitle).toContain('2025');
  });
});

describe('getProgress with BS calendar', () => {
  afterEach(() => vi.useRealTimers());

  it('getProgress("day","bs") returns valid percentage', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 5, 10, 12, 0, 0));
    const { percentage } = getProgress('day', 'bs');
    expect(percentage).toBeGreaterThanOrEqual(0);
    expect(percentage).toBeLessThanOrEqual(100);
  });

  it('getProgress("month","bs") returns valid percentage', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 5, 10, 12, 0, 0));
    const { percentage } = getProgress('month', 'bs');
    expect(percentage).toBeGreaterThanOrEqual(0);
    expect(percentage).toBeLessThanOrEqual(100);
  });

  it('getProgress("year","bs") returns valid percentage', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 5, 10, 12, 0, 0));
    const { percentage } = getProgress('year', 'bs');
    expect(percentage).toBeGreaterThanOrEqual(0);
    expect(percentage).toBeLessThanOrEqual(100);
  });
});

describe('getProgress — unknown period falls back to day', () => {
  afterEach(() => vi.useRealTimers());

  it('"unknown" period returns Day label', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 5, 10, 12, 0, 0));
    expect(getProgress('bogus').label).toBe('Day');
  });
});
