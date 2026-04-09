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
 * Photo source: Vercel curated proxy — VITE_PHOTOS_API_URL or the
 *   hardcoded fallback undistractedme.vercel.app/api/photos/curated.
 *
 * Attribution: per Unsplash ToS every photo carries author + link.
 */

import { PRODUCTION_BASE_URL } from '../constants/env.js';

const PHOTOS_API_URL = import.meta.env.VITE_PHOTOS_API_URL
  || `${PRODUCTION_BASE_URL}/api/photos/curated`;
/** Shared secret sent as X-API-Key header to the Vercel proxy. */
const PHOTOS_API_KEY = import.meta.env.VITE_API_KEY || null;

const CACHE_KEY = 'fm_unsplash_cache';
export const LIBRARY_MAX = 10;        // max photos stored in library

// ─── Cache helpers ────────────────────────────────────────────────────────────

const readCache = () => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]'); } catch { return []; }
};

const writeCache = (items) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(items.slice(0, LIBRARY_MAX)));
  } catch { /* localStorage quota exceeded — silently skip */ }
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the photo currently at the head of the library.
 * Fetches from Unsplash only if the library is completely empty.
 * Pre-warms in the background when the library runs low.
 */
export const getCurrentPhoto = async () => {
  const cache = readCache();
  if (cache.length > 0) return cache[0];
  // Library empty — download the curated set
  const photos = await downloadCuratedPhotos();
  return photos?.[0] || null;
};

/**
 * Advance to the next photo by cycling head → tail.
 * The current photo is never discarded — it moves to the end.
 * If only one photo exists, fetches a new one first.
 */
export const rotatePhoto = async () => {
  const cache = readCache();
  if (cache.length === 0) {
    const photos = await downloadCuratedPhotos();
    return photos?.[0] || null;
  }
  if (cache.length === 1) return cache[0]; // only one photo, stay on it
  // Cycle: head goes to tail
  writeCache([...cache.slice(1), cache[0]]);
  return readCache()[0];
};

/** Re-download the curated set and return the first photo. */
export const downloadNewPhoto = async () => {
  const photos = await downloadCuratedPhotos();
  return photos?.[0] || null;
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

/** True when photo fetching is available (direct key OR proxy API). */
export const hasUnsplashKey = () => !!PHOTOS_API_URL;
export const clearPhotoCache = () => localStorage.removeItem(CACHE_KEY);
export const getCachedPhotoSync = () => readCache()[0] || null;

/**
 * Pre-warm: fetch up to 2 photos on app boot so Focus Mode
 * opens instantly with a fresh image.
 */
export const prewarmPhotos = async () => {
  if (readCache().length > 0) return;
  await downloadCuratedPhotos();
};

// ─── Background source ────────────────────────────────────────────────────────

export const BG_SOURCE_KEY = 'fm_bg_source';

/** Returns the active background source: 'default' | 'curated' | 'custom'. */
export const getBgSource = () => {
  try { return localStorage.getItem(BG_SOURCE_KEY) || 'default'; }
  catch { return 'default'; }
};

/** Persists the background source choice. */
export const setBgSource = (src) => {
  try { localStorage.setItem(BG_SOURCE_KEY, src); }
  catch { }
};

// ─── Download curated set ─────────────────────────────────────────────────────

/**
 * Fetch the complete curated photo list from the Vercel proxy and replace
 * the local library with those photos.
 *
 * Returns the array of downloaded photos (may be fewer than 10 if the
 * server returned errors), or null on network failure.
 */
export const downloadCuratedPhotos = async () => {
  const headers = {};
  if (PHOTOS_API_KEY) headers['X-Api-Key'] = PHOTOS_API_KEY;

  try {
    const res = await fetch(PHOTOS_API_URL, { headers });
    if (!res.ok) return null;
    const photos = await res.json();
    if (!Array.isArray(photos) || photos.length === 0) return null;

    const stamped = photos.map(p => ({ ...p, cachedAt: Date.now() }));
    writeCache(stamped);
    return stamped;
  } catch {
    return null;
  }
};
