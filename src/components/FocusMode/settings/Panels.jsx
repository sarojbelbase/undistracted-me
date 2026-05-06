/**
 * Panels — Manage Focus Mode left-zone panels tab content.
 * No Modal wrapper — intended to be rendered inside the unified FocusModeSettings dialog.
 */

import React from 'react';
import { useSettingsStore } from '../../../store';
import {
  SECTION_CARD_STYLE, SECTION_BORDER,
  SectionLabel, Toggle,
} from '../dialog/shared';
import {
  FM_INK_1, FM_INK_3, FM_INK_4,
  FM_SURFACE, FM_BORDER,
  FM_ICON_STROKE, FM_ICON_STROKE_MUTED,
} from '../theme';
import { ClockIcon } from '../../../assets/svg/ClockIcon';
import { CalendarIcon } from '../../../assets/svg/CalendarIcon';
import { OccasionsIcon } from '../../../assets/svg/OccasionsIcon';
import { StockChartIcon } from '../../../assets/svg/StockChartIcon';
import { MusicDiscIcon } from '../../../assets/svg/MusicDiscIcon';

// ─── Panel registry ───────────────────────────────────────────────────────────

const PANEL_META = [
  {
    key: 'pomodoro',
    label: 'Pomodoro',
    description: 'Timer and progress bar while a session is running',
    icon: <ClockIcon size={14} color={FM_ICON_STROKE} />,
  },
  {
    key: 'event',
    label: 'Next Event',
    description: 'Upcoming event from your calendar or local list',
    icon: <CalendarIcon size={14} color={FM_ICON_STROKE} />,
  },
  {
    key: 'occasion',
    label: 'Occasions',
    description: 'Upcoming birthdays and anniversaries',
    icon: <OccasionsIcon size={14} color={FM_ICON_STROKE} />,
  },
  {
    key: 'stock',
    label: 'NEPSE Stock',
    description: 'Live NEPSE price, sparkline and OHL data',
    icon: <StockChartIcon size={14} color={FM_ICON_STROKE} />,
  },
  {
    key: 'spotify',
    label: 'Music Player',
    description: 'Spotify or browser media session (YouTube, SoundCloud…)',
    icon: <MusicDiscIcon size={14} color={FM_ICON_STROKE} mutedColor={FM_ICON_STROKE_MUTED} />,
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

// ─── Component ────────────────────────────────────────────────────────────────

export const Panels = () => {
  const focusPanels = useSettingsStore(s => s.focusPanels ?? {});
  const setFocusPanelEnabled = useSettingsStore(s => s.setFocusPanelEnabled);

  const allOn = PANEL_META.every(p => focusPanels[p.key] ?? true);

  const toggleAll = () => {
    const next = !allOn;
    PANEL_META.forEach(p => setFocusPanelEnabled(p.key, next));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      <div>
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
      </div>

      {/* ── Toggle all ── */}
      <button
        type="button"
        onClick={toggleAll}
        style={{
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

      <p style={{
        fontSize: 10.5, color: FM_INK_4, lineHeight: '1.5', textAlign: 'center', margin: 0,
      }}>
        Panels with no data (e.g. no running Pomodoro) are hidden automatically.
      </p>
    </div>
  );
};
