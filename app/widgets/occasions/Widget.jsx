import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAgeLabel } from '../../hooks/useAgeLabel';
import { BalloonFill, HeartFill, StarFill, XLg, PersonHeart } from 'react-bootstrap-icons';
import { EmptyState } from '../../components/ui/EmptyState';
import { EMPTY_STATES } from '../../constants/emptyStates';
import { Button } from '../../components/ui/Button';
import { BaseWidget } from '../BaseWidget';
import {
  getContactBirthdays,
  loadCachedContacts,
  loadContactsSyncedAt,
  isContactsConnected,
  loadManualBirthdays,
} from '../../utilities/googleContacts';
import {
  computeUpcoming,
  daysLabel,
  typeLabel,
  avatarColor,
  avatarLetter,
} from './utils';
import { OccasionsSettings } from './Settings';
import { UnifiedAddDialog } from '../../components/ui/UnifiedAddDialog';
import config from './config';
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

  // Load cached contacts from chrome.storage.local on mount (async).
  useEffect(() => {
    let cancelled = false;
    loadCachedContacts().then(entries => {
      if (!cancelled && entries.length > 0) setRaw(entries);
    });
    return () => { cancelled = true; };
  }, []);

  // Guard `sync`'s post-await setState so unmounting mid-sync (or navigating
  // away) can't write state to an unmounted tree.
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

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

  // Re-read manual occasions when the unified dialog adds/edits one.
  useEffect(() => {
    const handler = () => setManual(loadManualBirthdays());
    globalThis.addEventListener('manual_birthdays_changed', handler);
    return () => globalThis.removeEventListener('manual_birthdays_changed', handler);
  }, []);

  const sync = useCallback(async (interactive = true) => {
    setLoading(true);
    setError(null);
    try {
      const entries = await getContactBirthdays(interactive);
      if (!mountedRef.current) return;
      setRaw(entries);
      const ts = Date.now();
      setSyncedAt(ts);
      setConnected(true);
    } catch (err) {
      if (!mountedRef.current) return;
      if (interactive) {
        if (err.message === 'SERVICE_DISABLED') {
          setError('People API is not enabled. Enable it in Google Cloud Console for this project.');
        } else {
          setError('Could not connect. Try again.');
        }
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // Compute upcoming list (enriched + sorted + max 3) from both contacts + manual
  const allRaw = useMemo(() => [...raw, ...manual], [raw, manual]);
  const upcoming = useMemo(() => computeUpcoming(allRaw), [allRaw]);

  // ── Settings panel ─────────────────────────────────────────────────────────
  const settingsContent = (onClose) => (
    <>
      {/* Custom header — matching AllEventsModal style */}
      <div
        className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0"
        style={{ borderBottom: '1.5px solid var(--w-divider)' }}
      >
        <div>
          <p className="text-[15px] font-semibold" style={{ color: 'var(--w-ink-1)' }}>{config.title}</p>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-full transition-colors cursor-pointer"
          style={{ color: 'var(--w-ink-3)' }}
          aria-label={`Close ${config.title}`}
        >
          <XLg size={12} />
        </button>
      </div>
      {/* Scrollable body */}
      <div className="overflow-y-auto flex-1 px-4 py-4">
        <OccasionsSettings
          onManualChange={(updated) => setManual(updated)}
        />
      </div>
    </>
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
    if (!connected && manual.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center min-h-0">
          <EmptyState
            size="sm"
            icon={<PersonHeart size={18} />}
            title={EMPTY_STATES.occasions.unconnected.title}
            text={EMPTY_STATES.occasions.unconnected.text}
            action={
              <Button variant="soft" size="sm" onClick={() => setShowAddModal(true)}>
                Add Occasions
              </Button>
            }
          />
        </div>
      );
    }
    if (upcoming.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center min-h-0">
          <EmptyState
            size="sm"
            icon={<BalloonFill size={18} />}
            title={EMPTY_STATES.occasions.empty.title}
            text={EMPTY_STATES.occasions.empty.text}
          />
        </div>
      );
    }
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
        settingsNoHeader
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
        <UnifiedAddDialog
          type="occasion"
          onClose={() => setShowAddModal(false)}
        />
      )}
    </>
  );

};
