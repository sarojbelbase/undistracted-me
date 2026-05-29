import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SkipStartFill, SkipEndFill, PlayFill, PauseFill, MusicNoteBeamed } from 'react-bootstrap-icons';
import { IntegrationRow } from '../../components/ui/IntegrationRow';
import { TintedChip } from '../../components/ui/TintedChip';
import { TooltipBtn } from '../../components/ui/TooltipBtn';
import { SpotifyIcon as SpotifyBrandIcon } from '../../assets/brand/icons';
import { BaseWidget } from '../BaseWidget';
import {
  SPOTIFY_CLIENT_ID,
  isSpotifyConnected,
  getCurrentPlayback, setPlayPause, skipNext, skipPrev,
  extractAlbumColor, getSpotifyProfile, fetchAndCacheProfile,
} from './utils';
import { useChromeMedia } from './useChromeMedia';
// Event key shared with Accounts settings tab for Spotify connect/disconnect sync.
const SPOTIFY_ACCOUNT_CHANGED = 'spotify_account_changed';

const DEBUG_MODE = import.meta.env.VITE_DEBUG_MODE === 'true';

const parseTrack = (data) => {
  if (!data?.item) return null;
  const t = data.item;
  return {
    isPlaying: data.is_playing,
    title: t.name,
    artist: t.artists.map(a => a.name).join(', '),
    albumArt: t.album.images[0]?.url ?? null,
    durationMs: t.duration_ms,
    progressMs: data.progress_ms ?? 0,
  };
};

