/**
 * PanelsDialog — Manage which panels appear in the Focus Mode left zone.
 *
 * Each row shows an icon, panel name, a brief description, and a toggle.
 * Preferences are persisted in useSettingsStore.focusPanels (Zustand persist).
 */

import React from 'react';
import { Modal } from '../../ui/Modal';
import { useSettingsStore } from '../../../store';
import {
  DIALOG_STYLE, SECTION_CARD_STYLE, SECTION_BORDER,
  DialogHeader, SectionLabel, Toggle,
} from './shared';
import {
  FM_INK_1, FM_INK_3, FM_INK_4,
  FM_SURFACE, FM_BORDER,
  FM_ICON_STROKE, FM_ICON_STROKE_MUTED,
} from '../theme';

// ─── Panel registry ───────────────────────────────────────────────────────────
// Order here drives the visual order in the dialog (mirrors ZONES.left order).

const PANEL_META = [
  {
    key: 'pomodoro',
    label: 'Pomodoro',
    description: 'Timer and progress bar while a session is running',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke={FM_ICON_STROKE} strokeWidth="1.8" />
        <polyline points="12,7 12,12 15,14" stroke={FM_ICON_STROKE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'event',
    label: 'Next Event',
    description: 'Upcoming event from your calendar or local list',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="4" width="18" height="17" rx="2" stroke={FM_ICON_STROKE} strokeWidth="1.8" />
        <line x1="3" y1="9" x2="21" y2="9" stroke={FM_ICON_STROKE} strokeWidth="1.6" />
        <line x1="8" y1="2" x2="8" y2="6" stroke={FM_ICON_STROKE} strokeWidth="1.8" strokeLinecap="round" />
        <line x1="16" y1="2" x2="16" y2="6" stroke={FM_ICON_STROKE} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'occasion',
    label: 'Occasions',
    description: 'Upcoming birthdays and anniversaries',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2C8 2 6 6 12 8C18 6 16 2 12 2Z" stroke={FM_ICON_STROKE} strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M3 11h18v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9Z" stroke={FM_ICON_STROKE} strokeWidth="1.8" />
        <line x1="12" y1="8" x2="12" y2="11" stroke={FM_ICON_STROKE} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: 'stock',
    label: 'NEPSE Stock',
    description: 'Live NEPSE price, sparkline and OHL data',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <polyline points="4,16 8,10 12,13 16,7 20,9" stroke={FM_ICON_STROKE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: 'spotify',
    label: 'Music Player',
    description: 'Spotify or browser media session (YouTube, SoundCloud…)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke={FM_ICON_STROKE} strokeWidth="1.8" />
        <circle cx="12" cy="12" r="3" fill={FM_ICON_STROKE_MUTED} />
        <path d="M5.5 8C7 6.5 9 5.5 12 5.5" stroke={FM_ICON_STROKE} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M3.5 13.5C4.5 17 8 19.5 12 19.5" stroke={FM_ICON_STROKE_MUTED} strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
];

// ─── Panel row ────────────────────────────────────────────────────────────────

const PanelRow = ({ panel, enabled, onToggle, borderTop }) => (
  <div
    style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px',
      borderTop: borderTop ? SECTION_BORDER : 'none',
      transition: 'opacity 0.15s ease',
    }}
  >
    <div style={{
      width: 28, height: 28, borderRadius: 7, flexShrink: 0,
      background: FM_SURFACE,
      border: `1px solid ${FM_BORDER}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: enabled ? 1 : 0.5,
      transition: 'opacity 0.15s ease',
    }}>
      {panel.icon}
    </div>
    <div style={{ flex: 1, minWidth: 0, opacity: enabled ? 1 : 0.55, transition: 'opacity 0.15s ease' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: FM_INK_1, lineHeight: '1.3' }}>
        {panel.label}
      </div>
      <div style={{ fontSize: 11, color: FM_INK_3, marginTop: 1.5, lineHeight: '1.4' }}>
        {panel.description}
      </div>
    </div>
    <Toggle checked={enabled} onChange={onToggle} />
  </div>
);

// ─── Header icon ─────────────────────────────────────────────────────────────

const IconPanels = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="2" y="3" width="9" height="18" rx="2" stroke={FM_ICON_STROKE} strokeWidth="1.9" />
    <rect x="13" y="3" width="9" height="8" rx="2" stroke={FM_ICON_STROKE} strokeWidth="1.9" />
    <rect x="13" y="13" width="9" height="8" rx="2" stroke={FM_ICON_STROKE_MUTED} strokeWidth="1.7" />
  </svg>
);

// ─── Main component ───────────────────────────────────────────────────────────

export const PanelsDialog = ({ onClose }) => {
  const focusPanels = useSettingsStore(s => s.focusPanels ?? {});
  const setFocusPanelEnabled = useSettingsStore(s => s.setFocusPanelEnabled);

  const allOn = PANEL_META.every(p => focusPanels[p.key] ?? true);

  const toggleAll = () => {
    const next = !allOn;
    PANEL_META.forEach(p => setFocusPanelEnabled(p.key, next));
  };

  return (
    <Modal onClose={onClose} style={{ width: 360, ...DIALOG_STYLE }} ariaLabel="Manage panels">
      <DialogHeader
        icon={<IconPanels />}
        title="Manage Panels"
        subtitle="Choose which panels appear on the left in Focus Mode"
        onClose={onClose}
      />

      <div style={{ padding: '16px 18px 18px' }}>

        {/* ── Panels list ── */}
        <SectionLabel>Left zone panels</SectionLabel>
        <div style={SECTION_CARD_STYLE}>
          {PANEL_META.map((panel, i) => (
            <PanelRow
              key={panel.key}
              panel={panel}
              enabled={focusPanels[panel.key] ?? true}
              onToggle={v => setFocusPanelEnabled(panel.key, v)}
              borderTop={i > 0}
            />
          ))}
        </div>

        {/* ── Toggle all ── */}
        <button
          type="button"
          onClick={toggleAll}
          style={{
            marginTop: 12,
            width: '100%',
            padding: '7px 0',
            background: FM_SURFACE,
            border: `1px solid ${FM_BORDER}`,
            borderRadius: 9,
            fontSize: 11,
            fontWeight: 600,
            color: FM_INK_3,
            cursor: 'pointer',
            transition: 'opacity 0.15s ease',
            letterSpacing: '0.02em',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
        >
          {allOn ? 'Hide all panels' : 'Show all panels'}
        </button>

        {/* ── Hint ── */}
        <p style={{
          marginTop: 10,
          fontSize: 10.5,
          color: FM_INK_4,
          lineHeight: '1.5',
          textAlign: 'center',
        }}>
          Panels with no data (e.g. no running Pomodoro) are hidden automatically.
        </p>
      </div>
    </Modal>
  );
};
