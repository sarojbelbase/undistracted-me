import { useState, useEffect, useRef } from 'react';
import { XLg, CalendarEvent, Clock, HourglassSplit } from 'react-bootstrap-icons';
import { SegmentedDateTime } from '../../components/ui/SegmentedDateTime';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { SettingsInput } from '../../components/ui/SettingsInput';
import { CANVAS_BORDER_SOFT } from '../../theme/canvas';
import { Modal } from '../../components/ui/Modal';
import {
  EMPTY_FORM, DATE_CHIPS, DURATION_PILLS,
  getDateOffset, applyDuration, todayStr
} from './utils';

export const AddEvent = ({ onSave, onClose, initialDate }) => {
  const startDate = initialDate ?? todayStr();
  const today = todayStr();
  const tomorrow = getDateOffset(1);
  let initialChip = 'custom';
  if (startDate === today) initialChip = 'today';
  else if (startDate === tomorrow) initialChip = 'tomorrow';

  const [form, setForm] = useState({ ...EMPTY_FORM, startDate });
  const [dateChip, setDateChip] = useState(initialChip);
  const [durType, setDurType] = useState(null);
  const titleRef = useRef(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const titleValid = form.title.trim().length > 0;

  const updateStart = (sd, st) => {
    setForm(f => {
      const next = { ...f, startDate: sd, startTime: st ?? f.startTime };
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
    if (!titleValid) return;
    onSave(form);
    onClose();
  };

  const dateOptions = DATE_CHIPS.map(c => ({ label: c.label, value: c.key }));
  const durOptions = DURATION_PILLS.map(p => ({ label: p.label, value: p.mins === null ? 'custom' : String(p.mins) }));
  let durValue = null;
  if (durType === 'custom') durValue = 'custom';
  else if (durType !== null) durValue = String(durType);

  const headerIconStyle = {
    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
    background: 'var(--w-accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  return (
    <Modal onClose={onClose} style={{ width: 340 }} ariaLabel="New Event">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={headerIconStyle}>
            <CalendarEvent size={14} style={{ color: 'var(--w-accent-fg)' }} />
          </div>
          <div>
            <div className="w-heading" style={{ fontSize: '15px' }}>New Event</div>
            <div className="w-caption" style={{ marginTop: 1 }}>Add to your schedule</div>
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
          ref={titleRef}
          id="event-title"
          name="event-title"
          autoFocus
          type="text"
          placeholder="What's happening?"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && titleValid) handleSave(); }}
          wrapperStyle={{ height: 44 }}
          style={{ fontSize: '14px', fontWeight: 500 }}
        />

        {/* Starts at */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
            <Clock size={10} style={{ color: 'var(--w-ink-3)' }} />
            <span className="w-label" style={{ color: 'var(--w-ink-3)' }}>Starts at</span>
          </div>
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

        {/* Ends at */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
            <HourglassSplit size={10} style={{ color: 'var(--w-ink-3)' }} />
            <span className="w-label" style={{ color: 'var(--w-ink-3)' }}>Ends at</span>
          </div>
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
            border: `1px solid ${CANVAS_BORDER_SOFT}`, background: 'transparent',
            color: 'var(--w-ink-2)', transition: 'all 0.15s',
          }}
        >Cancel</button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!titleValid}
          style={{
            flex: 2, padding: '9px 0', borderRadius: 10,
            fontSize: '13px', fontWeight: 600,
            border: 'none', background: 'var(--w-accent)', color: 'var(--w-accent-fg)',
            opacity: titleValid ? 1 : 0.4, cursor: titleValid ? 'pointer' : 'default',
            transition: 'all 0.15s',
          }}
        >Save Event</button>
      </div>
    </Modal>
  );
};
