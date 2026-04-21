import React from 'react';
import { useSettingsStore } from '../../../store';
import {
  FM_CARD_BG, FM_CARD_BLUR, FM_CARD_BORDER, FM_CARD_SHADOW,
  FM_SURFACE, FM_BORDER, FM_INK_1, FM_INK_3, FM_INK_4,
} from '../theme';

// Focus mode settings — always dark glass, never inherits canvas theme state.

const FMLabel = ({ children }) => (
  <p className="text-[11px] font-semibold mb-2" style={{ color: FM_INK_3 }}>
    {children}
  </p>
);

const ToggleRow = ({ label, options, value, onChange }) => (
  <div>
    <FMLabel>{label}</FMLabel>
    <div
      className="flex gap-1 p-0.5 rounded-xl"
      style={{ background: FM_SURFACE, border: `1px solid ${FM_BORDER}` }}
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

export const FocusModeSettings = ({ onOpenBgModal, onOpenTasksDialog, onOpenSearchDialog }) => {
  const {
    dateFormat, setDateFormat,
    clockFormat, setClockFormat,
  } = useSettingsStore();

  return (
    <section
      aria-label="Focus mode settings"
      className="absolute top-15.5 z-50 flex flex-col gap-4 p-4 w-52 rounded-2xl"
      style={{
        right: 15,
        background: FM_CARD_BG,
        backdropFilter: FM_CARD_BLUR,
        WebkitBackdropFilter: FM_CARD_BLUR,
        border: `1px solid ${FM_CARD_BORDER}`,
        boxShadow: FM_CARD_SHADOW,
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
          background: FM_CARD_BG,
          border: `1px solid ${FM_CARD_BORDER}`,
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
      <div>
        <FMLabel>Search Bar</FMLabel>
        <button
          onClick={() => onOpenSearchDialog?.()}
          className="w-full flex items-center justify-between text-[10px] py-1.5 px-3 rounded-lg font-semibold focus:outline-none cursor-pointer transition-opacity hover:opacity-80"
          style={{ background: FM_SURFACE, border: `1px solid ${FM_BORDER}`, color: FM_INK_1 }}
        >
          <span>Configure search</span>
          <span style={{ color: FM_INK_4 }}>›</span>
        </button>
      </div>

      {/* Tasks */}
      <div>
        <FMLabel>Tasks</FMLabel>
        <button
          onClick={() => onOpenTasksDialog?.()}
          className="w-full flex items-center justify-between text-[10px] py-1.5 px-3 rounded-lg font-semibold focus:outline-none cursor-pointer transition-opacity hover:opacity-80"
          style={{ background: FM_SURFACE, border: `1px solid ${FM_BORDER}`, color: FM_INK_1 }}
        >
          <span>Configure tasks</span>
          <span style={{ color: FM_INK_4 }}>›</span>
        </button>
      </div>

      {/* Background */}
      <div>
        <FMLabel>Background</FMLabel>
        <button
          onClick={() => onOpenBgModal?.()}
          className="w-full flex items-center justify-between text-[10px] py-1.5 px-3 rounded-lg font-semibold focus:outline-none cursor-pointer transition-opacity hover:opacity-80"
          style={{ background: FM_SURFACE, border: `1px solid ${FM_BORDER}`, color: FM_INK_1 }}
        >
          <span>Change background</span>
          <span style={{ color: FM_INK_4 }}>›</span>
        </button>
      </div>
    </section>
  );
};

