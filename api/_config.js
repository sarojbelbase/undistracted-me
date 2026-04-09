/**
 * Shared constants for Vercel API route handlers.
 * Prefixed with _ so Vercel does not expose this as an HTTP endpoint.
 *
 * The production URL is read from package.json#homepage — single source of truth.
 */

import { createRequire } from 'module';
const { homepage_url } = createRequire(import.meta.url)('../public/manifest.json');

export const PRODUCTION_BASE_URL = homepage_url;

/**
 * Regex that matches every valid request origin:
 * Chrome/Firefox extensions, the production site, and local dev servers.
 */
export const ALLOWED_ORIGINS =
  /^chrome-extension:\/\/|^moz-extension:\/\/|^https:\/\/undistractedme\.sarojbelbase\.com\.np|^http:\/\/localhost(:\d+)?$/;

/**
 * Regex for private/local hostnames that should never be sent to external favicon services.
 */
export const PRIVATE_HOST_RE = /^localhost$|\.local$|\.internal$|^127\.|^192\.168\.|^10\.|^\[?::1\]?$/;

/**
 * Favicon waterfall services — ordered by preference.
 * The server tries each in sequence and returns the first successful image.
 */
export const FAVICON_SERVICES = [
  (domain, sz) => `https://www.google.com/s2/favicons?domain=${domain}&sz=${sz}`,
  (domain) => `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  (domain) => `https://icon.horse/icon/${domain}`,
];
