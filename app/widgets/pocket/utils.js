/**
 * Pocket — pure, unit-tested helpers.
 * No React, no storage, no DOM. Imported by both bg.js (service worker) and
 * the new-tab widget. classifyKind, dedupe, search, grouping and mergeStates
 * all live here so they can be tested in isolation.
 */

import { MAX_TEXT_LENGTH, MAX_FOLDER_NAME_LENGTH } from "./constants";

const TRACKING_PARAMS = new Set(["fbclid", "gclid", "mc_cid", "igshid"]);

const VALID_KINDS = new Set(["link", "word", "sentence", "paragraph", "code"]);

// Each marker contributes at most 1 to the code-likeness score (presence, not
// occurrence count), so a short snippet with a couple of signals qualifies
// while a plain English sentence does not.
const CODE_MARKERS = [
  { re: /=>/, score: 1 },
  { re: /\bfunction\b/, score: 1 },
  { re: /\bdef\s/, score: 1 },
  { re: /\bimport\s/, score: 1 },
  { re: /\b(class|const|let|var)\b/, score: 1 },
  { re: /[{}]/, score: 1 },
  { re: /;/, score: 1 },
  { re: /<\/[a-zA-Z]/, score: 1 },
];

/** code-likeness score: count distinct signals (0..N). */
export function codeLikeness(text) {
  let score = 0;
  for (const m of CODE_MARKERS) {
    if (m.re.test(text)) score += m.score;
  }
  const lines = text.split("\n");
  // Indented lines (2+ spaces or a tab), excluding the first line, imply code.
  if (lines.length > 1 && lines.slice(1).some((l) => /^( {2,}|\t)/.test(l))) {
    score += 1;
  }
  return score;
}

