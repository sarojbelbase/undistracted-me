// ─── Right zone ───────────────────────────────────────────────────────────────
//
// Ambient world clocks — rendered as right-side floating text (no glass card).
// Hidden on screens narrower than 900 px via .fm-world-panel CSS.

import React, { useState, useEffect } from 'react';
import { getTimeInZone } from '../../../widgets/clock/utils';
import { onClockTick } from '../../../utilities/sharedClock';
import { useSettingsStore } from '../../../store';
import { useFocusTimezones } from '../hooks';
import { ZONES } from '../config';

const RIGHT = ZONES.right.items;

export const RightZone = ({ centerOnDark = true }) => {
  const clockFormat = useSettingsStore(s => s.clockFormat) || '24h';
  const timezones = useFocusTimezones();
  const [times, setTimes] = useState([]);

  useEffect(() => {
    if (!timezones?.length) return;
    const fmt = clockFormat || '24h';
    const tick = () => setTimes(timezones.map(tz => getTimeInZone(tz, fmt)));
    return onClockTick(tick);
  }, [timezones, clockFormat]);

  if (!RIGHT.worldClocks.enable || !times.length) return null;

  // Adapt text colors to the luminance of the background image
  const timeColor = centerOnDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.82)';
  const cityColor = centerOnDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const periodColor = centerOnDark ? 'rgba(255,255,255,0.58)' : 'rgba(0,0,0,0.48)';
  const timeShadow = centerOnDark ? '0 2px 18px rgba(0,0,0,0.55)' : 'none';
  const cityShadow = centerOnDark ? '0 1px 8px rgba(0,0,0,0.6)' : 'none';

  return (
    <div className="fm-world-panel">
      {times.map(({ time, period, label }, i) => {
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
            <span style={{
              fontSize: 9,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: cityColor,
              fontWeight: 600,
              fontFamily: "'Google Sans', ui-sans-serif, sans-serif",
              textShadow: cityShadow,
            }}>
              {city}
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{
                fontSize: 'clamp(1.4rem, 2.2vw, 2rem)',
                fontWeight: 600,
                fontFamily: "'Google Sans', ui-sans-serif, sans-serif",
                color: timeColor,
                letterSpacing: '-0.02em',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
                textShadow: timeShadow,
              }}>
                {time}
              </span>
              {period && (
                <span style={{
                  fontSize: 'clamp(0.5rem, 0.7vw, 0.65rem)',
                  fontWeight: 700,
                  color: periodColor,
                  letterSpacing: '0.09em',
                  textTransform: 'uppercase',
                  textShadow: cityShadow,
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
