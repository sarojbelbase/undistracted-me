/**
 * Tests for the international-stocks backend:
 *   - api/stocks/_intl.js   (parseYahooChart / parseYahooSearch)
 *   - api/stocks/intl-chart.js
 *   - api/stocks/intl-search.js
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { parseYahooChart, parseYahooSearch } from '../../../api/stocks/_intl.js';
import { onRequest as intlChart } from '../../../api/stocks/intl-chart.js';
import { onRequest as intlSearch } from '../../../api/stocks/intl-search.js';
import { makeReq, makeContext, ORIGINS } from './helpers.js';

afterEach(() => vi.restoreAllMocks());

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeYahooChart = () => ({
  chart: {
    result: [
      {
        meta: { regularMarketPrice: 104, chartPreviousClose: 103, currency: 'USD', symbol: 'AAPL' },
        timestamp: [0, 86400, 172800, 259200, 345600],
        indicators: {
          quote: [
            {
              open: [99, 100, 101, 102, 103],
              high: [105, 106, 107, 108, 109],
              low: [95, 96, 97, 98, 99],
              close: [100, 101, 102, 103, 104],
              volume: [1000000, 1100000, 1200000, 1300000, 1400000],
            },
          ],
        },
      },
    ],
    error: null,
  },
});

const makeYahooSearch = () => ({
  quotes: [
    { symbol: 'AAPL', longname: 'Apple Inc.', shortname: 'Apple', quoteType: 'EQUITY', exchDisp: 'NASDAQ', exchange: 'NMS' },
    { symbol: 'MSFT', longname: 'Microsoft Corporation', shortname: 'Microsoft', quoteType: 'EQUITY', exchDisp: 'NASDAQ', exchange: 'NMS' },
    { symbol: 'SPY', longname: 'SPDR S&P 500 ETF Trust', shortname: 'SPDR S&P 500', quoteType: 'ETF', exchDisp: 'NYSEArca', exchange: 'PCX' },
    { symbol: '^GSPC', longname: 'S&P 500', shortname: 'S&P 500', quoteType: 'INDEX', exchDisp: 'S&P', exchange: 'SNP' },
  ],
  count: 4,
});

// ── parseYahooChart ───────────────────────────────────────────────────────────

describe('parseYahooChart', () => {
  it('normalizes a 5-candle chart into the merolagani shape', () => {
    const r = parseYahooChart(makeYahooChart());
    expect(r.prices).toEqual([100, 101, 102, 103, 104]);
    expect(r.ltp).toBe(104);       // c[n-1]
    expect(r.prevClose).toBe(103); // c[n-2]
    expect(r.open).toBe(103);
    expect(r.high).toBe(109);
    expect(r.low).toBe(99);
    expect(r.volume).toBe(1400000);
  });

  it('drops null closes and keeps o/h/l/v aligned', () => {
    const json = makeYahooChart();
    const q = json.chart.result[0].indicators.quote[0];
    q.close = [100, null, 102, 103, 104];
    q.open = [99, 200, 101, 102, 103];
    q.volume = [1, 2, 3, 4, 5];

    const r = parseYahooChart(json);
    expect(r.prices).toEqual([100, 102, 103, 104]);
    expect(r.ltp).toBe(104);
    expect(r.prevClose).toBe(103);
    expect(r.open).toBe(103);   // aligned to index 3 (original index 4)
    expect(r.volume).toBe(5);   // original index 4
  });

  it('returns null when there is no result/quote', () => {
    expect(parseYahooChart({ chart: { result: null } })).toBeNull();
    expect(parseYahooChart({ chart: { result: [] } })).toBeNull();
    expect(parseYahooChart({})).toBeNull();
    expect(parseYahooChart(null)).toBeNull();
  });

  it('returns null when close has fewer than 2 usable candles', () => {
    const json = makeYahooChart();
    json.chart.result[0].indicators.quote[0].close = [100, null, null];
    expect(parseYahooChart(json)).toBeNull();
  });

  it('returns null when close is not an array', () => {
    const json = makeYahooChart();
    json.chart.result[0].indicators.quote[0].close = null;
    expect(parseYahooChart(json)).toBeNull();
  });
});

// ── parseYahooSearch ──────────────────────────────────────────────────────────

describe('parseYahooSearch', () => {
  it('maps equities and drops ETFs/indices', () => {
    const r = parseYahooSearch(makeYahooSearch());
    expect(r).toEqual([
      { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ' },
    ]);
  });

  it('falls back to shortname when longname is missing', () => {
    const r = parseYahooSearch({
      quotes: [{ symbol: 'XYZ', quoteType: 'EQUITY', exchDisp: 'NYSE' }],
    });
    expect(r[0].name).toBe('XYZ');
    expect(r[0].exchange).toBe('NYSE');
  });

  it('falls back to symbol when both names are missing', () => {
    const r = parseYahooSearch({ quotes: [{ symbol: 'ABC', quoteType: 'EQUITY' }] });
    expect(r[0].name).toBe('ABC');
    expect(r[0].exchange).toBe('');
  });

  it('returns [] when quotes is missing', () => {
    expect(parseYahooSearch({})).toEqual([]);
    expect(parseYahooSearch(null)).toEqual([]);
  });
});

// ── intl-chart endpoint ───────────────────────────────────────────────────────

describe('intl-chart endpoint', () => {
  it('rejects a missing symbol with 400', async () => {
    const res = await intlChart(makeContext(makeReq({ origin: ORIGINS.production })));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'symbol is required' });
  });

  it('rejects a non-GET method with 405', async () => {
    const res = await intlChart(makeContext(makeReq({ method: 'POST', origin: ORIGINS.production })));
    expect(res.status).toBe(405);
  });

  it('rejects an invalid symbol (space) with 400', async () => {
    const res = await intlChart(makeContext(makeReq({ origin: ORIGINS.production, query: { symbol: 'BAD SYM' } })));
    expect(res.status).toBe(400);
  });

  it('proxies + normalizes a valid symbol', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(makeYahooChart()),
    }));
    const res = await intlChart(makeContext(makeReq({ origin: ORIGINS.production, query: { symbol: 'AAPL' } })));
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=300');
    const body = await res.json();
    expect(body.ltp).toBe(104);
    expect(body.prevClose).toBe(103);
    expect(body.prices).toHaveLength(5);
  });

  it('returns 404 when Yahoo has no candles', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ chart: { result: null } }),
    }));
    const res = await intlChart(makeContext(makeReq({ origin: ORIGINS.production, query: { symbol: 'AAPL' } })));
    expect(res.status).toBe(404);
  });

  it('returns 502 when the upstream throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    const res = await intlChart(makeContext(makeReq({ origin: ORIGINS.production, query: { symbol: 'AAPL' } })));
    expect(res.status).toBe(502);
  });
});

// ── intl-search endpoint ──────────────────────────────────────────────────────

describe('intl-search endpoint', () => {
  it('rejects a missing q with 400', async () => {
    const res = await intlSearch(makeContext(makeReq({ origin: ORIGINS.production })));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: 'q is required' });
  });

  it('rejects a non-GET method with 405', async () => {
    const res = await intlSearch(makeContext(makeReq({ method: 'POST', origin: ORIGINS.production })));
    expect(res.status).toBe(405);
  });

  it('returns filtered equity quotes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(makeYahooSearch()),
    }));
    const res = await intlSearch(makeContext(makeReq({ origin: ORIGINS.production, query: { q: 'apple' } })));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.quotes).toEqual([
      { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ' },
    ]);
  });

  it('returns 502 when the upstream throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    const res = await intlSearch(makeContext(makeReq({ origin: ORIGINS.production, query: { q: 'apple' } })));
    expect(res.status).toBe(502);
  });
});
