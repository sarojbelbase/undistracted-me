/**
 * useChromeSessionManager — Chrome media session state, album colour
 * extraction, pending/skip timeouts, and action handlers.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { extractAlbumColor, sendChromeMediaAction } from '../utils';

export function useChromeSessionManager(sessions) {
  const [albumColors, setAlbumColors] = useState({});
  const artRef = useRef({});
  const [trackAnimKey, setTrackAnimKey] = useState(0);
  const prevTrackIdRef = useRef(null);
  const [pendingTabId, setPendingTabId] = useState(null);
  const [skipPending, setSkipPending] = useState(null);
  const pendingTimeoutRef = useRef(null);
  const skipPendingTimeoutRef = useRef(null);

  const updateArtColor = useCallback((s) => {
    if (!s.artwork || artRef.current[s.tabId] === s.artwork) return;
    artRef.current[s.tabId] = s.artwork;
    extractAlbumColor(s.artwork).then(color => {
      if (color) setAlbumColors(prev => ({ ...prev, [s.tabId]: color }));
    });
  }, []);

  useEffect(() => { sessions.forEach(updateArtColor); }, [sessions, updateArtColor]);

  useEffect(() => {
    const liveIds = new Set(sessions.map(s => String(s.tabId)));
    for (const k of Object.keys(artRef.current)) { if (!liveIds.has(k)) delete artRef.current[k]; }
    setAlbumColors(prev => {
      const next = {}; let changed = false;
      for (const [k, v] of Object.entries(prev)) { if (liveIds.has(k)) next[k] = v; else changed = true; }
      return changed ? next : prev;
    });
  }, [sessions]);

  const playPause = (session) => {
    sendChromeMediaAction(session.playbackState === 'playing' ? 'pause' : 'play', session.tabId);
    setPendingTabId(session.tabId);
    clearTimeout(pendingTimeoutRef.current);
    pendingTimeoutRef.current = setTimeout(() => setPendingTabId(null), 6000);
  };
  const skipNext = (session) => {
    sendChromeMediaAction('next', session.tabId);
    setSkipPending({ tabId: session.tabId, action: 'next' });
    clearTimeout(skipPendingTimeoutRef.current);
    skipPendingTimeoutRef.current = setTimeout(() => setSkipPending(null), 6000);
  };
  const skipPrev = (session) => {
    sendChromeMediaAction('previous', session.tabId);
    setSkipPending({ tabId: session.tabId, action: 'prev' });
    clearTimeout(skipPendingTimeoutRef.current);
    skipPendingTimeoutRef.current = setTimeout(() => setSkipPending(null), 6000);
  };

  return { albumColors, pendingTabId, skipPending, trackAnimKey, setTrackAnimKey, prevTrackIdRef, playPause, skipNext, skipPrev };
}
