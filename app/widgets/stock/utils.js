import { NEPSE_CHART_API, NEPSE_COMPANIES_API, INTL_CHART_API, INTL_SEARCH_API } from '../../constants/urls.js';

// Default watchlist now lives in constants/defaults.js (single source of truth).
// Re-exported here so existing import paths keep working.
export { DEFAULT_SYMBOLS } from '../../constants/defaults.js';

// ── International symbol handling ─────────────────────────────────────────────
// International symbols are namespaced with an `INTL:` prefix so they never
// collide with NEPSE tickers (which are bare symbols like `NABIL`). The prefix
// is stripped before any network call and re-added only for storage/identity.
export const INTL_PREFIX = 'INTL:';
export const isIntlSymbol = (sym) => typeof sym === 'string' && sym.startsWith(INTL_PREFIX);
export const intlTicker = (sym) => (isIntlSymbol(sym) ? sym.slice(INTL_PREFIX.length) : sym);
export const displaySymbol = (sym) => intlTicker(sym);

// In dev (localhost) requests go through the Vite proxy to avoid CORS.
// In production (web app + browser extension) requests go through the backend
// API (api.undistracted.me) so the provider is never referenced client-side.
const hostname = typeof location !== 'undefined' ? location.hostname : '';
const isDev = hostname === 'localhost';

// ── Company list ──────────────────────────────────────────────────────────────
// dev → Vite proxy (/np-api); production (web + extension) → backend API.
const COMPANIES_URL = isDev ? '/np-api/GetCompanies' : NEPSE_COMPANIES_API;

