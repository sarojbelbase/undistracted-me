import React from 'react';
import { TZ_OPTIONS } from './utils';

export const Settings = ({ widgetId, format, timezones = [], onChange }) => {
  const setTz = (idx, tz) => {
    const next = [...timezones];
    next[idx] = tz;
    onChange('timezones', next.filter(Boolean));
  };

  const removeTz = (idx) => {
    const next = timezones.filter((_, i) => i !== idx);
    onChange('timezones', next);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── Format ── */}
      <div className="flex flex-col gap-2">
        <span className="w-label">Time Format</span>
        {[
          { label: '24-hour', value: '24h' },
          { label: '12-hour (AM/PM)', value: '12h' },
        ].map(({ label, value }) => (
          <label key={value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`${widgetId}-format`}
              value={value}
              checked={format === value}
              onChange={() => onChange('format', value)}
              className="accent-blue-500"
            />
            <span className="w-body font-normal">{label}</span>
          </label>
        ))}
      </div>

      {/* ── Extra Clocks ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <span className="w-label">Extra Clocks</span>
          <span className="text-[10px]" style={{ color: 'var(--w-ink-5)' }}>up to 2</span>
        </div>

        {[0, 1].map((idx) => {
          const current = timezones[idx];
          const prevFilled = idx === 0 || !!timezones[0];
          if (!prevFilled) return null;

          return (
            <div key={idx} className="flex items-center gap-2">
              <select
                value={current || ''}
                onChange={(e) => setTz(idx, e.target.value)}
                className="flex-1 text-xs px-2 py-1.5 rounded-lg outline-none cursor-pointer"
                style={{
                  backgroundColor: 'var(--w-surface-2)',
                  border: '1px solid var(--w-border)',
                  color: current ? 'var(--w-ink-1)' : 'var(--w-ink-5)',
                }}
              >
                <option value="">— pick a timezone —</option>
                {TZ_OPTIONS.map(({ tz, label }) => (
                  <option key={tz} value={tz}>{label}</option>
                ))}
              </select>
              {current && (
                <button
                  onClick={() => removeTz(idx)}
                  className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full transition-opacity hover:opacity-70 cursor-pointer"
                  style={{ backgroundColor: 'var(--w-surface-3, var(--w-surface-2))' }}
                  title="Remove"
                >
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="1" y1="1" x2="7" y2="7" /><line x1="7" y1="1" x2="1" y2="7" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

