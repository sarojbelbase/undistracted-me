/**
 * useRssMulti — fetches multiple RSS feeds in parallel, merges and sorts
 * all items by date descending. Used when custom feeds are loaded from JSON.
 *
 * Each item gets a `source` field injected from the feed label.
 * Results are cached individually per URL, same TTL as useRss (10 min).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchFeed, readRssCache, writeRssCache, rssItemTime } from './utils';

const POLL_INTERVAL = 15 * 60 * 1000;

/** Maximum items stored per feed to prevent localStorage bloat from verbose feeds. */
const MAX_CACHED_ITEMS = 30;

/** Cap items to MAX_CACHED_ITEMS newest (by isoDate descending) before caching. */
const capItems = (items) => {
  if (items.length <= MAX_CACHED_ITEMS) return items;
  return [...items]
    .sort((a, b) => rssItemTime(b.isoDate) - rssItemTime(a.isoDate))
    .slice(0, MAX_CACHED_ITEMS);
};

/**
 * @param {Array<{label: string, url: string}>} feeds
 * @returns {{ items, loading, error, refreshedAt, refresh }}
 */
export function useRssMulti(feeds = []) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshedAt, setRefreshedAt] = useState(null);

  // Stable key to detect when the feeds array actually changed
  const feedsKey = feeds.map((f) => f.url).join('|');
  const feedsRef = useRef(feeds);
  feedsRef.current = feeds;

  const merge = useCallback((allItems, fetchedAt = null) => {
    // Sort newest-first using a NaN-safe timestamp. Invalid/missing dates fall
    // to the bottom (0) instead of corrupting the comparison — this is what
    // keeps a 14-min-old story ahead of a 3-day-old one.
    const sorted = allItems
      .filter(Boolean)
      .sort((a, b) => rssItemTime(b.isoDate) - rssItemTime(a.isoDate));
    setItems(sorted);
    // Prefer the server-side fetch timestamp (persisted "date of fetching");
    // fall back to now when it's missing/invalid.
    const ts = fetchedAt ? new Date(fetchedAt).getTime() : Date.now();
    setRefreshedAt(Number.isFinite(ts) ? ts : Date.now());
  }, []);

  // Epoch counter — only the most recently initiated load may update state.
  // Prevents a slow initial load(false) from overwriting fresh results
  // delivered by a faster manual load(true) triggered by the refresh button.
  const epochRef = useRef(0);

  const load = useCallback(async (forceNetwork = false) => {
    const current = feedsRef.current;
    if (!current.length) return;

    const epoch = ++epochRef.current;
    setLoading(true);
    setError(null);

    const results = await Promise.allSettled(
      current.map(async (feed) => {
        const cacheKey = `custom_${feed.url}`;
        if (!forceNetwork) {
          const cached = readRssCache(cacheKey);
          if (cached) return { items: cached.items, fetchedAt: cached.fetchedAt };
        }
        const { items: fetchedItems, fetchedAt } = await fetchFeed(cacheKey, feed.url);
        // Inject source label into every item
        const tagged = fetchedItems.map((item) => ({ ...item, source: feed.label }));
        writeRssCache(cacheKey, capItems(tagged), fetchedAt);
        return { items: tagged, fetchedAt };
      }),
    );

    // If a newer load started while we were waiting, discard these results
    if (epochRef.current !== epoch) return;

    const allItems = results.flatMap((r) => (r.status === 'fulfilled' ? r.value.items : []));
    // Use the newest fetch timestamp across feeds as the aggregate fetch time.
    const fetchTimes = results
      .filter((r) => r.status === 'fulfilled' && r.value.fetchedAt)
      .map((r) => new Date(r.value.fetchedAt).getTime())
      .filter(Number.isFinite);
    const anyError = results.every((r) => r.status === 'rejected');

    if (anyError && allItems.length === 0) {
      setError('Could not load any feeds');
    }
    merge(allItems, fetchTimes.length ? new Date(Math.max(...fetchTimes)).toISOString() : null);
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!feeds.length) {
      setItems([]);
      setError(null);
      setRefreshedAt(null);
      return;
    }

    // Populate instantly from localStorage cache
    const cached = feeds.flatMap((feed) => {
      const c = readRssCache(`custom_${feed.url}`);
      return c ? c.items : [];
    });
    // Use the most recent cache write time as the aggregate fetch timestamp.
    const cacheTs = feeds
      .map((f) => readRssCache(`custom_${f.url}`)?.ts)
      .filter(Boolean)
      .sort((a, b) => b - a)[0];
    if (cached.length) merge(cached, cacheTs ? new Date(cacheTs).toISOString() : null);
    else {
      setItems([]);
      // ── SW rss_queue seed ─────────────────────────────────────────────
      // If the service worker pre-fetched the merged feed queue, use it for
      // instant display before the network fetch completes.
      chrome?.storage?.local?.get?.('rss_queue').then((result) => {
        const q = result?.rss_queue;
        if (!q?.items?.length) return;
        if (Date.now() - q.fetchedAt > 30 * 60_000) return; // older than 30 min
        // Only seed if none of the feeds have an active localStorage cache yet
        // (avoids overwriting partial cache with a potentially broader SW queue)
        const stillEmpty = feeds.every((f) => readRssCache(`custom_${f.url}`) === null);
        if (stillEmpty) merge(q.items, q.fetchedAt);
      }).catch(() => { });
    }

    // Fetch network (skip if all caches were fresh)
    const allCached = feeds.every((f) => readRssCache(`custom_${f.url}`) !== null);
    if (!allCached) load(false);

    const timerId = setInterval(() => load(true), POLL_INTERVAL);
    return () => clearInterval(timerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedsKey]);

  const refresh = useCallback(() => load(true), [load]);

  return { items, loading, error, refreshedAt, refresh };
}
