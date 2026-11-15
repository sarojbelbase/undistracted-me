/**
 * GET /stocks/intl-chart?symbol=AAPL
 *
 * Server-side proxy for Yahoo Finance's chart endpoint, normalized to the
 * merolagani chart shape so the frontend renders it identically to NEPSE data.
 * Avoids CORS issues for web/extension origins and Yahoo's rate-limits.
 */

import { assertStrictOrigin, json, corsHeaders } from '../_config.js';
import { rateLimit } from '../_ratelimit.js';
import { fetchYahoo, parseYahooChart } from './_intl.js';

const YAHOO_CHART_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart/';

// Yahoo ticker charset: letters, digits, dot (VOW3.DE), hyphen (BRK-B),
// caret (^GSPC), equals (currency futures).
const SYMBOL_RE = /^[A-Za-z0-9.\-=^]{1,20}$/;

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

  const symbol = new URL(request.url).searchParams.get('symbol');
  if (!symbol || !SYMBOL_RE.test(symbol.trim())) {
    return json({ error: 'symbol is required' }, 400, { request });
  }

  const url = `${YAHOO_CHART_BASE}${encodeURIComponent(symbol.trim())}?range=3mo&interval=1d`;

  try {
    const upstream = await fetchYahoo(url);
    if (!upstream.ok) return json({ error: 'Upstream error' }, upstream.status, { request });
    const parsed = parseYahooChart(await upstream.json());
    if (!parsed) return json({ error: 'No chart data' }, 404, { request });
    return json(parsed, 200, {
      request,
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
    });
  } catch (err) {
    return json({ error: 'Failed to fetch from Yahoo Finance' }, 502, { request });
  }
}
