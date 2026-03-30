/**
 * Tests for src/utilities/unsplash.js
 *
 * The Unsplash ACCESS_KEY is null in tests, so fetchOne() returns null
 * immediately without making network calls. Tests focus on cache operations:
 * rotatePhoto, deletePhoto, jumpToPhotoById, getCachedPhotoSync,
 * getPhotoLibrary, clearPhotoCache, hasUnsplashKey.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock fetch BEFORE any import of unsplash.js to prevent real network calls
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403, json: () => Promise.resolve({}) }));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  // Ensure fetch stays mocked as failing after clearAllMocks
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403, json: () => Promise.resolve({}) }));
});

afterEach(() => {
  localStorage.clear();
});

import {
  rotatePhoto, deletePhoto, jumpToPhotoById,
  getCachedPhotoSync, getPhotoLibrary,
  clearPhotoCache, hasUnsplashKey, LIBRARY_MAX,
  downloadNewPhoto,
} from '../../../src/utilities/unsplash';

const CACHE_KEY = 'fm_unsplash_cache';

const makePhoto = (n) => ({
  id: `photo_${n}`,
  url: `https://example.com/photo${n}.jpg`,
  color: '#000',
  author: `Author ${n}`,
  authorUrl: 'https://unsplash.com',
  photoUrl: 'https://unsplash.com',
  query: 'zen nature landscape',
  cachedAt: Date.now(),
});

const seedCache = (count) => {
  const photos = Array.from({ length: count }, (_, i) => makePhoto(i));
  localStorage.setItem(CACHE_KEY, JSON.stringify(photos));
  return photos;
};

// ─────────────────────────────────────────────────────────────────────────────
// Basic cache operations
// ─────────────────────────────────────────────────────────────────────────────

describe('getCachedPhotoSync', () => {
  it('returns null when cache is empty', () => {
    expect(getCachedPhotoSync()).toBeNull();
  });

  it('returns the first photo when cache has items', () => {
    const photos = seedCache(3);
    expect(getCachedPhotoSync().id).toBe(photos[0].id);
  });
});

describe('getPhotoLibrary', () => {
  it('returns empty array when cache is empty', () => {
    expect(getPhotoLibrary()).toEqual([]);
  });

  it('returns all photos in cache', () => {
    seedCache(3);
    expect(getPhotoLibrary()).toHaveLength(3);
  });
});

describe('clearPhotoCache', () => {
  it('removes the cache from localStorage', () => {
    seedCache(2);
    clearPhotoCache();
    expect(localStorage.getItem(CACHE_KEY)).toBeNull();
    expect(getPhotoLibrary()).toEqual([]);
  });

  it('is safe to call on an empty cache', () => {
    expect(() => clearPhotoCache()).not.toThrow();
  });
});

describe('hasUnsplashKey', () => {
  it('returns a boolean', () => {
    // ACCESS_KEY may or may not be set in .env — just verify type
    expect(typeof hasUnsplashKey()).toBe('boolean');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LIBRARY_MAX
// ─────────────────────────────────────────────────────────────────────────────

describe('LIBRARY_MAX', () => {
  it('is a positive number', () => {
    expect(LIBRARY_MAX).toBeGreaterThan(0);
  });

  it('equals 10', () => {
    expect(LIBRARY_MAX).toBe(10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deletePhoto
// ─────────────────────────────────────────────────────────────────────────────

describe('deletePhoto', () => {
  it('removes a photo by id', () => {
    const photos = seedCache(3);
    deletePhoto(photos[1].id);
    const lib = getPhotoLibrary();
    expect(lib).toHaveLength(2);
    expect(lib.find(p => p.id === photos[1].id)).toBeUndefined();
  });

  it('is a no-op for unknown id', () => {
    seedCache(2);
    deletePhoto('nonexistent_id');
    expect(getPhotoLibrary()).toHaveLength(2);
  });

  it('can delete the head photo', () => {
    const photos = seedCache(2);
    deletePhoto(photos[0].id);
    expect(getCachedPhotoSync()?.id).toBe(photos[1].id);
  });

  it('handles empty cache gracefully', () => {
    expect(() => deletePhoto('some_id')).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// jumpToPhotoById
// ─────────────────────────────────────────────────────────────────────────────

describe('jumpToPhotoById', () => {
  it('moves target photo to head position', () => {
    const photos = seedCache(3);
    jumpToPhotoById(photos[2].id);
    expect(getCachedPhotoSync()?.id).toBe(photos[2].id);
  });

  it('preserves all other photos in the library', () => {
    seedCache(3);
    const photo = makePhoto(99);
    const all = getPhotoLibrary();
    jumpToPhotoById(all[2].id);
    expect(getPhotoLibrary()).toHaveLength(3);
  });

  it('is a no-op if target is already the head', () => {
    const photos = seedCache(3);
    jumpToPhotoById(photos[0].id);
    expect(getCachedPhotoSync()?.id).toBe(photos[0].id);
    expect(getPhotoLibrary()).toHaveLength(3);
  });

  it('is a no-op for unknown id', () => {
    const photos = seedCache(2);
    jumpToPhotoById('nonexistent');
    // Head unchanged
    expect(getCachedPhotoSync()?.id).toBe(photos[0].id);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// rotatePhoto — no API key so fetchOne returns null
// ─────────────────────────────────────────────────────────────────────────────

describe('rotatePhoto', () => {
  it('returns null when cache is empty and fetch fails', async () => {
    // fetch is mocked to fail, so fetchOne returns null
    const result = await rotatePhoto();
    expect(result).toBeNull();
  });

  it('cycles head to tail, returning the new head when 2+ photos exist', async () => {
    const photos = seedCache(3);
    const next = await rotatePhoto();
    // Head moved to tail, photo[1] is now head
    expect(next?.id).toBe(photos[1].id);
    expect(getCachedPhotoSync()?.id).toBe(photos[1].id);
  });

  it('preserves all photos (no photo is deleted on rotate)', async () => {
    seedCache(3);
    await rotatePhoto();
    expect(getPhotoLibrary()).toHaveLength(3);
  });

  it('with single photo: fetchOne returns null → stays on current photo', async () => {
    const photos = seedCache(1);
    // fetchOne will return null because ACCESS_KEY is null
    const result = await rotatePhoto();
    // stays on current
    expect(result?.id).toBe(photos[0].id);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// downloadNewPhoto — no API key
// ─────────────────────────────────────────────────────────────────────────────

describe('downloadNewPhoto', () => {
  it('returns null when fetch fails (access key invalid or network error)', async () => {
    // fetch is mocked to return 403
    const result = await downloadNewPhoto();
    expect(result).toBeNull();
  });
});
