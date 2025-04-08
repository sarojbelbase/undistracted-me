import React from "react";
import {
  LANGUAGES,
  SHOW_MITI_IN_ICON,
  TIME_FORMAT,
} from "../constants/settings";

const SettingsOption = ({ id, label, value, options, onChange }) => (
  <div className={`${id}-area`}>
    <label htmlFor={`${id}-select`} className={`${id}-label`}>
      {label}
    </label>
    <select id={`${id}-select`} value={value} onChange={onChange}>
      {Object.keys(options).map((key) => (
        <option key={key} value={options[key]}>
          {key}
        </option>
      ))}
    </select>
  </div>
);

// ✅ Add `timeFormat` and `setTimeFormat` to props
export const Settings = ({
  language,
  setLanguage,
  showMitiInIcon,
  setShowMitiInIcon,
  timeFormat,
  setTimeFormat,
  closeSettings,
}) => {
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
        onChange={handleChange(setLanguage, "language")}
      />
      <SettingsOption
        id="badge"
        label="Show Miti In Badge:"
        value={showMitiInIcon}
        options={SHOW_MITI_IN_ICON}
        onChange={handleChange(setShowMitiInIcon, "showMitiInIcon")}
      />
      <SettingsOption
        id="timeformat"
        label="Time Format:"
        value={timeFormat}
        options={TIME_FORMAT}
        onChange={handleChange(setTimeFormat, "timeFormat")}
      />
    </div>
  );
};
