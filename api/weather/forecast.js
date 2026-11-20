/**
 * GET /weather/forecast?latitude=…&longitude=…&current=…&hourly=…
 *
 * Forward-proxy for Open-Meteo's current + hourly forecast. Query string is
 * passed through untouched so the client keeps its existing URLSearchParams.
 */

import { makeProxy } from '../_proxy.js';

export const onRequest = makeProxy('https://api.open-meteo.com/v1/forecast');
