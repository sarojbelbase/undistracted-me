/**
 * pocketStore: the single access point for Pocket data (storage.local).
 * UI components and the service worker go through here; nothing touches
 * chrome.storage / localStorage directly. Mirrors app/data/dataHub.js.
 *
 * Keys: "pocket:items", "pocket:folders", "pocket:meta" (schema 1).
 * Pure logic (classifyKind, dedupe, search, grouping, merge) lives in utils.js.
 */

import { POCKET_KEYS } from "./constants";
import { track, TELEMETRY_EVENTS } from "../../utilities/telemetry";
import {
  findDuplicate,
  mergeStates,
  sanitizeImport,
  hostFromUrl,
  nextFolderColor,
} from "./utils";

const hasChromeStorage =
  typeof chrome !== "undefined" &&
  typeof chrome.storage?.local?.get === "function";
const hasWindow = typeof window !== "undefined";

const ALL_KEYS = [POCKET_KEYS.items, POCKET_KEYS.folders, POCKET_KEYS.meta];

const DEFAULT_META = Object.freeze({
  schema: 1,
  syncEnabled: false,
  lastSyncAt: null,
  driveFileId: null,
  prefs: {
    groupBy: "date", // "date" | "website"
    density: "comfortable", // "comfortable" | "compact"
    showSiteIcons: true,
    previewLength: "medium", // "short" | "medium" | "long"
    wrapCode: false,
    widgetItems: 10,
    pageNotice: true,
    askOnPaste: true,
    cleanLinks: true,
    skipDuplicates: true,
    defaultFolderId: null,
    foldersOpen: true, // rail Folders section starts open (remembered)
  },
});

const EMPTY = Object.freeze({
  items: Object.freeze([]),
  folders: Object.freeze([]),
  meta: DEFAULT_META,
  hydrated: false,
});

let snapshot = null; // { items, folders, meta, hydrated }
const listeners = new Set();
let writeChain = Promise.resolve();
let persistTimer = null;

// ---------------------------------------------------------------------------
// Internal plumbing
// ---------------------------------------------------------------------------

function now() {
  return Date.now();
}

function emit() {
  for (const l of listeners) {
    try {
      l();
    } catch {
      /* a broken listener must not break the store */
    }
  }
}

// Deep-merge stored meta over defaults so newly-added pref keys survive for
// users with older stored meta (prefs are replaced wholesale, not shallow-merged).
// migratePrefs maps the Phase-1 pref keys to their Phase-2 names:
//   defaultTab "sites" → groupBy "website", anything else → "date"
//   showFavicons       → showSiteIcons
//   compactCount       → widgetItems
function migratePrefs(prefs) {
  const next = { ...prefs };
  if (next.defaultTab != null) {
    next.groupBy = next.defaultTab === "sites" ? "website" : "date";
    delete next.defaultTab;
  }
  if (next.showFavicons != null) {
    next.showSiteIcons = !!next.showFavicons;
    delete next.showFavicons;
  }
  if (next.compactCount != null) {
    next.widgetItems = next.compactCount;
    delete next.compactCount;
  }
  return next;
}

function mergeMeta(raw) {
  if (!raw || typeof raw !== "object") return DEFAULT_META;
  return {
    ...DEFAULT_META,
    ...raw,
    prefs: migratePrefs({ ...DEFAULT_META.prefs, ...(raw.prefs || {}) }),
  };
}

// The "word" kind was removed (taxonomy is now link / sentence / paragraph /
// code). Coerce any legacy "word" save to "sentence" on read so old data keeps
// rendering in the correct body instead of falling through to the code branch.
function coerceLegacyKinds(items) {
  if (!Array.isArray(items)) return items;
  let changed = false;
  const next = items.map((i) => {
    if (i && i.kind === "word") {
      changed = true;
      return { ...i, kind: "sentence" };
    }
    return i;
  });
  return changed ? next : items;
}

function readLocal() {
  try {
    const read = (key, fallback) => {
      const raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      return JSON.parse(raw);
    };
    const items = read(POCKET_KEYS.items, []);
    const folders = read(POCKET_KEYS.folders, []);
    const meta = mergeMeta(read(POCKET_KEYS.meta, null));
    return { items: coerceLegacyKinds(items), folders, meta };
  } catch {
    return { items: [], folders: [], meta: DEFAULT_META };
  }
}

function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode: data stays in memory only */
  }
}

function readRemote() {
  return new Promise((resolve) => {
    if (!hasChromeStorage) return resolve(readLocal());
    chrome.storage.local.get(ALL_KEYS, (res) => {
      if (chrome.runtime?.lastError) return resolve(readLocal());
      const items = Array.isArray(res?.[POCKET_KEYS.items])
        ? res[POCKET_KEYS.items]
        : [];
      const folders = Array.isArray(res?.[POCKET_KEYS.folders])
        ? res[POCKET_KEYS.folders]
        : [];
      const meta = mergeMeta(res?.[POCKET_KEYS.meta]);
      resolve({ items: coerceLegacyKinds(items), folders, meta });
    });
  });
}

