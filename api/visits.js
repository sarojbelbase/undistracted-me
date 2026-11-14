/**
 * /visits — "web app visits" counter.
 *
 *   GET  /visits → { visits: N }      read (landing page, cached 60s)
 *   POST /visits → { visits: N+1 }    increment (web app, on first open)
 *
 * The POST is a "simple" CORS request (no custom headers, empty body), so the
 * web app can fire it from app.undistracted.me without a preflight. No PII is
 * sent — the counter is just a number.
 */

import { assertStrictOrigin, corsHeaders, json } from './_config.js';
import { getVisits, incrementVisits } from './_kv.js';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    const rejected = assertStrictOrigin(request);
    if (rejected) return rejected;
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  const rejected = assertStrictOrigin(request);
  if (rejected) return rejected;

  if (request.method === 'GET') {
    const visits = await getVisits(env);
    return json({ visits }, 200, {
      request,
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  }

  if (request.method === 'POST') {
    const visits = await incrementVisits(env);
    return json({ visits }, 200, {
      request,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  return json({ error: 'Method not allowed' }, 405, { request });
}
