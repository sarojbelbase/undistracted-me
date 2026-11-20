/**
 * GET /weather/geocoding?name=…&count=20&language=en&format=json
 *
 * Forward-proxy for the Open-Meteo geocoding search (city autocomplete).
 */

import { makeProxy } from '../_proxy.js';

export const onRequest = makeProxy('https://geocoding-api.open-meteo.com/v1/search');
