import { useEffect, useMemo, useRef, useState } from 'react';
import { HourglassSplit, PlusLg, ClockHistory } from 'react-bootstrap-icons';
import { ExpandedShell } from '../../components/ui/expanded/ExpandedShell';
import { SearchToolbar } from '../../components/ui/expanded/SearchToolbar';
import { RailItem } from '../../components/ui/expanded/RailItem';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { EMPTY_STATES } from '../../constants/emptyStates';
import { UnifiedAddDialog } from '../../components/ui/UnifiedAddDialog';
import { ListPanel, ListPanelRow } from '../../components/ui/ListPanel';
import { useEvents } from '../../hooks/useEvents';
import {
  getNextOccurrence,
  formatCountdown,
  formatSince,
  formatTargetDate,
  humanizeDuration,
  loadCustom,
  saveCustom,
} from './utils';

const PAGE_SIZE = 50;

/**
 * CountdownExpandedView: the full countdown library in the shared ExpandedShell.
 * Left rail: All + Countdown + Since (the two modes). Main pane: search + add,
 * then the countdown rows in the same ListPanelRow style as the widget settings.
 * Clicking a row opens the edit dialog; delete removes it (and its mirrored
 * event). Upcoming countdowns sort soonest-first, "since" countdowns most-recent
 * first, expired (non-repeating) countdowns dim at the bottom.
 */
