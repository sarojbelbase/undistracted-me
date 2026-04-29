/**
 * useRss — fetches, caches, and polls an RSS feed.
 *
 * On mount:
 *   1. Instantly populates state from localStorage cache (if fresh).
 *   2. Fetches from network only when cache is absent or expired.
 *   3. Schedules a 15-min poll interval (aligns with CDN s-maxage=600).
 *
 * When feedId changes the effect re-runs: old interval is cleared, cache is
 * checked for the new feed, and a fresh network fetch fires if needed.
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchFeed, readRssCache, writeRssCache, PRESET_FEEDS, DEFAULT_FEED_ID } from './utils';

const POLL_INTERVAL = 15 * 60 * 1000; // 15 min

/**
 * @param {string} feedId - One of PRESET_FEEDS[].id or a raw URL treated as custom.
 * @returns {{ items, loading, error, refreshedAt, refresh }}
 */
export function useRss(feedId = DEFAULT_FEED_ID) {
  // Resolve feedId to a URL: look up in presets, fall back to treating feedId as a URL.
  const feedUrl = PRESET_FEEDS.find((f) => f.id === feedId)?.url ?? feedId;

  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState(null);
  const [refreshedAt, setRefreshedAt] = useState(null);

  /** Always fetches from the network, writes cache, updates state. */
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFeed(feedId, feedUrl);
      setItems(data);
      setRefreshedAt(Date.now());
      writeRssCache(feedId, data);
    } catch (e) {
      setError(e.message || 'fetch_failed');
    } finally {
      setLoading(false);
    }
  }, [feedId, feedUrl]);

  useEffect(() => {
    // Reset error whenever the feed changes
    setError(null);

    // ── Instant cache populate ────────────────────────────────────────────
    const cached = readRssCache(feedId);
    if (cached) {
      setItems(cached.items);
      setRefreshedAt(cached.ts);
    } else {
      // No valid cache: clear stale items from previous feed
      setItems([]);
      setRefreshedAt(null);
    }

    // ── Network fetch: skip if cache is fresh ────────────────────────────
    if (!cached) load();

    // ── Polling ───────────────────────────────────────────────────────────
    const timerId = setInterval(load, POLL_INTERVAL);
    return () => clearInterval(timerId);
  }, [feedId, load]);

  /** Manually trigger an immediate network refresh (bypasses cache). */
  const refresh = useCallback(() => load(), [load]);

  return { items, loading, error, refreshedAt, refresh };
}
