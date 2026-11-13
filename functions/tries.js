/**
 * /tries — "web app tries" counter.
 *
 *   GET  /tries → { tries: N }      read (landing page, cached 60s)
 *   POST /tries → { tries: N+1 }    increment (web app, on first open)
 *
 * The POST is a "simple" CORS request (no custom headers, empty body), so the
 * web app can fire it from app.undistracted.me without a preflight. No PII is
 * sent — the counter is just a number.
 */

import { assertOrigin, corsHeaders, json } from './_config.js';
import { getTries, incrementTries } from './_kv.js';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    const rejected = assertOrigin(request);
    if (rejected) return rejected;
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  const rejected = assertOrigin(request);
  if (rejected) return rejected;

  if (request.method === 'GET') {
    const tries = await getTries(env);
    return json({ tries }, 200, {
      request,
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  }

  if (request.method === 'POST') {
    const tries = await incrementTries(env);
    return json({ tries }, 200, {
      request,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  return json({ error: 'Method not allowed' }, 405, { request });
}
