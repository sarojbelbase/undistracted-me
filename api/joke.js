/**
 * GET /joke
 *
 * Forward-proxy for the daily-joke provider. Sends the Accept header the
 * upstream requires so it returns JSON instead of HTML.
 *
 * ── Contract (to swap the upstream provider) ─────────────────────────────────
 * INPUT  (client → proxy): none
 *
 * OUTPUT (proxy → client, pass-through; field the client parses):
 *   joke: string, the joke text
 *
 * To replace the provider: return `{ joke: string }` (map here if the
 * replacement names the field differently).
 */

import { makeProxy } from '../_proxy.js';

export const onRequest = makeProxy('https://icanhazdadjoke.com/', {
  headers: { Accept: 'application/json' },
  cacheControl: 's-maxage=300, stale-while-revalidate=60',
});
