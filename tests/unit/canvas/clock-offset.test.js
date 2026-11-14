/**
 * Tests for getUtcOffset (DST-aware UTC offset badge).
 *
 * What can go wrong:
 *  – The offset badge shows a static standard-time offset (e.g. LA always
 *    "UTC-08:00"), which is wrong during DST.
 *  – A timezone with a half/quarter-hour offset (Kathmandu +05:45) formats
 *    incorrectly.
 *  – An unknown/invalid timezone throws and crashes the picker.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { getUtcOffset } from '../../../src/widgets/clock/utils';

afterEach(() => vi.useRealTimers());

const OFFSET_RE = /^UTC[+-]\d{2}:\d{2}$/;

describe('getUtcOffset', () => {
  it('returns a UTC±HH:MM string for fixed-offset zones', () => {
    expect(getUtcOffset('Asia/Kathmandu')).toBe('UTC+05:45');
    expect(getUtcOffset('UTC')).toBe('UTC+00:00');
  });

  it('returns a well-formed offset for arbitrary zones', () => {
    expect(getUtcOffset('Asia/Tokyo')).toMatch(OFFSET_RE);
    expect(getUtcOffset('America/New_York')).toMatch(OFFSET_RE);
  });

  it('reflects DST — LA is -08:00 in January and -07:00 in July', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 15, 12, 0, 0)); // January → PST
    expect(getUtcOffset('America/Los_Angeles')).toBe('UTC-08:00');

    vi.setSystemTime(new Date(2025, 6, 15, 12, 0, 0)); // July → PDT
    expect(getUtcOffset('America/Los_Angeles')).toBe('UTC-07:00');
  });

  it('does not throw for an invalid timezone', () => {
    expect(() => getUtcOffset('Not/AZone')).not.toThrow();
  });
});
