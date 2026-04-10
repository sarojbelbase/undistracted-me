import React from 'react';
import { useSettingsStore } from '../../store';

// Focus mode is always rendered on a dark background — use explicit dark-glass
// tokens rather than theme CSS variables (which may be light-mode in canvas).

const FMLabel = ({ children }) => (
  <p
    className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em]"
    style={{ color: 'rgba(255,255,255,0.38)' }}
  >
    {children}
  </p>
);

const ToggleRow = ({ label, options, value, onChange }) => (
  <div>
    <FMLabel>{label}</FMLabel>
    <div
      className="flex gap-1 p-0.5 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
    >
      {options.map(({ id, label: optLabel }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className="flex-1 text-[10px] py-1.5 rounded-lg font-semibold transition-all focus:outline-none cursor-pointer"
          style={value === id
            ? { background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }
            : { background: 'transparent', color: 'rgba(255,255,255,0.55)' }}
        >
          {optLabel}
        </button>
      ))}
    </div>
  </div>
);

export const FocusModeSettings = ({ onOpenBgModal }) => {
  const {
    dateFormat, setDateFormat,
    clockFormat, setClockFormat,
  } = useSettingsStore();

  return (
    <dialog
      open
      aria-label="Focus mode settings"
      className="absolute right-0 top-11 z-50 flex flex-col gap-4 p-4 w-52 rounded-2xl animate-fade-in"
      style={{
        background: 'rgba(12,12,16,0.86)',
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        border: '1px solid rgba(255,255,255,0.11)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      {/* Date format */}
      <ToggleRow
        label="Date Calendar"
        options={[{ id: 'gregorian', label: 'CE' }, { id: 'bikramSambat', label: 'BS' }]}
        value={dateFormat}
        onChange={setDateFormat}
      />

      {/* Clock format */}
      <ToggleRow
        label="Clock Format"
        options={[{ id: '24h', label: '24h' }, { id: '12h', label: '12h' }]}
        value={clockFormat || '24h'}
        onChange={setClockFormat}
      />

      {/* Background */}
      <div>
        <FMLabel>Background</FMLabel>
        <button
          onClick={() => onOpenBgModal?.()}
          className="w-full flex items-center justify-between text-[10px] py-1.5 px-3 rounded-xl font-semibold focus:outline-none cursor-pointer transition-opacity hover:opacity-80"
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.72)',
          }}
        >
          <span>Change background</span>
          <span style={{ color: 'rgba(255,255,255,0.35)' }}>›</span>
        </button>
      </div>
    </dialog>
  );
};


