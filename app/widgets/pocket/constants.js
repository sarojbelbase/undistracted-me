/**
 * Pocket widget — pure constants and theme tokens.
 * Colors and limits live here (never inline in components) so profiles,
 * accents and dark mode restyle the widget for free.
 *
 * This module is imported by the service worker (contextMenu.js), so keep it
 * free of React / DOM / icon imports — only data.
 */

export const KINDS = Object.freeze(["link", "sentence", "paragraph", "code"]);

export const KIND_META = Object.freeze({
  link: { label: "Links", singular: "Link" },
  sentence: { label: "Sentences", singular: "Sentence" },
  paragraph: { label: "Paragraphs", singular: "Paragraph" },
  code: { label: "Code", singular: "Code" },
});

// Starter user folders (first run only). Normal: renamable, deletable.
export const STARTER_FOLDERS = Object.freeze([
  { name: "Read later", color: "blue" },
  { name: "Quotes", color: "amber" },
  { name: "Ideas", color: "violet" },
]);

// 6 muted folder swatches. Used as small color dots; readable in light + dark.
// "slate" is the grey swatch — new folders never default to it (§2 P2).
export const FOLDER_COLORS = Object.freeze([
  { id: "slate", value: "#8b98a8" },
  { id: "blue", value: "#6d9ee8" },
  { id: "mint", value: "#5fb8a1" },
  { id: "amber", value: "#e0a64e" },
  { id: "rose", value: "#e08a9a" },
  { id: "violet", value: "#a893e8" },
]);

export const FOLDER_COLOR_MAP = Object.freeze(
  Object.fromEntries(FOLDER_COLORS.map((c) => [c.id, c.value])),
);

// Letter-tile glyph color. Fixed white so text stays AA on the derived host hue
// (spec §6: muted hue from a host hash, token-based lightness for contrast).
export const TILE_TEXT_COLOR = "#fff";

export const MAX_TEXT_LENGTH = 20000;
export const MAX_FOLDER_NAME_LENGTH = 24;
export const PAGE_SIZE = 50; // "Load more" at 50 per page

// ─── Grouping / density / preview option arrays (Section 10) ────────────────

export const GROUP_BY_OPTIONS = Object.freeze([
  { label: "Date", value: "date" },
  { label: "Website", value: "website" },
]);

export const DENSITY_OPTIONS = Object.freeze([
  { label: "Comfortable", value: "comfortable" },
  { label: "Compact", value: "compact" },
]);

export const PREVIEW_LENGTH_OPTIONS = Object.freeze([
  { label: "Short", value: "short" },
  { label: "Medium", value: "medium" },
  { label: "Long", value: "long" },
]);

// Lines shown before "Show more" per kind, per preview length.
// Short = 3/4, Medium = 4/6, Long = 8/12 (paragraph / code).
export const PREVIEW_LINES = Object.freeze({
  short: { paragraph: 3, code: 4 },
  medium: { paragraph: 4, code: 6 },
  long: { paragraph: 8, code: 12 },
});

// Fixed clamps on the small widget card (independent of the preview-length pref).
export const WIDGET_CLAMPS = Object.freeze({
  link: 1, // title
  sentence: 2,
  paragraph: 2,
  code: 3,
});

export const WIDGET_ITEMS_OPTIONS = Object.freeze([3, 5, 8, 10]);
export const DEFAULT_WIDGET_ITEMS = 5;

// A character counter appears past this threshold, capping at MAX_TEXT_LENGTH.
export const CHAR_COUNTER_THRESHOLD = 15000;

// Storage keys (chrome.storage.local). Never read these directly from UI code.
export const POCKET_KEYS = Object.freeze({
  items: "pocket:items",
  folders: "pocket:folders",
  meta: "pocket:meta",
});

// ─── Empty-state copy (Section 11) ──────────────────────────────────────────
// One title, one sentence, at most one action button. No numbered steps.

export const EMPTY_COPY = Object.freeze({
  all: {
    title: "Nothing saved yet.",
    text: "Select text on any page, right-click, and choose Add to Undistracted Me.",
  },
  link: {
    title: "No links yet.",
    text: "Right-click a link or a page and choose Add to Undistracted Me.",
  },
  sentence: {
    title: "No sentences yet.",
    text: "Select a sentence on any page and choose Add to Undistracted Me.",
  },
  paragraph: {
    title: "No paragraphs yet.",
    text: "Select a few sentences on any page and choose Add to Undistracted Me.",
  },
  code: {
    title: "No code yet.",
    text: "Select code on any page and choose Add to Undistracted Me.",
  },
});
