import './App.css';
import React, { useState, useRef, useEffect, useMemo, Suspense, lazy } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { MoonStarsFill, Grid3x3GapFill, GearFill, Grid1x2Fill } from 'react-bootstrap-icons';
import { Analytics } from '@vercel/analytics/react';
import { FocusMode } from './components/FocusMode';
import { LookAway } from './components/LookAway';
import { useLookAwayScheduler, clearLookAwayDue } from './components/LookAway/hooks';
import { WidgetGrid } from './widgets/WidgetGrid';
import { OrbBackground } from './components/ui/OrbBackground';
import { BackgroundPicker, getOrbRgbById } from './components/ui/BackgroundPicker';
import { getPhotoLibrary, getThumbUrl } from './utilities/unsplash';
import { extractColorFromImage } from './utilities/favicon';
import bgImage from './assets/img/bg.webp';
import { ACCENT_COLORS } from './theme';
import { useSettingsStore, useWidgetInstancesStore } from './store';
import { useAutoTheme } from './hooks/useAutoTheme';

// Settings and catalog are only ever opened on demand — lazy-load them.
const settingsImport = () => import('./components/Settings').then(m => ({ default: m.Settings }));
const catalogImport = () => import('./widgets/WidgetCatalog').then(m => ({ default: m.WidgetCatalog }));
const Settings = lazy(settingsImport);
const WidgetCatalog = lazy(catalogImport);
// Hover preloaders — kick off the network request before the user clicks.
const preloadSettings = () => settingsImport();
const preloadCatalog = () => catalogImport();

// Platform detection — evaluated once at module load, never changes at runtime.
// userAgent is the recommended check after navigator.platform was deprecated.
const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);

