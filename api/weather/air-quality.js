/**
 * GET /weather/air-quality
 *
 * Forward-proxy for the air-quality provider. Query string forwarded verbatim.
 *
 * ── Contract (to swap the upstream provider) ─────────────────────────────────
 * INPUT  (client → proxy, forwarded as-is):
 *   latitude, longitude — coordinates
 *   current             — "us_aqi,pm2_5"
 *   timezone            — auto
 *
 * OUTPUT (proxy → client, pass-through; fields the client parses):
 *   current.us_aqi — US AQI value
 *   current.pm2_5  — PM2.5 µg/m³
 *
 * To replace the provider: accept the same params and return `current.us_aqi`
 * and `current.pm2_5` (map to those names if the provider differs).
 */

import { makeProxy } from '../_proxy.js';

export const onRequest = makeProxy('https://air-quality-api.open-meteo.com/v1/air-quality');
