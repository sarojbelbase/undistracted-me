import React from 'react';
import { LANGUAGES, SHOW_MITI_IN_ICON } from '../constants/settings';

const SettingsOption = ({ id, label, value, options, onChange }) => (
  <div className="flex flex-col gap-1">
    <label htmlFor={`${id}-select`} className="text-gray-300 text-sm font-medium">{label}</label>
    <select
      id={`${id}-select`}
      value={value}
      onChange={onChange}
      className="bg-gray-800 text-white rounded-md p-2 text-sm border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {Object.keys(options).map((key) => (
        <option key={key} value={options[key]}>
          {key}
        </option>
      ))}
    </select>
  </div>
);

export const Settings = ({ language, setLanguage, showMitiInIcon, setShowMitiInIcon, closeSettings }) => {
  const handleChange = (setter, storageKey) => (e) => {
    const value = e.target.value;
    setter(value);
    localStorage.setItem(storageKey, value);
    closeSettings();
  };

  return (
    <div className="absolute top-12 right-0 w-48 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 shadow-xl flex flex-col gap-4 animate-fade-in">
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
