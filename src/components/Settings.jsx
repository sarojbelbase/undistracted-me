import React from 'react';
import { SETTINGS_LANGUAGE } from '../constants';

export const Settings = ({ language, setLanguage, closeSettings }) => {
  const handleChange = (e) => {
    const selectedLanguage = e.target.value;
    setLanguage(selectedLanguage);
    localStorage.setItem('language', selectedLanguage);
    closeSettings();
  };

  return (
    <div className="settings-popup visible">
      <label htmlFor="language-select" className="language-label">Language:</label>
      <select id="language-select" value={language} onChange={handleChange}>
        {Object.keys(SETTINGS_LANGUAGE).map((key) => (
          <option key={key} value={SETTINGS_LANGUAGE[key]}>
            {key}
          </option>
        ))}
      </select>
    </div>
  );
};
