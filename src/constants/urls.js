/**
 * Centralised API & external URL constants.
 *
 * Import individual exports here rather than hardcoding URLs in business logic.
 * The service worker (bg.js) and all widgets reference this file so there is
 * one canonical place to update an endpoint if it ever changes.
 */

import { PRODUCTION_BASE_URL, API_BASE_URL } from './env.js';

// ── Own APIs ──────────────────────────────────────────────────────────────────

/** Backend RSS feed proxy (CORS-safe for extension origins). */
export const RSS_FEED_PROXY_URL = `${API_BASE_URL}/rss/feed`;

/**
 * Committed `holidays.json` (Nepali + international, AD-dated), served from the
 * app's own origin (the file lives in `public/` so the build copies it into
 * `dist/` and Cloudflare Pages serves it at `/holidays.json`).  Self-hosting is
 * branch-agnostic — no GitHub branch name or CDN reference to go stale.
 * Refreshed by `.github/workflows/holidays.yml`, which scrapes Wikipedia and
 * commits only when the data actually changes.
 */
export const HOLIDAYS_URL = `${PRODUCTION_BASE_URL}/holidays.json`;

// ── Weather & climate (Open-Meteo — free, no API key) ─────────────────────────

export const OPEN_METEO_WEATHER_API = 'https://api.open-meteo.com/v1/forecast';
export const OPEN_METEO_AQI_API = 'https://air-quality-api.open-meteo.com/v1/air-quality';
export const OPEN_METEO_GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';

// ── Geolocation ───────────────────────────────────────────────────────────────

/** OSM Nominatim — free reverse geocoder (lat/lon → city name). */
export const NOMINATIM_REVERSE_API = 'https://nominatim.openstreetmap.org/reverse';

/** IP geolocation — city-level accuracy; CORS-blocked from extension origins. */
export const IPAPI_GEO_URL = 'https://ipapi.co/json/';

/** IP geolocation fallback — CORS-enabled, works from extension origins. */
export const FREEIPAPI_GEO_URL = 'https://freeipapi.com/api/json';

// ── Nepal stock market ────────────────────────────────────────────────────────

/** Mero Lagani — OHLCV chart data for NEPSE-listed stocks. */
export const MEROLAGANI_CHART_API = 'https://www.merolagani.com/handlers/TechnicalChartHandler.ashx';

// ── Google APIs ───────────────────────────────────────────────────────────────

/** Google OAuth2 authorization endpoint (PKCE / web flow). */
export const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';

/** Google OAuth2 — signed-in user profile (name, email, picture). */
export const GOOGLE_USERINFO_API = 'https://www.googleapis.com/oauth2/v2/userinfo';

/** Google Calendar REST API — primary calendar events. */
export const GCAL_EVENTS_API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

/** Google People API — contacts list (birthdays & anniversaries). */
export const GOOGLE_PEOPLE_API = 'https://people.googleapis.com/v1/people/me/connections';

/** Google Tasks REST API v1 base URL. */
export const GOOGLE_TASKS_API = 'https://tasks.googleapis.com/tasks/v1';

/** Google OAuth2 scopes used by the extension. */
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/drive.appdata',
].join(' ');

/** Nepali Paisa — company / ticker listing for NEPSE. */
export const NEPALI_PAISA_COMPANIES_API = 'https://nepalipaisa.com/api/GetCompanies';

// ── Daily content ─────────────────────────────────────────────────────────────

/** icanhazdadjoke.com — returns one random dad joke (JSON). */
export const ICANHAZDADJOKE_API = 'https://icanhazdadjoke.com/';
