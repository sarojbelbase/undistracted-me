import React, { useState, useEffect, useRef } from 'react';
import { MusicNoteBeamed } from 'react-bootstrap-icons';
import { BaseWidget } from '../BaseWidget';
import { SPOTIFY_CLIENT_ID, isSpotifyConnected } from './utils';
import { useChromeMedia } from './hooks/useChromeMedia';
import { useChromeSessionManager } from './hooks/useChromeSessionManager';
import { useSpotifyPlayback } from './hooks/useSpotifyPlayback';
import { resolveColors } from './hooks/mediaHelpers';
import { ChromeMediaPlayer } from './ChromeMediaPlayer';
import { SpotifyPlayer } from './SpotifyPlayer';
import { SpotifySettings } from './Settings';

export const Widget = ({ onRemove }) => {
  const [connected, setConnected] = useState(() => isSpotifyConnected());

  const {
    track, trackAnimKey, albumColor,
    pending: spotifyPending, skipPending: spotifySkipPending,
    handlePlayPause, handleNext, handlePrev,
  } = useSpotifyPlayback(connected, setConnected);

  const tickRef = useRef(null);
  const { sessions: chromeMediaSessions } = useChromeMedia();

  const {
    albumColors: chromeAlbumColors,
    pendingTabId: chromePendingTabId,
    skipPending: chromeSkipPending,
    trackAnimKey: chromeTrackAnimKey,
    setTrackAnimKey: setChromeTrackAnimKey,
    prevTrackIdRef: prevChromeTrackIdRef,
    playPause: handleChromePlayPause,
    skipNext: handleChromeNext,
    skipPrev: handleChromePrev,
  } = useChromeSessionManager(chromeMediaSessions);

  useEffect(() => { clearInterval(tickRef.current); return () => clearInterval(tickRef.current); }, [track?.isPlaying]);

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

  useEffect(() => {
    if (!activeSession) return;
    const id = (activeSession.title ?? '') + (activeSession.artist ?? '');
    if (id !== prevChromeTrackIdRef.current) { prevChromeTrackIdRef.current = id; setChromeTrackAnimKey(k => k + 1); }
  }, [activeSession?.title, activeSession?.artist]);

  const activeChromeColor = activeSession ? (chromeAlbumColors[activeSession.tabId] ?? null) : null;
  const chromeHasBg = !!activeSession?.artwork && !!activeChromeColor;
  const { bgStyle: chromeBgStyle, ink: chromeInk, mute: chromeMute, btnBg: chromeBtnBg, btnBorder: chromeBtnBorder } = resolveColors(activeChromeColor, chromeHasBg);

  const hasBg = !!track?.albumArt;
  const { bgStyle, ink: inkColor, mute: muteColor, btnBg, btnBorder } = resolveColors(albumColor, hasBg);

  const settingsPanel = <SpotifySettings />;

  // Not set up
  if (!SPOTIFY_CLIENT_ID && !chromeMediaSessions.length) {
    return (
      <BaseWidget className="p-4 flex flex-col items-center justify-center gap-2" onRemove={onRemove}>
        <MusicNoteBeamed size={28} className="opacity-20" />
        <p className="w-muted text-center text-xs">Set <code className="font-mono">SPOTIFY_CLIENT_ID</code><br />in media/utils.js</p>
      </BaseWidget>
    );
  }

  // Not connected
  if (!connected && !chromeMediaSessions.length) {
    return (
      <BaseWidget className="p-4 flex flex-col items-center justify-center gap-3" onRemove={onRemove} settingsContent={settingsPanel} settingsTitle="Media">
        <MusicNoteBeamed size={22} style={{ color: 'var(--w-ink-6)', opacity: 0.4 }} />
        <div className="flex flex-col items-center gap-1.5 text-center">
          <p className="text-[11px] font-semibold" style={{ color: 'var(--w-ink-3)' }}>Nothing playing</p>
          <p className="text-[10.5px] leading-snug" style={{ color: 'var(--w-ink-5)' }}>Open YouTube or SoundCloud in any tab</p>
          <p className="text-[10px]" style={{ color: 'var(--w-ink-6)' }}>Settings&nbsp;›&nbsp;Accounts to connect Spotify</p>
        </div>
      </BaseWidget>
    );
  }

  // Connected, nothing playing
  if (connected && !track && !chromeMediaSessions.length) {
    return (
      <BaseWidget className="p-4 flex flex-col items-center justify-center gap-2" cardStyle={bgStyle} settingsContent={settingsPanel} settingsTitle="Media" onRemove={onRemove}>
        <MusicNoteBeamed size={28} style={{ color: muteColor }} />
        <p className="text-center text-xs" style={{ color: muteColor }}>Nothing playing</p>
      </BaseWidget>
    );
  }

  // Chrome media fallback
  if ((!connected || !track) && chromeMediaSessions.length) {
    return <ChromeMediaPlayer
      onRemove={onRemove} settingsPanel={settingsPanel}
      chromeBgStyle={chromeBgStyle} chromeInk={chromeInk} chromeMute={chromeMute}
      chromeBtnBg={chromeBtnBg} chromeBtnBorder={chromeBtnBorder}
      chromeTrackAnimKey={chromeTrackAnimKey} activeSession={activeSession}
      chromePendingTabId={chromePendingTabId} chromeSkipPending={chromeSkipPending}
      handleChromePlayPause={handleChromePlayPause}
      handleChromeNext={handleChromeNext} handleChromePrev={handleChromePrev}
    />;
  }

  return <SpotifyPlayer
    onRemove={onRemove} settingsPanel={settingsPanel}
    bgStyle={bgStyle} inkColor={inkColor} muteColor={muteColor}
    btnBg={btnBg} btnBorder={btnBorder} hasBg={hasBg}
    track={track} trackAnimKey={trackAnimKey}
    spotifyPending={spotifyPending} spotifySkipPending={spotifySkipPending}
    handlePlayPause={handlePlayPause} handleNext={handleNext} handlePrev={handlePrev}
  />;
};
