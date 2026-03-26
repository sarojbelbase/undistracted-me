import React, { useState, useEffect, useRef } from 'react';
import { GearFill, ArrowsFullscreen, FullscreenExit } from 'react-bootstrap-icons';
import { getWeatherIcon } from '../../widgets/weather/utils.jsx';
import { FocusModeSettings } from './Settings';

// ─── Responsive top-bar CSS ───────────────────────────────────────────────────
// Desktop: center cluster is absolutely centered (doesn't push buttons)
// Tablet/Phone: collapses to a single row; year + weather hidden on small screens

const TOPBAR_CSS = `
.fm-topbar-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0;
  pointer-events: none;
  user-select: none;
  white-space: nowrap;
}
.fm-topbar-year    { display: inline; }
.fm-topbar-weather { display: flex; }
@media (max-width: 767px) {
  /* On phone the center can't be absolutely placed without overlapping.
     Hide it entirely — the clock + greeting carry all context needed. */
  .fm-topbar-center { display: none; }
}
@media (max-width: 899px) and (min-width: 768px) {
  /* Tablet: keep center visible but hide the year and weather badge
     to shrink it so it can't collide with side buttons. */
  .fm-topbar-year    { display: none; }
  .fm-topbar-weather { display: none; }
}`;

// ─── Weather badge ────────────────────────────────────────────────────────────

const WeatherTopBadge = ({ weather }) => {
  if (!weather) return null;
  return (
    <div className="fm-topbar-weather" style={{ alignItems: 'center', gap: 6 }}>
      <div style={{ filter: 'brightness(0) invert(1)', opacity: 0.65, display: 'flex', alignItems: 'center' }}>
        {getWeatherIcon(weather.code, weather.isDay, 14)}
      </div>
      <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.78)', letterSpacing: '-0.01em' }}>
        {weather.temperature}°{weather.unit === 'imperial' ? 'F' : 'C'}
      </span>
      <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.2)', marginInline: 4 }}>·</span>
    </div>
  );
};

// ─── Top bar ──────────────────────────────────────────────────────────────────

export const TopBar = ({ onExit, isFullscreen, toggleFullscreen, uiVisible, weather, dateParts, onRotatePhoto }) => {
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
    <>
      <style>{TOPBAR_CSS}</style>
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
          style={{ padding: '5px 12px 5px 9px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)', backdropFilter: 'blur(12px)', opacity: 0.38, transition: 'opacity 0.2s' }}
          title="Back to Canvas"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M6.5 2L3.5 5L6.5 8" stroke="rgba(255,255,255,0.9)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[10px] font-medium tracking-wide select-none" style={{ color: 'rgba(255,255,255,0.85)' }}>Canvas</span>
        </button>

        {/* Center: Weather · Date */}
        <div className="fm-topbar-center">
          <WeatherTopBadge weather={weather} />
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.01em', color: 'rgba(255,255,255,0.72)' }}>
            {dateParts.dow}, {dateParts.month} {dateParts.day}
          </span>
          <span className="fm-topbar-year" style={{ fontSize: 13, color: 'rgba(255,255,255,0.22)', marginLeft: 7 }}>
            {dateParts.year}
          </span>
        </div>

        {/* Right: Fullscreen + Settings */}
        <div className="relative flex items-center" ref={settingsRef} onClick={e => e.stopPropagation()}>
          <div className="flex items-center rounded-full" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.11)', backdropFilter: 'blur(16px)' }}>
            <button
              onClick={toggleFullscreen}
              onMouseEnter={fadeIn}
              onMouseLeave={fadeOut}
              className="p-2.5 rounded-full focus:outline-none"
              style={{ opacity: 0.38, transition: 'opacity 0.2s' }}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen — keeps screen awake'}
            >
              {isFullscreen ? <FullscreenExit size={13} style={{ color: 'rgba(255,255,255,0.9)' }} /> : <ArrowsFullscreen size={12} style={{ color: 'rgba(255,255,255,0.9)' }} />}
            </button>
            <div className="w-px h-3.5 shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <button
              onClick={() => setShowSettings(s => !s)}
              onMouseEnter={fadeIn}
              onMouseLeave={e => { e.currentTarget.style.opacity = showSettings ? '0.88' : '0.38'; }}
              className="group p-2.5 rounded-full focus:outline-none"
              style={{ opacity: showSettings ? 0.88 : 0.38, transition: 'opacity 0.2s' }}
              title="Settings"
            >
              <GearFill size={13} className="transition-transform duration-300 group-hover:rotate-90" style={{ color: 'rgba(255,255,255,0.9)' }} />
            </button>
          </div>
          {showSettings && <FocusModeSettings onRotatePhoto={onRotatePhoto} />}
        </div>
      </div>
    </>
  );
};
