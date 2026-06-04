import React, { useState } from 'react';
import { BalloonFill, HeartFill, StarFill, PlusLg, PersonHeart } from 'react-bootstrap-icons';
import { AddOccasion } from './AddOccasion';
import { ListPanel, ListPanelRow } from '../../components/ui/ListPanel';
import { OCCASION_ANNIVERSARY_COLOR, OCCASION_SPECIAL_COLOR } from '../../theme/canvas';
import {
  loadManualBirthdays,
  addManualBirthday,
  removeManualBirthday,
} from '../../utilities/googleContacts';
import { typeLabel, avatarColor, avatarLetter } from './utils';
import { IntegrationRow } from '../../components/ui/IntegrationRow';
import { useGoogleAccountStore } from '../../store/useGoogleAccountStore';

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

const SmAvatar = ({ name, photoUrl }) => {
  const { bg, fg } = avatarColor(name);
  const letter = avatarLetter(name);
  const [imgFailed, setImgFailed] = useState(false);

  if (photoUrl && !imgFailed) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className="w-8 h-8 rounded-full object-cover shrink-0"
        onError={() => setImgFailed(true)}
      />
    );
  }

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
  const googleConnected = useGoogleAccountStore(s => s.connected);
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
          <ListPanel
            items={manual}
            className="mb-4"
            renderItem={(e) => {
              const monthShort = MONTHS.find(m => m.value === e.month)?.short ?? '';
              return (
                <ListPanelRow
                  key={e.id}
                  avatar={<SmAvatar name={e.name} photoUrl={e.photoUrl} />}
                  title={e.name}
                  meta={[
                    { text: typeLabel(e.type) },
                    { text: `${monthShort} ${e.day}` },
                  ]}
                  onDelete={() => handleRemove(e.id)}
                  deleteLabel={`Remove ${e.name}`}
                />
              );
            }}
          />
        )}

        {/* Empty hint */}
        {manual.length === 0 && (
          <p className="text-xs leading-relaxed" style={{ color: 'var(--w-ink-4)' }}>
            {googleConnected
              ? <>Tap <strong style={{ color: 'var(--w-ink-2)' }}>+ Add Countdown</strong> to include people who aren't in your Google Contacts.</>
              : <>Connect <strong style={{ color: 'var(--w-ink-2)' }}>Google Contacts</strong> above to sync birthdays automatically or tap <strong style={{ color: 'var(--w-ink-2)' }}>+ Add</strong> to add occasions manually.</>
            }
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
    <div style={{ height: 1, background: 'var(--card-border)' }} />
    <ManualSection onManualChange={onManualChange} />
  </div>
);

