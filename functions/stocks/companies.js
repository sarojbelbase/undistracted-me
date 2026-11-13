/**
 * POST /stocks/companies
 *
 * Server-side proxy for nepalipaisa.com GetCompanies endpoint.
 * Avoids CORS issues when the app is served from a web origin.
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
