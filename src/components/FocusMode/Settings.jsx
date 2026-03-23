import React from 'react';
import { CheckLg } from 'react-bootstrap-icons';
import { ACCENT_COLORS } from '../../theme';
import { LANGUAGES } from '../../constants/settings';
import { useSettingsStore } from '../../store';

export const FocusModeSettings = () => {
  const {
    dateFormat, setDateFormat,
    clockFormat, setClockFormat,
    accent, setAccent,
    mode, setMode,
    language, setLanguage,
  } = useSettingsStore();

  return (
    <div
      className="absolute right-0 top-11 z-50 flex flex-col gap-4 p-4 w-56 rounded-2xl animate-fade-in"
      style={{
        background: 'rgba(8,9,11,0.86)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)',
      }}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      {/* Date format */}
      <div>
        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.26)' }}>
          Date Calendar
        </p>
        <div className="flex gap-1.5">
          {[{ id: 'gregorian', label: 'CE' }, { id: 'bikramSambat', label: 'BS' }].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setDateFormat(id)}
              className="flex-1 text-[10px] py-1.5 rounded-lg font-medium transition-all focus:outline-none"
              style={dateFormat === id
                ? { background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }
                : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Clock format */}
      <div>
        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.26)' }}>
          Clock Format
        </p>
        <div className="flex gap-1.5">
          {[{ id: '24h', label: '24h' }, { id: '12h', label: '12h' }].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setClockFormat(id)}
              className="flex-1 text-[10px] py-1.5 rounded-lg font-medium transition-all focus:outline-none"
              style={(clockFormat || '24h') === id
                ? { background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }
                : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Appearance */}
      <div>
        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.26)' }}>
          Appearance
        </p>
        <div className="flex gap-1.5">
          {[{ id: 'light', label: 'Light' }, { id: 'dark', label: 'Dark' }].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className="flex-1 text-[10px] py-1.5 rounded-lg font-medium transition-all focus:outline-none"
              style={mode === id
                ? { background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }
                : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Accent */}
      <div>
        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.26)' }}>
          Accent
        </p>
        <div className="grid grid-cols-6 gap-1.5">
          {ACCENT_COLORS.map(color => {
            const locked = color.name === 'Default' && mode === 'dark';
            return (
              <button
                key={color.name}
                title={locked ? 'Not available in dark mode' : color.name}
                onClick={() => !locked && setAccent(color.name)}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-transform focus:outline-none"
                style={{
                  backgroundColor: color.hex,
                  outline: accent === color.name ? '2px solid rgba(255,255,255,0.7)' : 'none',
                  outlineOffset: '2px',
                  opacity: locked ? 0.25 : 1,
                  cursor: locked ? 'not-allowed' : 'pointer',
                  transform: accent === color.name ? 'scale(1.12)' : 'scale(1)',
                }}
              >
                {accent === color.name && <CheckLg size={11} style={{ color: color.fg }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Language */}
      <div>
        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.26)' }}>
          Nepali Language
        </p>
        <select
          value={language}
          onChange={e => setLanguage(e.target.value)}
          className="w-full rounded-lg px-2 py-1.5 text-[10px] outline-none"
          style={{
            backgroundColor: 'rgba(255,255,255,0.07)',
            color: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {Object.keys(LANGUAGES).map(k => (
            <option key={k} value={LANGUAGES[k]} style={{ backgroundColor: '#0d0e10', color: '#e5e7eb' }}>
              {k}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
