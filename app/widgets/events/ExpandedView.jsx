import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarEvent, PlusLg } from 'react-bootstrap-icons';
import { ExpandedShell } from '../../components/ui/expanded/ExpandedShell';
import { SearchToolbar } from '../../components/ui/expanded/SearchToolbar';
import { RailItem } from '../../components/ui/expanded/RailItem';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { EMPTY_STATES } from '../../constants/emptyStates';
import { useEvents, useGoogleCalendar } from '../../hooks/useEvents';
import { UnifiedAddDialog } from '../../components/ui/UnifiedAddDialog';
import { EventRow } from '../../components/ui/EventRow';
import { GoogleIcon } from '../../assets/brand/icons';
import { isPast } from './utils';

const PAGE_SIZE = 50;

const sortUpcoming = (a, b) => {
  const aKey = `${a.startDate || '9999'}T${a.startTime || '99:99'}`;
  const bKey = `${b.startDate || '9999'}T${b.startTime || '99:99'}`;
  return aKey.localeCompare(bKey);
};

const sortPast = (a, b) => {
  const aKey = `${a.startDate || '0000'}T${a.startTime || '99:99'}`;
  const bKey = `${b.startDate || '0000'}T${b.startTime || '99:99'}`;
  return bKey.localeCompare(aKey);
};

/**
 * EventsExpandedView: the full events library in the shared ExpandedShell.
 * Left rail: All + Local + Calendar. Main pane: search + add, then the event
 * rows (upcoming soonest-first, past dimmed at the bottom). Clicking a row
 * opens the event: Google Calendar events open their link, local events open
 * the edit dialog.
 */
export function EventsExpandedView({ onClose }) {
  const [localEvents, , removeEvent] = useEvents();
  const { gcalEvents } = useGoogleCalendar();
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

  // Merge local + calendar with an explicit _source so the two are distinct.
  const allEvents = useMemo(() => {
    const local = localEvents.map((e) => ({ ...e, _source: e._source || 'local' }));
    const gcal = gcalEvents.map((e) => ({ ...e, _source: 'gcal' }));
    return [...local, ...gcal];
  }, [localEvents, gcalEvents]);

  const { upcoming, past } = useMemo(() => {
    const up = [];
    const pa = [];
    for (const e of allEvents) (isPast(e) ? pa : up).push(e);
    up.sort(sortUpcoming);
    pa.sort(sortPast);
    return { upcoming: up, past: pa };
  }, [allEvents]);

  const countBySource = useMemo(() => {
    const m = { local: 0, calendar: 0 };
    for (const e of allEvents) m[e._source === 'gcal' ? 'calendar' : 'local'] += 1;
    return m;
  }, [allEvents]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    const matchSource = (e) => {
      if (!filter) return true;
      return filter === 'calendar' ? e._source === 'gcal' : e._source !== 'gcal';
    };
    const matchQuery = (e) => !q || (e.title || '').toLowerCase().includes(q);
    return {
      upcoming: upcoming.filter((e) => matchSource(e) && matchQuery(e)),
      past: past.filter((e) => matchSource(e) && matchQuery(e)),
    };
  }, [upcoming, past, filter, debouncedQuery]);

  const searching = debouncedQuery.trim().length > 0;
  const total = allEvents.length;
  const totalFiltered = filtered.upcoming.length + filtered.past.length;

  const visibleUpcoming = filtered.upcoming.slice(0, visible);
  const pastBudget = Math.max(0, visible - visibleUpcoming.length);
  const visiblePast = filtered.past.slice(0, pastBudget);
  const hasMore = totalFiltered > visible;

  const title = searching
    ? 'Search results'
    : filter === 'local'
      ? 'Local events'
      : filter === 'calendar'
        ? 'Calendar events'
        : 'All events';
  const countText = searching ? `${totalFiltered} results` : `${totalFiltered}`;

  const pickFilter = (id) => {
    setFilter(id);
    setVisible(PAGE_SIZE);
  };
  const clearSearch = () => {
    setQuery('');
    setDebouncedQuery('');
  };

  const openEvent = (event) => {
    if (event._source === 'gcal' && event.htmlLink) {
      window.open(event.htmlLink, '_blank', 'noopener,noreferrer');
    } else {
      setEditing(event);
    }
  };

  const rail = (
    <nav className="pocket-rail" aria-label="Event sources">
      <RailItem active={filter === null} onClick={() => pickFilter(null)} label="All" count={total} />
      <RailItem
        active={filter === 'local'}
        onClick={() => pickFilter('local')}
        icon={<CalendarEvent size={14} />}
        label="Local"
        count={countBySource.local}
      />
      <RailItem
        active={filter === 'calendar'}
        onClick={() => pickFilter('calendar')}
        icon={<GoogleIcon size={14} />}
        label="Calendar"
        count={countBySource.calendar}
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
      placeholder="Search events"
      searchRef={searchRef}
      addLabel="Add"
      addIcon={<PlusLg size={13} />}
    />
  );

  const renderEmpty = () => {
    if (total === 0) {
      return (
        <EmptyState
          icon={<CalendarEvent size={22} />}
          title={EMPTY_STATES.events.empty.title}
          text={EMPTY_STATES.events.empty.text}
          action={
            <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
              Add event
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
        icon={<CalendarEvent size={22} />}
        title={filter === 'calendar' ? 'No calendar events.' : 'No local events.'}
        text={
          filter === 'calendar'
            ? 'Connect Google Calendar in Settings to sync events.'
            : 'Add an event to get started.'
        }
      />
    );
  };

  return (
    <>
      <ExpandedShell
        ariaLabel="Events"
        icon={<CalendarEvent size={16} />}
        title="Events"
        count={total}
        onClose={onClose}
        searchRef={searchRef}
        libraryLabel="Sources"
        rail={rail}
        toolbar={toolbar}
      >
        {visibleUpcoming.length === 0 && visiblePast.length === 0 ? (
          renderEmpty()
        ) : (
          <>
            <div className="pocket-expanded__list">
              {visibleUpcoming.map((event) => (
                <div key={event.id} className="evt-expanded__row">
                  <EventRow event={event} onRemove={removeEvent} onOpen={openEvent} />
                </div>
              ))}
              {visiblePast.length > 0 && (
                <>
                  <div className="evt-expanded__divider">Past</div>
                  {visiblePast.map((event) => (
                    <div key={event.id} className="evt-expanded__row evt-expanded__row--past">
                      <EventRow event={event} onRemove={removeEvent} onOpen={openEvent} />
                    </div>
                  ))}
                </>
              )}
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

      {showCreate && <UnifiedAddDialog type="event" onClose={() => setShowCreate(false)} />}
      {editing && <UnifiedAddDialog type="event" initial={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
