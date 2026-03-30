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
import { getDayProgress, TOTAL_DOTS } from '../../../src/widgets/dayProgress/utils';

afterEach(() => vi.useRealTimers());

describe('TOTAL_DOTS', () => {
  it('equals 24 (one dot per hour)', () => {
    expect(TOTAL_DOTS).toBe(24);
  });
});

describe('getDayProgress', () => {
  const mockTime = (h, m) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 1, h, m, 0));
  };

  it('returns an object with percentage and currentHour', () => {
    mockTime(9, 0);
    const result = getDayProgress();
    expect(result).toHaveProperty('percentage');
    expect(result).toHaveProperty('currentHour');
  });

  it('midnight (0:00) returns percentage 0', () => {
    mockTime(0, 0);
    expect(getDayProgress().percentage).toBe(0);
  });

  it('currentHour at midnight is 0', () => {
    mockTime(0, 0);
    expect(getDayProgress().currentHour).toBe(0);
  });

  it('noon (12:00) returns percentage 50', () => {
    mockTime(12, 0);
    expect(getDayProgress().percentage).toBe(50);
  });

  it('23:59 returns percentage less than 100', () => {
    mockTime(23, 59);
    const { percentage } = getDayProgress();
    expect(percentage).toBeLessThan(100);
    expect(percentage).toBeGreaterThanOrEqual(99);
  });

  it('percentage never exceeds 100', () => {
    // test all whole-hour boundaries
    for (let h = 0; h < 24; h++) {
      mockTime(h, 0);
      expect(getDayProgress().percentage).toBeLessThanOrEqual(100);
    }
  });

  it('percentage is never negative', () => {
    for (let h = 0; h < 24; h++) {
      mockTime(h, 0);
      expect(getDayProgress().percentage).toBeGreaterThanOrEqual(0);
    }
  });

  it('percentage is an integer (Math.floor result)', () => {
    mockTime(9, 30);
    const { percentage } = getDayProgress();
    expect(Number.isInteger(percentage)).toBe(true);
  });

  it('currentHour matches the mocked hour', () => {
    mockTime(15, 45);
    expect(getDayProgress().currentHour).toBe(15);
  });

  it('6am returns ~25% (quarter of the day)', () => {
    mockTime(6, 0);
    expect(getDayProgress().percentage).toBe(25);
  });

  it('18:00 returns ~75%', () => {
    mockTime(18, 0);
    expect(getDayProgress().percentage).toBe(75);
  });
});