function persistAll(s) {
  if (hasChromeStorage) {
    // Single storage.set for all three keys → exactly one onChanged echo.
    writeChain = writeChain.then(
      () =>
        new Promise((resolve) => {
          chrome.storage.local.set(
            {
              [POCKET_KEYS.items]: s.items,
              [POCKET_KEYS.folders]: s.folders,
              [POCKET_KEYS.meta]: s.meta,
            },
            () => resolve(),
          );
        }),
    );
  } else if (hasWindow) {
    writeLocal(POCKET_KEYS.items, s.items);
    writeLocal(POCKET_KEYS.folders, s.folders);
    writeLocal(POCKET_KEYS.meta, s.meta);
  }
}

function setSnapshot(next) {
  snapshot = next;
  emit();
}

function schedulePersist() {
  if (hasChromeStorage) {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      persistTimer = null;
      const s = snapshot;
      if (!s) return;
      persistAll(s);
    }, 100);
  } else {
    const s = snapshot;
    if (!s) return;
    persistAll(s);
  }
}

function attachStorageListener() {
  if (hasChromeStorage) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      const s = snapshot ?? EMPTY;
      let next = s;
      if (changes[POCKET_KEYS.items]) next = { ...next, items: changes[POCKET_KEYS.items].newValue ?? [] };
      if (changes[POCKET_KEYS.folders]) next = { ...next, folders: changes[POCKET_KEYS.folders].newValue ?? [] };
      if (changes[POCKET_KEYS.meta]) next = { ...next, meta: mergeMeta(changes[POCKET_KEYS.meta].newValue) };
      if (next === s) return;
      setSnapshot({ ...next, hydrated: true });
    });
  } else if (hasWindow) {
    window.addEventListener("storage", (e) => {
      if (!e.key || !ALL_KEYS.includes(e.key)) return;
      setSnapshot({ ...readLocal(), hydrated: true });
    });
  }
}

// ---------------------------------------------------------------------------
// Hydration
// ---------------------------------------------------------------------------

function hydrate() {
  readRemote().then((next) => {
    setSnapshot({ ...next, hydrated: true });
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot() {
  return snapshot ?? EMPTY;
}

/** Resolve once hydrated (or immediately if already hydrated). */
export function whenHydrated() {
  if (getSnapshot().hydrated) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = subscribe(() => {
      if (getSnapshot().hydrated) {
        unsub();
        resolve();
      }
    });
  });
}

/** Flush any pending write (used by the service worker before it may suspend). */
export async function flush() {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
    const s = snapshot;
    if (s) persistAll(s);
  }
  await writeChain;
}

// --- Sync (cross-device) -------------------------------------------------

/**
 * Apply a merged pocket state ({ items, folders }) pulled from cross-device
 * sync, then persist. Synchronous from the caller's view (setSnapshot is
 * synchronous; persist is debounced). Used by syncEngine's pocket merge.
 */
export function syncApply(next) {
  const s = getSnapshot();
  const items = Array.isArray(next?.items) ? next.items : s.items;
  const folders = Array.isArray(next?.folders) ? next.folders : s.folders;
  setSnapshot({ ...s, items, folders });
  schedulePersist();
}

// --- Items ---------------------------------------------------------------

/**
 * addItem(item, opts?) → { status: "added" | "duplicate", item }
 * Dedupes on kind + normalized (trimmed) text unless opts.skipDuplicates is
 * false. On duplicate, moves the existing item to the top and refreshes
 * updatedAt.
 */
export function addItem(item, opts = {}) {
  const s = getSnapshot();
  const skipDuplicates = opts.skipDuplicates !== false;
  if (skipDuplicates) {
    const dup = findDuplicate(s.items, item);
    if (dup) {
      const rest = s.items.filter((i) => i.id !== dup.id);
      const updated = { ...dup, updatedAt: item.updatedAt };
      setSnapshot({ ...s, items: [updated, ...rest] });
      schedulePersist();
      return { status: "duplicate", item: updated };
    }
  }
  setSnapshot({ ...s, items: [item, ...s.items] });
  schedulePersist();
  track(TELEMETRY_EVENTS.CLIP_SAVED);
  return { status: "added", item };
}

export function updateItem(id, patch) {
  const s = getSnapshot();
  const item = s.items.find((i) => i.id === id);
  if (!item) return;
  const updated = { ...item, ...patch, updatedAt: now() };
  setSnapshot({ ...s, items: s.items.map((i) => (i.id === id ? updated : i)) });
  schedulePersist();
  return updated;
}

