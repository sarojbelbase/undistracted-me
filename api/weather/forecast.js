/**
 * GET /weather/forecast
 *
 * Forward-proxy for the weather forecast provider. The incoming query string is
 * forwarded verbatim, so the client's URLSearchParams are untouched.
 *
 * ── Contract (to swap the upstream provider) ─────────────────────────────────
 * INPUT  (client → proxy, forwarded as-is):
 *   latitude, longitude     : coordinates
 *   current                 : "temperature_2m,apparent_temperature,weather_code,
 *                               wind_gusts_10m,precipitation,is_day"
 *   hourly                  : "precipitation_probability,weather_code,wind_gusts_10m"
 *   forecast_hours          : 12
 *   temperature_unit        : celsius | fahrenheit
 *   wind_speed_unit         : kmh | mph
 *   timezone                : auto
 *
 * OUTPUT (proxy → client, pass-through; fields the client parses):
 *   current.temperature_2m       : °C/°F
 *   current.apparent_temperature : feels-like
 *   current.weather_code         : WMO code
 *   current.is_day               : 0|1
 *   current.precipitation        : mm
 *   current.wind_gusts_10m       : kmh/mph
 *   hourly.time[]                : ISO timestamps
 *   hourly.precipitation_probability[]
 *   hourly.weather_code[]
 *   hourly.wind_gusts_10m[]
 *
 * To replace the provider: point `upstreamBase` at a new endpoint that accepts
 * the same query params (or translate them here) and returns the same field
 * names. If the replacement uses different names, map them here before returning.
 */

import { makeProxy } from '../_proxy.js';

export const onRequest = makeProxy('https://api.open-meteo.com/v1/forecast');
