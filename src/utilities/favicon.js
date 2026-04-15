import { PRODUCTION_BASE_URL } from '../constants/env.js';

const PRIVATE_HOST_RE = /^localhost$|\.local$|\.internal$|^127\.|^192\.168\.|^10\.|^\[?::1\]?$/;

// ── Shared favicon helpers ────────────────────────────────────────────────────

// External favicon service URLs — ordered by priority (Google → DDG → Icon Horse)
export const FAVICON_SERVICES = Object.freeze({
  google: (domain, size) => `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`,
  duckduckgo: (domain) => `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  iconHorse: (domain) => `https://icon.horse/icon/${domain}`,
});

// In-session favicon cache: hostname → resolved src URL ('' means letter fallback was used)
export const faviconCache = new Map();
export const cacheFavicon = (hostname, src) => faviconCache.set(hostname, src);

export const getHostname = (url) => {
  try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname; } catch { return url; }
};

export const getDefaultName = (url) => getHostname(url).replace(/^www\./, '');

// Strip one subdomain level: app.example.com → example.com
// Returns null when already a bare domain, or when the result would be a
// known public suffix (e.g. com.np, co.uk) — those aren't real origins.
const PUBLIC_SUFFIX_RE = /^(com|co|org|net|gov|edu|ac|mil)\.[a-z]{2}$/;
export const parentDomain = (hostname) => {
  const parts = hostname.split('.');
  if (parts.length <= 2) return null;
  const parent = parts.slice(1).join('.');
  // Don't use a public suffix as a favicon origin — it will always 404
  if (PUBLIC_SUFFIX_RE.test(parent)) return null;
  return parent;
};

// Base URL for the server-side favicon waterfall API.
// - Web / dev: relative path works (Vite middleware or Vercel function)
// - Extension dev (CRXJS): pages are chrome-extension:// origin → needs absolute localhost URL
// - Extension production: needs the deployed Vercel URL
const _isExt = typeof chrome !== 'undefined' && !!chrome.runtime?.id;
const _extBase = import.meta.env.DEV ? 'http://localhost:3000' : PRODUCTION_BASE_URL;
const _faviconApiBase = _isExt ? _extBase : '';

/**
 * Builds an ordered favicon fallback chain for a URL.
 * The first entry always routes through our server-side waterfall API so the
 * browser never makes individual service requests that could 404 in the console.
 * @param {string} url    - Full or protocol-relative URL
 * @param {number} [size] - Favicon size hint in pixels (default 64)
 */
export const buildFaviconSources = (url, size = 64) => {
  const hostname = getHostname(url);
  if (faviconCache.has(hostname)) {
    const cached = faviconCache.get(hostname);
    // '' means letter fallback was used — skip network entirely
    return cached ? [cached, ''] : [''];
  }
  if (PRIVATE_HOST_RE.test(hostname)) return [''];
  return [
    // Server-side waterfall (Google → DDG → Icon Horse) — zero client-side 404s
    `${_faviconApiBase}/api/favicon?domain=${hostname}&sz=${size}`,
    // Direct Icon Horse as offline fallback for extension (virtually never 404s)
    ...(_isExt ? [FAVICON_SERVICES.iconHorse(hostname)] : []),
    // Empty string → letter initial fallback
    '',
  ];
};

// ── Color helpers ─────────────────────────────────────────────────────────────

