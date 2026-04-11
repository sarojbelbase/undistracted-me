import React, { useState, useEffect, useCallback, useRef } from 'react';
import bgImage from '../../assets/img/bg.webp';
import { getTimeParts } from '../../widgets/clock/utils';
import { useEvents, useGoogleCalendar } from '../../widgets/useEvents';
import { useSettingsStore } from '../../store';
import { getCurrentPlayback, isSpotifyConnected, setPlayPause, skipNext, skipPrev } from '../../widgets/spotify/utils';
import { getWeatherIcon } from '../../widgets/weather/utils.jsx';
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
import { BackgroundPicker, getCustomBgUrl, setCustomBgUrl as persistCustomUrl, getOrbRgb } from '../ui/BackgroundPicker';
import { getBgSource, setBgSource as persistBgSource } from '../../utilities/unsplash';

function useFocusSpotify() {
  const [spotify, setSpotify] = useState(null);
  const [spotifyProgress, setSpotifyProgress] = useState(0);

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

  useEffect(() => {
    if (!spotify?.isPlaying) return;
    const id = setInterval(() => setSpotifyProgress(p => Math.min(p + 1000, spotify.durationMs || p)), 1000);
    return () => clearInterval(id);
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
        setSpotifyProgress(p.progressMs);
      }
    } catch { }
  }, []);

  const handleToggle = useCallback(async () => {
    if (!spotify) return;
    try { await setPlayPause(!spotify.isPlaying); setSpotify(s => s ? { ...s, isPlaying: !s.isPlaying } : s); } catch { }
  }, [spotify]);

  const handleNext = useCallback(async () => {
    try { await skipNext(); setTimeout(refresh, 500); } catch { }
  }, [refresh]);

  const handlePrev = useCallback(async () => {
    try { await skipPrev(); setTimeout(refresh, 500); } catch { }
  }, [refresh]);

  return { spotify, spotifyProgress, handleToggle, handleNext, handlePrev };
}

function OrbBackground({ orbRgb }) {
  const rgb = orbRgb || 'var(--w-accent-rgb)';
  return (
    <>
      <div
        aria-hidden
        style={{ position: 'absolute', inset: 0, zIndex: 0, animation: 'fmOrbSpin 14s linear infinite', transformOrigin: '50% 50%', pointerEvents: 'none' }}
      >
        <div style={{ position: 'absolute', width: '70vmin', height: '70vmin', top: 'calc(50vh - 35vmin)', left: 'calc(50vw - 35vmin)', borderRadius: '50%', background: `radial-gradient(circle at 50% 50%, rgba(${rgb},0.38) 0%, rgba(${rgb},0.08) 50%, transparent 72%)`, filter: 'blur(52px)', animation: 'fmOrbBloom 8s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', width: '50vmin', height: '50vmin', top: 'calc(10vh - 5vmin)', right: 'calc(8vw - 5vmin)', borderRadius: '50%', background: `radial-gradient(circle at 50% 50%, rgba(${rgb},0.22) 0%, transparent 65%)`, filter: 'blur(64px)' }} />
        <div style={{ position: 'absolute', width: '44vmin', height: '44vmin', bottom: 'calc(8vh - 5vmin)', left: 'calc(6vw - 5vmin)', borderRadius: '50%', background: `radial-gradient(circle at 50% 50%, rgba(${rgb},0.16) 0%, transparent 62%)`, filter: 'blur(80px)', animation: 'fmOrbCounter 9s linear infinite', transformOrigin: '50% 50%' }} />
      </div>
      <div aria-hidden style={{ position: 'absolute', inset: '-20%', zIndex: 0, background: `conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(${rgb},0.04) 90deg, transparent 180deg, rgba(${rgb},0.03) 270deg, transparent 360deg)`, animation: 'fmOrbCounter 60s linear infinite', pointerEvents: 'none' }} />
    </>
  );
}

function FocusBgLayer({ bgSource, slotA, slotB, activeSlot, customBgUrl, orbRgb }) {
  const bgStyle = { position: 'absolute', inset: 0, backgroundSize: 'cover', backgroundPosition: 'center' };

  let fgBgImage;
  if (activeSlot === 'a') {
    fgBgImage = slotA ? `url(${slotA})` : undefined;
  } else {
    fgBgImage = slotB ? `url(${slotB})` : undefined;
  }

  let activeBg = null;
  if (bgSource === 'custom') activeBg = customBgUrl || bgImage;
  else if (bgSource === 'default') activeBg = bgImage;

  return (
    <>
      {bgSource === 'curated' && (
        <>
          <div style={{ ...bgStyle, zIndex: 0, backgroundImage: slotA ? `url(${slotA})` : `url(${bgImage})`, opacity: activeSlot === 'a' ? 1 : 0, transition: 'opacity 2.5s ease' }} />
          <div style={{ ...bgStyle, zIndex: 1, backgroundImage: slotB ? `url(${slotB})` : 'none', opacity: activeSlot === 'b' ? 1 : 0, transition: 'opacity 2.5s ease' }} />
        </>
      )}
      {bgSource === 'orb' && <OrbBackground orbRgb={orbRgb} />}
      {bgSource !== 'curated' && bgSource !== 'orb' && activeBg && (
        <div style={{ ...bgStyle, zIndex: 0, backgroundImage: `url(${activeBg})` }} />
      )}
      {bgSource === 'curated' && (slotA || slotB) && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 15, pointerEvents: 'none',
          backgroundImage: fgBgImage,
          backgroundSize: 'cover', backgroundPosition: 'center',
          WebkitMaskImage: FG_MASK, maskImage: FG_MASK,
          opacity: 0.6,
        }} />
      )}
    </>
  );
}

