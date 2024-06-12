import React, { useState, useEffect, useCallback } from 'react';
import { getNepaliMitiInSelectedLanguage } from '../utilities';

export const NepaliMiti = ({ language }) => {
  const [miti, setMiti] = useState('');

  const updateMiti = useCallback(() => {
    setMiti(getNepaliMitiInSelectedLanguage(language));
  }, [language]);

  useEffect(() => {
    updateMiti(); // Initial call to set the date immediately
    const intervalId = setInterval(updateMiti, 1000);

    return () => clearInterval(intervalId); // Clean up the interval on component unmount
  }, [updateMiti]);

  return (
    <div id="nepalimiti">
      {miti}
    </div>
  );
};
