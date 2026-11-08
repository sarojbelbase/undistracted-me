/**
 * useDataHub — subscribe a React component to one datahub namespace.
 *
 * Returns { data, updatedAt, meta, hydrated, write }. Reads are synchronous
 * (via useSyncExternalStore) once the snapshot is hydrated, so live background
 * updates from the service worker re-render consumers with no polling interval.
 */
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  subscribe,
  getEntrySnapshot,
  readEntry,
  writeEntry,
} from "../data/dataHub";

export function useDataHub(namespace) {
  const entry = useSyncExternalStore(subscribe, () =>
    getEntrySnapshot(namespace),
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    readEntry(namespace).then(() => {
      if (!cancelled) setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [namespace]);

  const write = useCallback(
    (data, meta = {}) => writeEntry(namespace, data, meta),
    [namespace],
  );

  return {
    data: entry?.data ?? null,
    updatedAt: entry?.updatedAt ?? null,
    // The full namespace entry ({ data, updatedAt, ...customMeta }). Named
    // `entry` (not `meta`) because `entry.data` and `data` above are the SAME
    // reference — this is not a separate small metadata object.
    entry: entry ?? null,
    hydrated,
    write,
  };
}
