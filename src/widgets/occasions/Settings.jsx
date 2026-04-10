import React, { useState } from 'react';
import { XLg, BalloonFill, HeartFill, StarFill, PlusLg, PersonHeart } from 'react-bootstrap-icons';
import {
  loadManualBirthdays,
  addManualBirthday,
  removeManualBirthday,
} from '../../utilities/googleContacts';
import { typeLabel, avatarColor, avatarLetter } from './utils';
import { IntegrationRow } from '../../components/ui/IntegrationRow';
import { TintedChip } from '../../components/ui/TintedChip';

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
  { value: 'anniversary', Icon: HeartFill, iconColor: '#e05c8a', label: 'Anniversary' },
  { value: 'other', Icon: StarFill, iconColor: '#f59e0b', label: 'Special' },
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
  <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--w-ink-4)', letterSpacing: '0.09em' }}>
    {children}
  </p>
);

const inputStyle = {
  background: 'var(--w-surface-2)',
  color: 'var(--w-ink-1)',
  border: '1px solid var(--w-border)',
  borderRadius: '0.625rem',
  outline: 'none',
  fontSize: '0.8125rem',
  padding: '0.5rem 0.75rem',
  width: '100%',
};

const selStyle = {
  background: 'var(--w-surface-2)',
  color: 'var(--w-ink-1)',
  border: '1px solid var(--w-border)',
  borderRadius: '0.625rem',
  outline: 'none',
  fontSize: '0.8125rem',
  padding: '0.5rem 0.75rem',
};

// ─── Google Contacts section ──────────────────────────────────────────────────

const ContactsSection = ({ connected, loading, ageLabel, profile, error, onConnect, onSync, onDisconnect }) => (
  <div className="flex flex-col gap-3">
    <IntegrationRow
      icon={<PersonHeart size={12} />}
      label="Google Contacts"
      connected={connected}
      loading={loading}
      profile={profile ? {
        name: profile.name ?? 'Google Account',
        email: profile.email,
        picture: profile.picture,
      } : null}
      syncedAtLabel={ageLabel}
      description="Reads birthdays and anniversaries from your contacts."
      privacyLabel="Stored only in your browser"
      connectLabel="Connect Google Contacts"
      onConnect={onConnect}
      onSync={onSync}
      onDisconnect={onDisconnect}
    />
    {error && (
      <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
    )}
  </div>
);

// ─── Manual entries section ───────────────────────────────────────────────────

const ManualSection = ({ onManualChange }) => {
  const [manual, setManual] = useState(() => loadManualBirthdays());
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'birthday', month: '', day: '' });
  const [formError, setFormError] = useState('');

  const days = form.month
    ? Array.from({ length: daysInMonth(Number(form.month)) }, (_, i) => i + 1)
    : Array.from({ length: 31 }, (_, i) => i + 1);

  const handleAdd = () => {
    if (!form.name.trim()) { setFormError('Name is required'); return; }
    if (!form.month) { setFormError('Pick a month'); return; }
    if (!form.day) { setFormError('Pick a day'); return; }
    setFormError('');
    addManualBirthday(form.name.trim(), form.type, Number(form.month), Number(form.day));
    const updated = loadManualBirthdays();
    setManual(updated);
    onManualChange(updated);
    setForm({ name: '', type: 'birthday', month: '', day: '' });
    setShowAdd(false);
  };

  const handleRemove = (id) => {
    removeManualBirthday(id);
    const updated = loadManualBirthdays();
    setManual(updated);
    onManualChange(updated);
  };

  const cancelAdd = () => {
    setShowAdd(false);
    setFormError('');
    setForm({ name: '', type: 'birthday', month: '', day: '' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <SectionHeading>Your Occasions</SectionHeading>
        {!showAdd && (
          <TintedChip size="sm" onClick={() => setShowAdd(true)} className="flex items-center gap-1">
            <PlusLg size={9} />
            Add
          </TintedChip>
        )}
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
                  background: 'var(--w-surface-2)',
                  borderBottom: i < manual.length - 1 ? '1px solid var(--w-border)' : 'none',
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
                <button
                  onClick={() => handleRemove(e.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-full transition-all hover:text-red-500 cursor-pointer"
                  style={{ color: 'var(--w-ink-4)' }}
                  aria-label={`Remove ${e.name}`}
                >
                  <XLg size={11} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty hint */}
      {manual.length === 0 && !showAdd && (
        <p className="text-xs leading-relaxed" style={{ color: 'var(--w-ink-4)' }}>
          Add people not in your Google Contacts — family, close friends, or anyone you don't want to miss.
        </p>
      )}

      {/* Add form */}
      {showAdd && (
        <div
          className="rounded-2xl p-4 flex flex-col gap-4"
          style={{ background: 'var(--w-surface-2)', border: '1px solid var(--w-border)' }}
        >
          {/* Name */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest block mb-2" style={{ color: 'var(--w-ink-4)' }}>
              Name
            </label>
            <input
              type="text"
              placeholder="e.g. Mom, Arjun, Alex…"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              style={inputStyle}
              autoFocus
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-widest block mb-2" style={{ color: 'var(--w-ink-4)' }}>
              Occasion type
            </label>
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--w-surface-2)', border: '1px solid var(--w-border)' }}>
              {TYPES.map(t => {
                const active = form.type === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: t.value }))}
                    className="flex-1 flex flex-col items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer"
                    style={active
                      ? { background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }
                      : { background: 'transparent', color: 'var(--w-ink-3)' }}
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
            <label className="text-[11px] font-bold uppercase tracking-widest block mb-2" style={{ color: 'var(--w-ink-4)' }}>
              Date
            </label>
            <div className="flex gap-2">
              <select
                value={form.month}
                onChange={e => setForm(f => ({ ...f, month: e.target.value, day: '' }))}
                className="flex-1 cursor-pointer"
                style={selStyle}
              >
                <option value="">Month</option>
                {MONTHS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <select
                value={form.day}
                onChange={e => setForm(f => ({ ...f, day: e.target.value }))}
                className="w-20 cursor-pointer"
                style={selStyle}
              >
                <option value="">Day</option>
                {days.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Error */}
          {formError && (
            <p className="text-xs font-medium -mt-1" style={{ color: '#ef4444' }}>{formError}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={cancelAdd}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-75 cursor-pointer"
              style={{ background: 'var(--w-surface-2)', color: 'var(--w-ink-3)', border: '1px solid var(--w-border)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              className="flex-1 py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-85 cursor-pointer"
              style={{ background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Exported settings component ─────────────────────────────────────────────

export const OccasionsSettings = ({
  connected,
  loading,
  error,
  ageLabel,
  profile,
  onConnect,
  onSync,
  onDisconnect,
  onManualChange,
}) => (
  <div className="flex flex-col gap-6 py-1">
    <ContactsSection
      connected={connected}
      loading={loading}
      error={error}
      ageLabel={ageLabel}
      profile={profile}
      onConnect={onConnect}
      onSync={onSync}
      onDisconnect={onDisconnect}
    />
    <div style={{ height: 1, background: 'var(--w-border)' }} />
    <ManualSection onManualChange={onManualChange} />
  </div>
);

