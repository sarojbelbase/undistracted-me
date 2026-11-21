/**
 * GET /geo/reverse
 *
 * Forward-proxy for reverse geocoding (lat/lon → human city label). Sets
 * Accept-Language so results are English, and a long cache TTL (place names
 * effectively never change).
 *
 * ── Contract (to swap the upstream provider) ─────────────────────────────────
 * INPUT  (client → proxy, forwarded as-is):
 *   lat, lon: coordinates
 *   format  : json
 *   zoom    : 10
 *
 * OUTPUT (proxy → client, pass-through; fields the client reads, in priority):
 *   address.suburb → address.neighbourhood → address.town → address.city →
 *   address.county → address.state
 *
 * To replace the provider: accept lat/lon and return an `address` object whose
 * fields resolve to the same city-label fallback chain above.
 */

import { makeProxy } from '../_proxy.js';

export const onRequest = makeProxy('https://nominatim.openstreetmap.org/reverse', {
  headers: { 'Accept-Language': 'en' },
  cacheControl: 's-maxage=86400, stale-while-revalidate=3600',
});
