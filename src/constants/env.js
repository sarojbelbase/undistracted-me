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
 * │ Google OAuth (chrome.identity)           │    ✗     │   ✅    │
 * │ Spotify OAuth (chrome.identity)          │    ✗     │   ✅    │
 * │ chrome.storage.local (token persistence) │    ✗     │   ✅    │
 * │ chrome.runtime messaging (media relay)   │    ✗     │   ✅    │
 * └──────────────────────────────────────────┴──────────┴─────────┘
 */

/** The canonical production base URL. */
export const PRODUCTION_BASE_URL = 'https://undistractedme.sarojbelbase.com.np';

export const PLATFORMS = {
  EXTENSION: 'extension',
  PHONE: 'phone',
  WEB: 'web'
};

/** Auto-detect current runtime platform */
export const getPlatform = () => {
  if (typeof window === 'undefined') return PLATFORMS.WEB; // SSR fallback
  
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile) return PLATFORMS.PHONE;

  const isForcedWeb = import.meta.env.VITE_WEBSITE_MODE === 'true';
  if (isForcedWeb) return PLATFORMS.WEB;

  const isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
  if (isExtension) return PLATFORMS.EXTENSION;
  
  return PLATFORMS.WEB;
};

export const CURRENT_PLATFORM = getPlatform();

// ─── Extension-only features ───────────────────────────────────────────────────
// All of these require chrome.* APIs. They are automatically disabled outside the extension
// context (chrome.action, chrome.identity, etc. are absent on web/phone).

/**
 * chrome.identity.getAuthToken (Chrome) / launchWebAuthFlow (Firefox)
 * Used for Google Calendar, Google Contacts OAuth.
 */
export const FEATURE_GOOGLE_AUTH = CURRENT_PLATFORM === PLATFORMS.EXTENSION;

/**
 * chrome.identity.launchWebAuthFlow (PKCE)
 * Used for Spotify OAuth authentication.
 */
export const FEATURE_SPOTIFY_AUTH = CURRENT_PLATFORM === PLATFORMS.EXTENSION;

/**
 * chrome.storage.local
 * Used to persist OAuth tokens and cached data between browser sessions
 * without exposing them in localStorage.
 */
export const FEATURE_CHROME_STORAGE = CURRENT_PLATFORM === PLATFORMS.EXTENSION;

/**
 * chrome.runtime.sendMessage / onMessage
 * Used in the background script to relay media-session data from content scripts.
 */
export const FEATURE_CHROME_MESSAGING = CURRENT_PLATFORM === PLATFORMS.EXTENSION;

// ─── Website-mode alternatives ────────────────────────────────────────────────


