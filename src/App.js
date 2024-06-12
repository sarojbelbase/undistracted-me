import './App.css';
import React, { useState, useEffect } from 'react';
import { FONTS, LANGUAGES } from './constants';
import { DateToday } from './components/DateToday';
import { LiveClock } from './components/LiveClock';
import { NepaliMiti } from './components/NepaliMiti';
import { Settings } from './components/Settings';

const App = () => {
  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem('language');
    return savedLanguage ? savedLanguage : LANGUAGES.en;
  });

  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  const closeSettings = () => {
    setShowSettings(false);
  };

  return (
    <div id="fullscreen">
      <div className="setting-area">
        <div className="setting-icon" onClick={toggleSettings}></div>
        {showSettings && (
          <Settings
            language={language}
            setLanguage={setLanguage}
            closeSettings={closeSettings}
          />
        )}
      </div>
      <div className="clock-area" style={{ fontFamily: FONTS[language] }}>
        <NepaliMiti language={language} />
        <LiveClock language={language} />
        <DateToday language={language} />
      </div>
    </div>
  );
};

export default App;
