import "./App.css";
import React, { useState, useEffect } from "react";
import { FONTS, LANGUAGES } from "./constants";
import { DateToday } from "./components/DateToday";
import { LiveClock } from "./components/LiveClock";
import { NepaliMiti } from "./components/NepaliMiti";
import { Settings } from "./components/Settings";
import { SHOW_MITI_IN_ICON, TIME_FORMAT } from "./constants/settings";

const App = () => {
  const [showSettings, setShowSettings] = useState(false);

  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem("language");
    return savedLanguage ? savedLanguage : LANGUAGES.en;
  });

  const [showMitiInIcon, setShowMitiInIcon] = useState(() => {
    const showBadge = localStorage.getItem("showMitiInIcon");
    return showBadge ? showBadge : SHOW_MITI_IN_ICON["Hide"];
  });

  const [timeFormat, setTimeFormat] = useState(() => {
    const savedFormat = localStorage.getItem("timeFormat");
    return savedFormat ? savedFormat : TIME_FORMAT["24-Hour"];
  });

  useEffect(() => {
    localStorage.setItem("language", language);
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
        <div
          className="setting-icon"
          onClick={toggleSettings}
          title="Settings"
        ></div>
        {showSettings && (
          <Settings
            language={language}
            setLanguage={setLanguage}
            showMitiInIcon={showMitiInIcon}
            setShowMitiInIcon={setShowMitiInIcon}
            timeFormat={timeFormat}
            setTimeFormat={setTimeFormat}
            closeSettings={closeSettings}
          />
        )}
      </div>
      <div className="clock-area" style={{ fontFamily: FONTS[language] }}>
        <NepaliMiti language={language} showMitiInIcon={showMitiInIcon} />
        <LiveClock language={language} timeFormat={timeFormat} />
        <DateToday language={language} />
      </div>
    </div>
  );
};

export default App;
