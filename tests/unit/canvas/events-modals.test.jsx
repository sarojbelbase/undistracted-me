/**
 * Tests for the Events expanded view (EventsExpandedView).
 *
 * AllEventsModal was removed in the events redesign; the "View All" entry now
 * opens EventsExpandedView (app/widgets/events/ExpandedView.jsx), a full
 * library built on the shared ExpandedShell with a Local + Calendar source rail.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

global.ResizeObserver = class { observe() { } unobserve() { } disconnect() { } };

// Mock react-bootstrap-icons (only what EventsExpandedView imports directly).
vi.mock('react-bootstrap-icons', () => ({
  CalendarEvent: () => <span data-testid="icon-cal">Cal</span>,
  PlusLg: () => <span data-testid="icon-plus">+</span>,
}));

// Mock the heavy expanded-shell primitives so we test EventsExpandedView's
// wiring (source rail, filters, row click → open) without the modal chrome.
vi.mock('../../../app/components/ui/expanded/ExpandedShell', () => ({
  ExpandedShell: ({ title, count, rail, toolbar, children }) => (
    <div data-testid="expanded-shell" data-title={title} data-count={count}>
      {rail}
      {toolbar}
      <div data-testid="shell-body">{children}</div>
    </div>
  ),
}));

vi.mock('../../../app/components/ui/expanded/SearchToolbar', () => ({
  SearchToolbar: ({ title, count, onAdd }) => (
    <div data-testid="search-toolbar" data-title={title} data-count={count}>
      <button onClick={onAdd} data-testid="add-btn">Add</button>
    </div>
  ),
}));

vi.mock('../../../app/components/ui/expanded/RailItem', () => ({
  RailItem: ({ label, count, onClick, active }) => (
    <button
      data-testid={`rail-${String(label).toLowerCase()}`}
      data-active={String(!!active)}
      onClick={onClick}
    >
      {label} ({count})
    </button>
  ),
}));

// EventRow is a shared list item; here we surface the title + the onOpen hook.
vi.mock('../../../app/components/ui/EventRow', () => ({
  EventRow: ({ event, onOpen }) => (
    <div data-testid={`event-row-${event.id}`}>
      <button onClick={() => onOpen?.(event)}>{event.title}</button>
    </div>
  ),
}));

vi.mock('../../../app/components/ui/UnifiedAddDialog', () => ({
  UnifiedAddDialog: ({ type, initial }) => (
    <div data-testid="unified-add-dialog" data-type={type} data-title={initial?.title || ''} />
  ),
}));

vi.mock('../../../app/assets/brand/icons', () => ({
  GoogleIcon: () => <span data-testid="google-icon">G</span>,
}));

// Mock hooks to return controllable state.
const mockRemoveEvent = vi.fn();
vi.mock('../../../app/hooks/useEvents', () => ({
  useEvents: vi.fn(() => [[], vi.fn(), mockRemoveEvent]),
  useGoogleCalendar: vi.fn(() => ({ gcalEvents: [], loading: false, connected: false, syncedAt: null, refresh: vi.fn() })),
  useGoogleProfile: vi.fn(() => null),
}));

import { useEvents, useGoogleCalendar } from '../../../app/hooks/useEvents';
import { EventsExpandedView } from '../../../app/widgets/events/ExpandedView';

// ── Helper events ──────────────────────────────────────────────────────────
const localEvent = {
  id: 'local-1',
  title: 'Local standup',
  startDate: '2099-07-01',
  startTime: '09:00',
  endDate: '2099-07-01',
  endTime: '10:00',
  _source: 'local',
};

const gcalEvent = {
  id: 'gcal-1',
  title: 'Calendar sync',
  startDate: '2099-07-02',
  startTime: '10:00',
  endDate: '2099-07-02',
  endTime: '11:00',
  htmlLink: 'https://calendar.google.com/event',
  _source: 'gcal',
};

const pastEvent = {
  id: 'past-1',
  title: 'Old meeting',
  startDate: '2000-01-01',
  startTime: '09:00',
  endDate: '2000-01-01',
  endTime: '10:00',
  _source: 'local',
};

// ─────────────────────────────────────────────────────────────────────────────
describe('EventsExpandedView', () => {
  let openSpy;

  beforeEach(() => {
    openSpy = vi.fn();
    vi.stubGlobal('open', openSpy);
    vi.mocked(useEvents).mockReturnValue([[localEvent, pastEvent], vi.fn(), mockRemoveEvent]);
    vi.mocked(useGoogleCalendar).mockReturnValue({
      gcalEvents: [gcalEvent], loading: false, connected: false, syncedAt: null, refresh: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the shell with title "Events" and total count', () => {
    render(<EventsExpandedView onClose={vi.fn()} />);
    const shell = screen.getByTestId('expanded-shell');
    expect(shell.getAttribute('data-title')).toBe('Events');
    expect(shell.getAttribute('data-count')).toBe('3');
  });

  it('renders All, Local and Calendar rail items with counts', () => {
    render(<EventsExpandedView onClose={vi.fn()} />);
    expect(screen.getByTestId('rail-all').textContent).toContain('3');
    expect(screen.getByTestId('rail-local').textContent).toContain('2');
    expect(screen.getByTestId('rail-calendar').textContent).toContain('1');
  });

  it('renders upcoming and past event titles', () => {
    render(<EventsExpandedView onClose={vi.fn()} />);
    expect(screen.getByText('Local standup')).toBeTruthy();
    expect(screen.getByText('Calendar sync')).toBeTruthy();
    expect(screen.getByText('Old meeting')).toBeTruthy();
  });

  it('opens a calendar event link when a gcal row is clicked', () => {
    render(<EventsExpandedView onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Calendar sync'));
    expect(openSpy).toHaveBeenCalledWith(
      'https://calendar.google.com/event', '_blank', 'noopener,noreferrer',
    );
  });

  it('opens the edit dialog when a local row is clicked', () => {
    render(<EventsExpandedView onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Local standup'));
    const dialog = screen.getByTestId('unified-add-dialog');
    expect(dialog.getAttribute('data-type')).toBe('event');
    expect(dialog.getAttribute('data-title')).toBe('Local standup');
  });

  it('opens the add dialog when Add is clicked', () => {
    render(<EventsExpandedView onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('add-btn'));
    const dialog = screen.getByTestId('unified-add-dialog');
    expect(dialog.getAttribute('data-type')).toBe('event');
    expect(dialog.getAttribute('data-title')).toBe('');
  });

  it('filters to Local events when the Local rail item is clicked', () => {
    render(<EventsExpandedView onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('rail-local'));
    expect(screen.queryByText('Local standup')).toBeTruthy();
    expect(screen.queryByText('Calendar sync')).toBeNull();
  });
});
