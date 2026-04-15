import { useState } from 'react';
import { XLg, CalendarEvent, Clock, HourglassSplit } from 'react-bootstrap-icons';
import { SegmentedDateTime } from '../../components/ui/SegmentedDateTime';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { SettingsInput } from '../../components/ui/SettingsInput';
import { Modal } from '../../components/ui/Modal';
import {
  EMPTY_FORM, DATE_CHIPS, DURATION_PILLS,
  getDateOffset, applyDuration, todayStr
} from './utils';

export const CreateModal = ({ onSave, onClose }) => {
  const [form, setForm] = useState({ ...EMPTY_FORM, startDate: todayStr() });
  const [dateChip, setDateChip] = useState('today');
  const [durType, setDurType] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.title.trim() && form.startDate;

  const updateStart = (startDate, startTime) => {
    setForm(f => {
      const next = { ...f, startDate, startTime: startTime ?? f.startTime };
      if (typeof durType === 'number') {
        return { ...next, ...applyDuration(next.startDate, next.startTime, durType) };
      }
      return next;
    });
  };

  const handleDateChip = (chip) => {
    setDateChip(chip.key);
    if (chip.key !== 'custom') {
      updateStart(getDateOffset(chip.offset), form.startTime);
    }
  };

  const handleDurationPill = (p) => {
    if (p.mins === null) {
      setDurType('custom');
    } else {
      setDurType(p.mins);
      setForm(f => ({ ...f, ...applyDuration(f.startDate, f.startTime, p.mins) }));
    }
  };

  const handleSave = () => {
    if (!valid) return;
    onSave(form);
    onClose();
  };

  const sectionLabel = (icon, text) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
      {icon}
      <span className="w-label" style={{ color: 'var(--w-ink-3)' }}>{text}</span>
    </div>
  );

  const dateOptions = DATE_CHIPS.map(c => ({ label: c.label, value: c.key }));
  const durOptions = DURATION_PILLS.map(p => ({ label: p.label, value: p.mins === null ? 'custom' : String(p.mins) }));
  let durValue = null;
  if (durType === 'custom') {
    durValue = 'custom';
  } else if (durType !== null) {
    durValue = String(durType);
  }

  return (
    <Modal onClose={onClose} style={{ width: 340 }} ariaLabel="New Event">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: 'var(--w-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CalendarEvent size={14} style={{ color: 'var(--w-accent-fg)' }} />
          </div>
          <div>
            <div className="w-heading" style={{ fontSize: '15px' }}>New Event</div>
            <div className="w-caption" style={{ marginTop: 1 }}>Add to your calendar</div>
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

      <div style={{ height: 1, background: 'var(--card-border)' }} />

      {/* Body */}
      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Title */}
        <SettingsInput
          autoFocus
          type="text"
          placeholder="What's happening?"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          wrapperStyle={{ height: 44 }}
          style={{ fontSize: '14px', fontWeight: 500 }}
        />

        {/* Starts at */}
        <div>
          {sectionLabel(<Clock size={10} style={{ color: 'var(--w-ink-3)' }} />, 'Starts at')}

          <SegmentedControl
            options={dateOptions}
            value={dateChip}
            onChange={(key) => handleDateChip(DATE_CHIPS.find(c => c.key === key))}
          />

          <div style={{ marginTop: 10 }}>
            <SegmentedDateTime
              mode={dateChip === 'custom' ? 'datetime' : 'time'}
              date={form.startDate}
              time={form.startTime}
              onDateChange={(d) => updateStart(d, form.startTime)}
              onTimeChange={(t) => updateStart(form.startDate, t)}
            />
          </div>
        </div>

        {/* Ends at (duration) */}
        <div>
          {sectionLabel(<HourglassSplit size={10} style={{ color: 'var(--w-ink-3)' }} />, 'Ends at')}
          <SegmentedControl
            options={durOptions}
            value={durValue}
            onChange={(val) => handleDurationPill(DURATION_PILLS.find(p => (p.mins === null ? 'custom' : String(p.mins)) === val))}
          />
          {durType === 'custom' && (
            <div style={{ marginTop: 10 }}>
              <SegmentedDateTime
                mode="datetime"
                date={form.endDate}
                time={form.endTime}
                onDateChange={(d) => setForm(f => ({ ...f, endDate: d }))}
                onTimeChange={(t) => setForm(f => ({ ...f, endTime: t }))}
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ height: 1, background: 'var(--card-border)' }} />
      <div style={{ display: 'flex', gap: 8, padding: '14px 20px' }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            flex: 1, padding: '9px 0', borderRadius: 10,
            fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            border: '1px solid rgba(0,0,0,0.12)', background: 'transparent',
            color: 'var(--w-ink-2)', transition: 'all 0.15s',
          }}
        >Cancel</button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!valid}
          style={{
            flex: 2, padding: '9px 0', borderRadius: 10,
            fontSize: '13px', fontWeight: 600,
            border: 'none', background: 'var(--w-accent)', color: 'var(--w-accent-fg)',
            opacity: valid ? 1 : 0.4, cursor: valid ? 'pointer' : 'default',
            transition: 'all 0.15s',
          }}
        >Save Event</button>
      </div>
    </Modal>
  );
};
