/**
 * Hidden Top Sites: persists the top-site URLs the user chose to hide from
 * the Quick Access widget (the "Don't show this site" context-menu action).
 * Stored in localStorage under `hidden_top_sites` (a plain JSON array of URLs).
 */

const STORAGE_KEY = "hidden_top_sites";

/** Read the list of hidden top-site URLs. Empty array on any error. */
export const getHiddenTopSites = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

/** Hide a top-site URL (idempotent). Returns the updated list. */
export const hideTopSite = (url) => {
  const next = [...new Set([...getHiddenTopSites(), url])];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
  return next;
};

/** Un-hide a top-site URL. Returns the updated list. */
export const unhideTopSite = (url) => {
  const next = getHiddenTopSites().filter((u) => u !== url);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
  return next;
};
