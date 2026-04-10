import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XLg, ClockFill } from 'react-bootstrap-icons';
import { PillButton } from '../../components/ui/PillButton';
import {
  EMPTY_FORM, DATE_CHIPS, DURATION_PILLS,
  getDateOffset, applyDuration, todayStr
} from './utils';

export const CreateModal = ({ onSave, onClose }) => {
  const [form, setForm] = useState({ ...EMPTY_FORM, startDate: todayStr() });

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);
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

  const datetimeLocalVal = form.startDate && form.startTime
    ? `${form.startDate}T${form.startTime}`
    : form.startDate ? `${form.startDate}T` : '';

  const handleDateTimeLocal = (val) => {
    const [date, time] = val.split('T');
    updateStart(date || '', time || '');
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

  const inputCls = 'outline-none transition-colors';
  const inputStyle = {
    border: '1px solid var(--card-border)',
    backgroundColor: 'var(--card-bg)',
    backdropFilter: 'var(--card-blur)',
    color: 'var(--w-ink-1)',
    borderRadius: '0.5rem',
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div
        className="rounded-2xl shadow-2xl p-5 w-80 animate-fade-in"
        style={{ background: 'var(--card-bg)', backdropFilter: 'var(--card-blur)', WebkitBackdropFilter: 'var(--card-blur)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="w-heading">New Event</span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors btn-close"
            style={{ color: 'var(--w-ink-3)' }}
          >
            <XLg size={14} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Event name */}
          <input
            autoFocus
            type="text"
            placeholder="What's happening?"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            className={`w-full px-3 py-2.5 text-sm ${inputCls}`}
            style={{ ...inputStyle, borderRadius: '0.75rem' }}
          />

          {/* When block */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--card-border)', backgroundColor: 'var(--card-bg)', backdropFilter: 'var(--card-blur)' }}
          >
            <div className="flex gap-1.5 p-3 pb-2">
              {DATE_CHIPS.map(chip => (
                <PillButton
                  key={chip.key}
                  active={dateChip === chip.key}
                  onClick={() => handleDateChip(chip)}
                >
                  {chip.label}
                </PillButton>
              ))}
            </div>

            {/* Time row */}
            <div className="px-3 pb-3">
              {dateChip === 'custom' ? (
                <div className="flex flex-col gap-0.5">
                  <span className="w-label mb-1">Date &amp; time</span>
                  <input
                    type="datetime-local"
                    value={datetimeLocalVal}
                    onChange={e => handleDateTimeLocal(e.target.value)}
                    className={`w-full px-2.5 py-1.5 text-xs ${inputCls}`}
                    style={inputStyle}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <ClockFill size={11} style={{ color: 'var(--w-ink-4)', flexShrink: 0 }} />
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={e => updateStart(form.startDate, e.target.value)}
                    placeholder="Add time"
                    className={`flex-1 px-2.5 py-1.5 text-xs ${inputCls}`}
                    style={inputStyle}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Duration */}
          <div className="flex flex-col gap-1.5">
            <span className="w-label">Duration</span>
            <div className="flex gap-1.5 flex-wrap">
              {DURATION_PILLS.map(p => {
                const active = p.mins === null ? durType === 'custom' : durType === p.mins;
                return (
                  <PillButton key={p.label} active={active} onClick={() => handleDurationPill(p)}>
                    {p.label}
                  </PillButton>
                );
              })}
            </div>
          </div>

          {/* Custom end when duration=custom */}
          {durType === 'custom' && (
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: '1px solid var(--card-border)', backgroundColor: 'var(--card-bg)', backdropFilter: 'var(--card-blur)' }}
            >
              <div className="flex flex-col gap-0.5 p-3">
                <span className="w-label mb-1 block">End date &amp; time</span>
                <input
                  type="datetime-local"
                  value={form.endDate && form.endTime ? `${form.endDate}T${form.endTime}` : ''}
                  onChange={e => {
                    const [d, t] = e.target.value.split('T');
                    setForm(f => ({ ...f, endDate: d || '', endTime: t || '' }));
                  }}
                  className={`w-full px-2.5 py-1.5 text-xs ${inputCls}`}
                  style={inputStyle}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm"
            style={{ color: 'var(--w-ink-3)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!valid}
            className="px-4 py-1.5 text-sm rounded-lg transition-colors disabled:opacity-40"
            style={{ backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
