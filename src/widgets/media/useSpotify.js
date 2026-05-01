// ─── Shared Spotify hook ──────────────────────────────────────────────────────
//
// Used by both Focus Mode (LeftPanel → Spotify.jsx) and can be adopted by the
// canvas Spotify widget. Encapsulates playback polling, progress tracking, and
// play/pause/skip controls in one place.
//
// Returns:
//   spotify      – current track object | null
//   progress     – current playback position in ms (interpolated)
//   pending      – true while play/pause toggle is in-flight
//   skipPending  – 'next' | 'prev' | null while a skip is in-flight
//   handleToggle – toggle play/pause
//   handleNext   – skip to next track
//   handlePrev   – skip to previous track

import { useState, useEffect, useCallback } from 'react';
import {
  getCurrentPlayback, isSpotifyConnected,
  setPlayPause, skipNext, skipPrev,
} from './utils';

export const useSpotify = () => {
  const [spotify, setSpotify] = useState(null);
  const [progress, setProgress] = useState(0);
  const [pending, setPending] = useState(false);
  const [skipPending, setSkipPending] = useState(null); // 'next' | 'prev' | null

  // Track connection state reactively so the polling effect re-runs when the
  // user authenticates after the component is already mounted.
  const [connected, setConnected] = useState(() => isSpotifyConnected());

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'spotify_connected') setConnected(isSpotifyConnected());
    };
    globalThis.addEventListener('storage', onStorage);
    return () => globalThis.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!connected) { setSpotify(null); return; }
    let cancelled = false;
    const fetchSpotify = async () => {
      try {
        const data = await getCurrentPlayback();
        if (cancelled) return;
        if (!data?.item) { setSpotify(null); return; }
        const p = {
          isPlaying: data.is_playing,
          title: data.item.name,
          artist: data.item.artists.map(a => a.name).join(', '),
          albumArt: data.item.album.images[0]?.url ?? null,
          durationMs: data.item.duration_ms,
          progressMs: data.progress_ms ?? 0,
        };
        setSpotify(p);
        setProgress(p.progressMs);
      } catch {
        if (!cancelled) setSpotify(null);
      }
    };
    fetchSpotify();
    const timerId = setInterval(fetchSpotify, 5000);
    return () => { cancelled = true; clearInterval(timerId); };
  }, [connected]);

  // Interpolate progress locally every second while playing.
  useEffect(() => {
    if (!spotify?.isPlaying) return;
    const timerId = setInterval(
      () => setProgress(p => Math.min(p + 1000, spotify.durationMs || p)),
      1000,
    );
    return () => clearInterval(timerId);
  }, [spotify?.isPlaying, spotify?.durationMs]);

  const refresh = useCallback(async () => {
    try {
      const data = await getCurrentPlayback();
      if (data?.item) {
        const p = {
          isPlaying: data.is_playing,
          title: data.item.name,
          artist: data.item.artists.map(a => a.name).join(', '),
          albumArt: data.item.album.images[0]?.url ?? null,
          durationMs: data.item.duration_ms,
          progressMs: data.progress_ms ?? 0,
        };
        setSpotify(p);
        setProgress(p.progressMs);
      }
    } catch { }
  }, []);

  const handleToggle = useCallback(async () => {
    if (!spotify) return;
    setPending(true);
    try {
      await setPlayPause(!spotify.isPlaying);
      setSpotify(s => s ? { ...s, isPlaying: !s.isPlaying } : s);
    } catch { } finally {
      setPending(false);
    }
  }, [spotify]);

  const handleNext = useCallback(async () => {
    setSkipPending('next');
    try { await skipNext(); setTimeout(refresh, 500); } catch { } finally { setSkipPending(null); }
  }, [refresh]);

  const handlePrev = useCallback(async () => {
    setSkipPending('prev');
    try { await skipPrev(); setTimeout(refresh, 500); } catch { } finally { setSkipPending(null); }
  }, [refresh]);

  return { spotify, progress, pending, skipPending, handleToggle, handleNext, handlePrev };
};
