import { useState, useEffect, useRef } from 'react';
import { Clock, HourglassSplit } from 'react-bootstrap-icons';
import { SegmentedDateTime } from '../../components/ui/SegmentedDateTime';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { todayStr } from '../../utilities';
import {
  EMPTY_FORM, DATE_CHIPS, DURATION_PILLS,
  getDateOffset, applyDuration,
} from './utils';

/**
 * AddEvent: event form body + footer only (no modal chrome). Rendered inside
 * UnifiedAddDialog, which supplies the header, type selector and Modal shell.
 */
export const AddEvent = ({ onSave, onCancel, initialDate, initial }) => {
  const startDate = initial?.startDate ?? initialDate ?? todayStr();
  const today = todayStr();
  const tomorrow = getDateOffset(1);
  let initialChip = 'custom';
  if (startDate === today) initialChip = 'today';
  else if (startDate === tomorrow) initialChip = 'tomorrow';

  const [form, setForm] = useState(
    initial
      ? {
          title: initial.title ?? '',
          startDate: initial.startDate ?? todayStr(),
          startTime: initial.startTime ?? '',
          endDate: initial.endDate ?? '',
          endTime: initial.endTime ?? '',
        }
      : { ...EMPTY_FORM, startDate },
  );
  const [dateChip, setDateChip] = useState(initialChip);
  const [durType, setDurType] = useState(initial && (initial.endDate || initial.endTime) ? 'custom' : null);
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
    onSave(initial ? { ...form, id: initial.id } : form);
  };

  const dateOptions = DATE_CHIPS.map(c => ({ label: c.label, value: c.key }));
  const durOptions = DURATION_PILLS.map(p => ({ label: p.label, value: p.mins === null ? 'custom' : String(p.mins) }));
  let durValue = null;
  if (durType === 'custom') durValue = 'custom';
  else if (durType !== null) durValue = String(durType);

  return (
    <>
      {/* Body */}
      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Title */}
        <Input pill
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
        <Button variant="secondary" size="md" onClick={onCancel} style={{ flex: 1 }}>
          Cancel
        </Button>
        <Button variant="primary" size="md" onClick={handleSave} disabled={!titleValid} style={{ flex: 2 }}>
          {initial ? 'Save Changes' : 'Save Event'}
        </Button>
      </div>
    </>
  );
};
