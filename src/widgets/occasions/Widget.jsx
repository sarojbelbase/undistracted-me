import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAgeLabel } from '../../hooks/useAgeLabel';
import { PersonHeart, BalloonFill, HeartFill, StarFill } from 'react-bootstrap-icons';
import { BaseWidget } from '../BaseWidget';
import {
  getContactBirthdays,
  loadCachedContacts,
  loadContactsSyncedAt,
  isContactsConnected,
  loadManualBirthdays,
  addManualBirthday,
} from '../../utilities/googleContacts';
import {
  computeUpcoming,
  daysLabel,
  typeLabel,
  avatarColor,
  avatarLetter,
} from './utils';
import { OccasionsSettings } from './Settings';
import { AddOccasion } from './AddOccasion';
import config from './config';
import { useUIStore } from '../../store/useUIStore';
import { GOOGLE_ACCOUNT_CHANGED } from '../../store/useGoogleAccountStore';

import { RefreshIcon } from '../../assets/svg/RefreshIcon';
import { TooltipBtn } from '../../components/ui/TooltipBtn';
import { OCCASION_ANNIVERSARY_COLOR, OCCASION_SPECIAL_COLOR } from '../../theme/canvas';

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Colored circular avatar with a single initial. Shows photo if available. */
const Avatar = ({ name, photoUrl, size = 32 }) => {
  const { bg, fg } = avatarColor(name);
  const letter = avatarLetter(name);
  const fontSize = size >= 40 ? '1.05rem' : '0.75rem';
  const [imgFailed, setImgFailed] = useState(false);

  if (photoUrl && !imgFailed) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
        onError={() => setImgFailed(true)}
      />
    );
  }

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
      <span className="occ-days-chip occ-days-chip--today">
        Today 🎉
      </span>
    );
  }

  if (days === 1) {
    return (
      <span className="occ-days-chip occ-days-chip--tomorrow">
        Tomorrow
      </span>
    );
  }

  const urgent = days <= 7;
  return (
    <span className={`occ-days-chip${urgent ? ' occ-days-chip--urgent' : ' occ-days-chip--normal'}`}>
      {label}
    </span>
  );
};

// ─── Type icon ────────────────────────────────────────────────────────────────
/** Small icon that identifies the occasion type. */
const TypeIcon = ({ type, size = 11 }) => {
  const style = { flexShrink: 0 };
  if (type === 'anniversary') return <HeartFill size={size} style={{ ...style, color: OCCASION_ANNIVERSARY_COLOR }} />;
  if (type === 'other') return <StarFill size={size} style={{ ...style, color: OCCASION_SPECIAL_COLOR }} />;
  return <BalloonFill size={size} style={{ ...style, color: 'var(--w-accent)' }} />;
};

// ─── Empty / unauthenticated states ──────────────────────────────────────────

const ConnectPrompt = ({ onConnect, onAdd }) => (
  <div className="occ-prompt">
    <PersonHeart size={24} className="occ-prompt__icon" />
    <div className="flex flex-col items-center gap-1.5">
      <p className="occ-prompt__title">No occasions yet</p>
      <p className="occ-prompt__hint">
        Connect Google Contacts to sync birthdays or add them manually.
      </p>
    </div>
  </div>
);

const EmptyState = () => (
  <div className="occ-empty">
    <span className="occ-empty__emoji">🎊</span>
    <p className="w-muted font-semibold">Nothing coming up</p>
    <p className="w-muted">No birthdays in your contacts</p>
  </div>
);

// ─── Regular list row ─────────────────────────────────────────────────────────

