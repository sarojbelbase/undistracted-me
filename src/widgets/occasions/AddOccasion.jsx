import { useState, useEffect, useRef } from 'react';
import { XLg, PersonHeart, BalloonFill, HeartFill, StarFill } from 'react-bootstrap-icons';
import { SettingsInput } from '../../components/ui/SettingsInput';
import { Modal } from '../../components/ui/Modal';

const MONTHS = [
  { label: 'January', value: 1 }, { label: 'February', value: 2 },
  { label: 'March', value: 3 }, { label: 'April', value: 4 },
  { label: 'May', value: 5 }, { label: 'June', value: 6 },
  { label: 'July', value: 7 }, { label: 'August', value: 8 },
  { label: 'September', value: 9 }, { label: 'October', value: 10 },
  { label: 'November', value: 11 }, { label: 'December', value: 12 },
];

const TYPES = [
  { value: 'birthday', Icon: BalloonFill, iconColor: 'var(--w-accent)', label: 'Birthday' },
  { value: 'anniversary', Icon: HeartFill, iconColor: '#e05c8a', label: 'Anniversary' },
  { value: 'other', Icon: StarFill, iconColor: '#f59e0b', label: 'Special' },
];

const daysInMonth = (month) => month ? new Date(2000, month, 0).getDate() : 31;

const selStyle = {
  background: 'var(--panel-bg)',
  color: 'var(--w-ink-1)',
  border: '1px solid var(--card-border)',
  borderRadius: '0.625rem',
  outline: 'none',
  fontSize: '0.8125rem',
  padding: '0.5rem 0.75rem',
  width: '100%',
  cursor: 'pointer',
};

export const AddOccasion = ({ onSave, onClose }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('birthday');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [error, setError] = useState('');
  const nameRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const nameValid = name.trim().length > 0;

  const handleSave = () => {
    if (!nameValid) { setError('Name is required'); return; }
    if (!month) { setError('Pick a month'); return; }
    if (!day) { setError('Pick a day'); return; }
    setError('');
    onSave({ name: name.trim(), type, month: Number(month), day: Number(day) });
    onClose();
  };

  const days = month
    ? Array.from({ length: daysInMonth(Number(month)) }, (_, i) => i + 1)
    : Array.from({ length: 31 }, (_, i) => i + 1);

  const headerIconStyle = {
    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
    background: 'var(--w-accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  return (
    <Modal onClose={onClose} style={{ width: 340 }} ariaLabel="New Occasion">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={headerIconStyle}>
            <PersonHeart size={14} style={{ color: 'var(--w-accent-fg)' }} />
          </div>
          <div>
            <div className="w-heading" style={{ fontSize: '15px' }}>New Occasion</div>
            <div className="w-caption" style={{ marginTop: 1 }}>Add a birthday or anniversary</div>
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
        {/* Name */}
        <SettingsInput
          ref={nameRef}
          autoFocus
          type="text"
          placeholder="e.g. Mom, Arjun, Alex…"
          value={name}
          onChange={e => { setName(e.target.value); setError(''); }}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
          wrapperStyle={{ height: 44 }}
          style={{ fontSize: '14px', fontWeight: 500 }}
        />

        {/* Type */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
            <span className="w-label" style={{ color: 'var(--w-ink-3)' }}>Occasion type</span>
          </div>
          <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: 'var(--panel-bg)', border: '1px solid var(--card-border)' }}>
            {TYPES.map(t => {
              const active = type === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  style={{
                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: 6, padding: '8px 0', borderRadius: 8,
                    fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer',
                    transition: 'all 0.15s', border: 'none',
                    background: active ? 'var(--w-accent)' : 'transparent',
                    color: active ? 'var(--w-accent-fg)' : 'var(--w-ink-3)',
                  }}
                >
                  <t.Icon size={14} style={{ color: active ? 'inherit' : t.iconColor }} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Date */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
            <span className="w-label" style={{ color: 'var(--w-ink-3)' }}>Date</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              value={month}
              onChange={e => { setMonth(e.target.value); setDay(''); setError(''); }}
              style={selStyle}
            >
              <option value="">Month</option>
              {MONTHS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select
              value={day}
              onChange={e => { setDay(e.target.value); setError(''); }}
              style={{ ...selStyle, width: 90 }}
            >
              <option value="">Day</option>
              {days.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          {error && (
            <p style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--w-danger)', marginTop: 6 }}>{error}</p>
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
          style={{
            flex: 2, padding: '9px 0', borderRadius: 10,
            fontSize: '13px', fontWeight: 600,
            border: 'none', background: 'var(--w-accent)', color: 'var(--w-accent-fg)',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >Save Occasion</button>
      </div>
    </Modal>
  );
};
