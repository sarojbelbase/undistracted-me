import React, { useState, useEffect, useCallback } from 'react';
import bgImage from '../assets/img/bg.webp';
import { getTimeParts } from '../widgets/clock/utils';
import {
  getTimeZoneAwareDayJsInstance,
  convertEnglishToNepali,
} from '../utilities';
import { MONTH_NAMES } from '../constants';

const ENGLISH_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const GREGORIAN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const getGregorianDate = () => {
  const now = getTimeZoneAwareDayJsInstance();
  const day = ENGLISH_DAYS[now.day()];
  const month = GREGORIAN_MONTHS[now.month()];
  const date = now.date();
  const year = now.year();
  return `${day}, ${month} ${date}, ${year}`;
};

const getBikramSambatDate = () => {
  const now = getTimeZoneAwareDayJsInstance();
  const [year, month, day] = now.format('YYYY M D').split(' ').map(Number);
  const result = convertEnglishToNepali(year, month, day);
  if (result === 'Invalid date!') return result;
  const [nepaliYear, nepaliMonth, nepaliDay] = result.split(' ').map(Number);
  const dayOfWeek = ENGLISH_DAYS[now.day()];
  return `${dayOfWeek}, ${MONTH_NAMES[nepaliMonth - 1]} ${nepaliDay}, ${nepaliYear} BS`;
};

export const Screensaver = ({ onExit }) => {
  const [dateFormat, setDateFormat] = useState(() =>
    localStorage.getItem('screensaverDateFormat') || 'gregorian'
  );
  const [parts, setParts] = useState(() => getTimeParts('24h'));
  const [dateStr, setDateStr] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const update = useCallback(() => {
    setParts(getTimeParts('24h'));
    setDateStr(dateFormat === 'gregorian' ? getGregorianDate() : getBikramSambatDate());
  }, [dateFormat]);

  useEffect(() => {
    update();
    const id = setInterval(update, 1_000);
    return () => clearInterval(id);
  }, [update]);

  useEffect(() => {
    localStorage.setItem('screensaverDateFormat', dateFormat);
  }, [dateFormat]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onExit();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onExit]);

  const toggleDateFormat = () => {
    setDateFormat(prev => prev === 'gregorian' ? 'bikramSambat' : 'gregorian');
    setShowSettings(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      onClick={onExit}
    >
      {/* Subtle dark overlay for readability */}
      <div className="absolute inset-0 bg-black/30 pointer-events-none" />

      {/* Top bar: date + settings */}
      <div
        className="relative z-10 flex items-center justify-between px-10 pt-8"
        onClick={e => e.stopPropagation()}
      >
        <span className="text-white/80 text-xl font-medium tracking-wide drop-shadow">
          {dateStr}
        </span>

        {/* Settings toggle */}
        <div className="relative">
          <button
            className="text-white/60 hover:text-white transition p-2 rounded-full hover:bg-white/10"
            title="Date format settings"
            onClick={() => setShowSettings(s => !s)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492M5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0" />
              <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52z" />
            </svg>
          </button>
          {showSettings && (
            <div className="absolute right-0 top-10 bg-black/80 backdrop-blur-sm rounded-xl shadow-xl p-4 w-52 border border-white/10">
              <p className="text-white/50 text-xs mb-3 uppercase tracking-widest">Date format</p>
              <button
                className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition ${dateFormat === 'gregorian' ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'
                  }`}
                onClick={toggleDateFormat}
              >
                Gregorian
              </button>
              <button
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${dateFormat === 'bikramSambat' ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'
                  }`}
                onClick={toggleDateFormat}
              >
                Bikram Sambat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main clock */}
      <div
        className="relative z-10 flex flex-col items-center justify-center flex-1 select-none"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-baseline gap-4">
          <span
            className="font-bold text-white leading-none drop-shadow-2xl"
            style={{ fontSize: 'clamp(8rem, 22vw, 22rem)', letterSpacing: '-0.03em' }}
          >
            {parts.time}
          </span>
          {parts.period && (
            <span className="text-white/70 text-5xl font-medium">{parts.period}</span>
          )}
        </div>

        {/* Greeting */}
        <div className="flex items-baseline gap-2 mt-4">
          <span className="text-white/60 text-2xl font-light">{parts.greeting.prefix}</span>
          <span className="text-white text-2xl font-semibold">{parts.greeting.label}</span>
        </div>
      </div>

      {/* Exit hint */}
      <div className="relative z-10 pb-6 text-center">
        <span className="text-white/30 text-sm tracking-wide">Press Esc or click anywhere to exit</span>
      </div>
    </div>
  );
};
