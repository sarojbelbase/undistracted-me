/**
 * GET /weather/air-quality?latitude=…&longitude=…&current=us_aqi,pm2_5…
 *
 * Forward-proxy for the Open-Meteo air-quality API.
 */

import { makeProxy } from '../_proxy.js';

export const onRequest = makeProxy('https://air-quality-api.open-meteo.com/v1/air-quality');
