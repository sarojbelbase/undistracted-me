/**
 * Runtime environment & feature flags.
 *
 * Set VITE_WEBSITE_MODE=true when deploying as a regular website (e.g. Cloudflare Pages).
 * Leave unset (or false) for the Chrome / Firefox extension builds.
 *
 * ┌──────────────────────────────────────────┬──────────┬─────────┐
 * │ Feature                                  │ Website  │ ExtMode │
 * ├──────────────────────────────────────────┼──────────┼─────────┤
 * │ Date / clock display                     │    ✅    │   ✅    │
 * │ Nepali calendar conversion               │    ✅    │   ✅    │
 * │ Widget grid (clock, notes, countdown…)   │    ✅    │   ✅    │
 * │ Focus Mode + LookAway                    │    ✅    │   ✅    │
 * │ Weather widget                           │    ✅    │   ✅    │
 * │ Curated photo backgrounds (Cloudflare R2)│    ✅    │   ✅    │
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
export const PRODUCTION_BASE_URL = 'https://app.undistracted.me';

/** The backend API base URL (Cloudflare Pages Functions on api.undistracted.me). */
export const API_BASE_URL = 'https://api.undistracted.me';

/** The marketing / landing site base URL. */
export const LANDING_BASE_URL = 'https://undistracted.me';

export const PLATFORMS = {
  EXTENSION: 'extension',
  PHONE: 'phone',
  WEB: 'web'
};

/** Auto-detect current runtime platform */
export const getPlatform = () => {
  if (typeof globalThis.window === 'undefined') return PLATFORMS.WEB; // SSR fallback
  
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile) return PLATFORMS.PHONE;

  const isForcedWeb = import.meta.env.VITE_WEBSITE_MODE === 'true';
  if (isForcedWeb) return PLATFORMS.WEB;

  const isExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
  if (isExtension) return PLATFORMS.EXTENSION;
  
  return PLATFORMS.WEB;
};

export const CURRENT_PLATFORM = getPlatform();

// ─── Website-mode alternatives ────────────────────────────────────────────────


