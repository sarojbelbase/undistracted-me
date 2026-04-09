import React from 'react';
import { useSettingsStore } from '../../store';

// ── Local component: theme-aware toggle row ───────────────────────────────────
const ToggleRow = ({ label, options, value, onChange }) => (
  <div>
    <p
      className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em]"
      style={{ color: 'var(--w-ink-5)' }}
    >
      {label}
    </p>
    <div className="flex gap-1.5">
      {options.map(({ id, label: optLabel }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className="flex-1 text-[10px] py-1.5 rounded-lg font-medium transition-all focus:outline-none cursor-pointer"
          style={value === id
            ? { background: 'var(--w-accent)', color: 'var(--w-accent-fg)', fontWeight: 700 }
            : { background: 'var(--w-surface-2)', color: 'var(--w-ink-4)', border: '1px solid var(--w-border)', fontWeight: 600 }}
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
    <div
      className="absolute right-0 top-11 z-50 flex flex-col gap-4 p-4 w-52 rounded-2xl shadow-xl animate-fade-in"
      style={{
        background: 'var(--card-bg)',
        backdropFilter: 'var(--card-blur)',
        WebkitBackdropFilter: 'var(--card-blur)',
        border: '1px solid var(--card-border)',
        boxShadow: 'var(--card-shadow)',
      }}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
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
        <p
          className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em]"
          style={{ color: 'var(--w-ink-5)' }}
        >
          Background
        </p>
        <button
          onClick={() => onOpenBgModal?.()}
          className="w-full flex items-center justify-between text-[10px] py-1.5 px-3 rounded-lg font-medium focus:outline-none transition-colors cursor-pointer"
          style={{ background: 'var(--w-surface-2)', color: 'var(--w-ink-4)', border: '1px solid var(--w-border)' }}
        >
          <span>Manage</span>
          <span style={{ color: 'var(--w-ink-5)' }}>›</span>
        </button>
      </div>
    </div>
  );
};


