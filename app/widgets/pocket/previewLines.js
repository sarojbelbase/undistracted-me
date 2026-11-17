/**
 * previewLines.js — how many lines each kind clamps to before "Show more",
 * plus the shared line-clamp style object.
 *
 * The widget card uses fixed clamps (WIDGET_CLAMPS) regardless of the pref.
 * The expanded list uses the preview-length pref (Short/Medium/Long), which only
 * affects paragraph and code (the two kinds long enough to need it).
 */

import { PREVIEW_LINES, WIDGET_CLAMPS } from "./constants";

const FALLBACK = "medium";

/** Clamp line count for a kind in the list (expanded) view. */
export function previewClamp(kind, previewLength) {
  const tier = PREVIEW_LINES[previewLength] ? previewLength : FALLBACK;
  if (kind === "code") return PREVIEW_LINES[tier].code;
  if (kind === "paragraph") return PREVIEW_LINES[tier].paragraph;
  if (kind === "sentence") return 2;
  return 1; // link title is single-line
}

/** Clamp line count for a kind on the small widget card (fixed). */
export function widgetClamp(kind) {
  return WIDGET_CLAMPS[kind] ?? 2;
}

/** CSS style object for a multi-line clamp (WebKit line-clamp). */
export function clampStyle(n) {
  return {
    display: "-webkit-box",
    WebkitLineClamp: n,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  };
}

/** True when `text` is likely longer than `clamp` lines (drives "Show more"). */
export function isClamped(text, clamp) {
  const t = text || "";
  if (t.split("\n").length > clamp) return true;
  return t.length > clamp * 80; // ~80 chars/line heuristic
}
