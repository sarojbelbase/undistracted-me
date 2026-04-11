import { useState } from 'react';
import { XLg, CalendarEvent, Clock, HourglassSplit } from 'react-bootstrap-icons';
import { SegmentedDateTime } from '../../components/ui/SegmentedDateTime';
import { SettingsInput } from '../../components/ui/SettingsInput';
import { Modal } from '../../components/ui/Modal';
import { useSettingsStore } from '../../store';
import {
  EMPTY_FORM, DATE_CHIPS, DURATION_PILLS,
  getDateOffset, applyDuration, todayStr
} from './utils';

export const CreateModal = ({ onSave, onClose }) => {
  const { cardStyle, mode } = useSettingsStore();
  const isGlass = cardStyle === 'glass';
  const isDark = mode === 'dark' || (mode === 'auto' && document.documentElement.dataset.mode === 'dark');
  const divider = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const cancelBorder = isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.12)';
  let trackBg, trackBorder;
  if (isGlass) {
    trackBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.45)';
    trackBorder = isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.09)';
  } else {
    trackBg = 'var(--w-surface-2)';
    trackBorder = '1px solid var(--w-border)';
  }
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
      <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--w-ink-3)' }}>{text}</span>
    </div>
  );

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
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--w-ink-1)', letterSpacing: '-0.01em', lineHeight: 1.2 }}>New Event</div>
            <div style={{ fontSize: '11px', color: 'var(--w-ink-4)', marginTop: 1 }}>Add to your calendar</div>
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

      <div style={{ height: 1, background: divider }} />

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

          {/* Segmented day picker */}
          <div style={{
            display: 'flex', background: trackBg,
            borderRadius: 11, padding: 3, border: trackBorder,
            marginBottom: 10,
          }}>
            {DATE_CHIPS.map(chip => (
              <button key={chip.key} type="button"
                onClick={() => handleDateChip(chip)}
                style={{
                  flex: 1, padding: '6px 0', borderRadius: 8,
                  fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s',
                  background: dateChip === chip.key ? 'var(--w-accent)' : 'transparent',
                  color: dateChip === chip.key ? 'var(--w-accent-fg)' : 'var(--w-ink-3)',
                  boxShadow: dateChip === chip.key ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
                }}
              >{chip.label}</button>
            ))}
          </div>

          {/* Date + time fields */}
          {dateChip === 'custom' ? (
            <SegmentedDateTime
              mode="datetime"
              date={form.startDate}
              time={form.startTime}
              onDateChange={(d) => updateStart(d, form.startTime)}
              onTimeChange={(t) => updateStart(form.startDate, t)}
            />
          ) : (
            <SegmentedDateTime
              mode="time"
              time={form.startTime}
              onTimeChange={(t) => updateStart(form.startDate, t)}
            />
          )}
        </div>

        {/* Ends at (duration) */}
        <div>
          {sectionLabel(<HourglassSplit size={10} style={{ color: 'var(--w-ink-3)' }} />, 'Ends at')}
          <div style={{
            display: 'flex', background: trackBg,
            borderRadius: 11, padding: 3, border: trackBorder,
            marginBottom: durType === 'custom' ? 10 : 0,
          }}>
            {DURATION_PILLS.map(p => {
              const active = p.mins === null ? durType === 'custom' : durType === p.mins;
              return (
                <button key={p.label} type="button"
                  onClick={() => handleDurationPill(p)}
                  style={{
                    flex: 1, padding: '6px 0', borderRadius: 8,
                    fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer',
                    textAlign: 'center', transition: 'all 0.15s',
                    background: active ? 'var(--w-accent)' : 'transparent',
                    color: active ? 'var(--w-accent-fg)' : 'var(--w-ink-3)',
                    boxShadow: active ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
                  }}
                >{p.label}</button>
              );
            })}
          </div>
          {durType === 'custom' && (
            <SegmentedDateTime
              mode="datetime"
              date={form.endDate}
              time={form.endTime}
              onDateChange={(d) => setForm(f => ({ ...f, endDate: d }))}
              onTimeChange={(t) => setForm(f => ({ ...f, endTime: t }))}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ height: 1, background: divider }} />
      <div style={{ display: 'flex', gap: 8, padding: '14px 20px' }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            flex: 1, padding: '9px 0', borderRadius: 10,
            fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            border: cancelBorder, background: 'transparent',
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
