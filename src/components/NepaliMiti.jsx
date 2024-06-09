import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import mitiBar from '../utilities';

dayjs.extend(utc);
dayjs.extend(timezone);

const NepaliMiti = () => {
  const [miti, setMiti] = useState('');

  useEffect(() => {
    const updateMiti = () => {
      const year = dayjs().tz('Asia/Kathmandu').format('YYYY');
      const month = dayjs().tz('Asia/Kathmandu').format('M');
      const day = dayjs().tz('Asia/Kathmandu').format('D');
      setMiti(mitiBar(year, month, day));
    };

    const intervalId = setInterval(updateMiti, 1000);
    updateMiti(); // Initial call to set the date immediately

    return () => clearInterval(intervalId); // Clean up the interval on component unmount
  }, []);

  return (
    <div id="nepalimiti">
      {miti}
    </div>
  );
};

export default NepaliMiti;
