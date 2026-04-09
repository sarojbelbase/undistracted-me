// ── Runtime environment detection ───────────────────────────────────────────
// Extensions bypass third-party CORS via host_permissions.
// The website (Vercel) needs server-side proxy routes instead.
const isDev = typeof location !== 'undefined' && location.hostname === 'localhost';
const isExt = typeof chrome !== 'undefined' && !!chrome?.runtime?.id;

// ── Company list — nepalipaisa.com ────────────────────────────────────────────
const COMPANIES_URL = isDev
  ? '/np-api/GetCompanies'
  : isExt
    ? 'https://nepalipaisa.com/api/GetCompanies'
    : '/api/stock/companies';

// ── Chart data — merolagani.com TechnicalChartHandler ────────────────────────
// Response: { t, o, h, l, c, v, s } — standard OHLCV arrays, s === "ok" on success.
const ML_ORIGIN = isDev ? '' : isExt ? 'https://www.merolagani.com' : '';
const ML_PATH = isDev
  ? '/ml-api'
  : isExt
    ? '/handlers/TechnicalChartHandler.ashx'
    : '/api/stock/chart';

function chartUrl(symbol) {
  const now = Math.floor(Date.now() / 1000);
  const start = now - 90 * 24 * 60 * 60; // 90 days of daily data for sparkline
  // Website mode: route through Vercel proxy with query params
  if (!isDev && !isExt) {
    return `/api/stock/chart?symbol=${encodeURIComponent(symbol)}&from=${start}&to=${now}`;
  }
  return `${ML_ORIGIN}${ML_PATH}?type=get_advanced_chart&symbol=${encodeURIComponent(symbol)}&resolution=1D&rangeStartDate=${start}&rangeEndDate=${now}&from=&isAdjust=1`;
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
 * Fetch chart data for a symbol from merolagani.com.
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
  const res = await fetch(chartUrl(symbol), { method: 'GET' });
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
    prices: c,            // 90 days of daily closes — sparkline
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
 * LTTB — Largest Triangle Three Buckets downsampling.
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
  if (!chartData || chartData.prices.length < 2) return { change: 0, pct: 0, dir: 'flat' };
  const change = chartData.ltp - chartData.prevClose;
  const pct = (change / chartData.prevClose) * 100;
  const dir = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
  return { change, pct, dir };
}

export function humanizeAge(ts) {
  if (!ts) return null;
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 5) return 'just now';
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

export function fmtPrice(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// O/H/L labels — 1 decimal is enough, saves horizontal space
export function fmtOHL(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('en-NP', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function fmtVolume(n) {
  if (n == null || isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(Math.round(n));
}
