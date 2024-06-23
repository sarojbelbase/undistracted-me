import React, { useState, useEffect, useCallback } from 'react';
import { getNepaliMitiInSelectedLanguage } from '../../utilities';
import { stampThisIntoExtensionIcon } from '../../utilities/chrome';
import { SHOW_MITI_IN_ICON } from '../../constants/settings';

export const NepaliMiti = ({ language, showMitiInIcon }) => {
  const [miti, setMiti] = useState('');

  const updateMiti = useCallback(() => {
    const theMiti = getNepaliMitiInSelectedLanguage(language);
    setMiti(theMiti);

    const todaysMitiGatey = theMiti.split(' ')[1]
    const textToStamp = showMitiInIcon === SHOW_MITI_IN_ICON["Show"] ? todaysMitiGatey : '';
    stampThisIntoExtensionIcon(textToStamp);

  }, [language, showMitiInIcon]);

  useEffect(() => {
    updateMiti();
    const intervalId = setInterval(updateMiti, 1000);
    return () => clearInterval(intervalId);
  }, [updateMiti]);

  return (
    <div id="nepalimiti">
      {miti}
    </div>
  );
};
