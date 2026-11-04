/**
 * Tests for the Events widget modals: AllEventsModal.
 *
 * CreateModal was removed in the events redesign — event creation now happens in
 * the UnifiedAddDialog (see src/components/ui/UnifiedAddDialog.jsx), which the
 * AllEventsModal opens via its "+" button.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

global.ResizeObserver = class { observe() { } unobserve() { } disconnect() { } };

// Mock react-bootstrap-icons
vi.mock('react-bootstrap-icons', () => ({
  XLg: () => <span data-testid="icon-x">X</span>,
  ClockFill: () => <span data-testid="icon-clock">C</span>,
  PlusLg: () => <span data-testid="icon-plus">+</span>,
  Trash: () => <span data-testid="icon-trash-plain">🗑</span>,
  Trash3: () => <span data-testid="icon-trash">Trash</span>,
  CalendarEvent: () => <span data-testid="icon-cal">Cal</span>,
  Pencil: () => <span data-testid="icon-pencil">✎</span>,
}));

// Prevent store init crash (circular dep via widget registry)
vi.mock('../../../src/store/useWidgetInstancesStore', () => ({
  useWidgetInstancesStore: vi.fn((selector) =>
    typeof selector === 'function' ? selector({ instances: [], widgetSettings: {} }) : undefined
  ),
}));

// Mock Modal to render children directly (keeps AllEventsModal testable in jsdom)
vi.mock('../../../src/components/ui/Modal', () => ({
  Modal: ({ children }) => <div data-testid="modal">{children}</div>,
}));

// Mock UnifiedAddDialog — heavy dependency; we only assert it opens.
vi.mock('../../../src/components/ui/UnifiedAddDialog', () => ({
  UnifiedAddDialog: ({ type }) => <div data-testid="unified-add-dialog" data-type={type} />,
}));

// Mock ConfirmButton so delete is a single click.
vi.mock('../../../src/components/ui/ConfirmButton', () => ({
  ConfirmButton: ({ onConfirm, label, children }) => (
    <button aria-label={label} onClick={onConfirm}>{children}</button>
  ),
}));

// Mock todayStr and other utils to return stable values
vi.mock('../../../src/widgets/events/utils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    todayStr: () => '2025-07-01',
    getDateOffset: (offset) => {
      const d = new Date('2025-07-01');
      d.setDate(d.getDate() + offset);
      return d.toISOString().slice(0, 10);
    },
    bucketLabel: (dateStr) => {
      if (dateStr === '2025-07-01') return 'Today';
      if (dateStr === '2025-07-02') return 'Tomorrow';
      if (dateStr > '2025-07-02') return 'Later';
      return 'Past';
    },
    isPast: () => false,
  };
});

import { AllEventsModal } from '../../../src/widgets/events/AllEventsModal';

// ── Helper events ──────────────────────────────────────────────────────────
const todayEvent = {
  id: 'e1',
  title: 'Meeting today',
  startDate: '2025-07-01',
  startTime: '09:00',
  endDate: '2025-07-01',
  endTime: '10:00',
  htmlLink: null,
  _source: 'local',
};

const tomorrowEvent = {
  id: 'e2',
  title: 'Event tomorrow',
  startDate: '2025-07-02',
  startTime: '14:00',
  endDate: '2025-07-02',
  endTime: '15:00',
  htmlLink: 'https://calendar.google.com/e2',
  _source: 'gcal',
};

const laterEvent = {
  id: 'e3',
  title: 'Future conference',
  startDate: '2025-07-15',
  startTime: '',
  endDate: '2025-07-15',
  endTime: '',
  htmlLink: null,
  _source: 'local',
};

// ─────────────────────────────────────────────────────────────────────────────
// AllEventsModal
// ─────────────────────────────────────────────────────────────────────────────
describe('AllEventsModal', () => {
  let onClose, onRemove;

  beforeEach(() => {
    onClose = vi.fn();
    onRemove = vi.fn();
  });

  it('renders "All Events" heading', () => {
    render(<AllEventsModal events={[]} onClose={onClose} onRemove={onRemove} />);
    expect(screen.getByText('All Events')).toBeTruthy();
  });

  it('shows empty state when no events', () => {
    render(<AllEventsModal events={[]} onClose={onClose} onRemove={onRemove} />);
    expect(screen.getByText(/No upcoming events/i)).toBeTruthy();
  });

  it('calls onClose when X button is clicked', () => {
    render(<AllEventsModal events={[]} onClose={onClose} onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders today event in Today bucket', () => {
    render(<AllEventsModal events={[todayEvent]} onClose={onClose} onRemove={onRemove} />);
    expect(screen.getByText('Meeting today')).toBeTruthy();
  });

  it('renders tomorrow event in Tomorrow bucket', () => {
    render(<AllEventsModal events={[tomorrowEvent]} onClose={onClose} onRemove={onRemove} />);
    expect(screen.getByText('Event tomorrow')).toBeTruthy();
  });

  it('renders later event in Later bucket', () => {
    render(<AllEventsModal events={[laterEvent]} onClose={onClose} onRemove={onRemove} />);
    expect(screen.getByText('Future conference')).toBeTruthy();
  });

  it('renders events across all buckets', () => {
    render(<AllEventsModal events={[todayEvent, tomorrowEvent, laterEvent]} onClose={onClose} onRemove={onRemove} />);
    expect(screen.getByText('Meeting today')).toBeTruthy();
    expect(screen.getByText('Event tomorrow')).toBeTruthy();
    expect(screen.getByText('Future conference')).toBeTruthy();
  });

  it('shows delete button for local events but NOT for gcal events', () => {
    render(<AllEventsModal events={[todayEvent, tomorrowEvent]} onClose={onClose} onRemove={onRemove} />);
    const removeBtns = screen.queryAllByLabelText(/^Remove /);
    expect(removeBtns).toHaveLength(1);
  });

  it('calls onRemove with event id when delete button is clicked', () => {
    render(<AllEventsModal events={[todayEvent]} onClose={onClose} onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText('Remove Meeting today'));
    expect(onRemove).toHaveBeenCalledWith('e1');
  });

  it('opens the add dialog when + Add Event button is clicked', () => {
    render(<AllEventsModal events={[]} onClose={onClose} onRemove={onRemove} />);
    const addBtn = screen.getByLabelText('Add event');
    act(() => { fireEvent.click(addBtn); });
    expect(screen.getByTestId('unified-add-dialog')).toBeTruthy();
  });
});
