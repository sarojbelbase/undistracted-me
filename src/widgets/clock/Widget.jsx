import React, { useState, useEffect, useCallback } from 'react';
import { BaseWidget } from '../BaseWidget';
import { useWidgetSettings } from '../useWidgetSettings';
import { Settings } from './Settings';
import { getTimeParts, getTimeInZone } from './utils';

export const Widget = ({ id, onRemove }) => {
  const [settings, updateSetting] = useWidgetSettings(id, { format: '24h', timezones: [] });
  const { format, timezones = [] } = settings;

  const [parts, setParts] = useState(() => getTimeParts(format));
  const [extraTimes, setExtraTimes] = useState([]);

  const update = useCallback(() => {
    setParts(getTimeParts(format));
    setExtraTimes(timezones.map(tz => getTimeInZone(tz, format)));
  }, [format, timezones]);

  useEffect(() => {
    update();
    const id = setInterval(update, 1_000);
    return () => clearInterval(id);
  }, [update]);

  const hasTZ = timezones.length > 0;

  // Conservative clamp — widget is typically ~200–340 px wide.
  // Avoid vw > 4.5 to prevent overflow in small grid cells.
  const mainSize = hasTZ ? 'clamp(1.5rem, 4vw, 3rem)' : 'clamp(3rem, 6vw, 4.25rem)';

  return (
    <BaseWidget
      className="p-4 flex flex-col items-center justify-center gap-2"
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
        <span className="w-display tabular-nums" style={{ fontSize: mainSize, lineHeight: 1 }}>
          {parts.time}
        </span>
        {parts.period && (
          <span
            className="font-semibold tracking-wider"
            style={{ fontSize: '0.8rem', color: 'var(--w-ink-4)', letterSpacing: '0.1em' }}
          >
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
          className={`w-full flex ${extraTimes.length === 1 ? 'justify-center' : 'justify-evenly'} gap-2 pt-2`}
          style={{ borderTop: '1px solid var(--w-border)' }}
        >
          {extraTimes.map(({ time, period, label }) => (
            <div key={label} className="flex flex-col items-center gap-0.5">
              <div className="flex items-baseline gap-0.5">
                <span
                  className="tabular-nums font-semibold"
                  style={{ fontSize: '0.875rem', color: 'var(--w-ink-2)' }}
                >
                  {time}
                </span>
                {period && (
                  <span
                    className="font-semibold"
                    style={{ fontSize: '0.55rem', color: 'var(--w-ink-4)' }}
                  >
                    {period}
                  </span>
                )}
              </div>
              <span
                className="text-center leading-tight font-medium"
                style={{ fontSize: '0.68rem', color: 'var(--w-ink-4)', maxWidth: '5rem' }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      )}
    </BaseWidget>
  );
};

