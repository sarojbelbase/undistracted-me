import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SkipStartFill, SkipEndFill, PlayFill, PauseFill, MusicNoteBeamed } from 'react-bootstrap-icons';
import { BaseWidget } from '../BaseWidget';
import { IntegrationRow } from '../../components/ui/IntegrationRow';
import {
  SPOTIFY_CLIENT_ID,
  connectSpotify, disconnectSpotify, isSpotifyConnected,
  getCurrentPlayback, setPlayPause, skipNext, skipPrev,
  extractAlbumColor, fetchAndCacheProfile, getSpotifyProfile,
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

export const Widget = ({ onRemove }) => {
  const [connected, setConnected] = useState(() => isSpotifyConnected());
  const [track, setTrack] = useState(null);
  const [albumColor, setAlbumColor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(() => getSpotifyProfile());
  const lastArtRef = useRef(null);
  const tickRef = useRef(null);

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
    await setPlayPause(!track.isPlaying);
    setTrack(t => t ? { ...t, isPlaying: !t.isPlaying } : t);
  };

  const handleNext = async () => { await skipNext(); setTimeout(fetchPlayback, 400); };
  const handlePrev = async () => { await skipPrev(); setTimeout(fetchPlayback, 400); };

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

  // Not set up
  if (!SPOTIFY_CLIENT_ID) {
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

  // Not connected — clear setup instructions
  if (!connected) {
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

  // Connected, nothing playing
  if (!track) {
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
          <button
            onClick={handlePrev}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-80"
            style={{ backgroundColor: btnBg, color: inkColor, border: btnBorder }}
          >
            <SkipStartFill size={13} />
          </button>
          <button
            onClick={handlePlayPause}
            className="w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all hover:scale-105"
            style={{ backgroundColor: 'rgba(255,255,255,0.9)', color: '#000' }}
          >
            {track.isPlaying ? <PauseFill size={16} /> : <PlayFill size={16} />}
          </button>
          <button
            onClick={handleNext}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:opacity-80"
            style={{ backgroundColor: btnBg, color: inkColor, border: btnBorder }}
          >
            <SkipEndFill size={13} />
          </button>
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
    </div>
  );
};
