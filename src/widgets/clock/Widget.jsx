import React, { useState, useEffect, useCallback } from 'react';
import { BaseWidget } from '../BaseWidget';
import { useWidgetSettings } from '../useWidgetSettings';
import { Settings } from './Settings';
import config from './config';
import { getTimeParts, getTimeInZone } from './utils';
import { onClockTick } from '../../utilities/sharedClock';
import { CLOCK_TIMEZONE_DIVIDER } from '../../theme/canvas';

const DEFAULT_SETTINGS = { format: '24h', timezones: [] };

export const Widget = ({ id, onRemove }) => {
  const [settings, updateSetting] = useWidgetSettings(id, DEFAULT_SETTINGS);
  const { format, timezones = [] } = settings;

  const [parts, setParts] = useState(() => getTimeParts(format));
  const [extraTimes, setExtraTimes] = useState([]);

  const update = useCallback(() => {
    setParts(getTimeParts(format));
    setExtraTimes(timezones.map(tz => getTimeInZone(tz, format)));
  }, [format, timezones]);

  useEffect(() => onClockTick(update), [update]);

  const hasTZ = timezones.length > 0;

  // Conservative clamp — widget is typically ~200–340 px wide.
  // Avoid vw > 4.5 to prevent overflow in small grid cells.
  const mainSize = hasTZ ? 'clamp(1.5rem, 4vw, 3rem)' : 'clamp(3rem, 6vw, 4.25rem)';

  return (
    <BaseWidget
      className="p-4 flex flex-col items-center justify-center gap-2"
      settingsTitle={config.title}
      settingsContent={
        <Settings
          format={format}
          timezones={timezones}
          onChange={updateSetting}
        />
      }
      onRemove={onRemove}
    >
      {/* Time + AM/PM inline, baseline-aligned — no awkward stacking */}
      <div className="flex items-baseline gap-1 flex-wrap justify-center">
        <span className="clk-main-time" style={{ fontSize: mainSize }}>
          {parts.time}
        </span>
        {parts.period && (
          <span className="clk-period">
            {parts.period}
          </span>
        )}
      </div>

      {/* Greeting — inline natural flow, no two-column flex that can split mid-word */}
      <p className="text-center text-sm leading-snug px-1">
        <span className="w-sub-soft">{parts.greeting.prefix} </span>
        <span className="w-sub-bold">{parts.greeting.label}</span>
      </p>

      {/* Extra timezone clocks — subtle rule separates from main clock */}
      {hasTZ && (
        <div
          className={`clk-tz-section ${extraTimes.length === 1 ? 'clk-tz-section--single' : 'clk-tz-section--multi'}`}
          style={{ borderTop: `1px solid ${CLOCK_TIMEZONE_DIVIDER}` }}
        >
          {extraTimes.map(({ time, period, label }) => (
            <div key={label} className="clk-tz-item">
              <div className="clk-tz-time-row">
                <span className="clk-tz-time">
                  {time}
                </span>
                {period && (
                  <span className="clk-tz-period">
                    {period}
                  </span>
                )}
              </div>
              <span className="clk-tz-label">
                {label}
              </span>
            </div>
          ))}
        </div>
      )}
    </BaseWidget>
  );
};

