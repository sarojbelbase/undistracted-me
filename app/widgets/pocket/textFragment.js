/**
 * textFragment.js — build "Open at Quote" URLs using the WICG Text Fragments
 * directive (`#:~:text=`). Pure and unit-tested. If the browser ignores the
 * fragment, the page still opens normally.
 *
 * Rules (spec §8.5):
 *  - collapse whitespace
 *  - full text if ≤ 120 chars, else "first 6 words,last 6 words"
 *  - for code, use only the first line
 *  - percent-encode, including "-", "," and "&"
 *  - strip any existing hash from the source URL
 */

/** Collapse all runs of whitespace to single spaces. */
export function collapseWhitespace(text) {
  return (text || "").replace(/\s+/g, " ").trim();
}

/**
 * Build the text-fragment directive value (not yet percent-encoded).
 * The comma in the long-text case is the start/end separator of the directive,
 * so the browser highlights from the first 6 words to the last 6 words.
 */
export function buildTextFragment(text, kind) {
  const raw = (text || "").trim();
  if (!raw) return "";
  // For code, quote only the first line (taken before newlines are collapsed).
  if (kind === "code") return collapseWhitespace(raw.split("\n")[0]);
  const t = collapseWhitespace(raw);
  if (t.length <= 120) return t;
  const words = t.split(" ");
  const head = words.slice(0, 6).join(" ");
  const tail = words.slice(-6).join(" ");
  return `${head},${tail}`;
}

/**
 * Percent-encode a fragment value. `encodeURIComponent` already encodes "," and
 * "&", but leaves "-" (a prefix/suffix delimiter in the directive) untouched —
 * patch that so a literal dash is matched, not interpreted.
 */
export function encodeFragment(str) {
  return encodeURIComponent(str).replace(/-/g, "%2D");
}

/** Full "Open at Quote" URL. Returns the base URL when there is nothing to quote. */
export function quoteUrl(sourceUrl, text, kind) {
  const base = (sourceUrl || "").replace(/#.*$/, "");
  const fragment = buildTextFragment(text, kind);
  if (!base || !fragment) return base;
  return `${base}#:~:text=${encodeFragment(fragment)}`;
}
