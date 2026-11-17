/**
 * pocketStore — the single access point for Pocket data (storage.local).
 * UI components and the service worker go through here; nothing touches
 * chrome.storage / localStorage directly. Mirrors app/data/dataHub.js.
 *
 * Keys: "pocket:items", "pocket:folders", "pocket:meta" (schema 1).
 * Pure logic (classifyKind, dedupe, search, grouping, merge) lives in utils.js.
 */

import { POCKET_KEYS, STARTER_FOLDERS } from "./constants";
import {
  findDuplicate,
  mergeStates,
  sanitizeImport,
  hostFromUrl,
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
  prefs: { defaultTab: "recent", showFavicons: true, compactCount: 4 },
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
let pendingSelfWrites = 0; // count of our own storage.set echoes yet to arrive

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
function mergeMeta(raw) {
  if (!raw || typeof raw !== "object") return DEFAULT_META;
  return {
    ...DEFAULT_META,
    ...raw,
    prefs: { ...DEFAULT_META.prefs, ...(raw.prefs || {}) },
  };
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
    return { items, folders, meta };
  } catch {
    return { items: [], folders: [], meta: DEFAULT_META };
  }
}

function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode — data stays in memory only */
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
      resolve({ items, folders, meta });
    });
  });
}

function persistAll(s) {
  if (hasChromeStorage) {
    // Single storage.set for all three keys → exactly one onChanged echo.
    pendingSelfWrites += 1;
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
      const keys = ALL_KEYS.filter((k) => changes[k]);
      if (keys.length === 0) return;
      // Skip our own write's echo (persistAll → one storage.set → one event).
      // Re-reading would emit a second snapshot with fresh array identities
      // and force derived lists to recompute twice per mutation.
      if (pendingSelfWrites > 0) {
        pendingSelfWrites -= 1;
        return;
      }
      readRemote().then((next) => {
        setSnapshot({ ...next, hydrated: true });
      });
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
    // First run: seed starter folders.
    if (!Array.isArray(next.folders) || next.folders.length === 0) {
      const t = now();
      next.folders = STARTER_FOLDERS.map((f, i) => ({
        id: crypto.randomUUID(),
        name: f.name,
        color: f.color,
        order: i,
        createdAt: t,
        updatedAt: t,
        deletedAt: null,
      }));
    }
    setSnapshot({ ...next, hydrated: true });
    schedulePersist();
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

// --- Items ---------------------------------------------------------------

/**
 * addItem(item) → { status: "added" | "duplicate", item }
 * Dedupes on kind + normalized text (words case-insensitive). On duplicate,
 * moves the existing item to the top and refreshes updatedAt.
 */
export function addItem(item) {
  const s = getSnapshot();
  const dup = findDuplicate(s.items, item);
  if (dup) {
    const rest = s.items.filter((i) => i.id !== dup.id);
    const updated = { ...dup, updatedAt: item.updatedAt };
    setSnapshot({ ...s, items: [updated, ...rest] });
    schedulePersist();
    return { status: "duplicate", item: updated };
  }
  setSnapshot({ ...s, items: [item, ...s.items] });
  schedulePersist();
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

export function createFolder(name, color = "slate") {
  const s = getSnapshot();
  const t = now();
  const maxOrder = s.folders.reduce((m, f) => Math.max(m, f.order ?? 0), -1);
  const folder = {
    id: crypto.randomUUID(),
    name: name.trim(),
    color,
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

/** Soft-delete a folder; never deletes items — just removes its id from their folderIds. */
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

/** importJson(json) → { added, updated } — validates, sanitizes, merges via mergeStates. */
export function importJson(json) {
  let data;
  try {
    data = typeof json === "string" ? JSON.parse(json) : json;
  } catch {
    return { error: "Invalid JSON" };
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
