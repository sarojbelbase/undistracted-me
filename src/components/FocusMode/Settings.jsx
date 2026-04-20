import React from 'react';
import { useSettingsStore } from '../../store';
import {
  FM_SECTION_CARD_BG, FM_SPINNER_RING, FM_INK_3,
  FM_POPOVER_BG, FM_POPOVER_BORDER, FM_POPOVER_SHADOW,
  FM_DIVIDER, FM_BORDER,
} from './theme';

// Focus mode is always rendered on a dark background — use explicit dark-glass
// tokens rather than theme CSS variables (which may be light-mode in canvas).

const FMLabel = ({ children }) => (
  <p className="text-[11px] font-semibold mb-2" style={{ color: 'var(--w-ink-5)' }}>
    {children}
  </p>
);

const ToggleRow = ({ label, options, value, onChange }) => (
  <div>
    <FMLabel>{label}</FMLabel>
    <div
      className="flex gap-1 p-0.5 rounded-xl"
      style={{ background: FM_SECTION_CARD_BG, border: `1px solid ${FM_SPINNER_RING}` }}
    >
      {options.map(({ id, label: optLabel }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className="flex-1 text-[10px] py-1.5 rounded-lg font-semibold transition-all focus:outline-none cursor-pointer"
          style={value === id
            ? { background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }
            : { background: 'transparent', color: FM_INK_3 }}
        >
          {optLabel}
        </button>
      ))}
    </div>
  </div>
);

const OnOffRow = ({ label, value, onChange }) => (
  <ToggleRow
    label={label}
    options={[{ id: true, label: 'On' }, { id: false, label: 'Off' }]}
    value={value}
    onChange={v => onChange(v === true || v === 'true' || v === 'on')}
  />
);

export const FocusModeSettings = ({ onOpenBgModal }) => {
  const {
    dateFormat, setDateFormat,
    clockFormat, setClockFormat,
    focusSearchBar, setFocusSearchBar,
    focusTasks, setFocusTasks,
  } = useSettingsStore();

  return (
    <section
      aria-label="Focus mode settings"
      className="absolute top-15.5 z-50 flex flex-col gap-4 p-4 w-52 rounded-2xl"
      style={{
        right: 15,
        background: FM_POPOVER_BG,
        backdropFilter: 'blur(24px) saturate(160%)',
        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
        border: `1px solid ${FM_POPOVER_BORDER}`,
        boxShadow: FM_POPOVER_SHADOW,
        animation: 'fm-slide-in 0.18s cubic-bezier(0.16,1,0.3,1) both',
      }}
    >
      {/* Caret pointing up, aligned to gear icon (~17px from right edge of panel) */}
      <div style={{
        position: 'absolute', top: -7, right: 17,
        width: 12, height: 7, overflow: 'hidden',
        pointerEvents: 'none',
      }}>
        <div style={{
          width: 12, height: 12,
          background: FM_POPOVER_BG,
          border: `1px solid ${FM_POPOVER_BORDER}`,
          transform: 'rotate(45deg) translate(2px, 2px)',
        }} />
      </div>
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

      {/* Search bar */}
      <ToggleRow
        label="Search Bar"
        options={[{ id: true, label: 'Show' }, { id: false, label: 'Hide' }]}
        value={focusSearchBar ?? true}
        onChange={setFocusSearchBar}
      />

      {/* Tasks */}
      <ToggleRow
        label="Tasks"
        options={[{ id: true, label: 'Show' }, { id: false, label: 'Hide' }]}
        value={focusTasks ?? true}
        onChange={setFocusTasks}
      />

      {/* Background */}
      <div>
        <FMLabel>Background</FMLabel>
        <button
          onClick={() => onOpenBgModal?.()}
          className="w-full flex items-center justify-between text-[10px] py-1.5 px-3 rounded-xl font-semibold focus:outline-none cursor-pointer transition-opacity hover:opacity-80"
          style={{
            background: FM_DIVIDER,
            border: `1px solid ${FM_BORDER}`,
            color: 'rgba(255,255,255,0.72)',
          }}
        >
          <span>Change background</span>
          <span style={{ color: 'rgba(255,255,255,0.35)' }}>›</span>
        </button>
      </div>
    </section>
  );
};


