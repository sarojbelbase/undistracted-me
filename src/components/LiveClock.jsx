import React, { useState, useEffect, useCallback } from 'react';
import { getLiveClockInSelectedLanguage } from '../utilities';

export const LiveClock = ({ language }) => {
  const [clock, setClock] = useState('');

  const updateClock = useCallback(() => {
    setClock(getLiveClockInSelectedLanguage(language));
  }, [language]);

  useEffect(() => {
    updateClock();
    const intervalId = setInterval(updateClock, 1000);
    return () => clearInterval(intervalId);
  }, [updateClock]);

  return (
    <div id="liveclock">
      {clock}
    </div>
  );
};
