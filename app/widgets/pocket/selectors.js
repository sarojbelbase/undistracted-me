/**
 * selectors.js: pure derived-state helpers for Pocket.
 *
 * Every count shown in the UI (rail, header, settings) MUST come from here so
 * they can never disagree (§2 P1). These functions are pure and storage-free so
 * they can be unit-tested in isolation.
 */

import { timeBucket, TIME_BUCKET_LABELS } from "./utils";

/** Live items: exclude soft-deleted. */
export function liveItems(items) {
  return (items || []).filter((i) => !i.deletedAt);
}

/** Live folders: exclude soft-deleted. */
export function liveFolders(folders) {
  return (folders || []).filter((f) => !f.deletedAt);
}

/** Live items, newest first. */
export function sortedItems(items) {
  return [...liveItems(items)].sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Total live saves. */
export function totalCount(items) {
  return liveItems(items).length;
}

/** Map of kind → live count. */
export function countByKind(items) {
  const m = new Map();
  for (const i of liveItems(items)) m.set(i.kind, (m.get(i.kind) || 0) + 1);
  return m;
}

/** Map of folderId → live count (an item in N folders counts N times). */
export function countByFolder(items) {
  const m = new Map();
  for (const i of liveItems(items)) {
    for (const fid of i.folderIds || []) m.set(fid, (m.get(fid) || 0) + 1);
  }
  return m;
}

/**
 * Live items filtered by a view filter, newest first.
 * filter: null | { type: "kind"|"folder", value }.
 */
export function filterItems(items, filter) {
  const live = sortedItems(items);
  if (!filter) return live;
  if (filter.type === "kind") return live.filter((i) => i.kind === filter.value);
  return live.filter((i) => (i.folderIds || []).includes(filter.value));
}

/** Approximate byte size of the serialized items + folders (usage line). */
export function storageSize(items, folders) {
  const acc = (s) => {
    try {
      return JSON.stringify(s).length;
    } catch {
      return 0;
    }
  };
  return acc(items) + acc(folders);
}

/** Human-readable bytes: "1.2 KB", "18 KB", "3.4 MB". */
export function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  const rounded = n >= 100 || i === 0 ? Math.round(n) : Math.round(n * 10) / 10;
  return `${rounded} ${units[i]}`;
}

/**
 * Group live items into time buckets (Today / Yesterday / This week / Earlier),
 * preserving each bucket's already-sorted (newest-first) order.
 */
export function groupByDate(items) {
  const order = ["today", "yesterday", "week", "earlier"];
  const map = new Map();
  for (const it of items) {
    const b = timeBucket(it.updatedAt);
    if (!map.has(b)) map.set(b, []);
    map.get(b).push(it);
  }
  return order
    .filter((b) => map.has(b))
    .map((b) => ({ key: b, label: TIME_BUCKET_LABELS[b], items: map.get(b) }));
}
