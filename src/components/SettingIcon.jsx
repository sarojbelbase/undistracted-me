import React from 'react';

const SettingIcon = ({ toggleSettings }) => (
  <div
    className="setting-icon"
    onClick={toggleSettings}
    title='Settings'
  >
    {/* You can add an icon here */}
  </div>
);

export default SettingIcon;
