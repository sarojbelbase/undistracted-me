/**
 * useChromeMedia — shared hook for Chrome media session playback.
 *
 * Used by both the canvas Media widget and Focus Mode.  Single source of truth
 * for browser-tab media (YouTube, SoundCloud, Apple Music, etc.).
 *
 * Data flow:
 *   bg.js writes sessions to chrome.storage.local['chrome_media_sessions']
 *   → onChanged listener fires instantly in all open tabs  ← primary path
 *   → 30 s fallback poll (SW may be dormant, onChanged missed)
 *   → paused entirely when the tab is hidden (visibilitychange)
 */
import { useState, useEffect, useCallback } from 'react';
import { getChromeMedia, sendChromeMediaAction } from '../utils';

const FALLBACK_POLL_MS = 30_000;

export function useChromeMedia() {
  const [sessions, setSessions] = useState([]);
  const [pending, setPending] = useState(false);
  const [skipPending, setSkipPending] = useState(null);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
    let cancelled = false;
    const load = async () => {
      if (cancelled) return;
      try {
        const data = await getChromeMedia();
        if (!cancelled) { setSessions(data); setPending(false); setSkipPending(null); }
      } catch { /* ignore */ }
    };
    load();
    const onChanged = (changes, area) => {
      if (area !== 'local' || !changes.chrome_media_sessions) return;
      const updated = changes.chrome_media_sessions.newValue ?? [];
      if (!cancelled) { setSessions(updated); setPending(false); setSkipPending(null); }
    };
    chrome.storage.onChanged.addListener(onChanged);
    const fallbackId = setInterval(() => { if (!document.hidden) load(); }, FALLBACK_POLL_MS);
    const onVisible = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      chrome.storage.onChanged.removeListener(onChanged);
      clearInterval(fallbackId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const top = sessions[0] ?? null;
  const track = top ? {
    title: top.title || 'Playing',
    artist: top.artist || top.host || '',
    albumArt: top.artwork || null,
    isPlaying: top.playbackState === 'playing',
    tabId: top.tabId,
    host: top.host,
    durationMs: null,
    progressMs: null,
  } : null;

  const sendAction = useCallback((action, tabId) => {
    const targetId = tabId ?? top?.tabId;
    if (!targetId) return;
    if (action === 'play' || action === 'pause') setPending(true);
    if (action === 'next') setSkipPending('next');
    if (action === 'previous') setSkipPending('prev');
    sendChromeMediaAction(action, targetId);
  }, [top]);

  return { track, sessions, sendAction, pending, skipPending };
}