// ── Chart data ────────────────────────────────────────────────────────────────
// dev → Vite proxy (/ml-api); production (web + extension) → backend API.
function chartUrl(symbol) {
  const now = Math.floor(Date.now() / 1000);
  const start = now - 90 * 24 * 60 * 60; // 90 days of daily data for sparkline
  if (isDev) {
    return `/ml-api?type=get_advanced_chart&symbol=${encodeURIComponent(symbol)}&resolution=1D&rangeStartDate=${start}&rangeEndDate=${now}&from=&isAdjust=1`;
  }
  return `${NEPSE_CHART_API}?symbol=${encodeURIComponent(symbol)}&from=${start}&to=${now}`;
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

/**
 * Response: { statusCode, message, result: { companyId, companyName, stockSymbol, sectorId, sectorName }[] }
 */
export async function fetchCompanies() {
  const res = await fetch(COMPANIES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '[]',
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const list = json?.result ?? [];
  return list
    .map((c) => ({
      symbol: c.stockSymbol ?? '',
      name: c.companyName ?? '',
      sector: c.sectorName ?? '',
    }))
    .filter((c) => c.symbol);
}

/**
 * Search international stocks via the backend proxy.
 * Returns [{ symbol, name, exchange }].
 */
export async function searchInternational(query) {
  const url = `${INTL_SEARCH_API}?q=${encodeURIComponent(query.trim())}`;
  const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json?.quotes ?? [];
}

/**
 * Fetch international chart data via the backend proxy.
 * The backend already normalizes to
 *   { prices, ltp, prevClose, open, high, low, volume }
 * so this is a straight pass-through. Returns the object, or null when the
 * backend had no usable candles.
 */
export async function fetchIntlChart(ticker) {
  const url = `${INTL_CHART_API}?symbol=${encodeURIComponent(ticker)}`;
  const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return Array.isArray(json?.prices) && json.prices.length >= 2 ? json : null;
}

/**
 * Fetch chart data for a symbol from NEPSE.com.
 *
 * Single call returns 90 days of daily OHLCV candles.
 *   c[n-1] = today's close  → LTP
 *   c[n-2] = yesterday's close → prevClose
 *   c[]    = all closes → sparkline
 *   o/h/l at [n-1] = today's open/high/low
 *
 * Returns { prices, ltp, prevClose, open, high, low } or null.
 */
export async function fetchChart(symbol) {
  if (isIntlSymbol(symbol)) return fetchIntlChart(intlTicker(symbol));
  const res = await fetch(chartUrl(symbol), {
    method: 'GET',
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();

  if (json?.s !== 'ok') return null;

  const c = json.c;
  const o = json.o;
  const h = json.h;
  const l = json.l;
  if (!Array.isArray(c) || c.length < 2) return null;

  const v = json.v;
  const n = c.length;
  return {
    prices: c,            // 90 days of daily closes: sparkline
    ltp: c[n - 1],    // today's official close
    prevClose: c[n - 2],    // yesterday's official close
    open: o?.[n - 1],  // today's open
    high: h?.[n - 1],  // today's high
    low: l?.[n - 1],  // today's low
    volume: v?.[n - 1],  // today's traded volume / turnover
  };
}

// ── Sparkline SVG path builder ────────────────────────────────────────────────

/**
 * LTTB: Largest Triangle Three Buckets downsampling.
 * Reduces a price array to `threshold` points while preserving the visual shape.
 */
function lttb(prices, threshold) {
  const len = prices.length;
  if (len <= threshold) return prices;

  const sampled = [prices[0]];
  const bucketSize = (len - 2) / (threshold - 2);
  let a = 0; // previously selected index

  for (let i = 0; i < threshold - 2; i++) {
    // Next bucket: compute average point
    const nextStart = Math.floor((i + 1) * bucketSize) + 1;
    const nextEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, len);
    let avgY = 0;
    let avgX = 0;
    const count = nextEnd - nextStart;
    for (let j = nextStart; j < nextEnd; j++) {
      avgX += j;
      avgY += prices[j];
    }
    avgX /= count;
    avgY /= count;

    // Current bucket range
    const rangeStart = Math.floor(i * bucketSize) + 1;
    const rangeEnd = Math.floor((i + 1) * bucketSize) + 1;

    // Pick the point in current bucket that forms the largest triangle
    let maxArea = -1;
    let maxIdx = rangeStart;
    const ax = a, ay = prices[a];
    for (let j = rangeStart; j < rangeEnd; j++) {
      const area = Math.abs(
        (ax - avgX) * (prices[j] - ay) -
        (ax - j) * (avgY - ay)
      ) * 0.5;
      if (area > maxArea) { maxArea = area; maxIdx = j; }
    }

    sampled.push(prices[maxIdx]);
    a = maxIdx;
  }

  sampled.push(prices[len - 1]);
  return sampled;
}

/**
 * Smooth sparkline: LTTB-downsampled to 40 pts, then Catmull-Rom bezier.
 */
export function buildSparklinePaths(prices, vw = 100, vh = 40) {
  if (!prices || prices.length < 2) return { line: '', area: '' };

  const data = lttb(prices, 40);
  const rawMin = Math.min(...data);
  const rawMax = Math.max(...data);
  const mid = (rawMin + rawMax) / 2;

  // Enforce a minimum visible range of 1.5% of the mid price so low-volatility
  // stocks don't get stretched into spikey noise filling the full chart height.
  const minRange = mid * 0.015;
  const range = Math.max(rawMax - rawMin, minRange);
  const min = mid - range / 2;
  const max = mid + range / 2;
  const padTop = 6;
  const padBottom = 10;
  const usableH = vh - padTop - padBottom;

  const pts = data.map((p, i) => [
    (i / (data.length - 1)) * vw,
    padTop + (1 - (p - min) / (max - min)) * usableH,
  ]);

  const n = pts.length;
  let line = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;

  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, n - 1)];

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    line += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }

  const [lx] = pts[n - 1];
  const area = `${line} L${lx.toFixed(2)},${vh} L0,${vh} Z`;

  return { line, area };
}

// ── Stat helpers ──────────────────────────────────────────────────────────────

export function priceStats(chartData) {
  // Guard prevClose (0 / null / undefined) to avoid an Infinity/NaN percentage
  // on halted, newly-listed or malformed symbols.
  if (!chartData || chartData.prices.length < 2 || !chartData.prevClose) {
    return { change: 0, pct: 0, dir: 'flat' };
  }
  const change = chartData.ltp - chartData.prevClose;
  const pct = (change / chartData.prevClose) * 100;
  const dir = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
  return { change, pct, dir };
}

// humanizeAge is sourced from utilities/index.js: single canonical implementation.
export { humanizeAge } from '../../utilities';

export function fmtPrice(n) {
  if (n == null) return '-';
  return Number(n).toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// O/H/L labels: 1 decimal is enough, saves horizontal space
export function fmtOHL(n) {
  if (n == null) return '-';
  return Number(n).toLocaleString('en-NP', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function fmtVolume(n) {
  if (n == null || isNaN(n)) return '-';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(Math.round(n));
}
