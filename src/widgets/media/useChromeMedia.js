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
 *
 * Returns:
 *   track        — top session as { title, artist, albumArt, isPlaying, tabId, host }
 *                  or null when no media is playing
 *   sessions     — all active sessions (raw array from bg.js)
 *   sendAction   — (action, tabId?) => void   play / pause / next / previous
 *   pending      — true while play/pause action is in-flight
 *   skipPending  — 'next' | 'prev' | null while a skip is in-flight
 */

import { useState, useEffect, useCallback } from 'react';
import { getChromeMedia, sendChromeMediaAction } from '../../widgets/media/utils';

const FALLBACK_POLL_MS = 30_000; // safety net behind the push listener

export function useChromeMedia() {
  const [sessions, setSessions] = useState([]);
  const [pending, setPending] = useState(false);
  const [skipPending, setSkipPending] = useState(null); // 'next' | 'prev' | null

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
    let cancelled = false;

    // 1. Read from storage immediately — no SW wakeup needed
    const load = async () => {
      if (cancelled) return;
      try {
        const data = await getChromeMedia();
        if (!cancelled) {
          setSessions(data);
          setPending(false);
          setSkipPending(null);
        }
      } catch { /* ignore */ }
    };
    load();

    // 2. Push listener — fires the instant bg.js writes new sessions
    const onChanged = (changes, area) => {
      if (area !== 'local' || !changes.chrome_media_sessions) return;
      const updated = changes.chrome_media_sessions.newValue ?? [];
      if (!cancelled) {
        setSessions(updated);
        setPending(false);
        setSkipPending(null);
      }
    };
    chrome.storage.onChanged.addListener(onChanged);

    // 3. Fallback poll — 30 s safety net
    const fallbackId = setInterval(() => {
      if (!document.hidden) load();
    }, FALLBACK_POLL_MS);

    // 4. Pause entirely when hidden
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      chrome.storage.onChanged.removeListener(onChanged);
      clearInterval(fallbackId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // ── Derived top session ──────────────────────────────────────────────────
  const top = sessions[0] ?? null;
  const track = top
    ? {
      title: top.title || 'Playing',
      artist: top.artist || top.host || '',
      albumArt: top.artwork || null,
      isPlaying: top.playbackState === 'playing',
      tabId: top.tabId,
      host: top.host,
      durationMs: null,
      progressMs: null,
    }
    : null;

  // ── Action dispatcher ────────────────────────────────────────────────────
  const sendAction = useCallback(
    (action, tabId) => {
      const targetId = tabId ?? top?.tabId;
      if (!targetId) return;
      if (action === 'play' || action === 'pause') setPending(true);
      if (action === 'next') setSkipPending('next');
      if (action === 'previous') setSkipPending('prev');
      sendChromeMediaAction(action, targetId);
    },
    [top],
  );

  return { track, sessions, sendAction, pending, skipPending };
}
