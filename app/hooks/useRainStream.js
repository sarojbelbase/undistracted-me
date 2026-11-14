/**
 * useRainStream — single-file ambient audio player
 *
 * Fetches the secure OGG URL from /audio/rain on mount, then sets
 * it as the src on the <audio> element via the returned ref. The browser
 * handles HTTP Range Requests and native caching automatically — no manual
 * fetch needed.
 *
 * The <audio> element is not guaranteed to be stable — the pomodoro widget
 * renders a fresh <audio> node per phase — so this hook re-applies the src
 * whenever the element is swapped out.
 *
 * Usage:
 *   const { toggle, play, pause, isPlaying, audioRef, ready } = useRainStream(FADE_DURATION_MS);
 *   // Place <audio ref={audioRef} loop preload="none" /> in the tree.
 *   // - `toggle` flips based on current isPlaying (good for user buttons).
 *   // - `play`/`pause` are deterministic/idempotent (good for syncing a desired state).
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { API_BASE_URL } from "../constants/env.js";

const RAIN_API_URL =
  import.meta.env.VITE_RAIN_API_URL || `${API_BASE_URL}/audio/rain`;
const POS_KEY = "rain_audio_pos";
const URL_CACHE_KEY = "rain_audio_url"; // stale-while-revalidate cache

export function useRainStream(fadeDurationMs = 3000) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [ready, setReady] = useState(false);   // true once src is set on the element
  const audioRef = useRef(null);
  const fadeRafRef = useRef(null);
  // Tracks the URL already applied to the <audio> element so a fresh URL from
  // the API revalidation can replace a stale cached URL instead of being ignored.
  const appliedUrlRef = useRef(null);
  // Tracks which DOM element the URL was applied to. The <audio> node can be
  // remounted (the pomodoro widget swaps PICK ↔ TIMER branches, each with its
  // own <audio>), so a fresh node must be re-populated with the same URL.
  const appliedElRef = useRef(null);

  const applyUrl = useCallback((url) => {
    if (!url) return;
    const audio = audioRef.current;
    if (!audio) return;
    // Skip only when this exact URL is already on this exact element. A remounted
    // node (new element, empty src) must be re-populated.
    if (appliedElRef.current === audio && appliedUrlRef.current === url) return;
    appliedElRef.current = audio;
    // Don't interrupt active playback with a URL swap — keep the current
    // stream but remember the fresh URL for the next play session.
    if (audio.src && !audio.paused) {
      appliedUrlRef.current = url;
      return;
    }
    appliedUrlRef.current = url;
    audio.src = url;
    setReady(true);
  }, []);

  // 1. Fetch the secure CDN URL — serve stale from localStorage instantly,
  //    then revalidate from API in background.
  useEffect(() => {
    let cancelled = false;

    // Serve cached URL immediately (zero latency)
    const cached = localStorage.getItem(URL_CACHE_KEY);
    if (cached) applyUrl(cached);

    // Always revalidate from API
    const init = async () => {
      try {
        const res = await fetch(RAIN_API_URL);
        if (!res.ok || cancelled) return;
        const { url } = await res.json();
        if (!url || cancelled) return;
        localStorage.setItem(URL_CACHE_KEY, url);
        applyUrl(url);
      } catch { /* network unavailable — cached URL already applied */ }
    };
    init();
    return () => { cancelled = true; };
  }, [applyUrl]);

  // Re-populate the <audio> src if the element was swapped out on a later render
  // (e.g. the pomodoro widget remounts its <audio> when the phase changes).
  // Deliberately no dependency array: it must run after *every* render to catch
  // a freshly-mounted <audio> node — the swap is driven by the parent's DOM (the
  // pomodoro widget swaps PICK ↔ TIMER branches, each with its own <audio>), not
  // by any hook state we can observe. Idempotent — the appliedElRef guard in
  // applyUrl makes repeated calls a no-op.
  useEffect(() => {
    if (appliedUrlRef.current) applyUrl(appliedUrlRef.current);
  });

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
    // Throttle position persistence — `timeupdate` fires ~4×/second; writing
    // localStorage at that rate hammers disk (and any `storage` listeners).
    let lastPersist = 0;
    const onTimeUpdate = () => {
      const now = Date.now();
      if (now - lastPersist < 5000) return;
      lastPersist = now;
      localStorage.setItem(POS_KEY, String(audio.currentTime));
    };
    const persistNow = () =>
      localStorage.setItem(POS_KEY, String(audio.currentTime));
    audio.addEventListener("timeupdate", onTimeUpdate);
    // Persist immediately on pause/end (final position) and when the tab hides.
    audio.addEventListener("pause", persistNow);
    audio.addEventListener("ended", persistNow);
    document.addEventListener("visibilitychange", persistNow);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("pause", persistNow);
      audio.removeEventListener("ended", persistNow);
      document.removeEventListener("visibilitychange", persistNow);
    };
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

  // Deterministic start/stop — safe to call regardless of captured `isPlaying`.
  // The pomodoro widget (and any caller syncing a desired on/off state) should
  // use these instead of `toggle()` to avoid stale-closure toggles.
  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !ready) return;
    if (!audio.paused) return;
    audio.volume = 0;
    audio.play()
      .then(() => {
        setIsPlaying(true);
        fadeVolume(0, 1, null);
      })
      .catch(() => {});
  }, [ready, fadeVolume]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !ready) return;
    if (audio.paused) return;
    const vol = audio.volume;
    setIsPlaying(false);
    fadeVolume(vol, 0, () => {
      audio.pause();
      audio.volume = 0;
    });
  }, [ready, fadeVolume]);

  return { toggle, play, pause, isPlaying, audioRef, ready };
}