export function softDelete(id) {
  const s = getSnapshot();
  const item = s.items.find((i) => i.id === id);
  if (!item || item.deletedAt) return null;
  const updated = { ...item, deletedAt: now(), updatedAt: now() };
  setSnapshot({ ...s, items: s.items.map((i) => (i.id === id ? updated : i)) });
  schedulePersist();
  return updated;
}

export function undoDelete(id) {
  const s = getSnapshot();
  const item = s.items.find((i) => i.id === id);
  if (!item) return null;
  const updated = { ...item, deletedAt: null, updatedAt: now() };
  setSnapshot({ ...s, items: s.items.map((i) => (i.id === id ? updated : i)) });
  schedulePersist();
  return updated;
}

/** Hard-delete every save ("Clear all saves"). */
export function clearAll() {
  const s = getSnapshot();
  setSnapshot({ ...s, items: [] });
  schedulePersist();
}

// --- Folders -------------------------------------------------------------

export function createFolder(name, color) {
  const s = getSnapshot();
  const t = now();
  const maxOrder = s.folders.reduce((m, f) => Math.max(m, f.order ?? 0), -1);
  const folder = {
    id: crypto.randomUUID(),
    name: name.trim(),
    color: color || nextFolderColor(s.folders),
    order: maxOrder + 1,
    createdAt: t,
    updatedAt: t,
    deletedAt: null,
  };
  setSnapshot({ ...s, folders: [...s.folders, folder] });
  schedulePersist();
  return folder;
}

export function updateFolder(id, patch) {
  const s = getSnapshot();
  const folder = s.folders.find((f) => f.id === id);
  if (!folder) return null;
  const updated = { ...folder, ...patch, updatedAt: now() };
  setSnapshot({ ...s, folders: s.folders.map((f) => (f.id === id ? updated : f)) });
  schedulePersist();
  return updated;
}

/** Soft-delete a folder; never deletes items: just removes its id from their folderIds. */
export function deleteFolder(id) {
  const s = getSnapshot();
  const folder = s.folders.find((f) => f.id === id);
  if (!folder || folder.deletedAt) return null;
  const updated = { ...folder, deletedAt: now(), updatedAt: now() };
  const items = s.items.map((it) =>
    it.folderIds?.includes(id)
      ? { ...it, folderIds: it.folderIds.filter((fid) => fid !== id), updatedAt: now() }
      : it,
  );
  setSnapshot({
    ...s,
    items,
    folders: s.folders.map((f) => (f.id === id ? updated : f)),
  });
  schedulePersist();
  return updated;
}

/** Add/remove an item from a folder (multi-select membership). */
export function setItemFolders(id, folderIds) {
  const s = getSnapshot();
  const item = s.items.find((i) => i.id === id);
  if (!item) return;
  const updated = { ...item, folderIds: [...folderIds], updatedAt: now() };
  setSnapshot({ ...s, items: s.items.map((i) => (i.id === id ? updated : i)) });
  schedulePersist();
  return updated;
}

// --- Meta / prefs --------------------------------------------------------

/** Current prefs, merged over defaults (safe to read pre-hydration). */
export function getPrefs() {
  const s = getSnapshot();
  return { ...DEFAULT_META.prefs, ...(s.meta?.prefs || {}) };
}

export function updatePrefs(patch) {
  const s = getSnapshot();
  const prefs = { ...s.meta.prefs, ...patch };
  setSnapshot({ ...s, meta: { ...s.meta, prefs } });
  schedulePersist();
}

// --- Export / Import -----------------------------------------------------

/** exportJson() → serialized { schema, items, folders, updatedAt }. */
export function exportJson() {
  const s = getSnapshot();
  return JSON.stringify(
    { schema: 1, items: s.items, folders: s.folders, updatedAt: now() },
    null,
    2,
  );
}

/** importJson(json) → { added, updated } | { error }: validates, sanitizes, merges via mergeStates. */
export function importJson(json) {
  let data;
  try {
    data = typeof json === "string" ? JSON.parse(json) : json;
  } catch {
    return { error: "Invalid JSON" };
  }
  // A Pocket export always carries an items and/or folders array.
  if (!data || typeof data !== "object" || (!Array.isArray(data.items) && !Array.isArray(data.folders))) {
    return { error: "Not a Pocket export" };
  }
  const incoming = sanitizeImport(data);
  const s = getSnapshot();
  const merged = mergeStates({ items: s.items, folders: s.folders }, incoming);
  setSnapshot({ ...s, items: merged.items, folders: merged.folders });
  schedulePersist();
  return { added: incoming.items.length, updated: merged.items.length };
}

// Re-export pure helper so callers (and tests) have one import surface.
export { hostFromUrl };

hydrate();
attachStorageListener();
