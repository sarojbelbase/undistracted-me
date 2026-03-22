import './App.css';
import React, { useState, useEffect, useRef } from 'react';
import { MoonStarsFill, Grid3x3GapFill, GearFill } from 'react-bootstrap-icons';
import { LANGUAGES } from './constants';
import { Settings } from './components/Settings';
import { FocusMode } from './components/FocusMode';
import { WidgetGrid } from './widgets/WidgetGrid';
import { WidgetCatalog } from './widgets/WidgetCatalog';
import { useWidgetInstances } from './widgets/useWidgetInstances';
import { useTheme } from './theme';

const App = () => {
  const [showSettings, setShowSettings] = useState(false);

  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem('language');
    return savedLanguage ? savedLanguage : LANGUAGES.en;
  });

  const { instances, addInstance, removeInstance } = useWidgetInstances();

  const [showCatalog, setShowCatalog] = useState(false);
  const [defaultView, setDefaultView] = useState(() => localStorage.getItem('defaultView') || 'canvas');
  const [showFocusMode, setShowFocusMode] = useState(() => (localStorage.getItem('defaultView') || 'canvas') === 'focus');

  const handleSetDefaultView = (view) => {
    setDefaultView(view);
    localStorage.setItem('defaultView', view);
  };

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const { accent, mode, setAccent, setMode } = useTheme();
  const topBarRef = useRef(null);

  useEffect(() => {
    if (!showSettings) return;
    const handler = (e) => {
      if (topBarRef.current && !topBarRef.current.contains(e.target)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSettings]);

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  const closeSettings = () => {
    setShowSettings(false);
  };

  const isDark = mode === 'dark';

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
          title="Focus Mode"
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
          <Settings
            language={language}
            setLanguage={setLanguage}
            closeSettings={closeSettings}
            accent={accent}
            setAccent={setAccent}
            mode={mode}
            setMode={setMode}
            defaultView={defaultView}
            setDefaultView={handleSetDefaultView}
          />
        )}
      </div>

      {showCatalog && (
        <WidgetCatalog
          instances={instances}
          onAddInstance={addInstance}
          onRemoveInstance={removeInstance}
          onClose={() => setShowCatalog(false)}
        />
      )}

      <div className="w-full h-full pt-16">
        <WidgetGrid instances={instances} onRemoveInstance={removeInstance} />
      </div>

      {showFocusMode && (
        <FocusMode
          onExit={() => setShowFocusMode(false)}
          accent={accent}
          setAccent={setAccent}
          mode={mode}
          setMode={setMode}
          language={language}
          setLanguage={setLanguage}
        />
      )}
    </div>
  );
};

export default App;
