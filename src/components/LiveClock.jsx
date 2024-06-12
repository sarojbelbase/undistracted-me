import React, { useState, useEffect, useCallback } from 'react';
import { getLiveClockInSelectedLanguage } from '../utilities';

export const LiveClock = ({ language }) => {
  const [clock, setClock] = useState('');

  const updateClock = useCallback(() => {
    setClock(getLiveClockInSelectedLanguage(language));
  }, [language]);

  useEffect(() => {
    updateClock(); // Initial call to set the clock immediately
    const intervalId = setInterval(updateClock, 1000);

    return () => clearInterval(intervalId); // Clean up the interval on component unmount
  }, [updateClock]);

  return (
    <div id="liveclock">
      {clock}
    </div>
  );
};
