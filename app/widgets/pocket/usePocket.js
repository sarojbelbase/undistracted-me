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
