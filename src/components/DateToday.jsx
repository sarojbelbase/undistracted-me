import React, { useState, useEffect, useCallback } from 'react';
import { getDateTodayInSelectedLanguage } from '../utilities';

export const DateToday = ({ language }) => {
  const [date, setDate] = useState('');

  const updateDate = useCallback(() => {
    setDate(getDateTodayInSelectedLanguage(language));
  }, [language]);

  useEffect(() => {
    updateDate();
    const intervalId = setInterval(updateDate, 1000);
    return () => clearInterval(intervalId);
  }, [updateDate]);

  return (
    <div id="datetoday">
      {date}
    </div>
  );
};
