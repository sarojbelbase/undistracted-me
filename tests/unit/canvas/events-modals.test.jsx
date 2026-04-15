/**
 * Tests for Events widget modals: CreateModal and AllEventsModal
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

global.ResizeObserver = class { observe() { } unobserve() { } disconnect() { } };

// Mock react-bootstrap-icons
vi.mock('react-bootstrap-icons', () => ({
  XLg: () => <span data-testid="icon-x">X</span>,
  ClockFill: () => <span data-testid="icon-clock">C</span>, Clock: () => <span data-testid="icon-clock2">C</span>, PlusLg: () => <span data-testid="icon-plus">+</span>,
  Trash: () => <span data-testid="icon-trash-plain">🗑</span>,
  Trash3: () => <span data-testid="icon-trash">Trash</span>,
  CalendarEvent: () => <span data-testid="icon-cal">Cal</span>,
  BalloonFill: () => <span>🎈</span>,
  PersonHeart: () => <span>🫶</span>,
  HeartFill: () => <span>♥</span>,
  StarFill: () => <span>⭐</span>,
  GeoAlt: () => <span>📍</span>,
  XCircleFill: () => <span>✕</span>,
  Search: () => <span>🔍</span>,
  GraphUpArrow: () => <span>📈</span>,
  InfoCircleFill: () => <span>ℹ</span>,
  Grid3x3GapFill: () => <span>▦</span>,
  CalendarCheck: () => <span>✅</span>,
  HourglassSplit: () => <span data-testid="icon-hourglass">⏳</span>,
}));

// Prevent store init crash (circular dep via widget registry)
vi.mock('../../../src/store/useWidgetInstancesStore', () => ({
  useWidgetInstancesStore: vi.fn((selector) =>
    typeof selector === 'function' ? selector({ instances: [], widgetSettings: {} }) : undefined
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
    // Mock bucketLabel so tests are not sensitive to the "real" today date
    bucketLabel: (dateStr) => {
      if (dateStr === '2025-07-01') return 'Today';
      if (dateStr === '2025-07-02') return 'Tomorrow';
      if (dateStr > '2025-07-02') return 'Later';
      return 'Past';
    },
    isPast: () => false,
  };
});

// Mock useEvents to avoid localStorage module-level cache issues
vi.mock('../../../src/widgets/useEvents', () => ({
  formatEventTime: (event) => event.startTime || 'All day',
}));

// Mock SegmentedDateTime so tests can find predictable inputs
vi.mock('../../../src/components/ui/SegmentedDateTime', () => ({
  SegmentedDateTime: ({ mode, date, time, onDateChange, onTimeChange }) => (
    <div data-testid={`segmented-dt-${mode}`}>
      {(mode === 'datetime' || mode === 'date') && (
        <input type="date" value={date || ''} onChange={e => onDateChange?.(e.target.value)} aria-label="Date" />
      )}
      {(mode === 'datetime' || mode === 'time') && (
        <input type="time" value={time || ''} onChange={e => onTimeChange?.(e.target.value)} aria-label="Time" />
      )}
    </div>
  ),
}));

// Mock SegmentedControl so button labels are predictable
vi.mock('../../../src/components/ui/SegmentedControl', () => ({
  SegmentedControl: ({ options, value, onChange }) => (
    <div>
      {(options || []).map(o => (
        <button key={o.value} onClick={() => onChange(o.value)} aria-pressed={value === o.value}>
          {o.label}
        </button>
      ))}
    </div>
  ),
}));

import { CreateModal } from '../../../src/widgets/events/CreateModal';
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
// CreateModal
// ─────────────────────────────────────────────────────────────────────────────
describe('CreateModal', () => {
  let onSave, onClose;

  beforeEach(() => {
    onSave = vi.fn();
    onClose = vi.fn();
  });

  it('renders "New Event" heading', () => {
    render(<CreateModal onSave={onSave} onClose={onClose} />);
    expect(screen.getByText('New Event')).toBeTruthy();
  });

  it('renders title input and placeholder', () => {
    render(<CreateModal onSave={onSave} onClose={onClose} />);
    expect(screen.getByPlaceholderText("What's happening?")).toBeTruthy();
  });

  it('renders date chip buttons (Today, Tomorrow, Custom)', () => {
    render(<CreateModal onSave={onSave} onClose={onClose} />);
    expect(screen.getByText('Today')).toBeTruthy();
    expect(screen.getByText('Tomorrow')).toBeTruthy();
    // Custom appears for both date chip and duration pill
    expect(screen.getAllByText('Custom').length).toBeGreaterThan(0);
  });

  it('renders duration pills', () => {
    render(<CreateModal onSave={onSave} onClose={onClose} />);
    // Duration pills include '30 min', '1 hr', '2 hr'
    expect(screen.getByText('30 min')).toBeTruthy();
    expect(screen.getByText('1 hr')).toBeTruthy();
    expect(screen.getByText('2 hr')).toBeTruthy();
  });

  it('calls onClose when Close (X) button is clicked', () => {
    render(<CreateModal onSave={onSave} onClose={onClose} />);
    const closeBtn = screen.getByLabelText('Close');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not call onSave when title is empty', () => {
    render(<CreateModal onSave={onSave} onClose={onClose} />);
    const saveBtn = screen.getByText('Save Event');
    fireEvent.click(saveBtn);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('calls onSave with form data when title is filled and Save clicked', () => {
    render(<CreateModal onSave={onSave} onClose={onClose} />);
    const titleInput = screen.getByPlaceholderText("What's happening?");
    fireEvent.change(titleInput, { target: { value: 'My New Event' } });
    const saveBtn = screen.getByText('Save Event');
    fireEvent.click(saveBtn);
    expect(onSave).toHaveBeenCalledOnce();
    const savedForm = onSave.mock.calls[0][0];
    expect(savedForm.title).toBe('My New Event');
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('triggers save on Enter key in title input', () => {
    render(<CreateModal onSave={onSave} onClose={onClose} />);
    const titleInput = screen.getByPlaceholderText("What's happening?");
    fireEvent.change(titleInput, { target: { value: 'Quick event' } });
    fireEvent.keyDown(titleInput, { key: 'Enter' });
    expect(onSave).toHaveBeenCalledOnce();
  });

  it('calls onClose when Cancel button is clicked', () => {
    render(<CreateModal onSave={onSave} onClose={onClose} />);
    const cancelBtn = screen.getByText('Cancel');
    fireEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows time input when a non-custom date chip is selected', () => {
    render(<CreateModal onSave={onSave} onClose={onClose} />);
    // Default is "today" chip active → SegmentedDateTime in time mode renders input[type=time]
    const timeInputs = document.querySelectorAll('input[type="time"]');
    expect(timeInputs.length).toBeGreaterThan(0);
  });

  it('selects Tomorrow chip when clicked', () => {
    render(<CreateModal onSave={onSave} onClose={onClose} />);
    const tomorrowBtn = screen.getByText('Tomorrow');
    fireEvent.click(tomorrowBtn);
    // Should not throw and chip updates state
    expect(tomorrowBtn).toBeTruthy();
  });

  it('clicking Custom date chip shows datetime-local input', () => {
    render(<CreateModal onSave={onSave} onClose={onClose} />);
    const allCustomBtns = screen.getAllByText('Custom');
    // First Custom button is the date chip
    fireEvent.click(allCustomBtns[0]);
    // In datetime mode, SegmentedDateTime mock renders both date and time inputs
    expect(document.querySelector('[data-testid="segmented-dt-datetime"]')).toBeTruthy();
  });

  it('clicking Custom duration pill shows "End date & time"', () => {
    render(<CreateModal onSave={onSave} onClose={onClose} />);
    fireEvent.change(screen.getByPlaceholderText("What's happening?"), { target: { value: 'Test' } });
    const allCustomBtns = screen.getAllByText('Custom');
    // Last Custom button is the duration pill
    fireEvent.click(allCustomBtns[allCustomBtns.length - 1]);
    // After clicking Custom duration, a second SegmentedDateTime (for end time) should appear
    expect(document.querySelectorAll('[data-testid="segmented-dt-datetime"]').length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// AllEventsModal
// ─────────────────────────────────────────────────────────────────────────────
describe('AllEventsModal', () => {
  let onClose, onAdd, onRemove;

  beforeEach(() => {
    onClose = vi.fn();
    onAdd = vi.fn();
    onRemove = vi.fn();
  });

  it('renders "All Events" heading', () => {
    render(<AllEventsModal events={[]} onClose={onClose} onAdd={onAdd} onRemove={onRemove} />);
    expect(screen.getByText('All Events')).toBeTruthy();
  });

  it('shows empty state when no events', () => {
    render(<AllEventsModal events={[]} onClose={onClose} onAdd={onAdd} onRemove={onRemove} />);
    expect(screen.getByText(/No upcoming events/i)).toBeTruthy();
  });

  it('calls onClose when X button is clicked', () => {
    render(<AllEventsModal events={[]} onClose={onClose} onAdd={onAdd} onRemove={onRemove} />);
    const closeBtn = screen.getByLabelText('Close');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders today event in Today bucket', () => {
    render(<AllEventsModal events={[todayEvent]} onClose={onClose} onAdd={onAdd} onRemove={onRemove} />);
    // Event title should be visible
    expect(screen.getByText('Meeting today')).toBeTruthy();
  });

  it('renders tomorrow event in Tomorrow bucket', () => {
    render(<AllEventsModal events={[tomorrowEvent]} onClose={onClose} onAdd={onAdd} onRemove={onRemove} />);
    expect(screen.getByText('Event tomorrow')).toBeTruthy();
    // Should be a link since htmlLink is set
    const link = screen.getByRole('link', { name: 'Event tomorrow' });
    expect(link).toBeTruthy();
  });

  it('renders later event in Later bucket', () => {
    render(<AllEventsModal events={[laterEvent]} onClose={onClose} onAdd={onAdd} onRemove={onRemove} />);
    expect(screen.getByText('Future conference')).toBeTruthy();
  });

  it('renders events across all buckets', () => {
    render(<AllEventsModal events={[todayEvent, tomorrowEvent, laterEvent]} onClose={onClose} onAdd={onAdd} onRemove={onRemove} />);
    expect(screen.getByText('Meeting today')).toBeTruthy();
    expect(screen.getByText('Event tomorrow')).toBeTruthy();
    expect(screen.getByText('Future conference')).toBeTruthy();
  });

  it('shows delete button for local events but NOT for gcal events', () => {
    render(<AllEventsModal events={[todayEvent, tomorrowEvent]} onClose={onClose} onAdd={onAdd} onRemove={onRemove} />);
    // todayEvent._source = 'local' → should have remove button
    // tomorrowEvent._source = 'gcal' → should NOT have remove button
    const removeBtns = screen.queryAllByLabelText(/^Remove /);
    expect(removeBtns).toHaveLength(1);
  });

  it('calls onRemove with event id when delete button is clicked', () => {
    render(<AllEventsModal events={[todayEvent]} onClose={onClose} onAdd={onAdd} onRemove={onRemove} />);
    const removeBtn = screen.getByLabelText('Remove Meeting today');
    fireEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalledWith('e1');
  });

  it('opens CreateModal when + Add Event button clicked', () => {
    render(<AllEventsModal events={[]} onClose={onClose} onAdd={onAdd} onRemove={onRemove} />);
    const addBtn = screen.getByLabelText('Add event');
    act(() => { fireEvent.click(addBtn); });
    // CreateModal should now be visible
    expect(screen.getByText('New Event')).toBeTruthy();
  });

  it('calls onAdd when event is saved from created CreateModal', () => {
    render(<AllEventsModal events={[]} onClose={onClose} onAdd={onAdd} onRemove={onRemove} />);
    // Open CreateModal
    fireEvent.click(screen.getByLabelText('Add event'));
    // Fill in title
    const titleInput = screen.getByPlaceholderText("What's happening?");
    fireEvent.change(titleInput, { target: { value: 'New from modal' } });
    fireEvent.click(screen.getByText('Save Event'));
    expect(onAdd).toHaveBeenCalledOnce();
    const savedForm = onAdd.mock.calls[0][0];
    expect(savedForm.title).toBe('New from modal');
  });
});
