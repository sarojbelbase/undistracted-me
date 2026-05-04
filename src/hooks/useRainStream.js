/**
 * useRainStream — single-file ambient audio player
 *
 * Fetches the secure OGG URL from /api/audio/rain on mount, then sets
 * it as the src on a stable <audio> ref. The browser handles HTTP Range
 * Requests and native caching automatically — no manual fetch needed.
 *
 * Usage:
 *   const { toggle, isPlaying, audioRef } = useRainStream(FADE_DURATION_MS);
 *   // Place <audio ref={audioRef} loop preload="none" /> in the tree.
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { PRODUCTION_BASE_URL } from "../constants/env.js";

const RAIN_API_URL =
  import.meta.env.VITE_RAIN_API_URL || `${PRODUCTION_BASE_URL}/api/audio/rain`;
const API_KEY = import.meta.env.VITE_API_KEY || null;
const POS_KEY = "rain_audio_pos";
const URL_CACHE_KEY = "rain_audio_url"; // stale-while-revalidate cache

export function useRainStream(fadeDurationMs = 3000) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [ready, setReady] = useState(false);   // true once src is set on the element
  const audioRef = useRef(null);
  const fadeRafRef = useRef(null);

  // 1. Fetch the secure CDN URL — serve stale from localStorage instantly,
  //    then revalidate from API in background.
  useEffect(() => {
    let cancelled = false;

    const applyUrl = (url) => {
      const audio = audioRef.current;
      if (audio && !audio.src) {
        audio.src = url;
        setReady(true);
      }
    };

    // Serve cached URL immediately (zero latency)
    const cached = localStorage.getItem(URL_CACHE_KEY);
    if (cached) applyUrl(cached);

    // Always revalidate from API
    const init = async () => {
      try {
        const headers = {};
        if (API_KEY) headers["X-Api-Key"] = API_KEY;
        const res = await fetch(RAIN_API_URL, { headers });
        if (!res.ok || cancelled) return;
        const { url } = await res.json();
        if (!url || cancelled) return;
        localStorage.setItem(URL_CACHE_KEY, url);
        applyUrl(url);
      } catch { /* network unavailable — cached URL already applied */ }
    };
    init();
    return () => { cancelled = true; };
  }, []);

  // 2. Restore saved playback position once src is set
  useEffect(() => {
    if (!ready) return;
    const audio = audioRef.current;
    if (!audio) return;
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

  // 3. Save position on unmount
  useEffect(() => {
    return () => {
      if (fadeRafRef.current) cancelAnimationFrame(fadeRafRef.current);
      const audio = audioRef.current;
      if (audio) localStorage.setItem(POS_KEY, String(audio.currentTime));
    };
  }, []);

  // 4. Cubic ease-in-out volume crossfade
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
      audio.play()
        .then(() => {
          setIsPlaying(true);
          fadeVolume(0, 1, null);
        })
        .catch(() => {});
    }
  }, [isPlaying, ready, fadeVolume]);

  return { toggle, isPlaying, audioRef };
}
