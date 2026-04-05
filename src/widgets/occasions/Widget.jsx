import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PersonHeart, BalloonFill, HeartFill, StarFill } from 'react-bootstrap-icons';
import { BaseWidget } from '../BaseWidget';
import {
  getContactBirthdays,
  loadCachedContacts,
  loadContactsSyncedAt,
  isContactsConnected,
  disconnectContacts,
  loadManualBirthdays,
} from '../../utilities/googleContacts';
import { loadCachedProfile } from '../../utilities/googleCalendar';
import {
  computeUpcoming,
  daysLabel,
  typeLabel,
  urgencyColor,
  avatarColor,
  avatarLetter,
  humanizeAge,
} from './utils';
import { OccasionsSettings } from './Settings';

import { RefreshIcon } from '../../components/ui/RefreshIcon';

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Colored circular avatar with a single initial. */
const Avatar = ({ name, size = 32 }) => {
  const { bg, fg } = avatarColor(name);
  const letter = avatarLetter(name);
  const fontSize = size >= 40 ? '1.05rem' : '0.75rem';
  return (
    <div
      className="shrink-0 rounded-full flex items-center justify-center font-bold select-none"
      style={{ width: size, height: size, backgroundColor: bg, color: fg, fontSize }}
      aria-hidden="true"
    >
      {letter}
    </div>
  );
};

/**
 * Days-away chip.
 *  Today     → accent background (green-tinted via accent)
 *  Tomorrow  → slightly muted
 *  ≤7d       → accent text, no background
 *  further   → muted gray text
 */
const DaysChip = ({ days }) => {
  const label = daysLabel(days);

  if (days === 0) {
    return (
      <span
        className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
        style={{ background: 'var(--w-accent)', color: 'var(--w-accent-fg)', letterSpacing: '0.01em' }}
      >
        Today 🎉
      </span>
    );
  }

  if (days === 1) {
    return (
      <span
        className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
        style={{ background: 'var(--w-surface-2)', color: 'var(--w-ink-3)', border: '1px solid var(--w-border)' }}
      >
        Tomorrow
      </span>
    );
  }

  const urgent = days <= 7;
  return (
    <span
      className="text-[10px] font-semibold tabular-nums shrink-0"
      style={{ color: urgent ? 'var(--w-accent)' : 'var(--w-ink-5)' }}
    >
      {label}
    </span>
  );
};

// ─── Type icon ────────────────────────────────────────────────────────────────
/** Small icon that identifies the occasion type. */
const TypeIcon = ({ type, size = 11 }) => {
  const style = { flexShrink: 0 };
  if (type === 'anniversary') return <HeartFill size={size} style={{ ...style, color: '#e05c8a' }} />;
  if (type === 'other') return <StarFill size={size} style={{ ...style, color: '#f59e0b' }} />;
  return <BalloonFill size={size} style={{ ...style, color: 'var(--w-accent)' }} />;
};

// ─── Empty / unauthenticated states ──────────────────────────────────────────

const ConnectPrompt = () => (
  <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4 text-center">
    <PersonHeart size={24} style={{ color: 'var(--w-ink-5)', opacity: 0.35 }} />
    <div className="flex flex-col items-center gap-1.5">
      <p className="text-xs font-semibold" style={{ color: 'var(--w-ink-3)' }}>Not connected</p>
      <p className="text-[11px] leading-relaxed" style={{ color: 'var(--w-ink-5)' }}>
        Open the{' '}
        <span
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md align-middle"
          style={{ backgroundColor: 'var(--w-surface-2)', border: '1px solid var(--w-border)' }}
        >
          <svg width="10" height="3" viewBox="0 0 14 4" fill="currentColor" style={{ color: 'var(--w-ink-3)' }}>
            <circle cx="2" cy="2" r="1.5" /><circle cx="7" cy="2" r="1.5" /><circle cx="12" cy="2" r="1.5" />
          </svg>
        </span>
        {' '}menu and tap <span className="font-semibold" style={{ color: 'var(--w-ink-3)' }}>Settings</span> to sync Google Contacts birthdays.
      </p>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="flex-1 flex flex-col items-center justify-center gap-1.5 px-4 py-2">
    <span style={{ fontSize: '1.75rem', lineHeight: 1 }}>🎊</span>
    <p className="text-xs font-semibold" style={{ color: 'var(--w-ink-3)' }}>Nothing coming up</p>
    <p className="w-muted">No birthdays in your contacts</p>
  </div>
);

// ─── Hero card — spotlit single entry within 30 days ─────────────────────────

const HeroRow = ({ entry }) => {
  const { bg } = avatarColor(entry.name);
  return (
    <div
      className="mx-3 rounded-2xl px-3.5 py-3 flex items-center gap-3"
      style={{ background: bg, transition: 'background 0.3s ease' }}
    >
      {/* Large avatar */}
      <Avatar name={entry.name} size={44} />

      {/* Name + type row */}
      <div className="flex-1 min-w-0">
        <div
          className="font-semibold text-sm leading-tight truncate"
          style={{ color: 'var(--w-ink-1)' }}
        >
          {entry.name}
        </div>
        <div
          className="text-[11px] mt-0.5 flex items-center gap-1"
          style={{ color: 'var(--w-ink-4)' }}
        >
          <TypeIcon type={entry.type} size={11} />
          {typeLabel(entry.type)}
        </div>
      </div>

      {/* Days chip floated right */}
      <DaysChip days={entry.daysAway} />
    </div>
  );
};

// ─── Regular list row ─────────────────────────────────────────────────────────

