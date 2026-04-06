import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SkipStartFill, SkipEndFill, PlayFill, PauseFill, MusicNoteBeamed } from 'react-bootstrap-icons';
import { BaseWidget } from '../BaseWidget';
import { IntegrationRow } from '../../components/ui/IntegrationRow';
import {
  SPOTIFY_CLIENT_ID,
  connectSpotify, disconnectSpotify, isSpotifyConnected,
  getCurrentPlayback, setPlayPause, skipNext, skipPrev,
  extractAlbumColor, fetchAndCacheProfile, getSpotifyProfile,
  getChromeMedia, sendChromeMediaAction,
} from './utils';

const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

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

// Compact strip shown for non-active browser media sessions in the stacked player.
// Clicking the strip body (artwork + text) promotes it to the main player slot.
// The play/pause button is an independent control.
const ChromeMediaStrip = ({ session, isPending, onPromote, onPlayPause }) => {
  const isPlaying = session.playbackState === 'playing';
  return (
    <div
      className="relative z-10 flex items-center gap-2.5 px-3 py-2 shrink-0"
      style={{ borderTop: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.3)', minHeight: 44 }}
    >
      {/* Clickable zone: artwork + track info → promotes this session */}
      <button
        onClick={onPromote}
        className="flex items-center gap-2.5 min-w-0 flex-1 text-left transition-opacity hover:opacity-90 active:opacity-70"
        aria-label={`Switch to ${session.title || session.host || 'this player'}`}
        style={{ background: 'none', border: 'none', padding: 0 }}
      >
        {session.artwork ? (
          <img src={session.artwork} alt="" className="w-7 h-7 rounded-md object-cover shrink-0 shadow-sm" />
        ) : (
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
          >
            <MusicNoteBeamed size={10} style={{ color: 'rgba(255,255,255,0.4)' }} />
          </div>
        )}
        <div className="flex flex-col gap-0 min-w-0">
          <span className="truncate text-[11px] font-semibold leading-tight" style={{ color: 'rgba(255,255,255,0.88)' }}>
            {session.title || 'Playing'}
          </span>
          <span className="truncate text-[10px] leading-tight" style={{ color: 'rgba(255,255,255,0.42)' }}>
            {session.artist || session.host || 'Browser'}
          </span>
        </div>
      </button>

      {/* State dot + play/pause */}
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: isPlaying ? '#22c55e' : 'rgba(255,255,255,0.22)',
            transition: 'background-color 0.3s',
          }}
        />
        <div className="relative">
          {isPending && (
            <div
              className="absolute animate-spin pointer-events-none rounded-full"
              style={{ inset: '-2px', border: '1.5px solid rgba(255,255,255,0.1)', borderTopColor: 'rgba(255,255,255,0.6)' }}
              aria-hidden="true"
            />
          )}
          <button
            onClick={onPlayPause}
            className="w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{
              backgroundColor: 'rgba(255,255,255,0.16)',
              color: 'rgba(255,255,255,0.85)',
              border: '1px solid rgba(255,255,255,0.12)',
              opacity: isPending ? 0.65 : 1,
              transition: 'opacity 0.2s',
            }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <PauseFill size={9} /> : <PlayFill size={9} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export const Widget = ({ onRemove }) => {
  const [connected, setConnected] = useState(() => isSpotifyConnected());
  const [track, setTrack] = useState(null);
  const [albumColor, setAlbumColor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(() => getSpotifyProfile());
  const lastArtRef = useRef(null);
  const tickRef = useRef(null);
  const [chromeMediaSessions, setChromeMediaSessions] = useState([]);
  const [chromeAlbumColors, setChromeAlbumColors] = useState({});
  const chromeArtRef = useRef({});
  const [activeChromeTabId, setActiveChromeTabId] = useState(null);
  const [chromePendingTabId, setChromePendingTabId] = useState(null);
  const chromePendingTimeoutRef = useRef(null);
  const [spotifyPending, setSpotifyPending] = useState(false);
  // 'next' | 'prev' | null — which skip button is in-flight for Spotify
  const [spotifySkipPending, setSpotifySkipPending] = useState(null);
  // { tabId, action } | null — pending skip for chrome sessions
  const [chromeSkipPending, setChromeSkipPending] = useState(null);
  const chromeSkipPendingTimeoutRef = useRef(null);

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

  // Poll playback every 5s when connected
  useEffect(() => {
    if (!connected) return;
    fetchPlayback();
    const id = setInterval(fetchPlayback, 5000);
    return () => clearInterval(id);
  }, [connected, fetchPlayback]);

  // Smooth local progress tick — kept for potential future use, currently no-op
  useEffect(() => {
    clearInterval(tickRef.current);
    return () => clearInterval(tickRef.current);
  }, [track?.isPlaying]);

  // Poll Chrome media every 3s as fallback when Spotify is idle
  const fetchChromeMedia = useCallback(async () => {
    const sessions = await getChromeMedia();
    setChromeMediaSessions(sessions);
    // Real data arrived — clear all pending indicators
    setChromePendingTabId(null);
    setChromeSkipPending(null);
  }, []);

  useEffect(() => {
    fetchChromeMedia();
    const id = setInterval(fetchChromeMedia, 3000);
    return () => clearInterval(id);
  }, [fetchChromeMedia]);

  // Extract colour from each chrome session's artwork (keyed by tabId)
  useEffect(() => {
    chromeMediaSessions.forEach(s => {
      if (!s.artwork || chromeArtRef.current[s.tabId] === s.artwork) return;
      chromeArtRef.current[s.tabId] = s.artwork;
      extractAlbumColor(s.artwork).then(color => {
        if (color) setChromeAlbumColors(prev => ({ ...prev, [s.tabId]: color }));
      });
    });
  }, [chromeMediaSessions]);

  const handleConnect = async () => {
    if (!SPOTIFY_CLIENT_ID) { setError('Set SPOTIFY_CLIENT_ID in spotify/utils.js'); return; }
    setLoading(true);
    setError(null);
    try {
      await connectSpotify();
      setConnected(true);
      fetchPlayback();
      fetchAndCacheProfile().then(p => { if (p) setProfile(p); });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    disconnectSpotify();
    setConnected(false);
    setTrack(null);
    setAlbumColor(null);
    setProfile(null);
  };

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
    try { await skipNext(); setTimeout(fetchPlayback, 400); } finally { setSpotifySkipPending(null); }
  };
  const handlePrev = async () => {
    setSpotifySkipPending('prev');
    try { await skipPrev(); setTimeout(fetchPlayback, 400); } finally { setSpotifySkipPending(null); }
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
  const bgStyle = albumColor
    ? { background: `linear-gradient(160deg, ${dark(albumColor.r, albumColor.g, albumColor.b, 0.55)} 0%, ${dark(albumColor.r, albumColor.g, albumColor.b, 0.35)} 100%)` }
    : hasBg
      ? { backgroundColor: '#1a1a1e' }
      : {};
  // Always white text/controls when hasBg — dark scrim + gradient ensures readability in all modes
  const inkColor = hasBg ? 'rgba(255,255,255,0.95)' : 'var(--w-ink-1)';
  const muteColor = hasBg ? 'rgba(255,255,255,0.6)' : 'var(--w-ink-4)';
  const btnBg = hasBg ? 'rgba(255,255,255,0.18)' : 'var(--w-surface-2)';
  const btnBorder = hasBg ? '1px solid rgba(255,255,255,0.25)' : '1px solid var(--w-border)';

  // Chrome media colours — based on the active session's album art
  const activeSession = chromeMediaSessions.find(s => s.tabId === activeChromeTabId)
    ?? chromeMediaSessions[0]
    ?? null;
  const otherSessions = chromeMediaSessions.filter(s => s !== activeSession);
  const activeChromeColor = activeSession ? (chromeAlbumColors[activeSession.tabId] ?? null) : null;
  const chromeHasBg = !!activeSession?.artwork && !!activeChromeColor;
  const chromeBgStyle = activeChromeColor
    ? { background: `linear-gradient(160deg, ${dark(activeChromeColor.r, activeChromeColor.g, activeChromeColor.b, 0.55)} 0%, ${dark(activeChromeColor.r, activeChromeColor.g, activeChromeColor.b, 0.35)} 100%)` }
    : chromeHasBg ? { backgroundColor: '#1a1a1e' } : {};
  const chromeInk = chromeHasBg ? 'rgba(255,255,255,0.95)' : 'var(--w-ink-1)';
  const chromeMute = chromeHasBg ? 'rgba(255,255,255,0.6)' : 'var(--w-ink-4)';
  const chromeBtnBg = chromeHasBg ? 'rgba(255,255,255,0.18)' : 'var(--w-surface-2)';
  const chromeBtnBorder = chromeHasBg ? '1px solid rgba(255,255,255,0.25)' : '1px solid var(--w-border)';

  // Not set up — only show the dev hint if there's also no browser media to display
  if (!SPOTIFY_CLIENT_ID && !chromeMediaSessions.length) {
    return (
      <BaseWidget className="p-4 flex flex-col items-center justify-center gap-2" onRemove={onRemove}>
        <MusicNoteBeamed size={28} className="opacity-20" />
        <p className="w-muted text-center text-xs">Set <code className="font-mono">SPOTIFY_CLIENT_ID</code><br />in spotify/utils.js</p>
      </BaseWidget>
    );
  }

  const settingsPanel = (
    <SpotifySettings
      connected={connected}
      profile={profile}
      loading={loading}
      error={error}
      onConnect={handleConnect}
      onDisconnect={handleDisconnect}
    />
  );

  // Not connected — show chrome media if available, otherwise hint to settings
  if (!connected) {
    if (!chromeMediaSessions.length) {
      return (
        <BaseWidget
          className="p-4 flex flex-col items-center justify-center gap-3"
          onRemove={onRemove}
          settingsContent={settingsPanel}
          settingsTitle="Spotify"
        >
          <MusicNoteBeamed size={28} style={{ color: 'var(--w-ink-5)', opacity: 0.3 }} />
          <div className="flex flex-col items-center gap-1.5 text-center">
            <p className="text-xs font-semibold" style={{ color: 'var(--w-ink-3)' }}>
              Not connected
            </p>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--w-ink-5)' }}>
              Open the{' '}
              <span
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md align-middle"
                style={{ backgroundColor: 'var(--w-surface-2)', border: '1px solid var(--w-border)' }}
              >
                <svg width="10" height="3" viewBox="0 0 14 4" fill="currentColor" style={{ color: 'var(--w-ink-3)' }}>
                  <circle cx="2" cy="2" r="1.5" /><circle cx="7" cy="2" r="1.5" /><circle cx="12" cy="2" r="1.5" />
                </svg>
              </span>
              {' '}menu and tap <span className="font-semibold" style={{ color: 'var(--w-ink-3)' }}>Settings</span> to connect your Spotify account.
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
        settingsTitle="Spotify"
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
        settingsTitle="Spotify"
        onRemove={onRemove}
      >
        {/* Full-bleed blurred artwork behind active session */}
        {activeSession?.artwork && (
          <div className="absolute inset-0 rounded-2xl overflow-hidden">
            <img src={activeSession.artwork} alt="" className="w-full h-full object-cover opacity-25" style={{ transition: 'opacity 0.4s' }} />
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.54)' }} />
          </div>
        )}

        {/* Main player — fills available vertical space above the strips */}
        <div className="relative z-10 flex flex-col flex-1 p-4 gap-2 min-h-0">
          {/* Source label + session-switcher dots (only when >1 session) */}
          {chromeMediaSessions.length > 1 && (
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] font-medium tracking-widest uppercase"
                style={{ color: chromeHasBg ? 'rgba(255,255,255,0.45)' : 'var(--w-ink-5)', letterSpacing: '0.1em' }}
              >
                {activeSession?.host || 'Browser'}
              </span>
              {/* Pill-dot navigation — active dot is a wider pill */}
              <div className="flex items-center gap-1.5" role="tablist" aria-label="Switch source">
                {chromeMediaSessions.map(s => (
                  <button
                    key={s.tabId}
                    role="tab"
                    aria-selected={s === activeSession}
                    aria-label={`Switch to ${s.host || 'player'}`}
                    onClick={() => setActiveChromeTabId(s.tabId)}
                    className="rounded-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
                    style={{
                      height: 6,
                      width: s === activeSession ? 18 : 6,
                      transition: 'width 0.25s ease, background-color 0.25s ease',
                      backgroundColor: s === activeSession
                        ? (chromeHasBg ? 'rgba(255,255,255,0.85)' : 'var(--w-ink-1)')
                        : (chromeHasBg ? 'rgba(255,255,255,0.28)' : 'var(--w-ink-5)'),
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Album art square — slightly smaller when strips are present to leave room */}
          {activeSession?.artwork && (
            <div className="flex justify-center">
              <img
                src={activeSession.artwork}
                alt=""
                className="rounded-xl shadow-lg object-cover"
                style={{
                  width: otherSessions.length ? 64 : 80,
                  height: otherSessions.length ? 64 : 80,
                  transition: 'width 0.25s ease, height 0.25s ease',
                }}
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
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-80 active:scale-90"
                style={{
                  backgroundColor: chromeBtnBg,
                  color: chromeInk,
                  border: chromeBtnBorder,
                  opacity: chromeSkipPending?.tabId === activeSession?.tabId && chromeSkipPending?.action === 'prev' ? 0.6 : 1,
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
            </div>
            <div className="relative">
              {chromeSkipPending?.tabId === activeSession?.tabId && chromeSkipPending?.action === 'next' && (
                <div
                  className="absolute animate-spin pointer-events-none rounded-full"
                  style={{ inset: '-3px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: 'rgba(255,255,255,0.7)' }}
                  aria-hidden="true"
                />
              )}
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
            </div>
          </div>
        </div>

        {/* Other session strips — compact rows that peek below the main player */}
        {otherSessions.map(s => (
          <ChromeMediaStrip
            key={s.tabId}
            session={s}
            isPending={chromePendingTabId === s.tabId}
            onPromote={() => setActiveChromeTabId(s.tabId)}
            onPlayPause={() => handleChromePlayPause(s)}
          />
        ))}
      </BaseWidget>
    );
  }

  return (
    <BaseWidget
      className="relative p-0 flex flex-col"
      cardStyle={bgStyle}
      settingsContent={settingsPanel}
      settingsTitle="Spotify"
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
        {/* Album art square */}
        {track.albumArt && (
          <div className="flex justify-center">
            <img src={track.albumArt} alt="" className="w-20 h-20 rounded-xl shadow-lg object-cover" />
          </div>
        )}

        {/* Track info */}
        <div className="flex flex-col gap-0.5 min-w-0 mt-1">
          <div className="truncate text-sm font-semibold" style={{ color: inkColor }}>{track.title}</div>
          <div className="truncate text-xs" style={{ color: muteColor }}>{track.artist}</div>
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
            >
              <SkipStartFill size={13} />
            </button>
          </div>
          <div className="relative">
            {spotifyPending && (
              <div
                className="absolute animate-spin pointer-events-none rounded-full"
                style={{ inset: '-3px', border: '2px solid rgba(0,0,0,0.08)', borderTopColor: 'rgba(0,0,0,0.55)' }}
                aria-hidden="true"
              />
            )}
            <button
              onClick={handlePlayPause}
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all hover:scale-105"
              style={{
                backgroundColor: 'rgba(255,255,255,0.9)',
                color: '#000',
                opacity: spotifyPending ? 0.65 : 1,
                transition: 'opacity 0.2s, transform 0.15s',
              }}
            >
              {track.isPlaying ? <PauseFill size={16} /> : <PlayFill size={16} />}
            </button>
          </div>
          <div className="relative">
            {spotifySkipPending === 'next' && (
              <div
                className="absolute animate-spin pointer-events-none rounded-full"
                style={{ inset: '-3px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: hasBg ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.45)' }}
                aria-hidden="true"
              />
            )}
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
            >
              <SkipEndFill size={13} />
            </button>
          </div>
        </div>
      </div>
    </BaseWidget>
  );
};

const SpotifyMusicIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
    <path d="M9 13c0 1.105-1.12 2-2.5 2S4 14.105 4 13s1.12-2 2.5-2 2.5.895 2.5 2z" />
    <path fillRule="evenodd" d="M9 3v10H8V3h1z" />
    <path d="M8 2.82a1 1 0 0 1 .804-.98l3-.6A1 1 0 0 1 13 2.22V4L8 5V2.82z" />
  </svg>
);

const SpotifySettings = ({ connected, profile, loading, error, onConnect, onDisconnect }) => {
  const extensionId = typeof chrome !== 'undefined' && chrome.runtime?.id;
  const redirectUri = extensionId ? `https://${extensionId}.chromiumapp.org/` : null;

  return (
    <div className="flex flex-col gap-3">
      <IntegrationRow
        icon={<SpotifyMusicIcon />}
        label="Spotify"
        connected={connected}
        loading={loading}
        profile={connected && profile ? {
          name: profile.name ?? 'Spotify Account',
          picture: profile.avatar ?? null,
          avatarColor: '#1DB954',
          avatarFgColor: '#000',
        } : null}
        description="Plays music and shows your current track."
        privacyLabel="No data stored · playback controls only"
        connectLabel="Connect Spotify"
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />
      {/* Dev mode only: redirect URI setup helper */}
      {DEV_MODE && !connected && redirectUri && (
        <div className="rounded-lg p-2.5" style={{ backgroundColor: 'var(--w-surface-2)', border: '1px solid var(--w-border)' }}>
          <p className="text-[11px] mb-1.5" style={{ color: 'var(--w-ink-4)' }}>
            Add this to your{' '}
            <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#1DB954' }}>
              Spotify app
            </a>{' '}redirect URIs:
          </p>
          <code className="text-[10px] break-all select-all block font-mono px-2 py-1 rounded" style={{ backgroundColor: 'var(--w-surface)', color: 'var(--w-ink-1)' }}>
            {redirectUri}
          </code>
        </div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}

      {/* Browser media playback section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <span style={{ color: 'var(--w-ink-5)' }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6 13c0 1.105-1.12 2-2.5 2S1 14.105 1 13s1.12-2 2.5-2 2.5.895 2.5 2zm9-2c0 1.105-1.12 2-2.5 2s-2.5-.895-2.5-2 1.12-2 2.5-2 2.5.895 2.5 2z" />
              <path fillRule="evenodd" d="M14 11V2h1v9h-1zM6 3v10H5V3h1z" />
              <path d="M5 2.905a1 1 0 0 1 .9-.995l8-.8a1 1 0 0 1 1.1.995V3L5 4V2.905z" />
            </svg>
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--w-ink-5)' }}>Browser Media</span>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--w-ink-4)' }}>
          When Spotify is idle, playback from your browser is shown automatically.
        </p>
        <div className="flex flex-wrap gap-1.5">
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'var(--w-surface-2)', border: '1px solid var(--w-border)', color: '#FF5500' }}
          >
            SoundCloud
          </span>
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'var(--w-surface-2)', border: '1px solid var(--w-border)', color: 'var(--w-ink-5)' }}
          >
            + more coming soon
          </span>
        </div>
      </div>
    </div>
  );
};
