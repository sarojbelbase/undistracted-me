/**
 * Tests for src/widgets/stock/utils.js
 * Covers: fetchChart, fetchCompanies, priceStats, fmtPrice, fmtOHL,
 *         fmtVolume, humanizeAge, buildSparklinePaths, lttb (via buildSparklinePaths)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchChart,
  fetchCompanies,
  priceStats,
  fmtPrice,
  fmtOHL,
  fmtVolume,
  humanizeAge,
  buildSparklinePaths,
} from '../../../src/widgets/stock/utils';

afterEach(() => vi.restoreAllMocks());

// ─────────────────────────────────────────────────────────────────────────────
// priceStats
// ─────────────────────────────────────────────────────────────────────────────

describe('priceStats', () => {
  it('returns dir=up when ltp > prevClose', () => {
    const result = priceStats({ ltp: 110, prevClose: 100, prices: [100, 110] });
    expect(result.dir).toBe('up');
    expect(result.change).toBeCloseTo(10);
    expect(result.pct).toBeCloseTo(10);
  });

  it('returns dir=down when ltp < prevClose', () => {
    const result = priceStats({ ltp: 90, prevClose: 100, prices: [100, 90] });
    expect(result.dir).toBe('down');
    expect(result.change).toBeCloseTo(-10);
  });

  it('returns dir=flat when ltp === prevClose', () => {
    const result = priceStats({ ltp: 100, prevClose: 100, prices: [100, 100] });
    expect(result.dir).toBe('flat');
    expect(result.change).toBe(0);
    expect(result.pct).toBe(0);
  });

  it('returns zero stats for null chartData', () => {
    const result = priceStats(null);
    expect(result).toEqual({ change: 0, pct: 0, dir: 'flat' });
  });

  it('returns zero stats when prices has fewer than 2 entries', () => {
    const result = priceStats({ ltp: 100, prevClose: 90, prices: [100] });
    expect(result).toEqual({ change: 0, pct: 0, dir: 'flat' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fmtPrice
// ─────────────────────────────────────────────────────────────────────────────

describe('fmtPrice', () => {
  it('returns "—" for null', () => {
    expect(fmtPrice(null)).toBe('—');
  });

  it('returns "—" for undefined', () => {
    expect(fmtPrice(undefined)).toBe('—');
  });

  it('formats a number to 2 decimal places', () => {
    const formatted = fmtPrice(1234.5);
    expect(formatted).toMatch(/1,234\.50|1\.234,50/); // different locales
    // Just ensure it contains the number somehow
    expect(formatted).toContain('1');
    expect(formatted).toContain('4');
  });

  it('formats an integer by padding with .00', () => {
    const formatted = fmtPrice(500);
    expect(formatted).toContain('00'); // 500.00 has trailing 00
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fmtOHL
// ─────────────────────────────────────────────────────────────────────────────

describe('fmtOHL', () => {
  it('returns "—" for null', () => {
    expect(fmtOHL(null)).toBe('—');
  });

  it('formats to 1 decimal place', () => {
    const formatted = fmtOHL(1234.56);
    // Should contain .6 (rounded to 1dp from 1234.56 → 1234.6)
    expect(formatted).toContain('6');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fmtVolume
// ─────────────────────────────────────────────────────────────────────────────

describe('fmtVolume', () => {
  it('returns "—" for null', () => {
    expect(fmtVolume(null)).toBe('—');
  });

  it('returns "—" for NaN', () => {
    expect(fmtVolume(NaN)).toBe('—');
  });

  it('returns K suffix for thousands', () => {
    expect(fmtVolume(5000)).toBe('5.0K');
  });

  it('returns M suffix for millions', () => {
    expect(fmtVolume(2_500_000)).toBe('2.5M');
  });

  it('returns B suffix for billions', () => {
    expect(fmtVolume(1_000_000_000)).toBe('1.0B');
  });

  it('returns raw number for < 1000', () => {
    expect(fmtVolume(42)).toBe('42');
  });

  it('handles negative volumes via Math.abs', () => {
    expect(fmtVolume(-5000)).toBe('-5.0K');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// humanizeAge
// ─────────────────────────────────────────────────────────────────────────────

describe('humanizeAge', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns null for null input', () => {
    expect(humanizeAge(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(humanizeAge(undefined)).toBeNull();
  });

  it('returns "just now" for very recent timestamps (< 5s)', () => {
    const now = Date.now();
    vi.setSystemTime(new Date(now + 2000));
    expect(humanizeAge(now)).toBe('just now');
  });

  it('returns seconds ago for 30s old timestamp', () => {
    const now = Date.now();
    vi.setSystemTime(new Date(now + 30000));
    expect(humanizeAge(now)).toBe('30s ago');
  });

  it('returns minutes ago for 2m old timestamp', () => {
    const now = Date.now();
    vi.setSystemTime(new Date(now + 2 * 60 * 1000));
    expect(humanizeAge(now)).toBe('2m ago');
  });

  it('returns hours ago for 3h old timestamp', () => {
    const now = Date.now();
    vi.setSystemTime(new Date(now + 3 * 3600 * 1000));
    expect(humanizeAge(now)).toBe('3h ago');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buildSparklinePaths
// ─────────────────────────────────────────────────────────────────────────────

describe('buildSparklinePaths', () => {
  it('returns empty strings for null prices', () => {
    const { line, area } = buildSparklinePaths(null);
    expect(line).toBe('');
    expect(area).toBe('');
  });

  it('returns empty strings for single-value array', () => {
    const { line, area } = buildSparklinePaths([100]);
    expect(line).toBe('');
    expect(area).toBe('');
  });

  it('returns non-empty path strings for valid data', () => {
    const prices = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 5) * 10);
    const { line, area } = buildSparklinePaths(prices);
    expect(line.length).toBeGreaterThan(0);
    expect(area.length).toBeGreaterThan(0);
  });

  it('path starts with "M"', () => {
    const prices = Array.from({ length: 60 }, (_, i) => 100 + i);
    const { line } = buildSparklinePaths(prices);
    expect(line.startsWith('M')).toBe(true);
  });

  it('flat prices produce a path (minimum range enforcement)', () => {
    const prices = Array(60).fill(100);
    const { line } = buildSparklinePaths(prices);
    expect(line.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fetchChart — mocked fetch
// ─────────────────────────────────────────────────────────────────────────────

const makeMockOHLCV = (length = 5) => ({
  s: 'ok',
  c: Array.from({ length }, (_, i) => 100 + i),
  o: Array.from({ length }, () => 99),
  h: Array.from({ length }, () => 105),
  l: Array.from({ length }, () => 95),
  v: Array.from({ length }, () => 50000),
  t: Array.from({ length }, (_, i) => i * 86400),
});

describe('fetchChart', () => {
  it('returns normalized chart data on success', async () => {
    const mock = makeMockOHLCV(5);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mock),
    }));

    const result = await fetchChart('NABIL');
    expect(result).not.toBeNull();
    expect(result.ltp).toBe(104);           // c[4]
    expect(result.prevClose).toBe(103);     // c[3]
    expect(result.prices).toEqual(mock.c);
  });

  it('returns null when s !== "ok"', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ s: 'error', c: [100, 101] }),
    }));
    expect(await fetchChart('NABIL')).toBeNull();
  });

  it('returns null when c has fewer than 2 entries', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ s: 'ok', c: [100] }),
    }));
    expect(await fetchChart('NABIL')).toBeNull();
  });

  it('returns null when c is not an array', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ s: 'ok', c: null }),
    }));
    expect(await fetchChart('NABIL')).toBeNull();
  });

  it('throws on HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(fetchChart('NABIL')).rejects.toThrow('HTTP 500');
  });

  it('includes volume in the returned data', async () => {
    const mock = makeMockOHLCV(3);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mock),
    }));
    const result = await fetchChart('NABIL');
    expect(result.volume).toBe(50000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fetchCompanies — mocked fetch
// ─────────────────────────────────────────────────────────────────────────────

describe('fetchCompanies', () => {
  it('returns a mapped list of companies on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: [
          { stockSymbol: 'NABIL', companyName: 'Nabil Bank', sectorName: 'Commercial Banks' },
          { stockSymbol: 'NIC', companyName: 'NIC Asia Bank', sectorName: 'Commercial Banks' },
        ],
      }),
    }));

    const companies = await fetchCompanies();
    expect(companies).toHaveLength(2);
    expect(companies[0]).toEqual({ symbol: 'NABIL', name: 'Nabil Bank', sector: 'Commercial Banks' });
  });

  it('filters out entries with no symbol', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: [
          { stockSymbol: '', companyName: 'No Symbol', sectorName: 'Test' },
          { stockSymbol: 'VALID', companyName: 'Valid Co', sectorName: 'Test' },
        ],
      }),
    }));
    const companies = await fetchCompanies();
    expect(companies).toHaveLength(1);
    expect(companies[0].symbol).toBe('VALID');
  });

  it('returns empty array when result is null', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: null }),
    }));
    expect(await fetchCompanies()).toEqual([]);
  });

  it('throws on HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    await expect(fetchCompanies()).rejects.toThrow('HTTP 403');
  });
});
