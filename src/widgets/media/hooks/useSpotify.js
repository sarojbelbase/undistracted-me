// ─── Shared Spotify hook ──────────────────────────────────────────────────────
//
// Used by both Focus Mode (LeftPanel → Spotify.jsx) and can be adopted by the
// canvas Spotify widget. Encapsulates playback polling, progress tracking, and
// play/pause/skip controls in one place.

import { useState, useEffect, useCallback, useRef } from "react";
import { getCurrentPlayback, isSpotifyConnected, setPlayPause, skipNext, skipPrev } from "../utils";

export const useSpotify = () => {
  const [spotify, setSpotify] = useState(null);
  const [progress, setProgress] = useState(0);
  const [pending, setPending] = useState(false);
  const [skipPending, setSkipPending] = useState(null);
  const [connected, setConnected] = useState(() => isSpotifyConnected());
  const refreshTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(refreshTimerRef.current), []);

  useEffect(() => {
    const onStorage = (e) => { if (e.key === "spotify_connected") setConnected(isSpotifyConnected()); };
    globalThis.addEventListener("storage", onStorage);
    return () => globalThis.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!connected) { setSpotify(null); return; }
    let cancelled = false;
    const fetchSpotify = async () => {
      if (document.hidden) return;
      try {
        const data = await getCurrentPlayback();
        if (cancelled) return;
        if (!data?.item) { setSpotify(null); return; }
        const p = {
          isPlaying: data.is_playing,
          title: data.item.name,
          artist: data.item.artists.map((a) => a.name).join(", "),
          albumArt: data.item.album.images[0]?.url ?? null,
          durationMs: data.item.duration_ms,
          progressMs: data.progress_ms ?? 0,
        };
        setSpotify(p);
        setProgress(p.progressMs);
      } catch { if (!cancelled) setSpotify(null); }
    };
    fetchSpotify();
    const timerId = setInterval(fetchSpotify, 5000);
    const onVisible = () => { if (!document.hidden) fetchSpotify(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { cancelled = true; clearInterval(timerId); document.removeEventListener("visibilitychange", onVisible); };
  }, [connected]);

  const durationRef = useRef(spotify?.durationMs);
  durationRef.current = spotify?.durationMs;

  useEffect(() => {
    if (!spotify?.isPlaying) return;
    const timerId = setInterval(() => setProgress((p) => Math.min(p + 1000, durationRef.current || p)), 1000);
    return () => clearInterval(timerId);
  }, [spotify?.isPlaying]);

  const refresh = useCallback(async () => {
    try {
      const data = await getCurrentPlayback();
      if (data?.item) {
        const p = { isPlaying: data.is_playing, title: data.item.name, artist: data.item.artists.map((a) => a.name).join(", "), albumArt: data.item.album.images[0]?.url ?? null, durationMs: data.item.duration_ms, progressMs: data.progress_ms ?? 0 };
        setSpotify(p);
        setProgress(p.progressMs);
      }
    } catch { }
  }, []);

  const handleToggle = useCallback(async () => {
    if (!spotify) return;
    setPending(true);
    try { await setPlayPause(!spotify.isPlaying); setSpotify((s) => (s ? { ...s, isPlaying: !s.isPlaying } : s)); }
    catch { } finally { setPending(false); }
  }, [spotify]);

  const handleNext = useCallback(async () => {
    setSkipPending("next");
    try { await skipNext(); clearTimeout(refreshTimerRef.current); refreshTimerRef.current = setTimeout(refresh, 500); }
    catch { } finally { setSkipPending(null); }
  }, [refresh]);

  const handlePrev = useCallback(async () => {
    setSkipPending("prev");
    try { await skipPrev(); clearTimeout(refreshTimerRef.current); refreshTimerRef.current = setTimeout(refresh, 500); }
    catch { } finally { setSkipPending(null); }
  }, [refresh]);

  return { spotify, progress, pending, skipPending, handleToggle, handleNext, handlePrev };
};