/** True when text is exactly one http(s) URL (no surrounding whitespace). */
export function isSingleHttpUrl(text) {
  if (/\s/.test(text)) return false;
  try {
    const u = new URL(text);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** True when text is exactly one word (hyphens/apostrophes allowed), ≤40 chars. */
export function isSingleWord(text) {
  return (
    text.length <= 40 &&
    /^[\p{L}\p{N}'’\-]+$/u.test(text) &&
    /\p{L}/u.test(text)
  );
}

/**
 * classifyKind(text, context) → "link" | "word" | "sentence" | "paragraph" | "code"
 * context: { fromLink, fromPage, codeContext } — hints from the save origin.
 */
export function classifyKind(text, context = {}) {
  const t = (text ?? "").trim();
  if (!t) return "paragraph";
  if (context.fromLink || context.fromPage || isSingleHttpUrl(t)) return "link";
  if (
    context.codeContext ||
    (codeLikeness(t) >= 2 && (t.includes("\n") || t.length >= 20))
  ) {
    return "code";
  }
  if (isSingleWord(t)) return "word";
  if (!t.includes("\n") && t.length <= 280) return "sentence";
  return "paragraph";
}

/** Strip tracking params (utm_*, fbclid, gclid, mc_cid, igshid). http(s) only. */
export function cleanUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return url;
    for (const key of [...u.searchParams.keys()]) {
      if (key.startsWith("utm_") || TRACKING_PARAMS.has(key)) {
        u.searchParams.delete(key);
      }
    }
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * cleanText: normalize newlines, trim, collapse 3+ blank lines to 2, cap at
 * MAX_TEXT_LENGTH. Returns { text, truncated }.
 */
export function cleanText(text) {
  let t = (text ?? "").replace(/\r\n?/g, "\n").trim();
  t = t.replace(/\n{3,}/g, "\n\n");
  const truncated = t.length > MAX_TEXT_LENGTH;
  if (truncated) t = t.slice(0, MAX_TEXT_LENGTH);
  return { text: t, truncated };
}

/** Canonical form for dedupe. Words are case-insensitive; everything else is trim-only. */
export function normalizeText(text, kind) {
  const t = (text ?? "").trim();
  return kind === "word" ? t.toLowerCase() : t;
}

/** Stable dedupe key: kind + normalized text. */
export function dedupeKey(item) {
  return `${item.kind}\u0000${normalizeText(item.text, item.kind)}`;
}

/**
 * findDuplicate(items, item) → existing non-deleted item with the same dedupe
 * key, or null. Pure.
 */
export function findDuplicate(items, item) {
  const key = dedupeKey(item);
  for (const it of items) {
    if (!it.deletedAt && dedupeKey(it) === key) return it;
  }
  return null;
}

/** Lowercase host key ("www." stripped; "" if none). */
export function hostFromUrl(url) {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Muted hue for letter tiles, derived from a hash of the host. */
export function hostHueColor(str) {
  let h = 0;
  const s = str || "";
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return `hsl(${h}, 42%, 40%)`;
}

/** Live filter across text, title, host and folder names (all lowercase). */
export function searchItems(items, folders, query) {
  const alive = items.filter((it) => !it.deletedAt);
  const q = (query ?? "").trim().toLowerCase();
  if (!q) return alive;
  const folderNameById = new Map(folders.map((f) => [f.id, f.name.toLowerCase()]));
  return alive.filter((it) => {
    const haystack = [
      it.text,
      it.title,
      it.host,
      ...(it.folderIds || []).map((id) => folderNameById.get(id) || ""),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

/** Group items by host, ordered by most recent save. Returns [{host, items, latest}]. */
export function groupBySite(items) {
  const groups = new Map();
  for (const it of items) {
    if (it.deletedAt) continue;
    const host = it.host || "";
    if (!groups.has(host)) groups.set(host, []);
    groups.get(host).push(it);
  }
  return [...groups.entries()]
    .map(([host, list]) => ({
      host,
      items: list.sort((a, b) => b.updatedAt - a.updatedAt),
      latest: Math.max(...list.map((i) => i.updatedAt)),
    }))
    .sort((a, b) => b.latest - a.latest);
}

/** Bucket a timestamp: "today" | "yesterday" | "week" | "earlier". */
export function timeBucket(ts) {
  const now = new Date();
  const d = new Date(ts);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfToday - startOfDay) / 86400000);
  if (dayDiff <= 0) return "today";
  if (dayDiff === 1) return "yesterday";
  if (dayDiff < 7) return "week";
  return "earlier";
}

export const TIME_BUCKET_LABELS = Object.freeze({
  today: "Today",
  yesterday: "Yesterday",
  week: "Earlier this week",
  earlier: "Earlier",
});

const TOMBSTONE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

// wins(a, b): a beats b when a has a newer updatedAt; a tombstone (deletedAt)
// beats a non-tombstone of the same update time.
function wins(a, b) {
  const au = a.updatedAt || 0;
  const bu = b.updatedAt || 0;
  if (au !== bu) return au > bu;
  return !!a.deletedAt && !b.deletedAt;
}

/**
 * mergeStates(local, remote) → { items, folders }
 * Pure merge: per id the higher updatedAt wins; tombstones beat older edits;
 * purge tombstones older than 30 days; deleting a folder removes its id from
 * items' folderIds. Used by Import now; by Drive sync in Phase 2.
 */
export function mergeStates(local, remote) {
  const l = local || { items: [], folders: [] };
  const r = remote || { items: [], folders: [] };
  const now = Date.now();

  const mergedItems = new Map();
  for (const it of [...l.items, ...r.items]) {
    const prev = mergedItems.get(it.id);
    if (!prev || wins(it, prev)) mergedItems.set(it.id, { ...it });
  }

  const mergedFolders = new Map();
  for (const f of [...l.folders, ...r.folders]) {
    const prev = mergedFolders.get(f.id);
    if (!prev || wins(f, prev)) mergedFolders.set(f.id, { ...f });
  }

  const aliveFolderIds = new Set(
    [...mergedFolders.values()].filter((f) => !f.deletedAt).map((f) => f.id),
  );

  const items = [...mergedItems.values()]
    .filter((it) => !(it.deletedAt && now - it.deletedAt > TOMBSTONE_TTL))
    .map((it) => {
      const folderIds = (it.folderIds || []).filter((id) => aliveFolderIds.has(id));
      return folderIds.length === (it.folderIds || []).length ? it : { ...it, folderIds };
    })
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const folders = [...mergedFolders.values()]
    .filter((f) => !(f.deletedAt && now - f.deletedAt > TOMBSTONE_TTL))
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  return { items, folders };
}

/**
 * sanitizeImport(data) → { items, folders }
 * Validate + coerce imported JSON to the Pocket schema before merging. Drops
 * malformed records and clamps text/name lengths. Pure, unit-tested.
 */
export function sanitizeImport(data) {
  if (!data || typeof data !== "object") return { items: [], folders: [] };
  const rawItems = Array.isArray(data.items) ? data.items : [];
  const rawFolders = Array.isArray(data.folders) ? data.folders : [];

  const items = [];
  for (const raw of rawItems) {
    if (!raw || typeof raw !== "object") continue;
    if (typeof raw.id !== "string" || typeof raw.text !== "string") continue;
    if (!VALID_KINDS.has(raw.kind)) continue;
    items.push({
      id: raw.id,
      kind: raw.kind,
      text: raw.text.slice(0, MAX_TEXT_LENGTH),
      title: typeof raw.title === "string" ? raw.title : "",
      host: typeof raw.host === "string" ? raw.host : "",
      sourceUrl: typeof raw.sourceUrl === "string" ? raw.sourceUrl : "",
      favicon: typeof raw.favicon === "string" ? raw.favicon : "",
      folderIds: Array.isArray(raw.folderIds)
        ? raw.folderIds.filter((x) => typeof x === "string")
        : [],
      createdAt: Number(raw.createdAt) || Date.now(),
      updatedAt: Number(raw.updatedAt) || Date.now(),
      deletedAt: raw.deletedAt == null ? null : Number(raw.deletedAt),
    });
  }

  const folders = [];
  for (const raw of rawFolders) {
    if (!raw || typeof raw !== "object") continue;
    if (typeof raw.id !== "string" || typeof raw.name !== "string") continue;
    folders.push({
      id: raw.id,
      name: raw.name.slice(0, MAX_FOLDER_NAME_LENGTH),
      color: typeof raw.color === "string" ? raw.color : "slate",
      order: Number(raw.order) || 0,
      createdAt: Number(raw.createdAt) || Date.now(),
      updatedAt: Number(raw.updatedAt) || Date.now(),
      deletedAt: raw.deletedAt == null ? null : Number(raw.deletedAt),
    });
  }

  return { items, folders };
}
