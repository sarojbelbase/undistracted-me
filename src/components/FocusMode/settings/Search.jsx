/**
 * Search — Search Bar settings tab content.
 * No Modal wrapper — intended to be rendered inside the unified FocusModeSettings dialog.
 */

import React from 'react';
import { useSettingsStore } from '../../../store';
import {
  SECTION_CARD_STYLE, SECTION_BORDER,
  SectionLabel, ToggleRow, Toggle,
} from '../dialog/shared';
import {
  FM_SURFACE, FM_BORDER, FM_INK_1, FM_INK_3,
  FM_ICON_STROKE_MUTED,
} from '../theme';
import { StarIcon } from '../../../assets/svg/StarIcon';
import { GlobeIcon } from '../../../assets/svg/GlobeIcon';

const IconStar = () => <StarIcon size={14} color={FM_ICON_STROKE_MUTED} />;
const IconGlobe = () => <GlobeIcon size={14} color={FM_ICON_STROKE_MUTED} />;

// ─── Source row (icon badge + label + description + toggle) ──────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export const Search = () => {
  const focusSearchBar = useSettingsStore(s => s.focusSearchBar ?? true);
  const setFocusSearchBar = useSettingsStore(s => s.setFocusSearchBar);
  const focusSearchTopSites = useSettingsStore(s => s.focusSearchTopSites ?? true);
  const setFocusSearchTopSites = useSettingsStore(s => s.setFocusSearchTopSites);
  const focusSearchWeb = useSettingsStore(s => s.focusSearchWeb ?? true);
  const setFocusSearchWeb = useSettingsStore(s => s.setFocusSearchWeb);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* ── Visibility ── */}
      <div>
        <SectionLabel>Visibility</SectionLabel>
        <div style={SECTION_CARD_STYLE}>
          <ToggleRow
            label="Show Search Bar"
            description="Display search in the center of Focus Mode"
            checked={focusSearchBar}
            onChange={setFocusSearchBar}
          />
        </div>
      </div>

      {/* ── Result Sources ── */}
      <div>
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
  );
};
