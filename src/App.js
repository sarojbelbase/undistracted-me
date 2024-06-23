import './App.css';
import React, { useState } from 'react';
import useLanguage from './hooks/useLanguage';
import useShowMitiInIcon from './hooks/useShowMitiInIcon';
import Settings from './components/Settings';
import SettingIcon from './components/SettingIcon';
import DigitalClock from './components/DigitalClock';

const App = () => {
  const [showSettings, setShowSettings] = useState(false);
  const [language, setLanguage] = useLanguage();
  const [showMitiInIcon, setShowMitiInIcon] = useShowMitiInIcon();

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  const closeSettings = () => {
    setShowSettings(false);
  };

  return (
    <div id="fullscreen">
      <div className="setting-area">
        <SettingIcon toggleSettings={toggleSettings} />
        {showSettings && (
          <Settings
            language={language}
            setLanguage={setLanguage}
            showMitiInIcon={showMitiInIcon}
            setShowMitiInIcon={setShowMitiInIcon}
            closeSettings={closeSettings}
          />
        )}
      </div>
      <DigitalClock language={language} showMitiInIcon={showMitiInIcon} />
    </div>
  );
};

export default App;
