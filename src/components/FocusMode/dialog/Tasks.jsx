/**
 * TasksDialog - Google Tasks connection and settings modal for Focus Mode.
 * Uses shared dialog primitives from ./shared.
 */

import React from 'react';
import { Modal } from '../../ui/Modal';
import { useSettingsStore } from '../../../store';
import {
  DIALOG_STYLE, SECTION_CARD_STYLE,
  DialogHeader, SectionLabel, ToggleRow, AccountSection,
  IconGoogle,
} from './shared';

export const TasksDialog = ({ onClose }) => {
  const focusTasks = useSettingsStore(s => s.focusTasks ?? true);
  const setFocusTasks = useSettingsStore(s => s.setFocusTasks);
  return (
    <Modal onClose={onClose} style={{ width: 360, ...DIALOG_STYLE }} ariaLabel="Google Tasks settings">
      <DialogHeader icon={<IconGoogle />} title="Google Tasks"
        subtitle="Manage tasks directly from Focus Mode"
        onClose={onClose} />
      <div style={{ padding: "16px 18px 18px" }}>
        <AccountSection
          icon={<IconGoogle />}
          label="Google Tasks"
          description="Add, complete, and track tasks from your Google Tasks lists."
          privacyLabel="Nothing stored on servers"
        />
        <div style={{ marginTop: 18 }}>
          <SectionLabel>Visibility</SectionLabel>
          <div style={SECTION_CARD_STYLE}>
            <ToggleRow label="Show in Focus Mode" description="Display the Tasks pill in the bottom-right corner"
              checked={focusTasks} onChange={setFocusTasks} />
          </div>
        </div>
      </div>
    </Modal>
  );
};
