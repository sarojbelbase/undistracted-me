import './App.css';
import React, { useState, useEffect, useRef } from 'react';
import { FONTS, LANGUAGES } from './constants';
import { DateToday } from './components/DateToday';
import { LiveClock } from './components/LiveClock';
import { NepaliMiti } from './components/NepaliMiti';
import { Settings } from './components/Settings';
import { SHOW_MITI_IN_ICON } from './constants/settings';
import { WidgetGrid } from './widgets/WidgetGrid';
import { WidgetCatalog } from './widgets/WidgetCatalog';
import { useWidgetInstances } from './widgets/useWidgetInstances';
import { useTheme } from './theme';

const App = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [showWidgets, setShowWidgets] = useState(() => {
    const saved = localStorage.getItem('showWidgets');
    return saved ? JSON.parse(saved) : true;
  });

  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem('language');
    return savedLanguage ? savedLanguage : LANGUAGES.en;
  });

  const [showMitiInIcon] = useState(SHOW_MITI_IN_ICON["Hide"]);

  const { instances, addInstance, removeInstance } = useWidgetInstances();

  const [showCatalog, setShowCatalog] = useState(false);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('showWidgets', JSON.stringify(showWidgets));
  }, [showWidgets]);

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

  const toggleWidgets = () => {
    setShowWidgets(!showWidgets);
  };

  return (
    <div
      id="fullscreen"
      className={`relative h-screen w-screen overflow-auto ${!showWidgets ? 'flex flex-col justify-center items-center text-white' : ''}`}
      style={{ background: showWidgets ? 'var(--w-page-bg)' : '#18191B' }}
    >
      <div ref={topBarRef} className="absolute top-5 right-5 z-50 flex gap-2">
        {/* Widget catalog / hamburger */}
        <button
          className={`p-2 rounded-full transition-all duration-300 focus:outline-none ${!showWidgets || mode === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
          onClick={() => { setShowCatalog(true); closeSettings(); }}
          title="Manage Widgets"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16" className={`transition-colors duration-300 ${!showWidgets || mode === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
            <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5" />
          </svg>
        </button>
        <button
          className={`p-2 rounded-full transition-all duration-300 focus:outline-none ${!showWidgets || mode === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
          onClick={toggleWidgets}
          title={showWidgets ? 'Hide Widgets' : 'Show Widgets'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16" className={`transition-colors duration-300 ${!showWidgets || mode === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
            <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm5 0v4h6V2H5zm6 5H5v7h6V7zM1 7v7a1 1 0 0 0 1 1h2V7H1zm11 0v8h1a1 1 0 0 0 1-1V7h-2z" />
          </svg>
        </button>
        <button
          className={`p-2 rounded-full transition-all duration-300 focus:outline-none ${!showWidgets || mode === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
          onClick={toggleSettings}
          title='Settings'
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16" className={`hover:rotate-45 transition-transform duration-300 ${!showWidgets || mode === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
            <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492M5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0" />
            <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115z" />
          </svg>
        </button>
        {showSettings && (
          <Settings
            language={language}
            setLanguage={setLanguage}
            closeSettings={closeSettings}
            accent={accent}
            setAccent={setAccent}
            mode={mode}
            setMode={setMode}
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

      {showWidgets ? (
        <div className="w-full h-full pt-16">
          <WidgetGrid instances={instances} onRemoveInstance={removeInstance} />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-4" style={{ fontFamily: FONTS[language] }}>
          <NepaliMiti language={language} showMitiInIcon={showMitiInIcon} />
          <LiveClock language={language} />
          <DateToday language={language} />
        </div>
      )}
    </div>
  );
};

export default App;
