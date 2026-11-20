/**
 * GET /stocks/chart?symbol=NABIL&from=<unix>&to=<unix>
 *
 * Server-side proxy for the NEPSE chart provider (merolagani.com
 * TechnicalChartHandler). Avoids CORS issues when the app is served from a web
 * origin.
 *
 * ── Contract (to swap the upstream provider) ─────────────────────────────────
 * INPUT  (client → proxy):
 *   symbol — NEPSE ticker (e.g. NABIL)
 *   from   — range start, unix seconds (defaults to now − 90 days)
 *   to     — range end, unix seconds (defaults to now)
 *
 * OUTPUT (proxy → client, pass-through upstream shape):
 *   { s: 'ok', c: number[], o: number[], h: number[], l: number[], v: number[] }
 *   c/o/h/l/v are daily arrays (newest last); the client derives:
 *     prices=c, ltp=c[last], prevClose=c[last-1], open=o[last], high=h[last],
 *     low=l[last], volume=v[last]
 *
 * To replace the provider: accept symbol/from/to and return the same
 * { s, c, o, h, l, v } shape (translate here if the new provider differs).
 */

import { assertStrictOrigin, json, corsHeaders } from '../_config.js';
import { rateLimit } from '../_ratelimit.js';

const ML_BASE = 'https://www.merolagani.com/handlers/TechnicalChartHandler.ashx';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    const rejected = assertStrictOrigin(request);
    if (rejected) return rejected;
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  const rejected = assertStrictOrigin(request);
  if (rejected) return rejected;
  const limited = await rateLimit(env, request);
  if (limited) return limited;

  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405, { request });
  }

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (!symbol) return json({ error: 'symbol is required' }, 400, { request });

  // Validate from/to as integers to prevent query-string parameter injection.
  const toInt = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; };
  const now = toInt(to) ?? Math.floor(Date.now() / 1000);
  const start = toInt(from) ?? (now - 90 * 24 * 60 * 60);

  const url = `${ML_BASE}?type=get_advanced_chart&symbol=${encodeURIComponent(symbol)}&resolution=1D&rangeStartDate=${start}&rangeEndDate=${now}&from=&isAdjust=1`;

  try {
    const upstream = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!upstream.ok) return json({ error: 'Upstream error' }, upstream.status, { request });
    const data = await upstream.json();
    return json(data, 200, {
      request,
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
    });
  } catch (err) {
    return json({ error: 'Failed to fetch from merolagani.com' }, 502, { request });
  }
}
