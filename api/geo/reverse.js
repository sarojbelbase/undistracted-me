/**
 * GET /geo/reverse?lat=…&lon=…&format=json&zoom=10
 *
 * Forward-proxy for OSM Nominatim reverse geocoding (lat/lon → city label).
 * Sets Accept-Language so results are English, and a longer cache TTL since
 * place names effectively never change.
 */

import { makeProxy } from '../_proxy.js';

export const onRequest = makeProxy('https://nominatim.openstreetmap.org/reverse', {
  headers: { 'Accept-Language': 'en' },
  cacheControl: 's-maxage=86400, stale-while-revalidate=3600',
});