export const FocusMode = ({ onExit }) => {
  const { dateFormat, clockFormat } = useSettingsStore();
  const fmt = clockFormat || '24h';
  const [parts, setParts] = useState(() => getTimeParts(fmt));
  const [dateParts, setDateParts] = useState(() =>
    dateFormat === 'gregorian' ? getGregorianDateParts() : getBikramSambatDateParts()
  );
  const [pomodoro, setPomodoro] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false); const [uiVisible, setUiVisible] = useState(true);
  const [showBgModal, setShowBgModal] = useState(false);
  const [bgSource, setBgSource] = useState(() => getBgSource());
  const [customBgUrl, setCustomBgUrl] = useState(() => getCustomBgUrl());
  const [orbRgb, setOrbRgb] = useState(getOrbRgb);
  const hideTimerRef = useRef(null);

  const weather = useFocusWeather();
  const stocks = useFocusStocks();
  const { photo, slotA, slotB, activeSlot, rotate } = useFocusPhoto();
  const centerOnDark = useCenterOnDark(slotA, slotB, activeSlot);
  // For non-curated sources (default image, custom URL) the background is
  // always treated as dark so the clock never renders with white shadows.
  const effectiveCenterOnDark = bgSource === 'curated' ? centerOnDark : true;
  const extraTimezones = useFocusTimezones();

  useWakeLock(isFullscreen);

  const { spotify, spotifyProgress, handleToggle: handleSpotifyToggle, handleNext: handleSpotifyNext, handlePrev: handleSpotifyPrev } = useFocusSpotify();

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
    globalThis.addEventListener('mousemove', resetHideTimer);
    globalThis.addEventListener('mousedown', resetHideTimer);
    resetHideTimer();
    return () => {
      globalThis.removeEventListener('mousemove', resetHideTimer);
      globalThis.removeEventListener('mousedown', resetHideTimer);
      clearTimeout(hideTimerRef.current);
    };
  }, [isFullscreen, resetHideTimer]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => { });
    } else {
      document.documentElement.requestFullscreen().catch(() => { });
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

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape' && !showBgModal) onExit(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onExit, showBgModal]);

  // Background source change — called by BackgroundPicker (focus scope)
  const handleBgChange = useCallback((source, customUrl) => {
    persistBgSource(source);
    setBgSource(source);
    if (source === 'orb') setOrbRgb(getOrbRgb());
    if (customUrl !== undefined) {
      setCustomBgUrl(customUrl);
      persistCustomUrl(customUrl); // keep localStorage in sync
    } else if (source !== 'custom') {
      setCustomBgUrl(null);
      persistCustomUrl(null);
    }
  }, []);

  const leftHasContent = pomodoro || eventInfo || stocks.length > 0;
  const spotifyTrack = spotify ? { ...spotify, progressMs: spotifyProgress } : null;
  const photoColor = photo?.color || '#18191b';

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      style={{ backgroundColor: bgSource === 'orb' ? '#060608' : photoColor }}
    >
      <style>{`
        @keyframes fmOrbSpin    { to { transform: rotate(360deg);  } }
        @keyframes fmOrbCounter { to { transform: rotate(-360deg); } }
        @keyframes fmOrbBloom   {
          0%, 100% { opacity: 1;    transform: scale(1);    }
          50%      { opacity: 0.78; transform: scale(1.18); }
        }
      `}</style>
      {/* ── Background layers (curated/orb/static) + FG depth overlay ── */}
      <FocusBgLayer
        bgSource={bgSource}
        slotA={slotA}
        slotB={slotB}
        activeSlot={activeSlot}
        customBgUrl={customBgUrl}
        orbRgb={orbRgb}
      />

      {/* ── Cinematic vignette (z 2) ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.5) 100%), linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, transparent 28%, transparent 62%, rgba(0,0,0,0.42) 100%)',
      }} />

      {/* ── Clock (z 18) ── */}
      <ClockDisplay parts={parts} centerOnDark={effectiveCenterOnDark} />

      {/* ── Greeting (z 20) ── */}
      <GreetingDisplay parts={parts} centerOnDark={effectiveCenterOnDark} />

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
        onOpenBgModal={() => setShowBgModal(true)}
      />

      {/* ── Weather + date — always visible, never hidden (z 31) ── */}
      <div
        className="fm-topbar-center"
        style={{ zIndex: 31, top: 'calc(1.25rem + 2px)', pointerEvents: 'none', userSelect: 'none' }}
      >
        {weather && (
          <>
            <div style={{ filter: 'brightness(0) invert(1)', opacity: 0.65, display: 'flex', alignItems: 'center', marginRight: 6 }}>
              {getWeatherIcon(weather.code, weather.isDay, 14)}
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.78)', letterSpacing: '-0.01em' }}>
              {weather.temperature}°{weather.unit === 'imperial' ? 'F' : 'C'}
            </span>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.2)', marginInline: 4 }}>·</span>
          </>
        )}
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.01em', color: 'rgba(255,255,255,0.72)' }}>
          {dateParts.dow}, {dateParts.month} {dateParts.day}
        </span>
        <span className="fm-topbar-year" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.36)', marginLeft: 7 }}>
          {dateParts.year}
        </span>
      </div>

      {/* ── Background picker (focus scope, z 90) ── */}
      {showBgModal && (
        <BackgroundPicker
          scope="focus"
          initialSource={bgSource}
          initialCustomUrl={bgSource === 'custom' ? customBgUrl : null}
          initialPhotoUrl={null}
          onClose={() => setShowBgModal(false)}
          onApply={(type, opts = {}) => {
            handleBgChange(type, opts.url);
          }}
          onRotatePhoto={rotate}
        />
      )}
    </div>
  );
};