export function CountdownExpandedView({ onClose }) {
  const [custom, setCustom] = useState(loadCustom);
  const [, , removeEvent] = useEvents();
  const [filter, setFilter] = useState(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const searchRef = useRef(null);

  // Debounce search (120 ms).
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 120);
    return () => clearTimeout(t);
  }, [query]);

  // Re-read when the unified dialog (or another widget instance) changes the
  // countdown list.
  useEffect(() => {
    const handler = () => setCustom(loadCustom());
    globalThis.addEventListener('countdown_events_changed', handler);
    return () => globalThis.removeEventListener('countdown_events_changed', handler);
  }, []);

  const removeCustom = (cdId) => {
    const next = custom.filter((c) => c.id !== cdId);
    setCustom(next);
    saveCustom(next);
    removeEvent(cdId); // drop the mirrored event so Events doesn't orphan it
    globalThis.dispatchEvent(new Event('countdown_events_changed'));
  };

  // Augment each countdown with its computed display fields (same math as the
  // widget face so the rows read identically).
  const augmented = useMemo(() => {
    return custom.map((cd) => {
      const isSince = cd.mode === 'since';
      const next = isSince
        ? new Date(`${cd.targetDate}T${cd.targetTime || '00:00'}`)
        : getNextOccurrence(cd);
      const isPast = !isSince && next.getTime() < Date.now() && (cd.repeat === 'none' || !cd.repeat);
      const { days, hours, minutes: mins } = isSince ? formatSince(next) : formatCountdown(next);
      const label = isPast ? 'Past' : humanizeDuration(days, hours, mins, isSince ? 'past' : 'future');

      const metaParts = [];
      metaParts.push({ text: formatTargetDate(next) });
      if (isSince) metaParts.push({ text: 'Since' });
      if (!isSince && cd.repeat && cd.repeat !== 'none') metaParts.push({ text: cd.repeat });

      return { ...cd, isSince, next, isPast, label, metaParts };
    });
  }, [custom]);

  // Ordering: upcoming countdowns soonest-first, then "since" most-recent-first,
  // then expired (past) countdowns most-recent-first at the bottom.
  const sorted = useMemo(() => {
    const rank = (a) => (a.isPast ? 2 : a.isSince ? 1 : 0);
    return [...augmented].sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb) return ra - rb;
      if (a.isSince || a.isPast) return b.next.getTime() - a.next.getTime();
      return a.next.getTime() - b.next.getTime();
    });
  }, [augmented]);

  const countByMode = useMemo(() => {
    const m = { countdown: 0, since: 0 };
    for (const a of augmented) {
      if (a.isSince) m.since += 1;
      else m.countdown += 1;
    }
    return m;
  }, [augmented]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const matchMode = (a) => {
      if (filter === 'since') return a.isSince;
      if (filter === 'countdown') return !a.isSince;
      return true;
    };
    const matchQuery = (a) => !q || (a.title || '').toLowerCase().includes(q);
    return sorted.filter((a) => matchMode(a) && matchQuery(a));
  }, [sorted, filter, debouncedQuery]);

  const searching = debouncedQuery.trim().length > 0;
  const total = custom.length;
  const filteredCount = filtered.length;
  const visibleItems = filtered.slice(0, visible);
  const hasMore = filtered.length > visible;

  const title = searching
    ? 'Search results'
    : filter === 'countdown'
      ? 'Countdowns'
      : filter === 'since'
        ? 'Since'
        : 'All countdowns';
  const countText = searching ? `${filteredCount} results` : `${filteredCount}`;

  const pickFilter = (id) => {
    setFilter(id);
    setVisible(PAGE_SIZE);
  };
  const clearSearch = () => {
    setQuery('');
    setDebouncedQuery('');
  };

  const rail = (
    <nav className="pocket-rail" aria-label="Countdown modes">
      <RailItem active={filter === null} onClick={() => pickFilter(null)} label="All" count={total} />
      <RailItem
        active={filter === 'countdown'}
        onClick={() => pickFilter('countdown')}
        icon={<HourglassSplit size={14} />}
        label="Countdown"
        count={countByMode.countdown}
      />
      <RailItem
        active={filter === 'since'}
        onClick={() => pickFilter('since')}
        icon={<ClockHistory size={14} />}
        label="Since"
        count={countByMode.since}
      />
    </nav>
  );

  const toolbar = (
    <SearchToolbar
      query={query}
      onQueryChange={setQuery}
      onClear={clearSearch}
      onAdd={() => setShowCreate(true)}
      title={title}
      count={countText}
      placeholder="Search countdowns"
      searchRef={searchRef}
      addLabel="Add"
      addIcon={<PlusLg size={13} />}
    />
  );

  const renderEmpty = () => {
    if (total === 0) {
      return (
        <EmptyState
          icon={<HourglassSplit size={22} />}
          title={EMPTY_STATES.countdown.empty.title}
          text={EMPTY_STATES.countdown.empty.text}
          action={
            <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
              Add countdown
            </Button>
          }
        />
      );
    }
    if (searching) {
      return (
        <EmptyState
          title={`No results for "${debouncedQuery}".`}
          text=""
          action={
            <Button variant="ghost" size="sm" onClick={clearSearch}>
              Clear search
            </Button>
          }
        />
      );
    }
    return (
      <EmptyState
        icon={<HourglassSplit size={22} />}
        title={filter === 'since' ? 'No since countdowns.' : 'No countdowns.'}
        text={
          filter === 'since'
            ? 'Track time since a milestone to see it here.'
            : 'Add a countdown to get started.'
        }
      />
    );
  };

  return (
    <>
      <ExpandedShell
        ariaLabel="Countdowns"
        icon={<HourglassSplit size={16} />}
        title="Countdown"
        count={total}
        onClose={onClose}
        searchRef={searchRef}
        libraryLabel="Modes"
        rail={rail}
        toolbar={toolbar}
      >
        {visibleItems.length === 0 ? (
          renderEmpty()
        ) : (
          <>
            <div className="pocket-expanded__list">
              <ListPanel
                items={visibleItems}
                renderItem={(a) => (
                  <ListPanelRow
                    title={a.title}
                    meta={a.metaParts}
                    label={a.label}
                    onEdit={() => setEditing(a)}
                    editLabel={`Edit ${a.title}`}
                    onDelete={() => removeCustom(a.id)}
                    deleteLabel={`Remove ${a.title}`}
                    onClick={() => setEditing(a)}
                    style={{ opacity: a.isPast ? 0.4 : 1 }}
                  />
                )}
              />
            </div>
            {hasMore && (
              <div className="pocket-load-more">
                <Button variant="ghost" size="sm" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </ExpandedShell>

      {showCreate && <UnifiedAddDialog type="countdown" onClose={() => setShowCreate(false)} />}
      {editing && <UnifiedAddDialog type="countdown" initial={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
