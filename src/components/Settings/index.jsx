import React from 'react';
import { LANGUAGES, SHOW_MITI_IN_ICON } from '../../constants/settings';
import SettingsOption from './SettingsOption';

const Settings = ({ language, setLanguage, showMitiInIcon, setShowMitiInIcon, closeSettings }) => {
  const handleChange = (setter, storageKey) => (e) => {
    const value = e.target.value;
    setter(value);
    localStorage.setItem(storageKey, value);
    closeSettings();
  };

  return (
    <div className="settings-popup visible">
      <SettingsOption
        id="language"
        label="Language:"
        value={language}
        options={LANGUAGES}
        onChange={handleChange(setLanguage, 'language')}
      />
      <SettingsOption
        id="badge"
        label="Show Miti In Badge:"
        value={showMitiInIcon}
        options={SHOW_MITI_IN_ICON}
        onChange={handleChange(setShowMitiInIcon, 'showMitiInIcon')}
      />
    </div>
  );
};

export default Settings;
