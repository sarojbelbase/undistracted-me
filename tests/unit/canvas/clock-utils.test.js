/**
 * Tests for src/widgets/clock/utils.js
 *
 * What can go wrong:
 *  – getGreeting picks the wrong greeting bucket: a user at 6am sees "nothing
 *    good happens after midnight" because the reverse-scan guard is wrong.
 *  – 12h format: hour 0 must become 12 AM, not 00 AM (the modulo edge case).
 *  – 12h format: hour 12 must become 12 PM, not 00 PM.
 *  – 24h format: period must be null (not undefined) — the UI renders
 *    `{period && <span>}` and undefined behaves differently to null.
 *  – Minutes must always be two digits (06 not 6) — a display regression.
 *  – getTimeInZone with an unknown timezone must not crash the app.
 *  – TZ_OPTIONS must include Kathmandu (the app's home timezone).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  TZ_OPTIONS,
  GREETINGS,
  getGreeting,
  getTimeParts,
  getTimeInZone,
} from '../../../src/widgets/clock/utils';

afterEach(() => vi.useRealTimers());

// ────────────────────────────────────────────────────────────────────────────
// TZ_OPTIONS
// ────────────────────────────────────────────────────────────────────────────

describe('TZ_OPTIONS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(TZ_OPTIONS)).toBe(true);
    expect(TZ_OPTIONS.length).toBeGreaterThan(0);
  });

  it('every entry has tz and label string properties', () => {
    TZ_OPTIONS.forEach((o) => {
      expect(typeof o.tz).toBe('string');
      expect(typeof o.label).toBe('string');
    });
  });

  it('contains Kathmandu timezone', () => {
    expect(TZ_OPTIONS.some((o) => o.tz === 'Asia/Kathmandu')).toBe(true);
  });

  it('no duplicate tz values', () => {
    const tzs = TZ_OPTIONS.map((o) => o.tz);
    expect(new Set(tzs).size).toBe(tzs.length);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// GREETINGS catalogue
// ────────────────────────────────────────────────────────────────────────────

describe('GREETINGS catalogue', () => {
  it('first greeting starts at hour 0', () => {
    expect(GREETINGS[0].from).toBe(0);
  });

  it('all from values are in 0–23 range', () => {
    GREETINGS.forEach((g) => {
      expect(g.from).toBeGreaterThanOrEqual(0);
      expect(g.from).toBeLessThan(24);
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// getGreeting
// ────────────────────────────────────────────────────────────────────────────

describe('getGreeting', () => {
  it('returns a greeting object with prefix and label', () => {
    const g = getGreeting(9);
    expect(g).toHaveProperty('prefix');
    expect(g).toHaveProperty('label');
  });

  it('hour 0 → midnight greeting (nothing good happens after midnight)', () => {
    const g = getGreeting(0);
    expect(g.prefix).toMatch(/nothing good/i);
  });

  it('hour 5 → early morning greeting', () => {
    const g = getGreeting(5);
    expect(g.prefix).toMatch(/early bird/i);
  });

  it('hour 12 → midday greeting', () => {
    const g = getGreeting(12);
    expect(g.label).toMatch(/afternoon/i);
  });

  it('hour 23 → late night greeting', () => {
    const g = getGreeting(23);
    expect(g.prefix).toMatch(/get some/i);
  });

  it('returns a greeting for every hour 0–23 without throwing', () => {
    expect(() => {
      for (let h = 0; h < 24; h++) getGreeting(h);
    }).not.toThrow();
  });

  it('does not return undefined for any valid hour', () => {
    for (let h = 0; h < 24; h++) {
      expect(getGreeting(h)).toBeDefined();
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// getTimeParts — 24h format
// ────────────────────────────────────────────────────────────────────────────

describe('getTimeParts — 24h format', () => {
  const mockTime = (h, m) => {
    vi.useFakeTimers();
    const d = new Date(2025, 0, 1, h, m, 0);
    vi.setSystemTime(d);
  };

  it('returns an object with time, period, greeting', () => {
    mockTime(9, 30);
    const parts = getTimeParts('24h');
    expect(parts).toHaveProperty('time');
    expect(parts).toHaveProperty('period');
    expect(parts).toHaveProperty('greeting');
  });

  it('period is null in 24h mode', () => {
    mockTime(14, 0);
    const { period } = getTimeParts('24h');
    expect(period).toBeNull();
  });

  it('formats time as HH:MM (zero-padded hours)', () => {
    mockTime(9, 5);
    const { time } = getTimeParts('24h');
    expect(time).toBe('09:05');
  });

  it('formats midnight as 00:00', () => {
    mockTime(0, 0);
    const { time } = getTimeParts('24h');
    expect(time).toBe('00:00');
  });

  it('formats 23:59 correctly', () => {
    mockTime(23, 59);
    const { time } = getTimeParts('24h');
    expect(time).toBe('23:59');
  });

  it('minutes are always 2 digits (zero-padded)', () => {
    mockTime(10, 6);
    const { time } = getTimeParts('24h');
    expect(time).toBe('10:06');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// getTimeParts — 12h format
// ────────────────────────────────────────────────────────────────────────────

describe('getTimeParts — 12h format', () => {
  const mockTime = (h, m) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 1, h, m, 0));
  };

  it('returns AM for hours before noon', () => {
    mockTime(9, 0);
    const { period } = getTimeParts('12h');
    expect(period).toBe('AM');
  });

  it('returns PM for hours at noon and after', () => {
    mockTime(12, 0);
    const { period } = getTimeParts('12h');
    expect(period).toBe('PM');
  });

  it('returns PM for 13:00 (1 PM)', () => {
    mockTime(13, 0);
    const { period } = getTimeParts('12h');
    expect(period).toBe('PM');
  });

  it('hour 0 renders as 12:xx AM (not 00:xx AM)', () => {
    mockTime(0, 30);
    const { time, period } = getTimeParts('12h');
    expect(time.startsWith('12:')).toBe(true);
    expect(period).toBe('AM');
  });

  it('hour 12 renders as 12:xx PM (not 00:xx PM)', () => {
    mockTime(12, 15);
    const { time, period } = getTimeParts('12h');
    expect(time.startsWith('12:')).toBe(true);
    expect(period).toBe('PM');
  });

  it('hour 13 renders as 01:xx (zero-padded in 12h)', () => {
    mockTime(13, 0);
    const { time } = getTimeParts('12h');
    expect(time.startsWith('01:')).toBe(true);
  });

  it('period is not null in 12h mode', () => {
    mockTime(9, 0);
    const { period } = getTimeParts('12h');
    expect(period).not.toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// getTimeInZone
// ────────────────────────────────────────────────────────────────────────────

describe('getTimeInZone', () => {
  it('returns time, period, and label for a known timezone', () => {
    const result = getTimeInZone('Asia/Kathmandu', '24h');
    expect(result).toHaveProperty('time');
    expect(result).toHaveProperty('period');
    expect(result).toHaveProperty('label');
  });

  it('label is the friendly name from TZ_OPTIONS for known tz', () => {
    const result = getTimeInZone('Asia/Kathmandu', '24h');
    const option = TZ_OPTIONS.find((o) => o.tz === 'Asia/Kathmandu');
    expect(result.label).toBe(option.label);
  });

  it('falls back to the raw IANA string as label for a valid tz not in TZ_OPTIONS', () => {
    // America/Noronha is a real IANA timezone that is not in TZ_OPTIONS
    const result = getTimeInZone('America/Noronha', '24h');
    expect(result.label).toBe('America/Noronha');
  });

  it('does not throw for any timezone in TZ_OPTIONS list', () => {
    expect(() => {
      TZ_OPTIONS.forEach((o) => getTimeInZone(o.tz, '24h'));
    }).not.toThrow();
  });

  it('period is null in 24h mode', () => {
    const result = getTimeInZone('Asia/Kathmandu', '24h');
    expect(result.period).toBeNull();
  });

  it('period is AM or PM in 12h mode', () => {
    const result = getTimeInZone('Asia/Kathmandu', '12h');
    expect(['AM', 'PM']).toContain(result.period);
  });
});
