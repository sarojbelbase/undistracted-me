/**
 * Tests for international-stock helpers in app/widgets/stock/utils.js:
 * isIntlSymbol, intlTicker, displaySymbol, searchInternational,
 * fetchIntlChart, and fetchChart routing.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  INTL_PREFIX,
  isIntlSymbol,
  intlTicker,
  displaySymbol,
  searchInternational,
  fetchIntlChart,
  fetchChart,
} from '../../../app/widgets/stock/utils';

afterEach(() => vi.restoreAllMocks());

describe('INTL_PREFIX', () => {
  it('is "INTL:"', () => expect(INTL_PREFIX).toBe('INTL:'));
});

describe('isIntlSymbol', () => {
  it('true for INTL:-prefixed symbols', () => {
    expect(isIntlSymbol('INTL:AAPL')).toBe(true);
    expect(isIntlSymbol('INTL:BRK-B')).toBe(true);
    expect(isIntlSymbol('INTL:VOW3.DE')).toBe(true);
  });

  it('false for bare NEPSE symbols', () => {
    expect(isIntlSymbol('NABIL')).toBe(false);
    expect(isIntlSymbol('NEPSE')).toBe(false);
  });

  it('false for non-string values', () => {
    expect(isIntlSymbol(undefined)).toBe(false);
    expect(isIntlSymbol(null)).toBe(false);
    expect(isIntlSymbol(123)).toBe(false);
  });
});

describe('intlTicker', () => {
  it('strips the prefix', () => expect(intlTicker('INTL:AAPL')).toBe('AAPL'));
  it('passes bare symbols through', () => expect(intlTicker('NABIL')).toBe('NABIL'));
});

describe('displaySymbol', () => {
  it('strips INTL: for display', () => expect(displaySymbol('INTL:AAPL')).toBe('AAPL'));
  it('leaves NEPSE symbols alone', () => expect(displaySymbol('NABIL')).toBe('NABIL'));
  it('handles hyphenated tickers', () => expect(displaySymbol('INTL:BRK-B')).toBe('BRK-B'));
  it('handles exchange-suffixed tickers', () => expect(displaySymbol('INTL:VOW3.DE')).toBe('VOW3.DE'));
});

describe('searchInternational', () => {
  it('returns the quotes array', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ quotes: [{ symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NMS' }] }),
    }));
    const result = await searchInternational('apple');
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('AAPL');
  });

  it('returns [] when quotes is missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }));
    expect(await searchInternational('apple')).toEqual([]);
  });

  it('throws on HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(searchInternational('apple')).rejects.toThrow('HTTP 500');
  });
});

describe('fetchIntlChart', () => {
  it('returns the normalized chart object', async () => {
    const data = { prices: [100, 101, 102], ltp: 102, prevClose: 101, open: 100, high: 103, low: 99, volume: 1e6 };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(data) }));
    const result = await fetchIntlChart('AAPL');
    expect(result.ltp).toBe(102);
    expect(result.prevClose).toBe(101);
  });

  it('returns null when prices has fewer than 2 entries', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ prices: [100] }) }));
    expect(await fetchIntlChart('AAPL')).toBeNull();
  });

  it('throws on HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(fetchIntlChart('AAPL')).rejects.toThrow('HTTP 404');
  });
});

describe('fetchChart routing', () => {
  it('routes INTL: symbols through the international backend', async () => {
    const data = { prices: [100, 101, 102], ltp: 102, prevClose: 101 };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(data) });
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchChart('INTL:AAPL');
    expect(result.ltp).toBe(102);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/stocks/intl-chart?symbol=AAPL'),
      expect.any(Object),
    );
  });

  it('still parses the merolagani shape for NEPSE symbols', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ s: 'ok', c: [100, 101, 102, 103, 104], o: [], h: [], l: [], v: [] }),
    }));
    const result = await fetchChart('NABIL');
    expect(result).not.toBeNull();
    expect(result.ltp).toBe(104);
    expect(result.prevClose).toBe(103);
  });
});
