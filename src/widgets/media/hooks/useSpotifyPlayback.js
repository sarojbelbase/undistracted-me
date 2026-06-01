/**
 * useSpotifyPlayback — Spotify playback state, polling, album colour,
 * account sync, and play/pause/skip controls.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { getCurrentPlayback, setPlayPause, skipNext, skipPrev, extractAlbumColor } from '../utils';
import { parseTrack } from './mediaHelpers';

export const SPOTIFY_ACCOUNT_CHANGED = 'spotify_account_changed';

export function useSpotifyPlayback(connected, setConnected) {
  const [track, setTrack] = useState(null);
  const [trackAnimKey, setTrackAnimKey] = useState(0);
  const prevTrackIdRef = useRef(null);
  const [albumColor, setAlbumColor] = useState(null);
  const lastArtRef = useRef(null);
  const [pending, setPending] = useState(false);
  const [skipPending, setSkipPending] = useState(null);
  const skipTimerRef = useRef(null);

  useEffect(() => {
    if (!track) return;
    const id = track.title + track.artist;
    if (id !== prevTrackIdRef.current) { prevTrackIdRef.current = id; setTrackAnimKey(k => k + 1); }
  }, [track?.title, track?.artist]);

  const fetchPlayback = useCallback(async () => {
    try {
      const data = await getCurrentPlayback();
      const t = parseTrack(data);
      setTrack(t);
      if (!t) { setAlbumColor(null); lastArtRef.current = null; }
    } catch (e) { if (e.message === 'not_authenticated') setTrack(null); }
  }, []);

  useEffect(() => {
    if (!track?.albumArt || track.albumArt === lastArtRef.current) return;
    lastArtRef.current = track.albumArt;
    extractAlbumColor(track.albumArt).then(setAlbumColor);
  }, [track?.albumArt]);

  useEffect(() => {
    if (!connected) return;
    fetchPlayback();
    let id;
    const startPoll = () => { clearInterval(id); id = setInterval(fetchPlayback, 5000); };
    const stopPoll = () => clearInterval(id);
    const onVis = () => { if (document.visibilityState === 'visible') { fetchPlayback(); startPoll(); } else stopPoll(); };
    onVis();
    document.addEventListener('visibilitychange', onVis);
    return () => { stopPoll(); document.removeEventListener('visibilitychange', onVis); };
  }, [connected, fetchPlayback]);

  useEffect(() => () => clearTimeout(skipTimerRef.current), []);

  useEffect(() => {
    const handler = ({ detail }) => {
      setConnected(detail.connected);
      if (detail.connected) fetchPlayback();
      else { setTrack(null); setAlbumColor(null); }
    };
    globalThis.addEventListener(SPOTIFY_ACCOUNT_CHANGED, handler);
    return () => globalThis.removeEventListener(SPOTIFY_ACCOUNT_CHANGED, handler);
  }, [fetchPlayback]);

  const handlePlayPause = async () => {
    if (!track) return;
    setPending(true);
    try { await setPlayPause(!track.isPlaying); setTrack(t => t ? { ...t, isPlaying: !t.isPlaying } : t); }
    finally { setPending(false); }
  };
  const handleNext = async () => {
    setSkipPending('next');
    try { await skipNext(); clearTimeout(skipTimerRef.current); skipTimerRef.current = setTimeout(fetchPlayback, 400); }
    finally { setSkipPending(null); }
  };
  const handlePrev = async () => {
    setSkipPending('prev');
    try { await skipPrev(); clearTimeout(skipTimerRef.current); skipTimerRef.current = setTimeout(fetchPlayback, 400); }
    finally { setSkipPending(null); }
  };

  return { track, trackAnimKey, albumColor, pending, skipPending, fetchPlayback, handlePlayPause, handleNext, handlePrev };
}
