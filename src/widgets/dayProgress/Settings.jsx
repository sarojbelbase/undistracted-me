import React, { useState } from 'react';
import { PRESETS } from './utils';

const HOURS = Array.from({ length: 25 }, (_, i) => i); // 0 – 24

const fmt = (h) => {
  if (h === 0) return '12 am';
  if (h === 12) return '12 pm';
  if (h === 24) return '12 am (+1)';
  return h < 12 ? `${h} am` : `${h - 12} pm`;
};

const selStyle = {
  background: 'var(--w-surface)',
  color: 'var(--w-ink-1)',
  border: '1px solid var(--w-border)',
  borderRadius: '0.5rem',
  fontSize: '0.8125rem',
  padding: '0.375rem 0.625rem',
  outline: 'none',
  cursor: 'pointer',
};

const inputStyle = {
  ...selStyle,
  width: '100%',
};

export const Settings = ({ preset = 'day', customLabel = '', customStart = 9, customEnd = 17, onChange }) => {
  const [localLabel, setLocalLabel] = useState(customLabel);

  const active = PRESETS.find(p => p.id === preset) || PRESETS[0];
  const isCustom = preset === 'custom';

  const commit = (key, val) => onChange(key, val);

  return (
    <div className="flex flex-col gap-4">
      {/* ── Preset chips ── */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--w-ink-5)' }}>
          Schedule
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => commit('preset', p.id)}
              className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
              style={preset === p.id
                ? { background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }
                : { background: 'var(--w-surface-2)', color: 'var(--w-ink-4)', border: '1px solid var(--w-border)' }}
            >
              {p.id === 'custom' ? 'Custom' : p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Custom options ── */}
      {isCustom && (
        <>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--w-ink-5)' }}>
              Title
            </p>
            <input
              type="text"
              value={localLabel}
              placeholder="e.g. Morning Shift"
              maxLength={32}
              style={inputStyle}
              onChange={e => setLocalLabel(e.target.value)}
              onBlur={() => commit('customLabel', localLabel.trim())}
              onKeyDown={e => e.key === 'Enter' && commit('customLabel', localLabel.trim())}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--w-ink-5)' }}>
                Start
              </p>
              <select
                value={customStart}
                style={selStyle}
                className="w-full"
                onChange={e => {
                  const v = Number(e.target.value);
                  commit('customStart', v);
                  if (v >= customEnd) commit('customEnd', Math.min(v + 1, 24));
                }}
              >
                {HOURS.slice(0, 24).map(h => (
                  <option key={h} value={h}>{fmt(h)}</option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--w-ink-5)' }}>
                End
              </p>
              <select
                value={customEnd}
                style={selStyle}
                className="w-full"
                onChange={e => commit('customEnd', Number(e.target.value))}
              >
                {HOURS.filter(h => h > customStart).map(h => (
                  <option key={h} value={h}>{fmt(h)}</option>
                ))}
              </select>
            </div>
          </div>
        </>
      )}

      {/* ── Preview label for non-custom ── */}
      {!isCustom && (
        <p className="text-[11px]" style={{ color: 'var(--w-ink-5)' }}>
          Tracks {fmt(active.startHour)} → {fmt(active.endHour)} &nbsp;({active.endHour - active.startHour}h)
        </p>
      )}
    </div>
  );
};