const App = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [arrangeMode, setArrangeMode] = useState(false);

  // ── Zustand stores ─────────────────────────────────────────────────────────
  const {
    mode, accent, defaultView,
    lookAwayEnabled, lookAwayInterval, lookAwayNotify,
    canvasBg, setCanvasBg,
    cardStyle,
  } = useSettingsStore();
  const { instances, addInstance, removeInstance } = useWidgetInstancesStore();

  // Resolves 'auto' mode to 'light'/'dark' based on sunrise/sunset;
  // no-op (returns mode as-is) for explicit 'light' or 'dark' settings.
  const effectiveMode = useAutoTheme(mode, accent, cardStyle);
  const isDark = effectiveMode === 'dark';
  const focusShortcut = isMac ? '⌥⇧F' : 'Alt+Shift+F';
  const [showFocusMode, setShowFocusMode] = useState(() => defaultView === 'focus');
  // Keep FocusMode permanently mounted after first activation so state/hooks
  // persist — re-entry is instant (no cold start). Only first open is cold.
  const [focusModeEverShown, setFocusModeEverShown] = useState(() => defaultView === 'focus');
  const [showLookAway, setShowLookAway] = useState(false);

  useLookAwayScheduler({
    enabled: lookAwayEnabled,
    intervalMins: lookAwayInterval,
    notify: lookAwayNotify,
    onTrigger: () => setShowLookAway(true),
  });

  // Alt+Shift+F — toggle Focus Mode (safe across Chrome/Firefox/Linux)
  useEffect(() => {
    const handleKey = (e) => {
      if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'f') {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        setShowFocusMode(v => {
          if (!v) setFocusModeEverShown(true);
          return !v;
        });
      }
    };
    globalThis.addEventListener('keydown', handleKey);
    return () => globalThis.removeEventListener('keydown', handleKey);
  }, []);

  const topBarRef = useRef(null);

  useEffect(() => {
    if (!showSettings) return;
    const handler = (e) => {
      if (e.type === 'keydown' && e.key === 'Escape') { setShowSettings(false); return; }
      if (topBarRef.current && !topBarRef.current.contains(e.target)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', handler);
    };
  }, [showSettings]);

  const toggleSettings = () => setShowSettings((s) => !s);
  const closeSettings = () => setShowSettings(false);

  // ESC closes arrange mode
  useEffect(() => {
    if (!arrangeMode) return;
    const handler = (e) => { if (e.key === 'Escape') setArrangeMode(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [arrangeMode]);

  // ── Canvas background computation ─────────────────────────────────────────
  const bgType = canvasBg?.type || 'orb';
  const bgOrbId = canvasBg?.orbId || 'accent';
  const bgOrbRgb = useMemo(() => bgOrbId === 'accent' ? null : getOrbRgbById(bgOrbId), [bgOrbId]);

  // URL for photo/custom backgrounds. Re-read library lazily at render time
  // (library is only relevant when bgType === 'curated').
  const bgImageUrl = useMemo(() => {
    if (bgType === 'custom') return canvasBg?.url || null;
    if (bgType === 'curated') { const p = getPhotoLibrary()[0]; return canvasBg?.url || p?.regular || p?.small || null; }
    if (bgType === 'default') return bgImage;
    return null;
  }, [bgType, canvasBg]);

  // Thumbnail URL for the active curated photo — drives both color extraction
  // and the blur-up blurry preview layer. Computed client-side from the library
  // head so it works even for cached entries that predate the `thumb` API field.
  const bgThumbUrl = useMemo(() => {
    if (bgType !== 'curated') return null;
    const p = getPhotoLibrary()[0];
    return getThumbUrl(p);
  }, [bgType, canvasBg?.url]);

  const pageBg = useMemo(() => {
    // Use the stored dominant colour as the instant placeholder so there's no
    // black flash while the full-resolution background image is loading.
    if (bgType === 'curated') return canvasBg?.color || '#0c0c10';
    if (bgType === 'custom' || bgType === 'default') return '#000000';
    if (bgType === 'orb') return isDark ? '#060608' : 'var(--w-page-bg)';
    // solid — rich accent-tinted gradient
    const accentHex = ACCENT_COLORS.find(a => a.name === accent)?.hex || '#3689E6';
    const base = isDark ? '#141414' : '#F0F0F2';
    const disc = isDark ? 32 : 26;
    const cone = isDark ? 20 : 16;
    const haze = isDark ? 10 : 8;
    return [
      `radial-gradient(ellipse 28% 20% at 55% 0%, color-mix(in srgb, ${accentHex} ${disc}%, ${base}) 0%, transparent 60%)`,
      `radial-gradient(ellipse 80% 110% at 55% -25%, color-mix(in srgb, ${accentHex} ${cone}%, ${base}) 0%, color-mix(in srgb, ${accentHex} ${Math.round(cone * 0.3)}%, ${base}) 55%, transparent 80%)`,
      `linear-gradient(to bottom, color-mix(in srgb, ${accentHex} ${haze}%, ${base}) 0%, ${base} 55%)`,
    ].join(', ');
  }, [bgType, isDark, accent, canvasBg?.color]);

  // ── Blur-up load tracking ──────────────────────────────────────────────────
  // Compare loaded URLs against current targets — comparison becomes false
  // automatically when URLs change, driving the blur-up sequence without an
  // explicit phase reset: pageBg color → blurry thumb → sharp full-res.
  const [thumbLoadedUrl, setThumbLoadedUrl] = useState(null);
  const [fullLoadedUrl, setFullLoadedUrl] = useState(null);
  const thumbReady = !!bgThumbUrl && thumbLoadedUrl === bgThumbUrl;
  const fullReady = !!bgImageUrl && fullLoadedUrl === bgImageUrl;

  return (
    <div
      id="fullscreen"
      className="relative h-screen w-screen overflow-auto"
      style={{ background: pageBg }}
    >
      {/* ── Canvas background layer ── */}
      {bgType === 'orb' && <OrbBackground zIndex={0} rgb={bgOrbRgb} isDark={isDark} />}

      {/* Blur-up sequence for curated photos:
            Layer 0 (zIndex 0): blurry thumbnail — fades in fast.
                                Also drives the color-extraction side-effect.
            Layer 1 (zIndex 1): full-res — crossfades in sharply over the thumb.
          The dominant `pageBg` colour shows through until layer 0 is ready. */}
      {bgType === 'curated' && bgThumbUrl && (
        <img
          key={bgThumbUrl}
          src={bgThumbUrl}
          alt=""
          aria-hidden
          crossOrigin="anonymous"
          onLoad={e => {
            extractColorFromImage(e.currentTarget, color =>
              setCanvasBg(prev => ({ ...prev, color }))
            );
            setThumbLoadedUrl(bgThumbUrl);
          }}
          style={{
            position: 'absolute', inset: 0, zIndex: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            filter: 'blur(18px)',
            transform: 'scale(1.08)', // hide blur edges
            opacity: thumbReady ? 1 : 0,
            transition: 'opacity 0.4s ease',
            pointerEvents: 'none',
          }}
        />
      )}
      {(bgType === 'curated' || bgType === 'custom' || bgType === 'default') && bgImageUrl && (
        <img
          key={bgImageUrl}
          src={bgImageUrl}
          alt=""
          aria-hidden
          onLoad={() => setFullLoadedUrl(bgImageUrl)}
          style={{
            position: 'absolute', inset: 0, zIndex: 1,
            width: '100%', height: '100%',
            objectFit: 'cover',
            opacity: fullReady ? 1 : 0,
            transition: 'opacity 0.6s ease',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* ── Focus Mode ── top-left ── */}
      <div className="absolute top-5 left-5 z-50">
        <button
          onClick={() => { setFocusModeEverShown(true); setShowFocusMode(true); }}
          className="group flex items-center rounded-full transition-all duration-300 focus:outline-none cursor-pointer"
          style={{
            padding: '7px 12px',
            background: 'var(--card-bg)',
            backdropFilter: 'var(--card-blur)',
            WebkitBackdropFilter: 'var(--card-blur)',
            border: '1px solid var(--card-border)',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          <MoonStarsFill
            size={14}
            className="shrink-0 transition-transform duration-200 group-hover:scale-110"
            style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.45)' }}
          />
          <span className="max-w-0 overflow-hidden transition-all duration-300 group-hover:max-w-28 opacity-0 group-hover:opacity-100">
            <span
              className="pl-2 text-xs font-semibold whitespace-nowrap select-none tracking-wide"
              style={{ color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.55)' }}
            >
              Focus <span style={{ opacity: 0.55, fontSize: '10px', fontWeight: 500 }}>{focusShortcut}</span>
            </span>
          </span>
        </button>
      </div>

      {/* ── Control Cluster ── top-right ── */}
      <div ref={topBarRef} className="absolute top-5 right-5 z-50">
        <div
          className="flex items-center rounded-full"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            backdropFilter: 'var(--card-blur)',
            WebkitBackdropFilter: 'var(--card-blur)',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          {/* Arrange */}
          <button
            className={`relative group p-2.5 rounded-full transition-all duration-200 focus:outline-none cursor-pointer ${arrangeMode ? '' : isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
            onClick={() => setArrangeMode(s => !s)}
            style={arrangeMode ? { background: 'var(--w-accent)', borderRadius: '9999px' } : {}}
          >
            <Grid1x2Fill
              size={15}
              style={{ color: arrangeMode ? 'var(--w-accent-fg)' : isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.5)' }}
            />
            <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
              <span className="block text-[10px] font-semibold whitespace-nowrap px-1.5 py-0.5 rounded-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', backdropFilter: 'var(--card-blur)', WebkitBackdropFilter: 'var(--card-blur)', color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.6)' }}>{arrangeMode ? 'Done (Esc)' : 'Arrange'}</span>
            </span>
          </button>

          <div className="w-px h-3.5 shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }} />

          {/* Widgets */}
          <button
            className={`relative group p-2.5 rounded-full transition-all duration-200 focus:outline-none cursor-pointer ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
            onClick={() => { setShowCatalog(true); closeSettings(); }}
            onMouseEnter={preloadCatalog}
          >
            <Grid3x3GapFill
              size={15}
              style={{ color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.5)' }}
            />
            <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
              <span className="block text-[10px] font-semibold whitespace-nowrap px-1.5 py-0.5 rounded-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', backdropFilter: 'var(--card-blur)', WebkitBackdropFilter: 'var(--card-blur)', color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.6)' }}>Widgets</span>
            </span>
          </button>

          <div className="w-px h-3.5 shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }} />

          {/* Settings */}
          <button
            className={`relative group p-2.5 rounded-full transition-all duration-200 focus:outline-none cursor-pointer ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
            onClick={toggleSettings}
            onMouseEnter={preloadSettings}
          >
            <GearFill
              size={15}
              className="transition-transform duration-300 group-hover:rotate-90"
              style={{
                color: (() => {
                  if (showSettings) return isDark ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.8)';
                  return isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.5)';
                })(),
              }}
            />
            <span className="absolute top-full left-1/2 -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
              <span className="block text-[10px] font-semibold whitespace-nowrap px-1.5 py-0.5 rounded-md" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', backdropFilter: 'var(--card-blur)', WebkitBackdropFilter: 'var(--card-blur)', color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.6)' }}>Settings</span>
            </span>
          </button>
        </div>

        {showSettings && (
          <Suspense fallback={null}>
            <Settings
              closeSettings={closeSettings}
              onPreviewLookAway={() => { setShowLookAway(true); closeSettings(); }}
              onOpenBgPicker={() => { setShowBgPicker(true); closeSettings(); }}
            />
          </Suspense>
        )}
      </div>

      {showCatalog && (
        <Suspense fallback={null}>
          <WidgetCatalog
            instances={instances}
            onAddInstance={addInstance}
            onRemoveInstance={removeInstance}
            onClose={() => setShowCatalog(false)}
          />
        </Suspense>
      )}

      <div className="w-full h-full pt-16">
        <WidgetGrid instances={instances} onRemoveInstance={removeInstance} arrangeMode={arrangeMode} />
      </div>

      {focusModeEverShown && (
        <div
          style={{ display: showFocusMode ? 'block' : 'none', pointerEvents: showFocusMode ? 'auto' : 'none' }}
          aria-hidden={!showFocusMode}
        >
          <FocusMode onExit={() => setShowFocusMode(false)} />
        </div>
      )}

      {showLookAway && (
        <LookAway
          onDismiss={() => { setShowLookAway(false); clearLookAwayDue(); }}
          duration={20}
          isDark={isDark}
        />
      )}

      {/* ── Canvas background picker ── */}
      {showBgPicker && (
        <BackgroundPicker
          scope="canvas"
          initialSource={bgType}
          initialOrbId={bgOrbId}
          initialCustomUrl={bgType === 'custom' ? canvasBg?.url || null : null}
          initialPhotoUrl={bgType === 'curated' ? canvasBg?.url || null : null}
          onClose={() => setShowBgPicker(false)}
          onApply={(type, opts = {}) => {
            setCanvasBg({ type, orbId: opts.orbId || bgOrbId, url: opts.url ?? null, color: opts.color ?? null });
          }}
        />
      )}
      <Analytics />
    </div>
  );
};

export default App;
