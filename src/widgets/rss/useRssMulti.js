/**
 * useRssMulti — fetches multiple RSS feeds in parallel, merges and sorts
 * all items by date descending. Used for both preset and custom feeds.
 *
 * Data is served from the shared DataHub (`rss` namespace) written by the
 * background service worker's UM_RSS prefetch alarm. There is NO page-side
 * polling interval — the SW stamps `updatedAt` on each write and the hub
 * propagates changes live via chrome.storage.onChanged.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchFeed, rssItemTime } from "./utils";
import { useDataHub } from "../../hooks/useDataHub";

const sortNewest = (items) =>
  [...items].sort((a, b) => rssItemTime(b.isoDate) - rssItemTime(a.isoDate));

/**
 * @param {Array<{label: string, url: string}>} feeds
 * @returns {{ items, loading, error, refreshedAt, refresh }}
 */
export function useRssMulti(feeds = []) {
  const feedsKey = feeds.map((f) => f.url).join("|");
  const feedsRef = useRef(feeds);
  feedsRef.current = feeds;

  // SW-prefetched merged queue from the DataHub.
  const { data, updatedAt, entry, hydrated, write } = useDataHub("rss");

  // Only trust the hub entry if it was produced for the exact feed set.
  const hasMatching = Array.isArray(data) && entry?.feedsKey === feedsKey;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const epochRef = useRef(0);

  // Once the hub hydrates with matching data, stop loading.
  useEffect(() => {
    if (hasMatching) setLoading(false);
  }, [hasMatching]);

  const fetchAll = useCallback(async () => {
    const current = feedsRef.current;
    if (!current.length) return null;

    const epoch = ++epochRef.current;
    const results = await Promise.allSettled(
      current.map(async (feed) => {
        const { items } = await fetchFeed(feed.url, feed.url);
        return items.map((item) => ({ ...item, source: feed.label }));
      }),
    );
    if (epochRef.current !== epoch) return null;

    const allItems = results.flatMap((r) =>
      r.status === "fulfilled" ? r.value : [],
    );
    const anyError = results.every((r) => r.status === "rejected");
    if (anyError && allItems.length === 0) setError("Could not load any feeds");
    return sortNewest(allItems.filter(Boolean));
  }, []);

  // Fetch only when hydrated + feeds present + no matching hub data (first
  // load for this feed set). Never re-fetch on a timer.
  useEffect(() => {
    if (!hydrated) return;
    if (!feeds.length) {
      setLoading(false);
      return;
    }
    if (hasMatching) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAll().then((sorted) => {
      if (cancelled) return;
      if (sorted && sorted.length) write(sorted, { feedsKey });
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [hydrated, feedsKey, hasMatching, feeds.length, fetchAll, write]);

  const refresh = useCallback(async () => {
    if (!feedsRef.current.length) return;
    setError(null);
    const sorted = await fetchAll();
    if (sorted && sorted.length) await write(sorted, { feedsKey });
  }, [fetchAll, feedsKey, write]);

  const items = hasMatching ? data : [];
  const refreshedAt = hasMatching ? updatedAt : null;

  return { items, loading, error, refreshedAt, refresh };
}
