/**
 * Runtime environment & feature flags.
 *
 * Set VITE_WEBSITE_MODE=true when deploying as a regular website (e.g. Vercel).
 * Leave unset (or false) for the Chrome / Firefox extension builds.
 *
 * ┌──────────────────────────────────────────┬──────────┬─────────┐
 * │ Feature                                  │ Website  │ ExtMode │
 * ├──────────────────────────────────────────┼──────────┼─────────┤
 * │ Date / clock display                     │    ✅    │   ✅    │
 * │ Nepali calendar conversion               │    ✅    │   ✅    │
 * │ Widget grid (clock, notes, countdown…)   │    ✅    │   ✅    │
 * │ Focus Mode + LookAway                    │    ✅    │   ✅    │
 * │ Weather widget (OpenWeatherMap)          │    ✅    │   ✅    │
 * │ Curated photo backgrounds (Vercel Blob)  │    ✅    │   ✅    │
 * │ localStorage persistence                 │    ✅    │   ✅    │
 * │ Dynamic browser-tab favicon (date)       │    ✅    │   ✗     │
 * ├──────────────────────────────────────────┼──────────┼─────────┤
 * │ Extension icon badge (chrome.action)     │    ✗     │   ✅    │
 * │ Google OAuth (chrome.identity)           │    ✗     │   ✅    │
 * │ Spotify OAuth (chrome.identity)          │    ✗     │   ✅    │
 * │ chrome.storage.local (token persistence) │    ✗     │   ✅    │
 * │ chrome.runtime messaging (media relay)   │    ✗     │   ✅    │
 * └──────────────────────────────────────────┴──────────┴─────────┘
 */

import manifest from '../../public/manifest.json';

/** The canonical production base URL — sourced from public/manifest.json#homepage_url. */
export const PRODUCTION_BASE_URL = manifest.homepage_url;

/** True when the app is deployed as a website rather than a browser extension. */
export const IS_WEBSITE_MODE = import.meta.env.VITE_WEBSITE_MODE === 'true';

// ─── Extension-only features ───────────────────────────────────────────────────
// All of these require chrome.* APIs. They are automatically disabled in website
// mode since the extension context (chrome.action, chrome.identity, etc.) is absent.

/**
 * chrome.identity.getAuthToken (Chrome) / launchWebAuthFlow (Firefox)
 * Used for Google Calendar, Google Contacts OAuth.
 */
export const FEATURE_GOOGLE_AUTH = !IS_WEBSITE_MODE;

/**
 * chrome.identity.launchWebAuthFlow (PKCE)
 * Used for Spotify OAuth authentication.
 */
export const FEATURE_SPOTIFY_AUTH = !IS_WEBSITE_MODE;

/**
 * chrome.storage.local
 * Used to persist OAuth tokens and cached data between browser sessions
 * without exposing them in localStorage.
 */
export const FEATURE_CHROME_STORAGE = !IS_WEBSITE_MODE;

/**
 * chrome.runtime.sendMessage / onMessage
 * Used in the background script to relay media-session data from content scripts.
 */
export const FEATURE_CHROME_MESSAGING = !IS_WEBSITE_MODE;

// ─── Website-mode alternatives ────────────────────────────────────────────────


