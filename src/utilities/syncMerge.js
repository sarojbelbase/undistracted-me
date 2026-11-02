/**
 * Pure last-write-wins element-set merge for array sync keys.
 *
 * Array keys (events, bookmarks, countdown) are merged as a *set of elements
 * keyed by a stable identity*, not replaced wholesale. This lets two devices
 * that both add/edit/delete items converge without losing the other's changes.
 *
 * Wire format for an array key (`keys[<key>].v`):
 *   {
 *     items:   { "<id>": { v: <item>, t: <epochMs> } },
 *     deleted: { "<id>": <deletedAt> }     // tombstones
 *   }
 *
 * Semantics (LWW element set):
 *   - For each id, the *highest-timestamp* event wins — a write at time `t`
 *     beats an earlier delete, and a delete at time `t` beats an earlier write.
 *   - Deletions survive as tombstones so a deleted item isn't resurrected by a
 *     stale write from another device.
 *
 * Keep this module PURE — no DOM / storage / network access, fully unit-testable.
 */

/** Stable identity for an item in an array key (events id, bookmark url, etc.). */
export function itemKey(item) {
  if (!item || typeof item !== 'object') return '';
  const k = item.id ?? item.url ?? item.name;
  return k == null ? '' : String(k);
}

/** Deep, key-order-independent equality for JSON-serializable values. */
export function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => deepEqual(a[k], b[k]));
}

/**
 * Diff a local array against the last-synced element set (`meta`), producing a
 * fresh element set. New/changed items get `ts`; deleted items get a tombstone
 * at `ts`; unchanged items keep their previous timestamp.
 */
export function arrayToElementSet(array, meta, ts) {
  const items = {};
  const deleted = { ...(meta?.deleted || {}) };
  const seen = new Set();

  for (const item of array || []) {
    const id = itemKey(item);
    if (!id) continue;
    seen.add(id);
    const prev = meta?.items?.[id];
    if (prev && deepEqual(prev.v, item)) {
      items[id] = prev; // unchanged — preserve timestamp
    } else {
      items[id] = { v: item, t: ts }; // new or edited
    }
    delete deleted[id]; // re-added — clear any tombstone
  }

  // Previously-known ids that are now absent → tombstone them.
  for (const id of Object.keys(meta?.items || {})) {
    if (!seen.has(id) && deleted[id] == null) {
      deleted[id] = ts;
    }
  }

  return { items, deleted };
}

/**
 * Merge two element sets. For each id the highest-timestamp event (write or
 * delete) wins. Returns { items, deleted }.
 */
export function mergeElementSets(a, b) {
  const ids = new Set([
    ...Object.keys(a?.items || {}),
    ...Object.keys(a?.deleted || {}),
    ...Object.keys(b?.items || {}),
    ...Object.keys(b?.deleted || {}),
  ]);

  const items = {};
  const deleted = {};

  for (const id of ids) {
    let winner = null; // { type: 'write'|'delete', t }
    const consider = (type, t, v) => {
      if (t == null) return;
      if (!winner || t > winner.t || (t === winner.t && type === 'write')) {
        winner = { type, t, v };
      }
    };
    consider('write', a?.items?.[id]?.t, a?.items?.[id]?.v);
    consider('delete', a?.deleted?.[id]);
    consider('write', b?.items?.[id]?.t, b?.items?.[id]?.v);
    consider('delete', b?.deleted?.[id]);

    if (winner && winner.type === 'write') items[id] = { v: winner.v, t: winner.t };
    else if (winner && winner.type === 'delete') deleted[id] = winner.t;
  }

  return { items, deleted };
}

/**
 * Rebuild a local array from a merged element set, preserving the local array's
 * order and appending remote-only items afterward.
 */
export function elementSetToArray(set, localArray) {
  const byId = set?.items || {};
  const result = [];
  const used = new Set();

  for (const item of localArray || []) {
    const id = itemKey(item);
    if (id && byId[id] && !used.has(id)) {
      result.push(byId[id].v);
      used.add(id);
    }
  }
  for (const id of Object.keys(byId)) {
    if (!used.has(id)) {
      result.push(byId[id].v);
      used.add(id);
    }
  }
  return result;
}
