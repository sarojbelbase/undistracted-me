/**
 * Centralised API & external URL constants.
 *
 * Import individual exports here rather than hardcoding URLs in business logic.
 * The service worker (bg.js) and all widgets reference this file so there is
 * one canonical place to update an endpoint if it ever changes.
 */

import { PRODUCTION_BASE_URL, API_BASE_URL, LANDING_BASE_URL } from './env.js';

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

// ── Support / funding ─────────────────────────────────────────────────────────

/** Buy Me a Momo — support link (support nudge, widget catalog, demo bookmark). */
export const MOMO_URL = 'https://buymemomo.com/sarojbelbase';

/** Project repository — GitHub star link in the support nudge. */
export const GITHUB_URL = 'https://github.com/sarojbelbase/undistracted-me';

/** Landing site home. */
export const LANDING_URL = LANDING_BASE_URL;

/** Landing site changelog (release notes). */
export const CHANGELOG_URL = `${LANDING_BASE_URL}/changelogs/`;

/** Chrome Web Store listing. */
export const CHROME_STORE_URL = 'https://chromewebstore.google.com/detail/undistracted-me/dfgbijakkhepoonhaelocdmcleeehmef';

/** Firefox Add-ons listing. */
export const FIREFOX_ADDONS_URL = 'https://addons.mozilla.org/en-US/firefox/addon/undistracted-me/';

/** Feedback form (Google Forms). */
export const FEEDBACK_FORM_URL = 'https://forms.gle/7vf4VGrB9Loz8hB76';

/** Landing site support section. */
export const SUPPORT_URL = `${LANDING_BASE_URL}/#support`;

// ── Weather & climate (via backend proxy) ─────────────────────────────────────
// All weather/geolocation/joke/stocks calls route through api.undistracted.me so
// the extension never references a third-party provider directly. The backend
// forwards the query string verbatim, so the client keeps its URLSearchParams.

export const WEATHER_API = `${API_BASE_URL}/weather/forecast`;
export const AIR_QUALITY_API = `${API_BASE_URL}/weather/air-quality`;
export const GEOCODING_API = `${API_BASE_URL}/weather/geocoding`;

// ── Geolocation ───────────────────────────────────────────────────────────────

/** Reverse geocoder (lat/lon → city name) — via backend proxy. */
export const REVERSE_GEOCODE_API = `${API_BASE_URL}/geo/reverse`;

/** IP geolocation — city-level accuracy. Stays DIRECT: the provider geolocates
 *  the *caller's* IP, so proxying would geolocate our edge server instead. */
export const IP_GEO_API = 'https://ipapi.co/json/';

/** IP geolocation fallback — CORS-enabled. Direct for the same IP reason above. */
export const IP_GEO_FALLBACK_API = 'https://free.freeipapi.com/api/v1/json';

// ── Nepal stock market ────────────────────────────────────────────────────────

/** NEPSE OHLCV chart data — via backend proxy (api.undistracted.me/stocks/chart). */
export const NEPSE_CHART_API = `${API_BASE_URL}/stocks/chart`;

// ── International stock market ────────────────────────────────────────────────

/** Backend proxy for international chart data (CORS-safe, symbol-agnostic). */
export const INTL_CHART_API = `${API_BASE_URL}/stocks/intl-chart`;

/** Backend proxy for international symbol search. */
export const INTL_SEARCH_API = `${API_BASE_URL}/stocks/intl-search`;

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

/** NEPSE company / ticker listing — via backend proxy (api.undistracted.me/stocks/companies). */
export const NEPSE_COMPANIES_API = `${API_BASE_URL}/stocks/companies`;

// ── Daily content ─────────────────────────────────────────────────────────────

/** One random dad joke (JSON) — via backend proxy. */
export const DAILY_JOKE_API = `${API_BASE_URL}/joke`;
