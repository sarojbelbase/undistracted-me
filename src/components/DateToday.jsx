import React, { useState, useEffect, useCallback } from 'react';
import { getDateTodayInSelectedLanguage } from '../utilities';

export const DateToday = ({ language }) => {
  const [date, setDate] = useState('');

  const updateDate = useCallback(() => {
    setDate(getDateTodayInSelectedLanguage(language));
  }, [language]);

  useEffect(() => {
    updateDate(); // Initial call to set the date immediately
    const intervalId = setInterval(updateDate, 1000);

    return () => clearInterval(intervalId); // Clean up the interval on component unmount
  }, [updateDate]);

  return (
    <div id="datetoday">
      {date}
    </div>
  );
};