// Darken an RGB colour for gradient backgrounds
const dark = (r, g, b, f) => `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;

// Small brand accent — a coloured ring (box-shadow) on the artwork edge.
// Zero layout cost; no extra DOM element in the flow.
const SOURCE_META = {
  'music.youtube.com': { color: '#c00c1e', label: 'YouTube Music' },
  'www.youtube.com': { color: '#ff0000', label: 'YouTube' },
  'youtube.com': { color: '#ff0000', label: 'YouTube' },
  'soundcloud.com': { color: '#ff5500', label: 'SoundCloud' },
};

function chromeArtworkRing(host) {
  const meta = host ? (SOURCE_META[host] ?? null) : null;
  if (!meta) return {};
  return { outline: `2px solid ${meta.color}`, outlineOffset: '2px' };
};

export const Widget = ({ onRemove }) => {
  const [connected, setConnected] = useState(() => isSpotifyConnected());
  const [track, setTrack] = useState(null);
  const [trackAnimKey, setTrackAnimKey] = useState(0);
  const prevTrackIdRef = useRef(null);
  const [albumColor, setAlbumColor] = useState(null);

  // Detect track changes for entrance animation
  useEffect(() => {
    if (!track) return;
    const id = track.title + track.artist;
    if (id !== prevTrackIdRef.current) {
      prevTrackIdRef.current = id;
      setTrackAnimKey(k => k + 1);
    }
  }, [track?.title, track?.artist]);

  const lastArtRef = useRef(null);
  const tickRef = useRef(null);
  // ── Chrome media — shared hook (onChanged push + 30s fallback) ──────────
  const {
    sessions: chromeMediaSessions,
    sendAction: chromeSendAction,
    pending: chromePendingActive,
    skipPending: chromeSkipPendingActive,
  } = useChromeMedia();

  // Map shared hook state to widget-local names (backward-compat with rendering code)
  const chromePendingTabId = chromePendingActive ? 1 : null;
  const chromeSkipPending = chromeSkipPendingActive;
  const [chromeAlbumColors, setChromeAlbumColors] = useState({});
  const chromeArtRef = useRef({});
  const [chromeTrackAnimKey, setChromeTrackAnimKey] = useState(0);
  const prevChromeTrackIdRef = useRef(null);
  const [spotifyPending, setSpotifyPending] = useState(false);
  const [spotifySkipPending, setSpotifySkipPending] = useState(null);
  // Ref for the post-skip Spotify refresh timer so it can be cancelled on unmount.
  const spotifySkipTimerRef = useRef(null);

  const fetchPlayback = useCallback(async () => {
    try {
      const data = await getCurrentPlayback();
      const t = parseTrack(data);
      setTrack(t);
      // Clear album color when nothing is playing so the widget reverts to default background
      if (!t) {
        setAlbumColor(null);
        lastArtRef.current = null;
      }
    } catch (e) {
      // Don't flip back to the connect screen on a transient auth error — the user
      // already went through setup. Stay connected and show "nothing playing";
      // they can explicitly disconnect via the settings gear if needed.
      if (e.message === 'not_authenticated') setTrack(null);
    }
  }, []);

  // Extract album color whenever art changes
  useEffect(() => {
    if (!track?.albumArt || track.albumArt === lastArtRef.current) return;
    lastArtRef.current = track.albumArt;
    extractAlbumColor(track.albumArt).then(setAlbumColor);
  }, [track?.albumArt]);

  // Poll playback every 5s when connected AND tab is visible — pause when
  // hidden to avoid wasted network requests. Resumes instantly on visibility change.
  useEffect(() => {
    if (!connected) return;
    fetchPlayback();
    let id;
    const startPoll = () => {
      clearInterval(id);
      id = setInterval(fetchPlayback, 5000);
    };
    const stopPoll = () => clearInterval(id);
    const onVis = () => {
      if (document.visibilityState === 'visible') { fetchPlayback(); startPoll(); }
      else stopPoll();
    };
    onVis(); // start immediately if visible
    document.addEventListener('visibilitychange', onVis);
    return () => { stopPoll(); document.removeEventListener('visibilitychange', onVis); };
  }, [connected, fetchPlayback]);

  // Smooth local progress tick — kept for potential future use, currently no-op
  useEffect(() => {
    clearInterval(tickRef.current);
    return () => clearInterval(tickRef.current);
  }, [track?.isPlaying]);

  // Cancel the post-skip Spotify refresh timer on unmount.
  useEffect(() => () => clearTimeout(spotifySkipTimerRef.current), []);

  // ── Album colour extraction from Chrome sessions ────────────────────────
  const updateSessionArtColor = useCallback((s) => {
    if (!s.artwork || chromeArtRef.current[s.tabId] === s.artwork) return;
    chromeArtRef.current[s.tabId] = s.artwork;
    extractAlbumColor(s.artwork).then(color => {
      if (color) setChromeAlbumColors(prev => ({ ...prev, [s.tabId]: color }));
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    chromeMediaSessions.forEach(updateSessionArtColor);
  }, [chromeMediaSessions, updateSessionArtColor]);

  // Prune stale tabId entries from both the artwork ref and the album-color state
  // so memory from closed tabs is released promptly rather than waiting for GC.
  useEffect(() => {
    const liveIds = new Set(chromeMediaSessions.map(s => String(s.tabId)));
    // Artwork ref: plain object mutation, no re-render needed.
    for (const k of Object.keys(chromeArtRef.current)) {
      if (!liveIds.has(k)) delete chromeArtRef.current[k];
    }
    // Album colors: bail out early if nothing was pruned to avoid a re-render.
    setChromeAlbumColors(prev => {
      const next = {};
      let changed = false;
      for (const [k, v] of Object.entries(prev)) {
        if (liveIds.has(k)) next[k] = v;
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [chromeMediaSessions]);

  // Sync with Accounts settings tab connect/disconnect events
  useEffect(() => {
    const handler = ({ detail }) => {
      setConnected(detail.connected);
      if (detail.connected) {
        fetchPlayback();
      } else {
        setTrack(null);
        setAlbumColor(null);
      }
    };
    globalThis.addEventListener(SPOTIFY_ACCOUNT_CHANGED, handler);
    return () => globalThis.removeEventListener(SPOTIFY_ACCOUNT_CHANGED, handler);
  }, [fetchPlayback]);

  const handlePlayPause = async () => {
    if (!track) return;
    setSpotifyPending(true);
    try {
      await setPlayPause(!track.isPlaying);
      setTrack(t => t ? { ...t, isPlaying: !t.isPlaying } : t);
    } finally {
      setSpotifyPending(false);
    }
  };

  const handleNext = async () => {
    setSpotifySkipPending('next');
    try {
      await skipNext();
      clearTimeout(spotifySkipTimerRef.current);
      spotifySkipTimerRef.current = setTimeout(fetchPlayback, 400);
    } finally { setSpotifySkipPending(null); }
  };
  const handlePrev = async () => {
    setSpotifySkipPending('prev');
    try {
      await skipPrev();
      clearTimeout(spotifySkipTimerRef.current);
      spotifySkipTimerRef.current = setTimeout(fetchPlayback, 400);
    } finally { setSpotifySkipPending(null); }
  };

  const handleChromePlayPause = (session) => {
    const action = session.playbackState === 'playing' ? 'pause' : 'play';
    sendChromeMediaAction(action, session.tabId);
    // Optimistic: flip state immediately so the button responds right away
    setChromeMediaSessions(prev => prev.map(s =>
      s.tabId === session.tabId ? { ...s, playbackState: action === 'play' ? 'playing' : 'paused' } : s
    ));
    // Show pending ring until the next confirmed poll clears it (or 6s safety)
    setChromePendingTabId(session.tabId);
    clearTimeout(chromePendingTimeoutRef.current);
    chromePendingTimeoutRef.current = setTimeout(() => setChromePendingTabId(null), 6000);
  };
  const handleChromeNext = (session) => {
    sendChromeMediaAction('next', session.tabId);
    setChromeSkipPending({ tabId: session.tabId, action: 'next' });
    clearTimeout(chromeSkipPendingTimeoutRef.current);
    chromeSkipPendingTimeoutRef.current = setTimeout(() => setChromeSkipPending(null), 6000);
  };
  const handleChromePrev = (session) => {
    sendChromeMediaAction('previous', session.tabId);
    setChromeSkipPending({ tabId: session.tabId, action: 'prev' });
    clearTimeout(chromeSkipPendingTimeoutRef.current);
    chromeSkipPendingTimeoutRef.current = setTimeout(() => setChromeSkipPending(null), 6000);
  };

  // hasBg = true whenever there's album art
  const hasBg = !!track?.albumArt;
  let bgStyle;
  if (albumColor) {
    bgStyle = { background: `linear-gradient(160deg, ${dark(albumColor.r, albumColor.g, albumColor.b, 0.55)} 0%, ${dark(albumColor.r, albumColor.g, albumColor.b, 0.35)} 100%)` };
  } else if (hasBg) {
    bgStyle = { backgroundColor: '#1a1a1e' };
  } else {
    bgStyle = {};
  }
  // Always white text/controls when hasBg — dark scrim + gradient ensures readability in all modes
  const inkColor = hasBg ? 'rgba(255,255,255,0.95)' : 'var(--w-ink-1)';
  const muteColor = hasBg ? 'rgba(255,255,255,0.6)' : 'var(--w-ink-4)';
  const btnBg = hasBg ? 'rgba(255,255,255,0.18)' : 'var(--panel-bg)';
  const btnBorder = hasBg ? '1px solid rgba(255,255,255,0.25)' : '1px solid var(--card-border)';

  // Priority-based single-session selection.
  // Playing sessions beat paused; ties broken by source priority:
  //   YouTube Music (0) > YouTube (1) > SoundCloud (2) > everything else (99)
  const chromePriority = (host) => {
    if (!host) return 99;
    if (host === 'music.youtube.com') return 0;
    if (host.includes('youtube.com')) return 1;
    if (host.includes('soundcloud.com')) return 2;
    return 99;
  };
  const activeSession = chromeMediaSessions.reduce((best, s) => {
    if (!best) return s;
    const bestPlaying = best.playbackState === 'playing';
    const sPlaying = s.playbackState === 'playing';
    if (sPlaying && !bestPlaying) return s;
    if (!sPlaying && bestPlaying) return best;
    return chromePriority(s.host) <= chromePriority(best.host) ? s : best;
  }, null) ?? null;

  // Animate when chrome media track changes
  useEffect(() => {
    if (!activeSession) return;
    const id = (activeSession.title ?? '') + (activeSession.artist ?? '');
    if (id !== prevChromeTrackIdRef.current) {
      prevChromeTrackIdRef.current = id;
      setChromeTrackAnimKey(k => k + 1);
    }
  }, [activeSession?.title, activeSession?.artist]);
  const activeChromeColor = activeSession ? (chromeAlbumColors[activeSession.tabId] ?? null) : null;
  const chromeHasBg = !!activeSession?.artwork && !!activeChromeColor;
  let chromeBgStyle;
  if (activeChromeColor) {
    chromeBgStyle = { background: `linear-gradient(160deg, ${dark(activeChromeColor.r, activeChromeColor.g, activeChromeColor.b, 0.55)} 0%, ${dark(activeChromeColor.r, activeChromeColor.g, activeChromeColor.b, 0.35)} 100%)` };
  } else if (chromeHasBg) {
    chromeBgStyle = { backgroundColor: '#1a1a1e' };
  } else {
    chromeBgStyle = {};
  }
  const chromeInk = chromeHasBg ? 'rgba(255,255,255,0.95)' : 'var(--w-ink-1)';
  const chromeMute = chromeHasBg ? 'rgba(255,255,255,0.6)' : 'var(--w-ink-4)';
  const chromeBtnBg = chromeHasBg ? 'rgba(255,255,255,0.18)' : 'var(--panel-bg)';
  const chromeBtnBorder = chromeHasBg ? '1px solid rgba(255,255,255,0.25)' : '1px solid var(--card-border)';

  // Not set up — only show the dev hint if there's also no browser media to display
  if (!SPOTIFY_CLIENT_ID && !chromeMediaSessions.length) {
    return (
      <BaseWidget className="p-4 flex flex-col items-center justify-center gap-2" onRemove={onRemove}>
        <MusicNoteBeamed size={28} className="opacity-20" />
        <p className="w-muted text-center text-xs">Set <code className="font-mono">SPOTIFY_CLIENT_ID</code><br />in media/utils.js</p>
      </BaseWidget>
    );
  }

  const settingsPanel = <SpotifySettings />;

  // Not connected — show chrome media if available, otherwise hint to settings
  if (!connected) {
    if (!chromeMediaSessions.length) {
      return (
        <BaseWidget
          className="p-4 flex flex-col items-center justify-center gap-3"
          onRemove={onRemove}
          settingsContent={settingsPanel}
          settingsTitle="Media"
        >
          <MusicNoteBeamed size={22} style={{ color: 'var(--w-ink-6)', opacity: 0.4 }} />
          <div className="flex flex-col items-center gap-1.5 text-center">
            <p className="text-[11px] font-semibold" style={{ color: 'var(--w-ink-3)' }}>Nothing playing</p>
            <p className="text-[10.5px] leading-snug" style={{ color: 'var(--w-ink-5)' }}>
              Open YouTube or SoundCloud in any tab
            </p>
            <p className="text-[10px]" style={{ color: 'var(--w-ink-6)' }}>
              Settings&nbsp;›&nbsp;Accounts to connect Spotify
            </p>
          </div>
        </BaseWidget>
      );
    }
  }

  // Connected, nothing playing — show chrome media if available
  if (connected && !track && !chromeMediaSessions.length) {
    return (
      <BaseWidget
        className="p-4 flex flex-col items-center justify-center gap-2"
        cardStyle={bgStyle}
        settingsContent={settingsPanel}
        settingsTitle="Media"
        onRemove={onRemove}
      >
        <MusicNoteBeamed size={28} style={{ color: muteColor }} />
        <p className="text-center text-xs" style={{ color: muteColor }}>Nothing playing</p>
      </BaseWidget>
    );
  }

  // Chrome media fallback — shown when Spotify is idle/not connected but browser media is active.
  // Supports up to 3 concurrent sessions in a stacked player: the active session shows as the
  // full player card; additional sessions peek in as compact strips at the bottom.
  if ((!connected || !track) && chromeMediaSessions.length) {
    return (
      <BaseWidget
        className="relative p-0 flex flex-col"
        cardStyle={chromeBgStyle}
        settingsContent={settingsPanel}
        settingsTitle="Media"
        onRemove={onRemove}
      >
        {/* Full-bleed blurred artwork behind active session */}
        {activeSession?.artwork && (
          <div className="absolute inset-0 rounded-2xl overflow-hidden">
            <img src={activeSession.artwork} alt="" className="w-full h-full object-cover opacity-25" style={{ transition: 'opacity 0.4s' }} />
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.54)' }} />
          </div>
        )}

        {/* Main player — fills available vertical space */}
        <div className="relative z-10 flex flex-col flex-1 p-4 gap-2 min-h-0">
          {/* Album art square — animates on track change */}
          <div key={chromeTrackAnimKey} className="flex flex-col gap-2" style={chromeTrackAnimKey > 0 ? { animation: 'spotifyTrackIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both' } : undefined}>
            {activeSession?.artwork && (
              <div className="flex justify-center">
                <img
                  src={activeSession.artwork}
                  alt=""
                  decoding="async"
                  className="rounded-xl shadow-lg object-cover"
                  style={{ width: 80, height: 80, ...chromeArtworkRing(activeSession?.host) }}
                />
              </div>
            )}

            {/* Track info */}
            <div className="flex flex-col gap-0.5 min-w-0 mt-1">
              <div className="truncate text-sm font-semibold" style={{ color: chromeInk }}>
                {activeSession?.title || 'Playing'}
              </div>
              <div className="truncate text-xs" style={{ color: chromeMute }}>
                {activeSession?.artist || activeSession?.host || 'Browser'}
              </div>
            </div>
          </div>

          {/* Playback controls */}
          <div className="flex items-center justify-center gap-3 pt-1">
            <div className="relative">
              {chromeSkipPending?.tabId === activeSession?.tabId && chromeSkipPending?.action === 'prev' && (
                <div
                  className="absolute animate-spin pointer-events-none rounded-full"
                  style={{ inset: '-3px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'rgba(255,255,255,0.7)' }}
                  aria-hidden="true"
                />
              )}
              <button
                onClick={() => handleChromePrev(activeSession)}
                disabled={activeSession?.canGoPrev === false}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-80 active:scale-90"
                style={{
                  backgroundColor: chromeBtnBg,
                  color: chromeInk,
                  border: chromeBtnBorder,
                  opacity: (() => {
                    if (activeSession?.canGoPrev === false) return 0.2;
                    if (chromeSkipPending?.tabId === activeSession?.tabId && chromeSkipPending?.action === 'prev') return 0.6;
                    return 1;
                  })(),
                  cursor: activeSession?.canGoPrev === false ? 'default' : undefined,
                  transition: 'opacity 0.2s',
                }}
                aria-label="Previous"
              >
                <SkipStartFill size={13} />
              </button>
            </div>
            <div className="relative">
              {chromePendingTabId === activeSession?.tabId && (
                <div
                  className="absolute animate-spin pointer-events-none rounded-full"
                  style={{ inset: '-3px', border: '2px solid rgba(0,0,0,0.08)', borderTopColor: 'rgba(0,0,0,0.55)' }}
                  aria-hidden="true"
                />
              )}
              <TooltipBtn tooltip={activeSession?.playbackState === 'playing' ? 'Pause' : 'Play'}>
                <button
                  onClick={() => handleChromePlayPause(activeSession)}
                  className="w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    color: '#000',
                    opacity: chromePendingTabId === activeSession?.tabId ? 0.65 : 1,
                    transition: 'opacity 0.2s, transform 0.15s',
                  }}
                  aria-label={activeSession?.playbackState === 'playing' ? 'Pause' : 'Play'}
                >
                  {activeSession?.playbackState === 'playing' ? <PauseFill size={16} /> : <PlayFill size={16} />}
                </button>
              </TooltipBtn>
            </div>
            <div className="relative">
              {chromeSkipPending?.tabId === activeSession?.tabId && chromeSkipPending?.action === 'next' && (
                <div
                  className="absolute animate-spin pointer-events-none rounded-full"
                  style={{ inset: '-3px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'rgba(255,255,255,0.7)' }}
                  aria-hidden="true"
                />
              )}
              <TooltipBtn tooltip="Next">
                <button
                  onClick={() => handleChromeNext(activeSession)}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-80 active:scale-90"
                  style={{
                    backgroundColor: chromeBtnBg,
                    color: chromeInk,
                    border: chromeBtnBorder,
                    opacity: chromeSkipPending?.tabId === activeSession?.tabId && chromeSkipPending?.action === 'next' ? 0.6 : 1,
                    transition: 'opacity 0.2s',
                  }}
                  aria-label="Next"
                >
                  <SkipEndFill size={13} />
                </button>
              </TooltipBtn>
            </div>
          </div>
        </div>
      </BaseWidget>
    );
  }

  return (
    <BaseWidget
      className="relative p-0 flex flex-col"
      cardStyle={bgStyle}
      settingsContent={settingsPanel}
      settingsTitle="Media"
      onRemove={onRemove}
    >
      {/* Album art — full-bleed, faded + dark scrim; clipped to card corners */}
      {track.albumArt && (
        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          <img src={track.albumArt} alt="" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.52)' }} />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full p-4 gap-2">
        {/* Album art + track info — animates on track change */}
        <div key={trackAnimKey} className="flex flex-col gap-2" style={trackAnimKey > 0 ? { animation: 'spotifyTrackIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both' } : undefined}>
          {/* Album art square */}
          {track.albumArt && (
            <div className="flex justify-center">
              <img src={track.albumArt} alt="" decoding="async" className="w-20 h-20 rounded-xl shadow-lg object-cover" />
            </div>
          )}

          {/* Track info */}
          <div className="flex flex-col gap-0.5 min-w-0 mt-1">
            <div className="truncate text-sm font-semibold" style={{ color: inkColor }}>{track.title}</div>
            <div className="truncate text-xs" style={{ color: muteColor }}>{track.artist}</div>
          </div>
        </div>

        {/* Controls — centered */}
        <div className="flex items-center justify-center gap-3 pt-1">
          <div className="relative">
            {spotifySkipPending === 'prev' && (
              <div
                className="absolute animate-spin pointer-events-none rounded-full"
                style={{ inset: '-3px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: hasBg ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.45)' }}
                aria-hidden="true"
              />
            )}
            <TooltipBtn tooltip="Previous">
              <button
                onClick={handlePrev}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-80"
                style={{
                  backgroundColor: btnBg,
                  color: inkColor,
                  border: btnBorder,
                  opacity: spotifySkipPending === 'prev' ? 0.6 : 1,
                  transition: 'opacity 0.2s',
                }}
                aria-label="Previous"
              >
                <SkipStartFill size={13} />
              </button>
            </TooltipBtn>
          </div>
          <div className="relative">
            {spotifyPending && (
              <div
                className="absolute animate-spin pointer-events-none rounded-full"
                style={{ inset: '-3px', border: '2px solid rgba(0,0,0,0.08)', borderTopColor: 'rgba(0,0,0,0.55)' }}
                aria-hidden="true"
              />
            )}
            <TooltipBtn tooltip={track.isPlaying ? 'Pause' : 'Play'}>
              <button
                onClick={handlePlayPause}
                className="w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all hover:scale-105"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  color: '#000',
                  opacity: spotifyPending ? 0.65 : 1,
                  transition: 'opacity 0.2s, transform 0.15s',
                }}
                aria-label={track.isPlaying ? 'Pause' : 'Play'}
              >
                {track.isPlaying ? <PauseFill size={16} /> : <PlayFill size={16} />}
              </button>
            </TooltipBtn>
          </div>
          <div className="relative">
            {spotifySkipPending === 'next' && (
              <div
                className="absolute animate-spin pointer-events-none rounded-full"
                style={{ inset: '-3px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: hasBg ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.45)' }}
                aria-hidden="true"
              />
            )}
            <TooltipBtn tooltip="Next">
              <button
                onClick={handleNext}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-80"
                style={{
                  backgroundColor: btnBg,
                  color: inkColor,
                  border: btnBorder,
                  opacity: spotifySkipPending === 'next' ? 0.6 : 1,
                  transition: 'opacity 0.2s',
                }}
                aria-label="Next"
              >
                <SkipEndFill size={13} />
              </button>
            </TooltipBtn>
          </div>
        </div>
      </div>
    </BaseWidget>
  );
};

const spotifyTierLabel = (profile) => {
  if (!profile) return null;
  if (profile.product === 'premium') return 'Spotify Premium';
  if (profile.product === 'free' || profile.product === 'open') return 'Spotify Free';
  return null;
};

const SpotifySettings = () => {
  const [connected, setConnected] = useState(() => isSpotifyConnected());
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    // fetchAndCacheProfile hits the Spotify API and returns avatar; fall back to
    // the cached storage profile (name+product only) if the API call fails.
    fetchAndCacheProfile()
      .then(p => { if (p) setProfile(p); })
      .catch(() => { })
      .finally(() => {
        if (!profile) getSpotifyProfile().then(p => { if (p) setProfile(p); });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync when Accounts settings tab fires SPOTIFY_ACCOUNT_CHANGED on this window.
  // (globalThis.storage only fires on *other* tabs — useless here.)
  useEffect(() => {
    const handler = ({ detail }) => {
      setConnected(detail.connected);
      if (detail.connected) {
        // Profile with avatar comes back from fetchAndCacheProfile inside Accounts tab
        fetchAndCacheProfile().then(p => { if (p) setProfile(p); }).catch(() => { });
      } else {
        setProfile(null);
      }
    };
    globalThis.addEventListener(SPOTIFY_ACCOUNT_CHANGED, handler);
    return () => globalThis.removeEventListener(SPOTIFY_ACCOUNT_CHANGED, handler);
  }, []);

  return (
    <div className="flex flex-col gap-4">

      {/* ── Spotify connection row ── */}
      <IntegrationRow
        icon={<SpotifyBrandIcon size={22} />}
        label="Spotify"
        description="Controls playback and shows the currently playing track."
        privacyLabel="Nothing stored on servers"
        connected={connected}
        profile={profile ? { ...profile, picture: profile.avatar ?? null } : null}
        profileSubtitle={spotifyTierLabel(profile)}
      />

      {/* ── Playback sources ── */}
      <div className="flex flex-col gap-2.5" style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '0.75rem' }}>
        <p className="text-[10px] font-semibold m-0" style={{ color: 'var(--w-ink-6)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
          Playback sources
        </p>
        <div className="flex flex-wrap gap-1.5">
          <TintedChip style={{ background: 'rgba(255,85,0,0.10)', color: '#ff5500' }}>SoundCloud</TintedChip>
          <TintedChip style={{ background: 'rgba(255,0,0,0.10)', color: '#ff0000' }}>YouTube</TintedChip>
          <TintedChip style={{ background: 'rgba(192,0,0,0.10)', color: '#c00c1e' }}>YouTube Music</TintedChip>
          <TintedChip style={{ opacity: 0.45, cursor: 'default', pointerEvents: 'none' }}>+ More</TintedChip>
        </div>
        <p className="text-[10px] leading-relaxed m-0" style={{ color: 'var(--w-ink-5)' }}>
          Detected automatically — just play in any tab.
        </p>
      </div>

    </div>
  );
};
