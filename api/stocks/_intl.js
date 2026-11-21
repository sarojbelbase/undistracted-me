/**
 * Shared helpers for the international-stocks endpoints.
 *
 * `_`-prefixed so Cloudflare Pages does not expose this as an HTTP route.
 * The parsers are pure so the endpoints AND the unit tests import the exact
 * same normalization code that runs in production.
 */

/** Realistic browser UA: Yahoo rejects the default Workers UA with a 429. */
export const YAHOO_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Fetch from Yahoo with a browser UA and a single retry on 429: Yahoo
 * rate-limits aggressively and intermittently, and a retry usually succeeds.
 */
export async function fetchYahoo(url) {
  const opts = { headers: { 'User-Agent': YAHOO_UA, Accept: 'application/json' } };
  let res = await fetch(url, opts);
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 700));
    res = await fetch(url, opts);
  }
  return res;
}

/**
 * Normalize a Yahoo Finance v8 chart response into the same shape the
 * merolagani chart path produces:
 *   { prices, ltp, prevClose, open, high, low, volume }
 * Returns null when the response has no usable candles.
 *
 * Yahoo pads arrays with `null` on non-trading days: those indices are
 * dropped while keeping open/high/low/volume aligned with the closes.
 */
export function parseYahooChart(json) {
  const quote = json?.chart?.result?.[0]?.indicators?.quote?.[0];
  if (!quote) return null;
  const { open, high, low, close, volume } = quote;
  if (!Array.isArray(close) || close.length < 2) return null;

  const c = [];
  const o = [];
  const h = [];
  const l = [];
  const v = [];
  for (let i = 0; i < close.length; i++) {
    if (close[i] == null) continue;
    c.push(close[i]);
    o.push(open?.[i] ?? null);
    h.push(high?.[i] ?? null);
    l.push(low?.[i] ?? null);
    v.push(volume?.[i] ?? null);
  }
  if (c.length < 2) return null;

  const n = c.length;
  return {
    prices: c,
    ltp: c[n - 1],
    prevClose: c[n - 2],
    open: o[n - 1],
    high: h[n - 1],
    low: l[n - 1],
    volume: v[n - 1],
  };
}

/**
 * Normalize a Yahoo Finance v1 search response into [{ symbol, name, exchange }].
 * Only equity results are kept (matches "stocks": not ETFs/indices/funds).
 */
export function parseYahooSearch(json) {
  const quotes = json?.quotes ?? [];
  return quotes
    .filter((q) => q && typeof q.symbol === 'string' && q.quoteType === 'EQUITY')
    .map((q) => ({
      symbol: q.symbol,
      name: q.longname || q.shortname || q.symbol,
      exchange: q.exchDisp || q.exchange || '',
    }));
}
