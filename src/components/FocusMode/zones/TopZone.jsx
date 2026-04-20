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
import { TooltipBtn } from '../../ui/TooltipBtn';

const TOP = ZONES.top.items;

const FocusModeSettings = lazy(() => import('../Settings').then(m => ({ default: m.FocusModeSettings })));

// Preload Settings panel on hover so it opens instantly
const preloadSettings = () => {
  import('../Settings');
};

// ── Info strip (weather + date) ───────────────────────────────────────────────

const ITEM_RENDERERS = {
  weatherIcon: (weather) => weather ? (
    <div key="weatherIcon" style={{ filter: 'brightness(0) invert(1)', opacity: 0.65, display: 'flex', alignItems: 'center', marginRight: 6 }}>
      {getWeatherIcon(weather.code, weather.isDay, 14)}
    </div>
  ) : null,
  weatherTemp: (weather) => weather ? (
    <React.Fragment key="weatherTemp">
      <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.78)', letterSpacing: '-0.01em' }}>
        {weather.temperature}°{weather.unit === 'imperial' ? 'F' : 'C'}
      </span>
      <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.2)', marginInline: 4 }}>·</span>
    </React.Fragment>
  ) : null,
  date: (_, dateParts) => (
    <span key="date" style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.01em', color: 'rgba(255,255,255,0.72)' }}>
      {dateParts.dow}, {dateParts.month} {dateParts.day}
    </span>
  ),
  year: (_, dateParts) => (
    <span key="year" className="fm-topbar-year" style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.36)', marginLeft: 7 }}>
      {dateParts.year}
    </span>
  ),
};

const InfoStrip = ({ weather, dateParts }) => {
  const nodes = Object.entries(TOP)
    .filter(([, cfg]) => cfg.enable)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([key]) => ITEM_RENDERERS[key]?.(weather, dateParts))
    .filter(Boolean);

  if (!nodes.length) return null;

  return (
    <div
      className="fm-topbar-center"
      style={{ zIndex: 31, top: 'calc(1.25rem + 2px)', pointerEvents: 'none', userSelect: 'none' }}
    >
      {nodes}
    </div>
  );
};

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
        const inBtn = settingsRef.current?.contains(e.target);
        const inDialog = e.target.closest?.('[aria-label="Focus mode settings"]');
        if (!inBtn && !inDialog) setShowSettings(false);
      };
      document.addEventListener('mousedown', handler);
    }, 0);
    return () => { clearTimeout(id); if (handler) document.removeEventListener('mousedown', handler); };
  }, [showSettings]);

  return (
    <div
      role="toolbar"
      aria-label="Navigation"
      className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 pt-5"
      style={{
        zIndex: 30,
        opacity: uiVisible ? 1 : 0,
        transition: 'opacity 0.7s ease',
        pointerEvents: uiVisible ? 'auto' : 'none',
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Back button */}
      <TooltipBtn
        onClick={onExit}
        onMouseEnter={fadeIn}
        onMouseLeave={fadeOut}
        className="flex items-center gap-1.5 rounded-full focus:outline-none"
        style={{ padding: '8px 12px 8px 11px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', opacity: 0.52, transition: 'opacity 0.2s' }}
        tooltip={showSettings ? null : 'Back to Canvas'}
      >
        <svg width="13" height="15" viewBox="0 0 10 10" fill="none">
          <path d="M6.5 2L3.5 5L6.5 8" stroke="rgba(255,255,255,0.9)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-[10px] font-semibold tracking-wide select-none" style={{ color: 'rgba(255,255,255,0.85)' }}>Canvas</span>
      </TooltipBtn>

      {/* Right side: fullscreen + settings */}
      <div
        ref={settingsRef}
        className="flex items-center gap-1 opacity-[0.52] hover:opacity-[0.92] transition-opacity duration-200"
        style={{
          background: 'rgba(255,255,255,0.07)',
          border: '1px solid rgba(255,255,255,0.11)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: 999,
          padding: '2.5px',
        }}
      >
        <TooltipBtn
          onClick={toggleFullscreen}
          onMouseEnter={fadeIn}
          onMouseLeave={fadeOut}
          className="p-1.5 rounded-full focus:outline-none"
          style={{ opacity: 0.52, transition: 'opacity 0.2s' }}
          tooltip={(() => {
            if (showSettings) return null;
            return isFullscreen ? 'Exit fullscreen' : 'Fullscreen — keeps screen awake';
          })()}
        >
          {isFullscreen ? <FullscreenExit size={15} color="rgba(255,255,255,0.9)" /> : <ArrowsFullscreen size={15} color="rgba(255,255,255,0.9)" />}
        </TooltipBtn>

        <div className="w-px h-3.5 shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }} />

        <TooltipBtn
          onClick={() => setShowSettings(s => !s)}
          onMouseEnter={(e) => { fadeIn(e); preloadSettings(); }}
          onMouseLeave={e => { e.currentTarget.style.opacity = showSettings ? '0.88' : '0.38'; }}
          className="group p-1.5 rounded-full focus:outline-none"
          style={{ opacity: showSettings ? 0.92 : 0.52, transition: 'opacity 0.2s' }}
          tooltip={showSettings ? null : 'Settings'}
        >
          <GearFill size={15} color="rgba(255,255,255,0.9)" />
        </TooltipBtn>
      </div>

      {showSettings && (
        <Suspense fallback={null}>
          <FocusModeSettings onOpenBgModal={onOpenBgModal} />
        </Suspense>
      )}
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
