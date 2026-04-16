// ─── Top zone ─────────────────────────────────────────────────────────────────
//
// Renders two layers:
//   1. TopBar      — back button (left) + fullscreen + settings (right)
//   2. InfoStrip   — weather + date, absolutely centered between the two buttons
//
// They are split so InfoStrip can be `pointerEvents: none` while TopBar buttons
// remain interactive.

import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { GearFill, ArrowsFullscreen, FullscreenExit } from 'react-bootstrap-icons';
import { getWeatherIcon } from '../../../widgets/weather/utils.jsx';
import { useSettingsStore } from '../../../store';
import { onClockTick } from '../../../utilities/sharedClock';
import { getGregorianDateParts, getBikramSambatDateParts } from '../../../utilities';
import { useFocusWeather } from '../hooks';
import { ZONES } from '../config';

const TOP = ZONES.top.items;

const FocusModeSettings = lazy(() => import('../Settings').then(m => ({ default: m.FocusModeSettings })));

// ── Info strip (weather + date) ───────────────────────────────────────────────

const InfoStrip = ({ weather, dateParts }) => (
  <div
    className="fm-topbar-center"
    style={{ zIndex: 31, top: 'calc(1.25rem + 2px)', pointerEvents: 'none', userSelect: 'none' }}
  >
    {TOP.weatherIcon.enable && weather && (
      <div style={{ filter: 'brightness(0) invert(1)', opacity: 0.65, display: 'flex', alignItems: 'center', marginRight: 6 }}>
        {getWeatherIcon(weather.code, weather.isDay, 14)}
      </div>
    )}
    {TOP.weatherTemp.enable && weather && (
      <>
        <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.78)', letterSpacing: '-0.01em' }}>
          {weather.temperature}°{weather.unit === 'imperial' ? 'F' : 'C'}
        </span>
        <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.2)', marginInline: 4 }}>·</span>
      </>
    )}
    {TOP.date.enable && (
      <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.01em', color: 'rgba(255,255,255,0.72)' }}>
        {dateParts.dow}, {dateParts.month} {dateParts.day}
      </span>
    )}
    {TOP.year.enable && (
      <span className="fm-topbar-year" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.36)', marginLeft: 7 }}>
        {dateParts.year}
      </span>
    )}
  </div>
);

// ── Nav bar ───────────────────────────────────────────────────────────────────

const NavBar = ({ onExit, isFullscreen, toggleFullscreen, uiVisible, onOpenBgModal }) => {
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef(null);

  const fadeIn = (e) => { e.currentTarget.style.opacity = '0.88'; };
  const fadeOut = (e) => { e.currentTarget.style.opacity = '0.38'; };

  useEffect(() => {
    if (!showSettings) return;
    let handler = null;
    const id = setTimeout(() => {
      handler = (e) => {
        if (settingsRef.current && !settingsRef.current.contains(e.target)) setShowSettings(false);
      };
      document.addEventListener('mousedown', handler);
    }, 0);
    return () => { clearTimeout(id); if (handler) document.removeEventListener('mousedown', handler); };
  }, [showSettings]);

  return (
    <div
      className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 pt-5"
      style={{
        zIndex: 30,
        opacity: uiVisible ? 1 : 0,
        transition: 'opacity 0.7s ease',
        pointerEvents: uiVisible ? 'auto' : 'none',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Left: ← Canvas */}
      <button
        onClick={onExit}
        onMouseEnter={fadeIn}
        onMouseLeave={fadeOut}
        className="flex items-center gap-1.5 rounded-full focus:outline-none"
        style={{ padding: '5px 12px 5px 9px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)', backdropFilter: 'blur(12px)', opacity: 0.52, transition: 'opacity 0.2s' }}
        title="Back to Canvas"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M6.5 2L3.5 5L6.5 8" stroke="rgba(255,255,255,0.9)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-[10px] font-semibold tracking-wide select-none" style={{ color: 'rgba(255,255,255,0.85)' }}>Canvas</span>
      </button>

      {/* Right: Fullscreen + Settings */}
      <div className="relative flex items-center" ref={settingsRef} onClick={e => e.stopPropagation()}>
        <div className="flex items-center rounded-full" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.11)', backdropFilter: 'blur(16px)' }}>
          <button
            onClick={toggleFullscreen}
            onMouseEnter={fadeIn}
            onMouseLeave={fadeOut}
            className="p-2.5 rounded-full focus:outline-none"
            style={{ opacity: 0.52, transition: 'opacity 0.2s' }}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen — keeps screen awake'}
          >
            {isFullscreen ? <FullscreenExit size={15} style={{ color: 'rgba(255,255,255,0.9)' }} /> : <ArrowsFullscreen size={14} style={{ color: 'rgba(255,255,255,0.9)' }} />}
          </button>
          <div className="w-px h-3.5 shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <button
            onClick={() => setShowSettings(s => !s)}
            onMouseEnter={fadeIn}
            onMouseLeave={e => { e.currentTarget.style.opacity = showSettings ? '0.88' : '0.38'; }}
            className="group p-2.5 rounded-full focus:outline-none"
            style={{ opacity: showSettings ? 0.92 : 0.52, transition: 'opacity 0.2s' }}
            title="Settings"
          >
            <GearFill size={15} className="transition-transform duration-300 group-hover:rotate-90" style={{ color: 'rgba(255,255,255,0.9)' }} />
          </button>
        </div>
        {showSettings && (
          <Suspense fallback={null}>
            <FocusModeSettings onOpenBgModal={onOpenBgModal} />
          </Suspense>
        )}
      </div>
    </div>
  );
};

// ── Top zone export ───────────────────────────────────────────────────────────

export const TopZone = ({ onExit, isFullscreen, toggleFullscreen, uiVisible, onOpenBgModal }) => {
  const dateFormat = useSettingsStore(s => s.dateFormat);
  const weather = useFocusWeather();
  const [dateParts, setDateParts] = useState(() =>
    dateFormat === 'gregorian' ? getGregorianDateParts() : getBikramSambatDateParts()
  );
  const update = useCallback(() => {
    setDateParts(dateFormat === 'gregorian' ? getGregorianDateParts() : getBikramSambatDateParts());
  }, [dateFormat]);
  useEffect(() => onClockTick(update), [update]);

  return (
    <>
      <NavBar
        onExit={onExit}
        isFullscreen={isFullscreen}
        toggleFullscreen={toggleFullscreen}
        uiVisible={uiVisible}
        onOpenBgModal={onOpenBgModal}
      />
      <InfoStrip weather={weather} dateParts={dateParts} />
    </>
  );
};