// Generates a consistent vivid HSL color from a string (site name).
// Used for the "Letter" icon mode background.
export const nameToColor = (str) => {
  if (!str) return 'hsl(220, 60%, 50%)';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (str.codePointAt(i) ?? 0) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 62%, 48%)`;
};

// WCAG 2.1 relative luminance (IEC 61966-2-1 linearisation).
// Perceptually correct: yellow at L=0.5 in HSL has Y≈0.93 (near-white),
// while Facebook blue at L=0.52 has Y≈0.20 (genuinely mid-dark).
const linearize = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const wcagY = (r, g, b) =>
  0.2126 * linearize(r / 255) +
  0.7152 * linearize(g / 255) +
  0.0722 * linearize(b / 255);

export const extractColorFromUrl = (src, onColor) => {
  if (!src) return;
  const img = new Image();
  // Only request CORS in extension context — in a normal web page this blocks
  // favicon.ico requests and produces console errors with no benefit.
  if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
    img.crossOrigin = 'anonymous';
  }
  img.onload = () => { runExtraction(img, onColor); };
  img.src = src;
};

function buildBuckets(data) {
  const buckets = {};
  let totalOpaque = 0, transparentCount = 0, darkCount = 0, lumSum = 0;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 64) { transparentCount++; continue; }
    totalOpaque++;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
    const lum = (max + min) / 2;
    const sat = max === 0 ? 0 : (max - min) / max;
    lumSum += lum;
    if (lum < 0.2) darkCount++;
    const key = `${Math.round(r / 16)},${Math.round(g / 16)},${Math.round(b / 16)}`;
    if (!buckets[key]) buckets[key] = { r, g, b, count: 0, sat, lum };
    buckets[key].count += a / 255;
  }
  return { buckets, totalOpaque, transparentCount, darkCount };
}

function pickBestColor(entries, pool) {
  const score = (e) => e.count * (e.sat + 0.05);
  return pool.reduce((a, b) => (score(b) > score(a) ? b : a), entries[0]);
}

function runExtraction(img, onColor) {
  try {
    const SIZE = 64;
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, SIZE, SIZE);
    const data = ctx.getImageData(0, 0, SIZE, SIZE).data;
    const totalPixels = SIZE * SIZE;

    const { buckets, totalOpaque, transparentCount, darkCount } = buildBuckets(data);
    if (totalOpaque === 0) return;
    const entries = Object.values(buckets);

    // 1. Mostly-transparent icon (e.g. Spotify green logo on transparent background).
    //    Don't synthesise a flat black/white — run the vibrant selector on the brand
    //    pixels themselves so Spotify gets its green, GitHub gets its dark grey, etc.
    if (transparentCount / totalPixels > 0.45) {
      // Skip the dark-dominant early exit; just do vibrant/fallback directly on opaque pixels
      const vibrantPoolT = entries.filter(
        (e) => e.lum >= 0.2 && e.sat > 0.25 && wcagY(e.r, e.g, e.b) <= 0.5,
      );
      let poolT = vibrantPoolT.length > 0 ? vibrantPoolT : entries.filter((e) => e.lum >= 0.15);
      if (poolT.length === 0) poolT = entries;
      const bestT = pickBestColor(entries, poolT);
      if (bestT) onColor(`rgb(${bestT.r},${bestT.g},${bestT.b})`);
      return;
    }

    // 2. Dark-dominant icon (e.g. X.com black square): full pool, count wins
    if (darkCount / totalOpaque > 0.5) {
      const best = pickBestColor(entries, entries);
      if (best) onColor(`rgb(${best.r},${best.g},${best.b})`);
      return;
    }

    // 3. Vibrant-zone: WCAG Y ≤ 0.5 excludes perceptually over-bright colours
    //    (yellow Y≈0.93, Instagram bright orange-yellow Y≈0.53) so richer hues
    //    (pink, purple, orange-red) win first. If nothing passes, fall back to
    //    any non-dark pixel — bright fills like saroj amber win by pixel count.
    const vibrantPool = entries.filter(
      (e) => e.lum >= 0.2 && e.sat > 0.3 && wcagY(e.r, e.g, e.b) <= 0.5,
    );
    let pool = vibrantPool.length > 0 ? vibrantPool : entries.filter((e) => e.lum >= 0.2);
    if (pool.length === 0) pool = entries;
    const best = pickBestColor(entries, pool);
    if (best) onColor(`rgb(${best.r},${best.g},${best.b})`);
  } catch { /* CORS blocked — no background colour */ }
}
