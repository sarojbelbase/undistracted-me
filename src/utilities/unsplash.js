/**
 * Unsplash photo utility for Focus Mode.
 *
 * Photo library model:
 *  - library[0] = currently displayed photo.
 *  - rotatePhoto()      → cycles head→tail, returns new head (never destroys).
 *  - downloadNewPhoto() → force-fetches a brand new photo, prepends to library.
 *  - deletePhoto(id)    → removes a photo from the library.
 *  - jumpToPhotoById(id)→ moves any photo to head without discarding others.
 *  - getPhotoLibrary()  → returns the full cached library.
 *
 * Requires: VITE_UNSPLASH_ACCESS_KEY in .env
 * Attribution: per Unsplash ToS every photo carries author + link.
 */

const ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY || null;
const CACHE_KEY = 'fm_unsplash_cache';
export const LIBRARY_MAX = 10;        // max photos stored in library

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
    localStorage.setItem(CACHE_KEY, JSON.stringify(items.slice(0, LIBRARY_MAX)));
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

/**
 * Fetches one photo from Unsplash and prepends it to the library.
 * @param {boolean} force — bypass the in-flight guard (for manual downloads)
 */
const fetchOne = async (force = false) => {
  if (!ACCESS_KEY) return null;
  if (_fetchInFlight && !force) return null;
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
      regular: d.urls.regular,
      small: d.urls.small,
      color: d.color || '#18191b',
      author: d.user.name,
      authorUrl: `${d.user.links.html}?utm_source=undistracted_me&utm_medium=referral`,
      photoUrl: `${d.links.html}?utm_source=undistracted_me&utm_medium=referral`,
      query,
      cachedAt: Date.now(),
    };

    // Prepend, deduplicate by id, trim to LIBRARY_MAX
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
 * Returns the photo currently at the head of the library.
 * Fetches from Unsplash only if the library is completely empty.
 * Pre-warms in the background when the library runs low.
 */
export const getCurrentPhoto = async () => {
  const cache = readCache();
  if (cache.length > 0) {
    if (cache.length < 3) fetchOne(); // background pre-warm
    return cache[0];
  }
  // Library empty — must fetch
  return fetchOne();
};

/**
 * Advance to the next photo by cycling head → tail.
 * The current photo is never discarded — it moves to the end.
 * If only one photo exists, fetches a new one first.
 */
export const rotatePhoto = async () => {
  const cache = readCache();
  if (cache.length === 0) return fetchOne();

  if (cache.length === 1) {
    // Need another photo to rotate to — fetch one first
    const newPhoto = await fetchOne();
    if (!newPhoto) return cache[0]; // fetch failed, stay on current
    // fetchOne prepended → library is now [new, old] — new is now showing
    return readCache()[0];
  }

  // Cycle: head goes to tail
  writeCache([...cache.slice(1), cache[0]]);
  const next = readCache()[0];
  if (cache.length < 4) fetchOne(); // background pre-warm
  return next;
};

/**
 * Force-fetch a brand new photo from Unsplash and prepend it to the library.
 * Bypasses the in-flight guard — explicitly user-requested.
 */
export const downloadNewPhoto = async () => {
  _fetchInFlight = false;
  return fetchOne(true);
};

/** Remove a photo from the library by id. */
export const deletePhoto = (id) => {
  writeCache(readCache().filter(c => c.id !== id));
};

/**
 * Move a specific photo to the head (current) position without
 * discarding any other photos.
 */
export const jumpToPhotoById = (id) => {
  const cache = readCache();
  const idx = cache.findIndex(c => c.id === id);
  if (idx <= 0) return; // already head or not found
  const photo = cache[idx];
  writeCache([photo, ...cache.filter(c => c.id !== id)]);
};

/** Returns the full photo library (all cached entries). */
export const getPhotoLibrary = () => readCache();

export const hasUnsplashKey = () => !!ACCESS_KEY;
export const clearPhotoCache = () => localStorage.removeItem(CACHE_KEY);
export const getCachedPhotoSync = () => readCache()[0] || null;

/**
 * Pre-warm: fetch up to 2 photos on app boot so Focus Mode
 * opens instantly with a fresh image.
 */
export const prewarmPhotos = async () => {
  if (!ACCESS_KEY) return;
  const cache = readCache();
  const needed = Math.min(LIBRARY_MAX - cache.length, 2);
  for (let i = 0; i < needed; i++) {
    await fetchOne();
    if (i < needed - 1) await new Promise(r => setTimeout(r, 300));
  }
};
