import './App.css';
import React, { useState, useRef, useEffect, Suspense, lazy } from 'react';
import { MoonStarsFill, Grid3x3GapFill, GearFill } from 'react-bootstrap-icons';
import { FocusMode } from './components/FocusMode';
import { LookAway } from './components/LookAway';
import { useLookAwayScheduler, clearLookAwayDue } from './components/LookAway/hooks';
import { WidgetGrid } from './widgets/WidgetGrid';
import { useSettingsStore, useWidgetInstancesStore } from './store';
import { useAutoTheme } from './utilities/useAutoTheme';

// Settings and catalog are only ever opened on demand — lazy-load them.
const Settings = lazy(() => import('./components/Settings').then(m => ({ default: m.Settings })));
const WidgetCatalog = lazy(() => import('./widgets/WidgetCatalog').then(m => ({ default: m.WidgetCatalog })));

const App = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);

  // ── Zustand stores ─────────────────────────────────────────────────────────
  const { mode, accent, defaultView, lookAwayEnabled, lookAwayInterval, lookAwayNotify } = useSettingsStore();
  const { instances, addInstance, removeInstance } = useWidgetInstancesStore();

  // Resolves 'auto' mode to 'light'/'dark' based on sunrise/sunset;
  // no-op (returns mode as-is) for explicit 'light' or 'dark' settings.
  const effectiveMode = useAutoTheme(mode, accent);
  const isDark = effectiveMode === 'dark';
  const [showFocusMode, setShowFocusMode] = useState(() => defaultView === 'focus');
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
        setShowFocusMode(v => !v);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
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

  return (
    <div
      id="fullscreen"
      className="relative h-screen w-screen overflow-auto"
      style={{ background: 'var(--w-page-bg)' }}
    >
      {/* ── Focus Mode ── top-left ── */}
      <div className="absolute top-5 left-5 z-50">
        <button
          onClick={() => setShowFocusMode(true)}
          className="group flex items-center rounded-full transition-all duration-300 focus:outline-none"
          style={{
            padding: '7px 12px',
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)'}`,
            backdropFilter: 'blur(12px)',
          }}
          title="Focus Mode (Alt+Shift+F)"
        >
          <MoonStarsFill
            size={14}
            className="shrink-0 transition-transform duration-200 group-hover:scale-110"
            style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }}
          />
          <span className="max-w-0 overflow-hidden transition-all duration-300 group-hover:max-w-14 opacity-0 group-hover:opacity-100">
            <span
              className="pl-2 text-xs font-medium whitespace-nowrap select-none tracking-wide"
              style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}
            >
              Focus
            </span>
          </span>
        </button>
      </div>

      {/* ── Control Cluster ── top-right ── */}
      <div ref={topBarRef} className="absolute top-5 right-5 z-50">
        <div
          className="flex items-center rounded-full"
          style={{
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.92)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.09)'}`,
            backdropFilter: 'blur(16px)',
            boxShadow: isDark
              ? '0 2px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)'
              : '0 2px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
          }}
        >
          {/* Widgets */}
          <button
            className={`p-2.5 rounded-full transition-all duration-200 focus:outline-none ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
            onClick={() => { setShowCatalog(true); closeSettings(); }}
            title="Widgets"
          >
            <Grid3x3GapFill
              size={15}
              style={{ color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.5)' }}
            />
          </button>

          <div className="w-px h-3.5 shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }} />

          {/* Settings */}
          <button
            className={`group p-2.5 rounded-full transition-all duration-200 focus:outline-none ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
            onClick={toggleSettings}
            title="Settings"
          >
            <GearFill
              size={15}
              className="transition-transform duration-300 group-hover:rotate-90"
              style={{
                color: showSettings
                  ? isDark ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.8)'
                  : isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.5)',
              }}
            />
          </button>
        </div>

        {showSettings && (
          <Suspense fallback={null}>
            <Settings
              closeSettings={closeSettings}
              onPreviewLookAway={() => { setShowLookAway(true); closeSettings(); }}
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
        <WidgetGrid instances={instances} onRemoveInstance={removeInstance} />
      </div>

      {showFocusMode && (
        <FocusMode onExit={() => setShowFocusMode(false)} />
      )}

      {showLookAway && (
        <LookAway
          onDismiss={() => { setShowLookAway(false); clearLookAwayDue(); }}
          duration={20}
          isDark={isDark}
        />
      )}
    </div>
  );
};

export default App;
