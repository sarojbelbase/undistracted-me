/**
 * POST /stocks/companies
 *
 * Server-side proxy for the NEPSE company-listing provider (nepalipaisa.com
 * GetCompanies). Avoids CORS issues when the app is served from a web origin.
 *
 * ── Contract (to swap the upstream provider) ─────────────────────────────────
 * INPUT  (client → proxy):
 *   POST with body '[]' and Content-Type application/json.
 *
 * OUTPUT (proxy → client, pass-through upstream shape):
 *   {
 *     statusCode: number,
 *     message: string,
 *     result: [{ companyId, companyName, stockSymbol, sectorId, sectorName }]
 *   }
 *   The client maps result[] → { symbol: stockSymbol, name: companyName,
 *   sector: sectorName }.
 *
 * To replace the provider: accept the same POST and return the same
 * { statusCode, message, result[] } shape (translate here if it differs).
 */

import { assertStrictOrigin, json, corsHeaders } from '../_config.js';
import { rateLimit } from '../_ratelimit.js';

const NP_URL = 'https://nepalipaisa.com/api/GetCompanies';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    const rejected = assertStrictOrigin(request);
    if (rejected) return rejected;
    return new Response(null, { status: 204, headers: corsHeaders(request, 'POST, OPTIONS') });
  }

  const rejected = assertStrictOrigin(request);
  if (rejected) return rejected;
  const limited = await rateLimit(env, request);
  if (limited) return limited;

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, { request, methods: 'POST, OPTIONS' });
  }

  try {
    const upstream = await fetch(NP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      body: '[]',
    });
    if (!upstream.ok) {
      return json({ error: 'Upstream error' }, upstream.status, { request, methods: 'POST, OPTIONS' });
    }
    const data = await upstream.json();
    return json(data, 200, {
      request,
      methods: 'POST, OPTIONS',
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=300' },
    });
  } catch (err) {
    return json({ error: 'Failed to fetch from nepalipaisa.com' }, 502, { request, methods: 'POST, OPTIONS' });
  }
}
