import React, { useState, useEffect, useCallback, useRef } from 'react';
import bgImage from '../../assets/img/bg.webp';
import { getTimeParts } from '../../widgets/clock/utils';
import { useEvents, useGoogleCalendar } from '../../widgets/useEvents';
import { useSettingsStore } from '../../store';
import { getCurrentPlayback, isSpotifyConnected, setPlayPause, skipNext, skipPrev } from '../../widgets/spotify/utils';
import {
  getGregorianDateParts,
  getBikramSambatDateParts,
  readPomodoro,
  getNextEventToShow,
  FG_MASK,
} from './constants';
import {
  useFocusWeather,
  useFocusStocks,
  useFocusPhoto,
  useWakeLock,
  useCenterOnDark,
  useFocusTimezones,
} from './hooks';
import { WorldClocksPanel } from './WorldClocksPanel';
import { ClockDisplay } from './ClockDisplay';
import { GreetingDisplay } from './GreetingDisplay';
import { LeftPanel } from './LeftPanel';
import { TopBar } from './TopBar';

export const FocusMode = ({ onExit }) => {
  const { dateFormat, clockFormat } = useSettingsStore();
  const fmt = clockFormat || '24h';
  const [parts, setParts] = useState(() => getTimeParts(fmt));
  const [dateParts, setDateParts] = useState(() =>
    dateFormat === 'gregorian' ? getGregorianDateParts() : getBikramSambatDateParts()
  );
  const [pomodoro, setPomodoro] = useState(null);
  const [spotify, setSpotify] = useState(null);
  const [spotifyProgress, setSpotifyProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const hideTimerRef = useRef(null);

  const weather = useFocusWeather();
  const stocks = useFocusStocks();
  const { photo, slotA, slotB, activeSlot, rotate } = useFocusPhoto();
  const centerOnDark = useCenterOnDark(slotA, slotB, activeSlot);
  const extraTimezones = useFocusTimezones();

  useWakeLock(isFullscreen);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const resetHideTimer = useCallback(() => {
    setUiVisible(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setUiVisible(false), 3000);
  }, []);

  useEffect(() => {
    if (!isFullscreen) {
      setUiVisible(true);
      clearTimeout(hideTimerRef.current);
      return;
    }
    window.addEventListener('mousemove', resetHideTimer);
    window.addEventListener('mousedown', resetHideTimer);
    resetHideTimer();
    return () => {
      window.removeEventListener('mousemove', resetHideTimer);
      window.removeEventListener('mousedown', resetHideTimer);
      clearTimeout(hideTimerRef.current);
    };
  }, [isFullscreen, resetHideTimer]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
    } else {
      document.exitFullscreen().catch(() => { });
    }
  }, []);

  const [localEvents] = useEvents();
  const { gcalEvents } = useGoogleCalendar();
  const eventInfo = getNextEventToShow([...localEvents, ...gcalEvents]);

  const update = useCallback(() => {
    setParts(getTimeParts(fmt));
    setDateParts(dateFormat === 'gregorian' ? getGregorianDateParts() : getBikramSambatDateParts());
    setPomodoro(readPomodoro());
  }, [dateFormat, fmt]);

  useEffect(() => {
    update();
    const id = setInterval(update, 1_000);
    return () => clearInterval(id);
  }, [update]);

  // Spotify — poll every 5s when connected
  useEffect(() => {
    if (!isSpotifyConnected()) return;
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
        setSpotifyProgress(p.progressMs);
      } catch {
        if (!cancelled) setSpotify(null);
      }
    };
    fetchSpotify();
    const id = setInterval(fetchSpotify, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Smooth local progress tick between Spotify polls
  useEffect(() => {
    if (!spotify?.isPlaying) return;
    const id = setInterval(() => setSpotifyProgress(p => Math.min(p + 1000, spotify.durationMs || p)), 1000);
    return () => clearInterval(id);
  }, [spotify?.isPlaying, spotify?.durationMs]);

  const handleSpotifyToggle = useCallback(async () => {
    if (!spotify) return;
    try { await setPlayPause(!spotify.isPlaying); setSpotify(s => s ? { ...s, isPlaying: !s.isPlaying } : s); } catch { }
  }, [spotify]);

  const refreshSpotifyTrack = useCallback(async () => {
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
        setSpotifyProgress(p.progressMs);
      }
    } catch { }
  }, []);

  const handleSpotifyNext = useCallback(async () => {
    try { await skipNext(); setTimeout(refreshSpotifyTrack, 500); } catch { }
  }, [refreshSpotifyTrack]);

  const handleSpotifyPrev = useCallback(async () => {
    try { await skipPrev(); setTimeout(refreshSpotifyTrack, 500); } catch { }
  }, [refreshSpotifyTrack]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onExit(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onExit]);

  const leftHasContent = pomodoro || eventInfo || stocks.length > 0;
  const spotifyTrack = spotify ? { ...spotify, progressMs: spotifyProgress } : null;
  const photoColor = photo?.color || '#18191b';
  const bgStyle = { position: 'absolute', inset: 0, backgroundSize: 'cover', backgroundPosition: 'center' };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      style={{ backgroundColor: photoColor }}
    >
      {/* ── Background photo — two slots for crossfade (z 0/1) ── */}
      <div style={{ ...bgStyle, zIndex: 0, backgroundImage: slotA ? `url(${slotA})` : `url(${bgImage})`, opacity: activeSlot === 'a' ? 1 : 0, transition: 'opacity 2.5s ease' }} />
      <div style={{ ...bgStyle, zIndex: 1, backgroundImage: slotB ? `url(${slotB})` : 'none', opacity: activeSlot === 'b' ? 1 : 0, transition: 'opacity 2.5s ease' }} />

      {/* ── Cinematic vignette (z 2) ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.5) 100%), linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, transparent 28%, transparent 62%, rgba(0,0,0,0.42) 100%)',
      }} />

      {/* ── Clock (z 18) ── */}
      <ClockDisplay parts={parts} centerOnDark={centerOnDark} />

      {/* ── Foreground depth overlay — gradient mask (z 15) ── */}
      {(slotA || slotB) && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 15, pointerEvents: 'none',
          backgroundImage: activeSlot === 'a'
            ? (slotA ? `url(${slotA})` : undefined)
            : (slotB ? `url(${slotB})` : undefined),
          backgroundSize: 'cover', backgroundPosition: 'center',
          WebkitMaskImage: FG_MASK, maskImage: FG_MASK,
          opacity: 0.6,
        }} />
      )}

      {/* ── Greeting (z 20) ── */}
      <GreetingDisplay parts={parts} centerOnDark={centerOnDark} />

      {/* ── World clocks — right side ambient (z 22) ── */}
      {extraTimezones.length > 0 && (
        <WorldClocksPanel timezones={extraTimezones} clockFormat={fmt} />
      )}

      {/* ── Left panel: Pomodoro + Event + Stocks + Spotify (z 22) ── */}
      {(leftHasContent || spotifyTrack) && (
        <LeftPanel
          pomodoro={pomodoro}
          eventInfo={eventInfo}
          stocks={stocks}
          spotifyTrack={spotifyTrack}
          onToggle={handleSpotifyToggle}
          onNext={handleSpotifyNext}
          onPrev={handleSpotifyPrev}
        />
      )}

      {/* ── Top bar (z 30) ── */}
      <TopBar
        onExit={onExit}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        uiVisible={uiVisible}
        weather={weather}
        dateParts={dateParts}
        onRotatePhoto={rotate}
      />

      {/* ── Photo attribution (z 20) ── */}
      {photo?.author && (
        <div className="absolute bottom-3 right-4 pointer-events-auto" style={{ zIndex: 20 }} onClick={e => e.stopPropagation()}>
          <a
            href={photo.photoUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.03em', textDecoration: 'none' }}
          >
            {photo.author} · Unsplash
          </a>
        </div>
      )}
    </div>
  );
};
