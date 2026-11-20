/**
 * GET /stocks/intl-search?q=apple
 *
 * Server-side proxy for the international symbol-search provider (Yahoo
 * Finance), filtered to equities.
 *
 * ── Contract (to swap the upstream provider) ─────────────────────────────────
 * INPUT  (client → proxy):
 *   q — search text
 *
 * OUTPUT (proxy → client, normalized):
 *   { quotes: [{ symbol: string, name: string, exchange: string }] }
 *
 * To replace the provider: accept `q` and return `quotes[]` with those three
 * fields (parse the new provider's response in ./_intl.js).
 */

import { assertStrictOrigin, json, corsHeaders } from '../_config.js';
import { rateLimit } from '../_ratelimit.js';
import { fetchYahoo, parseYahooSearch } from './_intl.js';

const YAHOO_SEARCH_BASE = 'https://query1.finance.yahoo.com/v1/finance/search';

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

  const q = new URL(request.url).searchParams.get('q');
  if (!q || !q.trim()) {
    return json({ error: 'q is required' }, 400, { request });
  }

  const url = `${YAHOO_SEARCH_BASE}?q=${encodeURIComponent(q.trim())}&quotesCount=10&newsCount=0&listsCount=0`;

  try {
    const upstream = await fetchYahoo(url);
    if (!upstream.ok) return json({ error: 'Upstream error' }, upstream.status, { request });
    return json({ quotes: parseYahooSearch(await upstream.json()) }, 200, {
      request,
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
    });
  } catch (err) {
    return json({ error: 'Failed to fetch from Yahoo Finance' }, 502, { request });
  }
}
