import React from 'react';

const SettingsOption = ({ id, label, value, options, onChange }) => (
  <div className={`${id}-area`}>
    <label htmlFor={`${id}-select`} className={`${id}-label`}>{label}</label>
    <select id={`${id}-select`} value={value} onChange={onChange}>
      {Object.keys(options).map((key) => (
        <option key={key} value={options[key]}>
          {key}
        </option>
      ))}
    </select>
  </div>
);

export default SettingsOption;
