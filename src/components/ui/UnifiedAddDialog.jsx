/**
 * UnifiedAddDialog — a single add/edit dialog for Events, Countdowns, and
 * Occasions, replacing the three separate AddEvent/AddCountdown/AddOccasion
 * dialogs.
 *
 * The top is a type selector (Event | Countdown | Occasion) that is locked to
 * the type it was launched from; double-clicking the selector unlocks switching.
 * A separator sits between the selector and the lower type-specific form body,
 * which reuses the existing Add* components via their `topContent` slot.
 *
 * Saving is self-contained: it writes to the shared stores (events hook,
 * manual-birthday store, countdown store) and broadcasts refresh events so the
 * widgets re-read their data.
 */
import { useState } from 'react';
import { XLg } from 'react-bootstrap-icons';
import { Modal } from './Modal';
import { useEvents } from '../../hooks/useEvents';
import { addManualBirthday, updateManualBirthday } from '../../utilities/googleContacts';
import { loadCustom, saveCustom } from '../../widgets/countdown/utils';
import { AddEvent } from '../../widgets/events/AddEvent';
import { AddCountdown } from '../../widgets/countdown/AddCountdown';
import { AddOccasion } from '../../widgets/occasions/AddOccasion';

const TYPES = [
  { id: 'event', label: 'Event' },
  { id: 'countdown', label: 'Countdown' },
  { id: 'occasion', label: 'Occasion' },
];

const TypeSelector = ({ active, locked, onChange, onUnlock }) => (
  <div
    style={{
      display: 'flex', gap: 4, padding: 4, borderRadius: 12, flex: 1,
      background: 'var(--panel-bg)', border: '1px solid var(--card-border)',
    }}
  >
    {TYPES.map((t) => {
      const isActive = active === t.id;
      const isLockedOut = locked && !isActive;
      return (
        <button
          key={t.id}
          type="button"
          onClick={() => { if (isLockedOut) return; onChange(t.id); }}
          onDoubleClick={onUnlock}
          title={locked ? 'Double-click to switch type' : undefined}
          style={{
            flex: 1, borderRadius: 8, fontSize: '0.75rem', fontWeight: 600,
            padding: '6px 0', cursor: isLockedOut ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s', border: 'none', opacity: isLockedOut ? 0.4 : 1,
            background: isActive ? 'var(--w-accent)' : 'transparent',
            color: isActive ? 'var(--w-accent-fg)' : 'var(--w-ink-3)',
          }}
        >
          {t.label}
        </button>
      );
    })}
  </div>
);

export const UnifiedAddDialog = ({ type, initial, initialDate, onClose, onSaved }) => {
  const [active, setActive] = useState(type);
  const [locked, setLocked] = useState(true);
  const [, addEvent, , updateEvent] = useEvents();

  // Only the originally-triggered type receives `initial` (edit mode); after
  // unlocking and switching types the dialog starts a fresh "add" of that type.
  const effectiveInitial = active === type ? initial : undefined;

  const handleSaveEvent = (item) => {
    if (effectiveInitial) updateEvent(effectiveInitial.id, item);
    else addEvent(item);
    onSaved?.('event', item);
    onClose();
  };

  const handleSaveOccasion = ({ id, name, type: occType, month, day }) => {
    if (id) updateManualBirthday(id, { name, type: occType, month, day });
    else addManualBirthday(name, occType, month, day);
    window.dispatchEvent(new Event('manual_birthdays_changed'));
    onSaved?.('occasion', { id, name, type: occType, month, day });
    onClose();
  };

  const handleSaveCountdown = (cd) => {
    const list = loadCustom();
    const exists = list.some((c) => c.id === cd.id);
    saveCustom(exists ? list.map((c) => (c.id === cd.id ? cd : c)) : [...list, cd]);

    // Mirror into the events store (same id) so countdowns appear in the Events
    // widget and participate in auto-targeting — matching addCustom's behaviour.
    const mirror = {
      title: cd.title,
      startDate: cd.targetDate,
      startTime: cd.targetTime || '',
      endDate: cd.targetDate,
      endTime: '',
    };
    if (exists) updateEvent(cd.id, mirror);
    else addEvent({ id: cd.id, ...mirror, _fromCountdown: true });

    window.dispatchEvent(new Event('countdown_events_changed'));
    onSaved?.('countdown', cd);
    onClose();
  };

  const topContent = (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px 12px' }}>
        <TypeSelector
          active={active}
          locked={locked}
          onChange={setActive}
          onUnlock={() => setLocked(false)}
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0 transition-colors btn-close cursor-pointer focus:outline-none"
          style={{ color: 'var(--w-ink-3)' }}
        >
          <XLg size={11} />
        </button>
      </div>
      <div style={{ height: 1, background: 'var(--card-border)' }} />
    </div>
  );

  if (active === 'event') {
    return (
      <AddEvent
        topContent={topContent}
        initial={effectiveInitial}
        initialDate={effectiveInitial ? undefined : initialDate}
        onSave={handleSaveEvent}
        onClose={onClose}
      />
    );
  }

  if (active === 'countdown') {
    return (
      <AddCountdown
        topContent={topContent}
        initial={effectiveInitial}
        onSave={handleSaveCountdown}
        onClose={onClose}
      />
    );
  }

  return (
    <AddOccasion
      topContent={topContent}
      initial={effectiveInitial}
      onSave={handleSaveOccasion}
      onClose={onClose}
    />
  );
};
