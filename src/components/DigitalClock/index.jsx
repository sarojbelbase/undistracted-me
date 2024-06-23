import React from 'react';
import { NepaliMiti } from './NepaliMiti';
import { LiveClock } from './LiveClock';
import { DateToday } from './DateToday';
import { FONTS } from '../../constants';

const DigitalClock = ({ language, showMitiInIcon }) => (
  <div className="digital-clock" style={{ fontFamily: FONTS[language] }}>
    <NepaliMiti language={language} showMitiInIcon={showMitiInIcon} />
    <LiveClock language={language} />
    <DateToday language={language} />
  </div>
);

export default DigitalClock;
