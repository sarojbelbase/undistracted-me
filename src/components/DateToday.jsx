import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

const DateToday = () => {
  const [date, setDate] = useState('');

  useEffect(() => {
    const todaysDate = () => {
      setDate(dayjs().tz('Asia/Kathmandu').format('MMMM D, dddd'));
    };

    const intervalId = setInterval(todaysDate, 1000);
    todaysDate(); // Initial call to set the date immediately

    return () => clearInterval(intervalId); // Clean up the interval on component unmount
  }, []);

  return (
    <div id="datetoday">
      {date}
    </div>
  );
};

export default DateToday;
