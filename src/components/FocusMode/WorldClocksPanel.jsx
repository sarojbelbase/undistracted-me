import React, { useState, useEffect } from 'react';
import { getTimeInZone } from '../../widgets/clock/utils';

export const WorldClocksPanel = ({ timezones, clockFormat }) => {
  const [times, setTimes] = useState([]);

  useEffect(() => {
    if (!timezones?.length) return;
    const fmt = clockFormat || '24h';
    const tick = () => setTimes(timezones.map(tz => getTimeInZone(tz, fmt)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timezones, clockFormat]);

  if (!times.length) return null;

  return (
    <div className="fm-world-panel">
      {times.map(({ time, period, label }, i) => {
        // "New York (ET)" → "New York" for a cleaner ambient look
        const city = label.replace(/\s*\([^)]+\)/, '').trim() || label;
        return (
          <div
            key={label}
            style={{
              animation: `worldClockIn 0.52s cubic-bezier(0.16,1,0.3,1) ${i * 90}ms both`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 3,
            }}
          >
            {/* City label — small, uppercase, dim */}
            <span style={{
              fontSize: 9,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.30)',
              fontWeight: 600,
              fontFamily: "'Google Sans', ui-sans-serif, sans-serif",
              textShadow: '0 1px 8px rgba(0,0,0,0.6)',
            }}>
              {city}
            </span>

            {/* Time — ambient, right-aligned, no glass card */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{
                fontSize: 'clamp(1.4rem, 2.2vw, 2rem)',
                fontWeight: 600,
                fontFamily: "'Google Sans', ui-sans-serif, sans-serif",
                color: 'rgba(255,255,255,0.78)',
                letterSpacing: '-0.02em',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
                textShadow: '0 2px 18px rgba(0,0,0,0.55)',
              }}>
                {time}
              </span>
              {period && (
                <span style={{
                  fontSize: 'clamp(0.5rem, 0.7vw, 0.65rem)',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.36)',
                  letterSpacing: '0.09em',
                  textTransform: 'uppercase',
                  textShadow: '0 1px 8px rgba(0,0,0,0.4)',
                }}>
                  {period}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
