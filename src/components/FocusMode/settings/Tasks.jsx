/**
 * Tasks — Google Tasks settings tab content.
 * No Modal wrapper — intended to be rendered inside the unified FocusModeSettings dialog.
 */

import React from 'react';
import { useSettingsStore } from '../../../store';
import {
  SECTION_CARD_STYLE,
  SectionLabel, ToggleRow, AccountSection, IconGoogle,
} from '../dialog/shared';

// ─── Component ────────────────────────────────────────────────────────────────

export const Tasks = () => {
  const focusTasks = useSettingsStore(s => s.focusTasks ?? true);
  const setFocusTasks = useSettingsStore(s => s.setFocusTasks);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* ── Google account ── */}
      <AccountSection
        icon={<IconGoogle />}
        label="Google Tasks"
        description="Add, complete, and track tasks from your Google Tasks lists."
        privacyLabel="Nothing stored on servers"
      />

      {/* ── Visibility ── */}
      <div>
        <SectionLabel>Visibility</SectionLabel>
        <div style={SECTION_CARD_STYLE}>
          <ToggleRow
            label="Show in Focus Mode"
            description="Display the Tasks pill in the bottom-right corner"
            checked={focusTasks}
            onChange={setFocusTasks}
          />
        </div>
      </div>

    </div>
  );
};
