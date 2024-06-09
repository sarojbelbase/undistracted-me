import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

const LiveClock = () => {
  const [clock, setClock] = useState('');

  useEffect(() => {
    const updateClock = () => {
      setClock(dayjs().tz('Asia/Kathmandu').format('HH.mm.ss'));
    };

    const intervalId = setInterval(updateClock, 1000);
    updateClock(); // Initial call to set the clock immediately

    return () => clearInterval(intervalId); // Clean up the interval on component unmount
  }, []);

  return (
    <div id="liveclock">
      {clock}
    </div>
  );
};

export default LiveClock;
