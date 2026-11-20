/**
 * GET /joke
 *
 * Forward-proxy for icanhazdadjoke.com (daily joke). Sends the Accept header
 * it requires so the upstream returns JSON rather than HTML.
 */

import { makeProxy } from '../_proxy.js';

export const onRequest = makeProxy('https://icanhazdadjoke.com/', {
  headers: { Accept: 'application/json' },
  cacheControl: 's-maxage=300, stale-while-revalidate=60',
});
