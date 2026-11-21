/**
 * actions.js: small DOM/clipboard helpers shared by the row actions and the
 * expanded Details block. Kept separate from utils.js (which stays free of
 * DOM / window references).
 */

import { quoteUrl } from "./textFragment";

export function isHttpUrl(s) {
  return /^https?:\/\//i.test(s || "");
}

/** Open a URL in a new tab, safely (no opener). */
export function openUrl(url) {
  if (!isHttpUrl(url)) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Open a saved item at its source: like Chrome's "Copy link to highlight".
 * Links open the URL directly; text saves (sentence/paragraph/code) open their
 * source page scrolled to + highlighting the selected text via a text fragment
 * (`#:~:text=…`). Falls back to the plain source page when there's no URL.
 */
export function openItemSource(item) {
  if (!item) return;
  if (item.kind === "link") return openUrl(item.text);
  if (item.sourceUrl) return openUrl(quoteUrl(item.sourceUrl, item.text, item.kind));
}

/** Copy text to the clipboard; rejects when unavailable. */
export function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  return Promise.reject(new Error("clipboard unavailable"));
}
