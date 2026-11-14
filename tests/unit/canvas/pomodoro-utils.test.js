/**
 * Tests for src/widgets/pomodoro/utils.js
 *
 * What can go wrong:
 *  – formatTime(0) must be '00:00' not '0:0' (the timer UI relies on fixed
 *    character width — variable-width would cause the display to jitter).
 *  – formatTime(3600) for exactly 60 minutes: minutes = 60, seconds = 00.
 *    Timer countdowns go through 60:00 on the way to presets above 1 hour.
 *  – The PRESETS array drives a picker; if a preset's secs is 0 or negative
 *    the timer would start in an already-expired state.
 *  – The 'Custom' preset has secs = null; code that does `preset.secs * 1000`
 *    must handle null separately — formatTime(null) must not NaN-crash.
 */

import { describe, it, expect } from 'vitest';
import { PRESETS, formatTime } from '../../../src/widgets/pomodoro/utils';

// ────────────────────────────────────────────────────────────────────────────
// PRESETS
// ────────────────────────────────────────────────────────────────────────────

describe('PRESETS', () => {
  it('has exactly 4 entries', () => {
    expect(PRESETS).toHaveLength(4);
  });

  it('every preset has a label and secs property', () => {
    PRESETS.forEach((p) => {
      expect(p).toHaveProperty('label');
      expect(p).toHaveProperty('secs');
    });
  });

  it('contains a "Custom" preset with secs=null', () => {
    const custom = PRESETS.find((p) => p.label === 'Custom');
    expect(custom).toBeDefined();
    expect(custom.secs).toBeNull();
  });

  it('non-Custom presets have positive secs values', () => {
    PRESETS.filter((p) => p.secs !== null).forEach((p) => {
      expect(p.secs).toBeGreaterThan(0);
    });
  });

  it('includes a 25-minute preset (the classic Pomodoro)', () => {
    const twentyFive = PRESETS.find((p) => p.secs === 25 * 60);
    expect(twentyFive).toBeDefined();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// formatTime
// ────────────────────────────────────────────────────────────────────────────

describe('formatTime', () => {
  it('formats 0 seconds as "00:00"', () => {
    expect(formatTime(0)).toBe('00:00');
  });

  it('formats 60 seconds as "01:00"', () => {
    expect(formatTime(60)).toBe('01:00');
  });

  it('formats 90 seconds as "01:30"', () => {
    expect(formatTime(90)).toBe('01:30');
  });

  it('formats 3600 seconds as "60:00"', () => {
    expect(formatTime(3600)).toBe('60:00');
  });

  it('formats 25 * 60 seconds as "25:00"', () => {
    expect(formatTime(25 * 60)).toBe('25:00');
  });

  it('seconds portion is always 2 digits (zero-padded)', () => {
    // 61 seconds → 01:01, not 1:1
    expect(formatTime(61)).toBe('01:01');
  });

  it('minutes portion is always 2 digits for values < 10 min', () => {
    // 5 minutes → 05:00
    expect(formatTime(5 * 60)).toBe('05:00');
  });

  it('returns a string in MM:SS format', () => {
    expect(formatTime(3661)).toMatch(/^\d{2}:\d{2}$/);
  });

  it('formats exactly 1 second as "00:01"', () => {
    expect(formatTime(1)).toBe('00:01');
  });

  it('formats 59 seconds as "00:59"', () => {
    expect(formatTime(59)).toBe('00:59');
  });
});
