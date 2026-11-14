/**
 * /stats — live tallies for the landing page.
 *
 * Aggregates GitHub stars, Chrome Web Store users and Firefox users via
 * shields.io (the same source as the README badges — the only public source
 * for Chrome's user count) plus the KV-backed web-app "visits" counter.
 *
 * The response is edge-cached for a minute so we don't hammer shields.io.
 */

import { assertStrictOrigin, corsHeaders, json } from './_config.js';
import { rateLimit } from './_ratelimit.js';
import { getVisits } from './_kv.js';

const GITHUB_STARS =
  'https://img.shields.io/github/stars/sarojbelbase/undistracted-me.json';
const CHROME_USERS =
  'https://img.shields.io/chrome-web-store/users/dfgbijakkhepoonhaelocdmcleeehmef.json';
const FIREFOX_USERS =
  'https://img.shields.io/amo/users/{1071d037-0f17-4c92-b06c-704050d2e2c3}.json';

/** Fetch a shields.io badge and extract its numeric `value`. */
async function shieldsValue(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'undistracted-me-stats/1.0 (+https://undistracted.me)' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const n = parseInt(data && data.value, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

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

  const [stars, chromeUsers, firefoxUsers, visits] = await Promise.all([
    shieldsValue(GITHUB_STARS),
    shieldsValue(CHROME_USERS),
    shieldsValue(FIREFOX_USERS),
    getVisits(env),
  ]);

  return json(
    {
      github: { stars },
      chrome: { users: chromeUsers },
      firefox: { users: firefoxUsers },
      visits,
    },
    200,
    { request, headers: { 'Cache-Control': 'public, max-age=60' } },
  );
}
