import React, { useState } from 'react';
import { XLg, BalloonFill, HeartFill, StarFill, PlusLg, PersonHeart } from 'react-bootstrap-icons';
import { AddOccasion } from './AddOccasion';
import { ConfirmButton } from '../../components/ui/ConfirmButton';
import { CANVAS_DIVIDER, OCCASION_ANNIVERSARY_COLOR, OCCASION_SPECIAL_COLOR } from '../../theme/canvas';
import {
  loadManualBirthdays,
  addManualBirthday,
  removeManualBirthday,
} from '../../utilities/googleContacts';
import { typeLabel, avatarColor, avatarLetter } from './utils';
import { IntegrationRow } from '../../components/ui/IntegrationRow';

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
  { label: 'January', short: 'Jan', value: 1 },
  { label: 'February', short: 'Feb', value: 2 },
  { label: 'March', short: 'Mar', value: 3 },
  { label: 'April', short: 'Apr', value: 4 },
  { label: 'May', short: 'May', value: 5 },
  { label: 'June', short: 'Jun', value: 6 },
  { label: 'July', short: 'Jul', value: 7 },
  { label: 'August', short: 'Aug', value: 8 },
  { label: 'September', short: 'Sep', value: 9 },
  { label: 'October', short: 'Oct', value: 10 },
  { label: 'November', short: 'Nov', value: 11 },
  { label: 'December', short: 'Dec', value: 12 },
];

const daysInMonth = (month) => month ? new Date(2000, month, 0).getDate() : 31;

const TYPES = [
  { value: 'birthday', Icon: BalloonFill, iconColor: 'var(--w-accent)', label: 'Birthday' },
  { value: 'anniversary', Icon: HeartFill, iconColor: OCCASION_ANNIVERSARY_COLOR, label: 'Anniversary' },
  { value: 'other', Icon: StarFill, iconColor: OCCASION_SPECIAL_COLOR, label: 'Special' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SmAvatar = ({ name }) => {
  const { bg, fg } = avatarColor(name);
  const letter = avatarLetter(name);
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 text-xs select-none"
      style={{ backgroundColor: bg, color: fg }}
    >
      {letter}
    </div>
  );
};

const TypeIcon = ({ type, size = 11 }) => {
  const t = TYPES.find(x => x.value === type) || TYPES[0];
  return <t.Icon size={size} style={{ color: t.iconColor, flexShrink: 0 }} />;
};

const SectionHeading = ({ children }) => (
  <p className="w-label mb-3">
    {children}
  </p>
);

const inputStyle = {
  background: 'var(--panel-bg)',
  color: 'var(--w-ink-1)',
  border: '1px solid var(--card-border)',
  borderRadius: '0.625rem',
  outline: 'none',
  fontSize: '0.8125rem',
  padding: '0.5rem 0.75rem',
  width: '100%',
};

const selStyle = {
  background: 'var(--panel-bg)',
  color: 'var(--w-ink-1)',
  border: '1px solid var(--card-border)',
  borderRadius: '0.625rem',
  outline: 'none',
  fontSize: '0.8125rem',
  padding: '0.5rem 0.75rem',
};

// ─── Google Contacts section ──────────────────────────────────────────────────

const ContactsSection = () => (
  <IntegrationRow
    icon={<PersonHeart size={12} />}
    label="Google Contacts"
    description="Reads birthdays and anniversaries from your contacts."
    privacyLabel="Stored only in your browser"
  />
);

// ─── Manual entries section ───────────────────────────────────────────────────

const ManualSection = ({ onManualChange }) => {
  const [manual, setManual] = useState(() => loadManualBirthdays());
  const [showModal, setShowModal] = useState(false);

  const handleSave = ({ name, type, month, day }) => {
    addManualBirthday(name, type, month, day);
    const updated = loadManualBirthdays();
    setManual(updated);
    onManualChange(updated);
  };

  const handleRemove = (id) => {
    removeManualBirthday(id);
    const updated = loadManualBirthdays();
    setManual(updated);
    onManualChange(updated);
  };

  return (
    <>
      {showModal && (
        <AddOccasion
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionHeading>Your Occasions</SectionHeading>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1 font-semibold rounded-lg whitespace-nowrap cursor-pointer transition-opacity hover:opacity-85 text-[10px] px-2.5 py-1"
            style={{ background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}
          >
            <PlusLg size={9} />
            Add
          </button>
        </div>

        {/* Existing entries */}
        {manual.length > 0 && (
          <div className="mb-4 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--card-border)' }}>
            {manual.map((e, i) => {
              const monthShort = MONTHS.find(m => m.value === e.month)?.short ?? '';
              return (
                <div
                  key={e.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{
                    background: 'var(--panel-bg)',
                    borderBottom: i < manual.length - 1 ? `1px solid ${CANVAS_DIVIDER}` : 'none',
                  }}
                >
                  <SmAvatar name={e.name} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: 'var(--w-ink-1)' }}>
                      {e.name}
                    </div>
                    <div className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--w-ink-4)' }}>
                      <TypeIcon type={e.type} size={11} />
                      {typeLabel(e.type)} · {monthShort} {e.day}
                    </div>
                  </div>
                  <ConfirmButton
                    onConfirm={() => handleRemove(e.id)}
                    label={`Remove ${e.name}`}
                    className="w-7 h-7 flex items-center justify-center rounded-full transition-all cursor-pointer"
                    style={{ color: 'var(--w-ink-4)', background: 'none' }}
                  >
                    <XLg size={11} />
                  </ConfirmButton>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty hint */}
        {manual.length === 0 && (
          <p className="text-xs leading-relaxed" style={{ color: 'var(--w-ink-4)' }}>
            Add people not in your Google Contacts — family, close friends, or anyone you don't want to miss.
          </p>
        )}
      </div>
    </>
  );
};

// ─── Exported settings component ─────────────────────────────────────────────

export const OccasionsSettings = ({ onManualChange }) => (
  <div className="flex flex-col gap-6 py-1">
    <ContactsSection />
    <div style={{ height: 1, background: CANVAS_DIVIDER }} />
    <ManualSection onManualChange={onManualChange} />
  </div>
);

