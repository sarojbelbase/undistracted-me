/**
 * Shared Bookmark Store
 *
 * Single source of truth for bookmarks across the popup and canvas dashboard.
 * Uses localStorage key `um_bookmarks` — persisted as a JSON array.
 *
 * Both the popup and the canvas bookmark widget read from and write to
 * this store, ensuring full bidirectional sync.
 *
 * Shape: { url, title, iconMode?: 'favicon' | 'letter', addedAt: number }
 */

const STORE_KEY = "um_bookmarks";

/** Load all bookmarks from persistent storage. */
export const loadBookmarks = () => {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
  } catch {
    return [];
  }
};

/** Replace the full bookmark list. */
const saveBookmarks = (list) => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
    // Dispatch so any open canvas tabs can re-read
    window.dispatchEvent(
      new CustomEvent("um_bookmarks_changed", { detail: list }),
    );
  } catch {
    /* storage unavailable */
  }
};

/**
 * Add a bookmark — prevents duplicates by URL.
 * Returns the updated list.
 */
export const addBookmark = (bm) => {
  const list = loadBookmarks();
  if (list.some((b) => b.url === bm.url)) return list;
  const next = [
    {
      ...bm,
      addedAt: bm.addedAt || Date.now(),
      iconMode: bm.iconMode || "favicon",
    },
    ...list,
  ].slice(0, 20);
  saveBookmarks(next);
  return next;
};

/** Subscribe to bookmark changes from other tabs (cross-context sync). */
export const onBookmarksChanged = (callback) => {
  const storageHandler = (e) => {
    if (e.key === STORE_KEY) callback();
  };
  const customHandler = () => callback();
  window.addEventListener("storage", storageHandler);
  window.addEventListener("um_bookmarks_changed", customHandler);
  return () => {
    window.removeEventListener("storage", storageHandler);
    window.removeEventListener("um_bookmarks_changed", customHandler);
  };
};

/**
 * Remove a bookmark by URL.
 * Returns the updated list.
 */
export const removeBookmark = (url) => {
  const next = loadBookmarks().filter((b) => b.url !== url);
  saveBookmarks(next);
  return next;
};

/**
 * Check if a URL is already bookmarked.
 */
export const isBookmarked = (url) => {
  return loadBookmarks().some((b) => b.url === url);
};
