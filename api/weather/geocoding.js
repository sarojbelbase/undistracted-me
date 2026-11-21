/**
 * GET /weather/geocoding
 *
 * Forward-proxy for the city-search (geocoding autocomplete) provider.
 *
 * ── Contract (to swap the upstream provider) ─────────────────────────────────
 * INPUT  (client → proxy, forwarded as-is):
 *   name     : search text
 *   count    : 20
 *   language : en
 *   format   : json
 *
 * OUTPUT (proxy → client, pass-through; fields the client parses):
 *   results[]                : matches, best-first
 *     .name                  : city name
 *     .latitude, .longitude  : coordinates
 *     .admin1                : region/state
 *     .country               : country
 *   (client de-dupes by display label and re-sorts by distance to the user.)
 *
 * To replace the provider: accept `name` and return `results[]` with the fields
 * above (map here if the replacement names them differently).
 */

import { makeProxy } from '../_proxy.js';

export const onRequest = makeProxy('https://geocoding-api.open-meteo.com/v1/search');
