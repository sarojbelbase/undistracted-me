/**
 * useRssMulti — fetches multiple RSS feeds in parallel, merges and sorts
 * all items by date descending. Used when custom feeds are loaded from JSON.
 *
 * Each item gets a `source` field injected from the feed label.
 * Results are cached individually per URL, same TTL as useRss (10 min).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchFeed, readRssCache, writeRssCache } from './utils';

const POLL_INTERVAL = 15 * 60 * 1000;

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

  const merge = useCallback((allItems) => {
    const sorted = allItems
      .filter(Boolean)
      .sort((a, b) => {
        const da = a.isoDate ? new Date(a.isoDate).getTime() : 0;
        const db = b.isoDate ? new Date(b.isoDate).getTime() : 0;
        return db - da;
      });
    setItems(sorted);
    setRefreshedAt(Date.now());
  }, []);

  const load = useCallback(async (forceNetwork = false) => {
    const current = feedsRef.current;
    if (!current.length) return;

    setLoading(true);
    setError(null);

    const results = await Promise.allSettled(
      current.map(async (feed) => {
        const cacheKey = `custom_${feed.url}`;
        if (!forceNetwork) {
          const cached = readRssCache(cacheKey);
          if (cached) return cached.items;
        }
        const fetched = await fetchFeed(cacheKey, feed.url);
        // Inject source label into every item
        const tagged = fetched.map((item) => ({ ...item, source: feed.label }));
        writeRssCache(cacheKey, tagged);
        return tagged;
      }),
    );

    const allItems = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
    const anyError = results.every((r) => r.status === 'rejected');

    if (anyError && allItems.length === 0) {
      setError('Could not load any feeds');
    }
    merge(allItems);
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!feeds.length) {
      setItems([]);
      setError(null);
      setRefreshedAt(null);
      return;
    }

    // Populate instantly from cache
    const cached = feeds.flatMap((feed) => {
      const c = readRssCache(`custom_${feed.url}`);
      return c ? c.items : [];
    });
    if (cached.length) merge(cached);
    else setItems([]);

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