const ListRow = ({ entry, isLast, highlight }) => {
  return (
    <div
      className={`occ-row${isLast ? '' : ' occ-row--divider'}${highlight ? ' occ-row--highlight' : ''}`}
    >
      {/* Avatar */}
      <Avatar name={entry.name} photoUrl={entry.photoUrl} size={30} />

      {/* Name + type */}
      <div className="occ-row__info">
        <div className={`occ-row__name${highlight ? ' occ-row__name--highlight' : ' occ-row__name--normal'}`}>
          {entry.name}
        </div>
        <div className="occ-row__type">
          <TypeIcon type={entry.type} size={10} />
          {typeLabel(entry.type)}
        </div>
      </div>

      {/* Days chip */}
      <DaysChip days={entry.daysAway} />
    </div>
  );
};

// ─── Main widget ──────────────────────────────────────────────────────────────

export const Widget = ({ id, onRemove }) => {
  const [raw, setRaw] = useState([]);
  const [manual, setManual] = useState(() => loadManualBirthdays());
  const [syncedAt, setSyncedAt] = useState(() => loadContactsSyncedAt());
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(() => isContactsConnected());
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const ageLabel = useAgeLabel(syncedAt);
  const openAccountsDialog = useUIStore(s => s.openAccountsDialog);

  // Load cached contacts from chrome.storage.local on mount (async).
  useEffect(() => {
    loadCachedContacts().then(entries => { if (entries.length > 0) setRaw(entries); });
  }, []);

  // Silent refresh on mount if already connected
  useEffect(() => {
    if (connected) sync(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to Google account connect/disconnect from Settings → Accounts tab
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.connected) {
        sync(false); // silently fetch contacts after connect
      } else {
        setRaw([]);
        setConnected(false);
        setSyncedAt(null);
      }
    };
    globalThis.addEventListener(GOOGLE_ACCOUNT_CHANGED, handler);
    return () => globalThis.removeEventListener(GOOGLE_ACCOUNT_CHANGED, handler);
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

  // ── Settings panel ─────────────────────────────────────────────────────────
  const settingsContent = (
    <OccasionsSettings
      onManualChange={(updated) => setManual(updated)}
    />
  );

  // ── Inline refresh row (mirrors stock widget) ───────────────────────────────
  const RefreshRow = connected && (
    <div className="flex items-center gap-1.5">
      {ageLabel && (
        <span className="occ-age-label">
          {ageLabel}
        </span>
      )}
      <TooltipBtn
        tooltip="Refresh contacts"
        onClick={() => sync(true)}
        disabled={loading}
        aria-label="Refresh contacts"
        onMouseDown={e => e.stopPropagation()}
        className="flex items-center justify-center transition-opacity hover:opacity-70 active:opacity-40 disabled:opacity-30 cursor-pointer"
        style={{ color: 'var(--w-ink-4)' }}
      >
        <RefreshIcon spinning={loading} />
      </TooltipBtn>
    </div>
  );

  // ── Content ──────────────────────────────────────────────────────────────
  function renderContent() {
    if (!connected && manual.length === 0) return (
      <ConnectPrompt
        onConnect={openAccountsDialog}
        onAdd={() => setShowAddModal(true)}
      />
    );
    if (upcoming.length === 0) return <EmptyState />;
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
        {/* Render all rows; hero gets a tinted background highlight */}
        {upcoming.map((entry, i) => (
          <ListRow
            key={entry.id}
            entry={entry}
            highlight={i === 0}
            isLast={i === upcoming.length - 1}
          />
        ))}
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <BaseWidget
        className="flex flex-col overflow-hidden"
        onRemove={onRemove}
        settingsContent={settingsContent}
        settingsTitle={config.title}
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
            style={{ background: 'color-mix(in srgb, var(--w-danger) 8%, transparent)', color: 'var(--w-danger)', border: '1px solid color-mix(in srgb, var(--w-danger) 25%, transparent)' }}
          >
            {error}
          </div>
        )}

        {renderContent()}
      </BaseWidget>
      {showAddModal && (
        <AddOccasion
          onClose={() => setShowAddModal(false)}
          onSave={(name, type, month, day) => {
            addManualBirthday(name, type, month, day);
            setManual(loadManualBirthdays());
            setShowAddModal(false);
          }}
        />
      )}
    </>
  );

};