const ListRow = ({ entry, isLast }) => (
  <div
    className="flex items-center gap-2.5 px-4 py-2.5"
    style={{ borderBottom: isLast ? 'none' : '1px solid var(--w-border)' }}
  >
    {/* Left urgency bar */}
    <div
      className="self-stretch rounded-full shrink-0"
      style={{ width: 3, backgroundColor: urgencyColor(entry.daysAway), opacity: 0.8 }}
    />

    {/* Avatar */}
    <Avatar name={entry.name} size={30} />

    {/* Name + type */}
    <div className="flex-1 min-w-0">
      <div
        className="text-xs font-semibold leading-tight truncate"
        style={{ color: 'var(--w-ink-1)' }}
      >
        {entry.name}
      </div>
      <div className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: 'var(--w-ink-5)' }}>
        <TypeIcon type={entry.type} size={10} />
        {typeLabel(entry.type)}
      </div>
    </div>

    {/* Days chip */}
    <DaysChip days={entry.daysAway} />
  </div>
);

// ─── Main widget ──────────────────────────────────────────────────────────────

export const Widget = ({ id, onRemove }) => {
  const [raw, setRaw] = useState(() => loadCachedContacts());
  const [manual, setManual] = useState(() => loadManualBirthdays());
  const [syncedAt, setSyncedAt] = useState(() => loadContactsSyncedAt());
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(() => isContactsConnected());
  const [error, setError] = useState(null);
  const [ageLabel, setAgeLabel] = useState(() => humanizeAge(loadContactsSyncedAt()));

  // Re-tick the age label every 30s
  useEffect(() => {
    if (!syncedAt) return;
    setAgeLabel(humanizeAge(syncedAt));
    const tid = setInterval(() => setAgeLabel(humanizeAge(syncedAt)), 30_000);
    return () => clearInterval(tid);
  }, [syncedAt]);

  // Silent refresh on mount if already connected
  useEffect(() => {
    if (connected) sync(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sync = useCallback(async (interactive = true) => {
    setLoading(true);
    setError(null);
    try {
      const entries = await getContactBirthdays(interactive);
      setRaw(entries);
      const ts = Date.now();
      setSyncedAt(ts);
      setAgeLabel(humanizeAge(ts));
      setConnected(true);
    } catch (err) {
      if (interactive) {
        if (err.message === 'SERVICE_DISABLED') {
          setError('People API is not enabled. Enable it in Google Cloud Console for this project.');
        } else {
          setError('Could not connect. Try again.');
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Compute upcoming list (enriched + sorted + max 3) from both contacts + manual
  const allRaw = useMemo(() => [...raw, ...manual], [raw, manual]);
  const upcoming = useMemo(() => computeUpcoming(allRaw), [allRaw]);

  // Hero logic: spotlight the single entry if exactly ONE is within 30 days
  const within30 = upcoming.filter(e => e.daysAway <= 30);
  const isHero = within30.length === 1;
  const hero = isHero ? within30[0] : null;
  // Secondary rows shown below the hero (up to 2 more from all upcoming, excluding hero)
  const secondary = isHero
    ? upcoming.filter(e => e.id !== hero.id).slice(0, 2)
    : upcoming;

  // ── Settings panel ─────────────────────────────────────────────────────────
  const settingsContent = (
    <OccasionsSettings
      connected={connected}
      loading={loading}
      error={!connected ? error : null}
      ageLabel={ageLabel}
      profile={loadCachedProfile()}
      onConnect={() => sync(true)}
      onSync={() => sync(true)}
      onDisconnect={() => {
        disconnectContacts();
        setRaw([]);
        setConnected(false);
        setSyncedAt(null);
        setAgeLabel('');
      }}
      onManualChange={(updated) => setManual(updated)}
    />
  );

  // ── Inline refresh row (mirrors stock widget) ───────────────────────────────
  const RefreshRow = connected && (
    <div className="flex items-center gap-1.5">
      {ageLabel && (
        <span className="text-[10px]" style={{ color: 'var(--w-ink-5)' }}>
          {ageLabel}
        </span>
      )}
      <button
        onClick={() => sync(true)}
        disabled={loading}
        aria-label="Refresh contacts"
        onMouseDown={e => e.stopPropagation()}
        className="flex items-center justify-center transition-opacity hover:opacity-70 active:opacity-40 disabled:opacity-30 cursor-pointer"
        style={{ color: 'var(--w-ink-5)' }}
      >
        <RefreshIcon spinning={loading} />
      </button>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <BaseWidget
      className="flex flex-col overflow-hidden"
      onRemove={onRemove}
      settingsContent={settingsContent}
      settingsTitle="Occasions"
      modalWidth="w-96"
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0"
      >
        <span className="w-sub-soft">Occasions</span>
        {RefreshRow}
      </div>

      {/* ── Error banner — only shown when already connected (retry errors) ─────────── */}
      {error && connected && (
        <div
          className="mx-3 mb-2 px-3 py-2 rounded-xl text-[11px]"
          style={{ background: '#fff5f5', color: '#c0392b', border: '1px solid #fecaca' }}
        >
          {error}
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────────── */}
      {!connected && manual.length === 0 ? (
        <ConnectPrompt />
      ) : upcoming.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col flex-1">

          {/* Hero (spacious highlighted card) */}
          {isHero && hero && (
            <div className="pb-2">
              <HeroRow entry={hero} />
            </div>
          )}

          {/* Divider between hero + secondary rows */}
          {isHero && secondary.length > 0 && (
            <div className="mx-4 mb-1" style={{ height: 1, background: 'var(--w-border)' }} />
          )}

          {/* List rows */}
          {secondary.map((entry, i) => (
            <ListRow
              key={entry.id}
              entry={entry}
              isLast={i === secondary.length - 1}
            />
          ))}
        </div>
      )}
    </BaseWidget>
  );
};
