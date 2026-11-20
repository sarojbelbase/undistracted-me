import { useSyncExternalStore } from "react";
import { getSnapshot, subscribe } from "./pocketStore";

/**
 * usePocket() → { items, folders, meta, hydrated }
 * React binding to pocketStore via useSyncExternalStore. New saves appear
 * live (storage.onChanged → snapshot update → re-render).
 */
export function usePocket() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Narrow selector hook — subscribes to only the selected slice so a leaf
 * component (e.g. RowActions reading `folders`) doesn't re-render on every item
 * mutation. `getSnapshot().folders` keeps the same reference across item-only
 * changes (setSnapshot spreads `{ ...s, items }`), so useSyncExternalStore skips.
 */
function usePocketSelector(selector) {
  return useSyncExternalStore(
    subscribe,
    () => selector(getSnapshot()),
    () => selector(getSnapshot()),
  );
}

/** Subscribe to just the `folders` slice (stable across item-only mutations). */
export function usePocketFolders() {
  return usePocketSelector((s) => s.folders);
}
