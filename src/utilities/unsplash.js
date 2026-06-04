/**
 * Unsplash photo utility for Focus Mode.
 *
 * Photo library model:
 *  - library[0] = currently displayed photo.
 *  - rotatePhoto()      → cycles head→tail, returns new head (never destroys).
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
export const LIBRARY_MAX = 20;

/** Persists the ID of the photo the user last explicitly chose. */
const SELECTED_KEY = 'fm_selected_photo_id';
const getSelectedPhotoId = () => { try { return localStorage.getItem(SELECTED_KEY) || null; } catch { return null; } };
export const setSelectedPhotoId = (id) => { try { if (id) localStorage.setItem(SELECTED_KEY, id); else localStorage.removeItem(SELECTED_KEY); } catch { } };

/** Persists the ID of the currently displayed photo (updated on every change, including auto-rotate). */
const CURRENT_KEY = 'fm_current_photo_id';
const getCurrentPhotoId = () => { try { return localStorage.getItem(CURRENT_KEY) || null; } catch { return null; } };
export const setCurrentPhotoId = (id) => { try { if (id) localStorage.setItem(CURRENT_KEY, id); else localStorage.removeItem(CURRENT_KEY); } catch { } };

/**
 * Compute a ~200 px thumbnail URL for a cached photo entry.
 * Uses Vercel Image Optimization served from the production deployment so
 * it works from any environment — local dev, staging, or extension.
 * Falls back to the full-res URL when no source URL is available.
 *
 * Since we now strip non-essential fields from the cache (see stripPhotoFields),
 * `small` and `thumb` may not exist. Compute from `regular` or `url` directly.
 */
export const getThumbUrl = (photo) => {
  if (!photo) return null;
  // In local dev, /_vercel/image is cross-origin and CORS-blocked. Use the raw blob URL directly.
  const isLocalDev = typeof location !== 'undefined' && location.hostname === 'localhost';
  const src = photo.regular || photo.url;
  if (isLocalDev) return src || null;
  if (!src) return null;
  return `${PRODUCTION_BASE_URL}/_vercel/image?url=${encodeURIComponent(src)}&w=200&q=70`;
};

// ─── Cache helpers ────────────────────────────────────────────────────────────

let _libraryCache = null;

const readCache = () => {
  if (_libraryCache !== null) return _libraryCache;
  try { _libraryCache = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]'); } catch { _libraryCache = []; }
  return _libraryCache;
};

const writeCache = (items) => {
  _libraryCache = items.slice(0, LIBRARY_MAX);
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(_libraryCache)); } catch { /* quota exceeded */ }
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the photo currently at the head of the library.
 * Fetches from Unsplash only if the library is completely empty.
 * Pre-warms in the background when the library runs low.
 */
export const getCurrentPhoto = async () => {
  const cache = readCache();
  if (cache.length === 0) {
    await downloadCuratedPhotos();
    return readCache()[0] || null;
  }
  // Restore the previously displayed photo on wake/sleep cycles
  const currentId = getCurrentPhotoId();
  if (currentId) {
    const found = cache.find((c) => c.id === currentId);
    if (found) return found;
  }
  return cache[0];
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
  const next = readCache()[0];
  setCurrentPhotoId(next?.id ?? null);
  return next;
};

/** Remove a photo from the library by id. */
export const deletePhoto = (id) => {
  writeCache(readCache().filter(c => c.id !== id));
};

/**
 * Persist a dominant color extracted from a photo's thumbnail back into
 * the cache entry so it survives page refresh as an immediate placeholder.
 */
export const updatePhotoColor = (id, color) => {
  const cache = readCache();
  const idx = cache.findIndex(p => p.id === id);
  if (idx < 0) return;
  cache[idx] = { ...cache[idx], color };
  writeCache(cache);
};

/**
 * Move a specific photo to the head (current) position without
 * discarding any other photos. Also persists the selection so it
 * survives page refresh and cache overwrites.
 */
export const jumpToPhotoById = (id, photoData = null) => {
  if (!id) return;
  const cache = readCache();
  const idx = cache.findIndex(c => c.id === id);
  if (idx < 0 && photoData) {
    // Photo not in cache (sliced out by LIBRARY_MAX) — insert at head.
    writeCache([photoData, ...cache]);
  } else if (idx > 0) {
    // Already in cache but not at head — move to head.
    const photo = cache[idx];
    writeCache([photo, ...cache.filter(c => c.id !== id)]);
  }
  // Always persist the explicit selection regardless of position.
  setSelectedPhotoId(id);
};

/** Returns the full photo library (all cached entries). */
export const getPhotoLibrary = () => readCache();

/** True when photo fetching is available (direct key OR proxy API). */
export const clearPhotoCache = () => { _libraryCache = null; localStorage.removeItem(CACHE_KEY); };
export const getCachedPhotoSync = () => readCache()[0] || null;

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
 * Strip non-essential fields from a photo object before storing.
 *
 * The full API response includes `small`, `thumb`, `description`, `width`,
 * `height`, and other fields we never read. Stripping them reduces
 * localStorage footprint from ~2 KB/photo to ~400 bytes/photo — a 5× saving.
 *
 * Essential fields kept:
 *  - id, regular, url  — display URLs
 *  - color              — dominant colour for background placeholder
 *  - author, authorUrl  — Unsplash attribution (ToS requirement)
 *  - cachedAt           — cache freshness tracking
 */
const ESSENTIAL_FIELDS = ['id', 'regular', 'url', 'color', 'author', 'authorUrl', 'cachedAt'];

const stripPhotoFields = (photo) => {
  const stripped = {};
  for (const k of ESSENTIAL_FIELDS) {
    if (photo[k] !== undefined) stripped[k] = photo[k];
  }
  return stripped;
};

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

    const stamped = photos.map(p => stripPhotoFields({ ...p, cachedAt: Date.now() }));
    writeCache(stamped);
    // Re-apply the user's last explicit selection so page refreshes and
    // concurrent downloads don't discard their chosen photo.
    // Pass the full photo object so it can be inserted if it was sliced
    // out by LIBRARY_MAX (e.g. alphabetically ordered past position 20).
    const selectedId = getSelectedPhotoId();
    if (selectedId) {
      const selectedPhoto = stamped.find(p => p.id === selectedId) || null;
      jumpToPhotoById(selectedId, selectedPhoto);
    }
    return stamped;
  } catch {
    return null;
  }
};
