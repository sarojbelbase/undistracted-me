/**
 * SearchBarDialog — Search Bar settings modal for Focus Mode.
 *
 * Sections:
 *   • Visibility  — Show/hide the search bar in Focus Mode
 *   • Sources     — Toggle Top Sites, Web Suggestions
 *
 * Uses shared dark-glass dialog primitives from ./shared.
 */

import React from 'react';
import { Modal } from '../../ui/Modal';
import { useSettingsStore } from '../../../store';
import {
  DIALOG_STYLE, SECTION_CARD_STYLE, SECTION_BORDER,
  DialogHeader, SectionLabel, ToggleRow, Toggle, AccountSection,
} from './shared';
import {
  FM_SURFACE, FM_BORDER, FM_INK_1, FM_INK_3,
  FM_ICON_STROKE, FM_ICON_STROKE_MUTED,
} from '../theme';

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="11" cy="11" r="7.5" stroke={FM_ICON_STROKE} strokeWidth="2" />
    <line x1="16.5" y1="16.5" x2="22" y2="22" stroke={FM_ICON_STROKE} strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

const IconStar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      stroke={FM_ICON_STROKE_MUTED} strokeWidth="1.8" strokeLinejoin="round"
    />
  </svg>
);

const IconGlobe = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke={FM_ICON_STROKE_MUTED} strokeWidth="1.8" />
    <path d="M12 3c-3 4-3 14 0 18M12 3c3 4 3 14 0 18M3 12h18" stroke={FM_ICON_STROKE_MUTED} strokeWidth="1.5" />
  </svg>
);

// ─── Source row (icon + label + description + toggle) ─────────────────────────
//
// Same shape as ToggleRow but with a 28×28 icon badge on the left.

const SourceRow = ({ icon, label, description, checked, onChange, borderTop = false }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 14px',
    borderTop: borderTop ? SECTION_BORDER : 'none',
  }}>
    <div style={{
      width: 28, height: 28, borderRadius: 7, flexShrink: 0,
      background: FM_SURFACE,
      border: `1px solid ${FM_BORDER}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: FM_INK_1, lineHeight: '1.3' }}>
        {label}
      </div>
      <div style={{ fontSize: 11, color: FM_INK_3, marginTop: 1.5, lineHeight: '1.4' }}>
        {description}
      </div>
    </div>
    <Toggle checked={checked} onChange={onChange} />
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

export const SearchBarDialog = ({
  onClose,
}) => {
  const focusSearchBar = useSettingsStore(s => s.focusSearchBar ?? true);
  const setFocusSearchBar = useSettingsStore(s => s.setFocusSearchBar);
  const focusSearchTopSites = useSettingsStore(s => s.focusSearchTopSites ?? true);
  const setFocusSearchTopSites = useSettingsStore(s => s.setFocusSearchTopSites);
  const focusSearchWeb = useSettingsStore(s => s.focusSearchWeb ?? true);
  const setFocusSearchWeb = useSettingsStore(s => s.setFocusSearchWeb);

  return (
    <Modal onClose={onClose} style={{ width: 380, ...DIALOG_STYLE }} ariaLabel="Search bar settings">
      <DialogHeader
        icon={<IconSearch />}
        title="Search Bar"
        subtitle="Configure what appears in search results"
        onClose={onClose}
      />

      <div style={{ padding: '16px 18px 18px' }}>

        {/* ── Visibility ── */}
        <SectionLabel>Visibility</SectionLabel>
        <div style={SECTION_CARD_STYLE}>
          <ToggleRow
            label="Show Search Bar"
            description="Display search in the center of Focus Mode"
            checked={focusSearchBar}
            onChange={setFocusSearchBar}
          />
        </div>

        {/* ── Result Sources ── */}
        <div style={{ marginTop: 18 }}>
          <SectionLabel>Include in results</SectionLabel>
          <div style={SECTION_CARD_STYLE}>
            <SourceRow
              icon={<IconStar />}
              label="Top Sites"
              description="Your most-visited sites when the bar is empty"
              checked={focusSearchTopSites}
              onChange={setFocusSearchTopSites}
            />
            <SourceRow
              borderTop
              icon={<IconGlobe />}
              label="Web Suggestions"
              description="Autocomplete suggestions from the web"
              checked={focusSearchWeb}
              onChange={setFocusSearchWeb}
            />
          </div>
        </div>

      </div>
    </Modal>
  );
};
