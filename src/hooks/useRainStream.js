/**
 * useRainStream — single-file ambient audio player
 *
 * Fetches the secure OGG URL from /api/audio/rain on mount.
 * Caches the full binary in Cache Storage ("rain-audio") so subsequent
 * loads never hit the network at all.
 *
 * Usage:
 *   const { toggle, isPlaying, audioRef } = useRainStream(FADE_DURATION_MS);
 *   // Place <audio ref={audioRef} loop /> anywhere in the tree.
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { PRODUCTION_BASE_URL } from "../constants/env.js";

const RAIN_API_URL =
  import.meta.env.VITE_RAIN_API_URL || `${PRODUCTION_BASE_URL}/api/audio/rain`;
const API_KEY = import.meta.env.VITE_API_KEY || null;
const CACHE_NAME = "rain-audio";
const POS_KEY = "rain_audio_pos";

// ── Cache Storage helpers ─────────────────────────────────────────────────────

async function getCached(url) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(url);
    if (cached) return URL.createObjectURL(await cached.blob());
  } catch { /* cache API unavailable (e.g. extension context) */ }
  return null;
}

async function putCached(url) {
  try {
    const headers = {};
    if (API_KEY) headers["X-Api-Key"] = API_KEY;
    const res = await fetch(url, { headers });
    if (!res.ok) return url; // fallback to direct URL
    const cache = await caches.open(CACHE_NAME);
    await cache.put(url, res.clone());
    return URL.createObjectURL(await res.blob());
  } catch {
    return url; // fallback: just play from CDN directly
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useRainStream(fadeDurationMs = 3000) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);           // always-mounted <audio> element
  const fadeRafRef = useRef(null);
  const urlRef = useRef(null);             // resolved playback URL (cached blob or CDN)
  const [ready, setReady] = useState(false);

  // 1. Fetch URL from API → check Cache Storage → download & cache if needed
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      try {
        const headers = {};
        if (API_KEY) headers["X-Api-Key"] = API_KEY;
        const res = await fetch(RAIN_API_URL, { headers });
        if (!res.ok || cancelled) return;
        const { url: cdnUrl } = await res.json();
        if (!cdnUrl || cancelled) return;

        // Try to serve from Cache Storage first
        const cachedBlobUrl = await getCached(cdnUrl);
        if (cancelled) return;

        if (cachedBlobUrl) {
          urlRef.current = cachedBlobUrl;
          setReady(true);
        } else {
          // Not cached yet — set CDN URL immediately so the user can start
          // playing right away, then download + cache in background
          urlRef.current = cdnUrl;
          setReady(true);
          const blobUrl = await putCached(cdnUrl);
          if (!cancelled && blobUrl !== cdnUrl) {
            // Audio is now fully cached — swap to blob URL seamlessly
            urlRef.current = blobUrl;
            const audio = audioRef.current;
            if (audio) {
              const pos = audio.currentTime;
              const wasPlaying = !audio.paused;
              audio.src = blobUrl;
              audio.currentTime = pos;
              if (wasPlaying) audio.play().catch(() => {});
            }
          }
        }
      } catch { /* network unavailable */ }
    };
    init();
    return () => { cancelled = true; };
  }, []);

  // 2. Restore playback position once audio element is ready
  useEffect(() => {
    if (!ready) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = urlRef.current;
    const saved = parseFloat(localStorage.getItem(POS_KEY) || "0");
    if (saved > 0) {
      const doSeek = () => { audio.currentTime = saved; };
      if (audio.readyState >= 1) doSeek();
      else audio.addEventListener("loadedmetadata", doSeek, { once: true });
    }
    const onTimeUpdate = () =>
      localStorage.setItem(POS_KEY, String(audio.currentTime));
    audio.addEventListener("timeupdate", onTimeUpdate);
    return () => audio.removeEventListener("timeupdate", onTimeUpdate);
  }, [ready]);

  // 3. Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fadeRafRef.current) cancelAnimationFrame(fadeRafRef.current);
      const audio = audioRef.current;
      if (audio) localStorage.setItem(POS_KEY, String(audio.currentTime));
    };
  }, []);

  // 4. Volume crossfade (cubic ease-in-out)
  const fadeVolume = useCallback(
    (from, to, onDone) => {
      if (fadeRafRef.current) cancelAnimationFrame(fadeRafRef.current);
      const audio = audioRef.current;
      if (!audio) return;
      const start = performance.now();
      const step = (now) => {
        const t = Math.min((now - start) / fadeDurationMs, 1);
        const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        audio.volume = Math.max(0, Math.min(1, from + (to - from) * e));
        if (t < 1) {
          fadeRafRef.current = requestAnimationFrame(step);
        } else {
          fadeRafRef.current = null;
          onDone?.();
        }
      };
      fadeRafRef.current = requestAnimationFrame(step);
    },
    [fadeDurationMs]
  );

  // 5. Toggle play / pause
  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !ready) return;

    if (isPlaying) {
      const vol = audio.volume;
      setIsPlaying(false);
      fadeVolume(vol, 0, () => {
        audio.pause();
        audio.volume = 0;
      });
    } else {
      audio.volume = 0;
      audio.play().then(() => {
        setIsPlaying(true);
        fadeVolume(0, 1, null);
      }).catch(() => {});
    }
  }, [isPlaying, ready, fadeVolume]);

  return { toggle, isPlaying, audioRef };
}
