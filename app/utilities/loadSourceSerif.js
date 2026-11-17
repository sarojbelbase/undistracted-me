const SOURCE_SERIF_HREF =
  "https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;1,8..60,400&display=swap";

/**
 * loadSourceSerif — lazy-load "Source Serif 4" (the Notes widget's serif face)
 * on first use. Idempotent: a second caller (e.g. Pocket) reuses the same
 * <link>, so the font is fetched once.
 */
export function loadSourceSerif() {
  if (typeof document === "undefined") return;
  if (document.querySelector(`link[href="${SOURCE_SERIF_HREF}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = SOURCE_SERIF_HREF;
  document.head.appendChild(link);
}
