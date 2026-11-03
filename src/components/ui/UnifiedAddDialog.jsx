/**
 * UnifiedAddDialog — a single add/edit dialog for Events, Countdowns, and
 * Occasions, replacing the three separate AddEvent/AddCountdown/AddOccasion
 * dialogs.
 *
 * The dialog owns the modal shell, a standard header (icon + title + subtitle +
 * close), and a type selector (Event | Countdown | Occasion) locked to the type
 * it was launched from — double-clicking the selector unlocks switching. The
 * lower type-specific form body is reused from the Add* components, which now
 * render only their form + footer (no modal chrome).
 *
 * Switching type slides the form body within the SAME dialog canvas rather than
 * unmounting one modal and mounting another, so the frame stays put.
 *
 * Saving is self-contained: it writes to the shared stores (events hook,
 * manual-birthday store, countdown store) and broadcasts refresh events so the
 * widgets re-read their data.
 */
import { useState } from 'react';
import { XLg, CalendarEvent, HourglassSplit, PersonHeart } from 'react-bootstrap-icons';
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

const TYPE_META = {
  event: {
    label: 'Event',
    Icon: CalendarEvent,
    addSubtitle: 'Add to your schedule',
    editSubtitle: 'Update your schedule',
  },
  countdown: {
    label: 'Countdown',
    Icon: HourglassSplit,
    addSubtitle: 'What are you tracking?',
    editSubtitle: 'What are you tracking?',
  },
  occasion: {
    label: 'Occasion',
    Icon: PersonHeart,
    addSubtitle: 'Add a birthday or anniversary',
    editSubtitle: 'Update a birthday or anniversary',
  },
};

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
  // Slide direction for the type-switch animation; null = no animation (initial mount).
  const [slideDir, setSlideDir] = useState(null);
  const [, addEvent, , updateEvent] = useEvents();

  // Only the originally-triggered type receives `initial` (edit mode); after
  // unlocking and switching types the dialog starts a fresh "add" of that type.
  const effectiveInitial = active === type ? initial : undefined;
  const isEdit = active === type && !!initial;
  const meta = TYPE_META[active];
  const title = isEdit ? `Edit ${meta.label}` : `New ${meta.label}`;
  const subtitle = isEdit ? meta.editSubtitle : meta.addSubtitle;

  const switchType = (id) => {
    if (id === active) return;
    const nextIdx = TYPES.findIndex((t) => t.id === id);
    const curIdx = TYPES.findIndex((t) => t.id === active);
    setSlideDir(nextIdx > curIdx ? 1 : -1);
    setActive(id);
  };

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

  const iconStyle = {
    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
    background: 'var(--w-accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  const slideClass = slideDir === null ? '' : (slideDir >= 0 ? 'fm-form-slide-next' : 'fm-form-slide-prev');

  return (
    <Modal onClose={onClose} style={{ width: 340 }} ariaLabel={title}>
      {/* Header — matches the standard Add* dialogs (icon + title + subtitle) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={iconStyle}>
            <meta.Icon size={14} style={{ color: 'var(--w-accent-fg)' }} />
          </div>
          <div>
            <div className="w-heading" style={{ fontSize: '15px' }}>{title}</div>
            <div className="w-caption" style={{ marginTop: 1 }}>{subtitle}</div>
          </div>
        </div>
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

      {/* Type selector */}
      <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center' }}>
        <TypeSelector
          active={active}
          locked={locked}
          onChange={switchType}
          onUnlock={() => setLocked(false)}
        />
      </div>

      <div style={{ height: 1, background: 'var(--card-border)' }} />

      {/* Type-specific form body — keyed by active type so switching slides
          within this same dialog canvas (see _animations.scss) */}
      <div key={active} className={slideClass}>
        {active === 'event' && (
          <AddEvent
            initial={effectiveInitial}
            initialDate={effectiveInitial ? undefined : initialDate}
            onSave={handleSaveEvent}
            onCancel={onClose}
          />
        )}
        {active === 'countdown' && (
          <AddCountdown
            initial={effectiveInitial}
            onSave={handleSaveCountdown}
            onCancel={onClose}
          />
        )}
        {active === 'occasion' && (
          <AddOccasion
            initial={effectiveInitial}
            onSave={handleSaveOccasion}
            onCancel={onClose}
          />
        )}
      </div>
    </Modal>
  );
};
