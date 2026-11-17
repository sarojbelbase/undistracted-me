/**
 * Pocket widget — pure constants and theme tokens.
 * Colors and limits live here (never inline in components) so profiles,
 * accents and dark mode restyle the widget for free.
 */

export const KINDS = Object.freeze(["link", "word", "sentence", "paragraph", "code"]);

export const KIND_META = Object.freeze({
  link: { label: "Links", singular: "Link" },
  word: { label: "Words", singular: "Word" },
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
export const RECENT_LIMIT = 20; // Recent tab shows newest 20
export const COMPACT_ROWS = 4; // compact container shows 4 rows

// Storage keys (chrome.storage.local). Never read these directly from UI code.
export const POCKET_KEYS = Object.freeze({
  items: "pocket:items",
  folders: "pocket:folders",
  meta: "pocket:meta",
});
