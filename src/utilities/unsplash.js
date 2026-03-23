/**
 * Unsplash photo utility for Focus Mode.
 *
 * Fetches landscape/zen/nature photos via the Unsplash API and caches them in
 * localStorage (URLs only, not image data). Up to MAX_CACHE URLs are stored.
 * Rotates to the next cached image after TTL_MS without a network call.
 * Pre-fetches in the background when the cache runs low.
 *
 * Requires:  VITE_UNSPLASH_ACCESS_KEY  in your .env file.
 * Attribution: per Unsplash ToS, each photo object includes author + link.
 */

const ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY || null;
const CACHE_KEY = 'fm_unsplash_cache';
const MAX_CACHE = 6;          // Max photos to keep in localStorage
const TTL_MS = 45 * 60_000;  // Rotate every 45 min

// Curated queries — calm, non-distracting imagery
const QUERIES = [
  'zen nature landscape',
  'serene mountains mist',
  'minimal ocean horizon',
  'forest morning light',
  'peaceful lake reflection',
  'desert dunes golden hour',
  'snow mountain valley',
  'coastal cliffs sunrise',
  'bamboo forest bokeh',
  'autumn forest path',
  'nordic fjord calm',
  'misty hills green',
];

// ─── Cache helpers ────────────────────────────────────────────────────────────

const readCache = () => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]'); } catch { return []; }
};

const writeCache = (items) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(items.slice(0, MAX_CACHE)));
  } catch { /* localStorage quota exceeded — silently skip */ }
};

// Pick a query we haven't used recently to maximise variety
const pickQuery = (cache) => {
  const usedQueries = new Set(cache.map(c => c.query).filter(Boolean));
  const unused = QUERIES.filter(q => !usedQueries.has(q));
  const pool = unused.length > 0 ? unused : QUERIES;
  return pool[Math.floor(Math.random() * pool.length)];
};

// ─── Fetch ────────────────────────────────────────────────────────────────────

let _fetchInFlight = false;

const fetchOne = async () => {
  if (!ACCESS_KEY || _fetchInFlight) return null;
  _fetchInFlight = true;

  const cache = readCache();
  const query = pickQuery(cache);

  try {
    const res = await fetch(
      `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&content_filter=high`,
      { headers: { Authorization: `Client-ID ${ACCESS_KEY}` } },
    );
    if (!res.ok) return null;

    const d = await res.json();
    const item = {
      id: d.id,
      url: d.urls.full,
      regular: d.urls.regular,   // ~1080p — better for performance
      small: d.urls.small,
      color: d.color || '#18191b',
      author: d.user.name,
      authorUrl: `${d.user.links.html}?utm_source=undistracted_me&utm_medium=referral`,
      photoUrl: `${d.links.html}?utm_source=undistracted_me&utm_medium=referral`,
      query,
      cachedAt: Date.now(),
    };

    // Prepend, deduplicate by id, trim to MAX_CACHE
    const fresh = readCache().filter(c => c.id !== item.id);
    writeCache([item, ...fresh]);
    return item;
  } catch {
    return null;
  } finally {
    _fetchInFlight = false;
  }
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the photo to display right now.
 * - If head of cache is fresh (< TTL_MS), return it instantly.
 * - If stale but cache has more items, pop head → return next instantly, fetch in background.
 * - If cache is empty, fetch synchronously (may be slow on first open).
 */
export const getCurrentPhoto = async () => {
  const cache = readCache();
  const head = cache[0];

  // Still fresh
  if (head && Date.now() - head.cachedAt < TTL_MS) {
    if (cache.length < 3) fetchOne(); // pre-warm in background
    return head;
  }

  // Stale — advance cache
  if (cache.length > 1) {
    writeCache(cache.slice(1));
    fetchOne(); // replenish in background
    return cache[1];
  }

  // Cache exhausted — must fetch (or return stale as fallback)
  const fresh = await fetchOne();
  return fresh || head || null;
};

/**
 * Force-advance to a new photo immediately.
 * Drops the current head and resolves to the next available photo.
 */
export const rotatePhoto = async () => {
  const cache = readCache();
  writeCache(cache.slice(1));
  return getCurrentPhoto();
};

/**
 * Pre-warm the cache with a few photos. Call once when the app boots
 * so future opens are instant.
 */
export const prewarmPhotos = async () => {
  if (!ACCESS_KEY) return;
  const cache = readCache();
  const needed = Math.min(MAX_CACHE - cache.length, 2);
  for (let i = 0; i < needed; i++) {
    await fetchOne();
    // Small gap to avoid rate-limiting
    if (i < needed - 1) await new Promise(r => setTimeout(r, 300));
  }
};

export const hasUnsplashKey = () => !!ACCESS_KEY;
export const clearPhotoCache = () => localStorage.removeItem(CACHE_KEY);

/** Synchronously reads the first cached photo — useful for initial render. */
export const getCachedPhotoSync = () => readCache()[0] || null;
