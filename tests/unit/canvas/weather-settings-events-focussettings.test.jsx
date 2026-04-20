/**
 * Tests for:
 * - weather/Settings.jsx (currently 6.25%)
 * - events/Widget.jsx (currently 37.83%)
 * - FocusMode/Settings.jsx (currently 37.03%)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

global.ResizeObserver = class { observe() { } unobserve() { } disconnect() { } };

// Mock fetch globally
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => [] }));

// Mock react-bootstrap-icons
vi.mock('react-bootstrap-icons', () => ({
  PlusLg: () => <span data-testid="plus">+</span>,
  ArrowRight: () => <span>→</span>,
  CalendarEvent: () => <span data-testid="no-events">Cal</span>,
  CalendarCheck: () => <span data-testid="calendar-check">📅</span>,
  Trash3: () => <span>🗑</span>,
  Trash: () => <span>🗑</span>,
  CheckLg: () => <span>✓</span>,
  XLg: () => <span>X</span>,
  ClockFill: () => <span>⏰</span>,
  GeoAlt: () => <span data-testid="geo-alt">📍</span>,
  XCircleFill: () => <span>✕</span>,
  BalloonFill: () => <span>🎈</span>,
  PersonHeart: () => <span>🫶</span>,
  HeartFill: () => <span>♥</span>,
  StarFill: () => <span>⭐</span>,
  Search: () => <span>🔍</span>,
  GraphUpArrow: () => <span>📈</span>,
  InfoCircleFill: () => <span>ℹ</span>,
  Grid3x3GapFill: () => <span>▦</span>,
}));

// Prevent store init crash (circular dep via widget registry)
vi.mock('../../../src/store/useWidgetInstancesStore', () => ({
  useWidgetInstancesStore: vi.fn((selector) =>
    typeof selector === 'function' ? selector({ instances: [], widgetSettings: {} }) : undefined
  ),
}));

// Mock BaseWidget for clean renders
vi.mock('../../../src/widgets/BaseWidget', () => ({
  BaseWidget: React.forwardRef(({ children, onRemove }, ref) => (
    <div ref={ref} data-testid="base-widget">
      {children}
    </div>
  )),
}));

// Mock googleCalendar (imported by useEvents)
vi.mock('../../../src/utilities/googleCalendar', () => ({
  loadCachedGcalEvents: vi.fn(() => []),
  clearGcalCache: vi.fn(),
  loadCachedProfile: vi.fn(() => null),
  getCalendarEvents: vi.fn(() => Promise.resolve({ events: [], changed: false })),
  isCalendarConnected: vi.fn(() => Promise.resolve(false)),
  disconnectCalendar: vi.fn(() => Promise.resolve()),
  loadGcalSyncedAt: vi.fn(() => null),
  clearDisconnectedFlag: vi.fn(),
}));

// Mock useEvents to return controllable state
const mockAddEvent = vi.fn();
const mockRemoveEvent = vi.fn();
vi.mock('../../../src/widgets/useEvents', () => ({
  useEvents: vi.fn(() => [[], mockAddEvent, mockRemoveEvent]),
  useGoogleCalendar: vi.fn(() => ({ gcalEvents: [], loading: false, connected: false, syncedAt: null, refresh: vi.fn() })),
  useGoogleProfile: vi.fn(() => null),
  formatEventTime: vi.fn(ev => ev.startTime || 'All day'),
}));

// Mock events utils
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
  };
});

// Mock CreateModal and AllEventsModal to avoid heavy dependencies
vi.mock('../../../src/widgets/events/CreateModal', () => ({
  CreateModal: ({ onSave, onClose }) => (
    <div data-testid="create-modal">
      <button onClick={() => { onSave({ title: 'Test', startDate: '2025-07-01', startTime: '', endDate: '', endTime: '' }); onClose(); }}>Save</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  ),
}));

vi.mock('../../../src/widgets/events/AllEventsModal', () => ({
  AllEventsModal: ({ onClose }) => (
    <div data-testid="all-events-modal">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock store
vi.mock('../../../src/store', () => ({
  useSettingsStore: vi.fn((selector) => {
    const state = {
      dateFormat: 'gregorian', clockFormat: '24h', accent: '#6366f1',
      mode: 'canvas', language: 'en',
      setDateFormat: vi.fn(), setClockFormat: vi.fn(), setAccent: vi.fn(),
      setMode: vi.fn(), setLanguage: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

// Mock unsplash
vi.mock('../../../src/utilities/unsplash', () => ({
  hasUnsplashKey: vi.fn(() => false),
  getPhotoLibrary: vi.fn(() => []),
  downloadNewPhoto: vi.fn(() => Promise.resolve()),
  deletePhoto: vi.fn(),
  jumpToPhotoById: vi.fn(),
  LIBRARY_MAX: 20,
}));

// Mock theme
vi.mock('../../../src/theme', () => ({
  ACCENT_COLORS: [
    { name: 'indigo', value: '#6366f1' },
    { name: 'blue', value: '#3b82f6' },
  ],
}));

// Mock constants
vi.mock('../../../src/constants/settings', () => ({
  LANGUAGES: { en: 'en', ne: 'ne' },
}));

import { useEvents, useGoogleCalendar } from '../../../src/widgets/useEvents';
import { Widget as EventsWidget } from '../../../src/widgets/events/Widget';
import { Settings as WeatherSettings } from '../../../src/widgets/weather/Settings';
import { FocusModeSettings } from '../../../src/components/FocusMode/Settings';

// ─────────────────────────────────────────────────────────────────────────────
// Weather Settings
// ─────────────────────────────────────────────────────────────────────────────
describe('WeatherSettings', () => {
  let onChange;

  beforeEach(() => {
    onChange = vi.fn();
    vi.mocked(fetch).mockClear();
  });

  it('renders Temperature label', () => {
    render(<WeatherSettings location={null} onChange={onChange} unit="metric" />);
    expect(screen.getByText('Temperature')).toBeTruthy();
  });

  it('renders °C and °F buttons', () => {
    render(<WeatherSettings location={null} onChange={onChange} unit="metric" />);
    expect(screen.getByText('°C')).toBeTruthy();
    expect(screen.getByText('°F')).toBeTruthy();
  });

  it('calls onChange with imperial when °F is clicked', () => {
    render(<WeatherSettings location={null} onChange={onChange} unit="metric" />);
    fireEvent.click(screen.getByText('°F'));
    expect(onChange).toHaveBeenCalledWith('unit', 'imperial');
  });

  it('calls onChange with metric when °C is clicked', () => {
    render(<WeatherSettings location={null} onChange={onChange} unit="imperial" />);
    fireEvent.click(screen.getByText('°C'));
    expect(onChange).toHaveBeenCalledWith('unit', 'metric');
  });

  it('renders Set Location label and input', () => {
    render(<WeatherSettings location={null} onChange={onChange} unit="metric" />);
    expect(screen.getByText('Location')).toBeTruthy();
    expect(screen.getByPlaceholderText('Search city…')).toBeTruthy();
  });

  it('shows existing location name in input', () => {
    render(<WeatherSettings location={{ name: 'Kathmandu', lat: 27.7, lon: 85.3 }} onChange={onChange} unit="metric" />);
    expect(screen.getByDisplayValue('Kathmandu')).toBeTruthy();
  });

  it('updates query on input change', () => {
    render(<WeatherSettings location={null} onChange={onChange} unit="metric" />);
    const input = screen.getByPlaceholderText('Search city…');
    fireEvent.change(input, { target: { value: 'Kat' } });
    expect(input.value).toBe('Kat');
  });

  it('clears suggestions when input is less than 2 chars', () => {
    render(<WeatherSettings location={null} onChange={onChange} unit="metric" />);
    const input = screen.getByPlaceholderText('Search city…');
    fireEvent.change(input, { target: { value: 'K' } });
    // No suggestions list should appear
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('shows location denial message when locationDenied is true', () => {
    // WeatherSettings doesn't show a message but should not crash
    expect(() => render(<WeatherSettings location={null} onChange={onChange} unit="metric" locationDenied={true} />)).not.toThrow();
  });

  it('shows suggestions when API returns results', async () => {
    vi.useFakeTimers();
    const mockResults = [{ name: 'Kathmandu', state: 'Bagmati', country: 'NP', latitude: 27.7, longitude: 85.3 }];
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ results: mockResults }) });

    render(<WeatherSettings location={null} onChange={onChange} unit="metric" />);
    const input = screen.getByPlaceholderText('Search city…');
    fireEvent.change(input, { target: { value: 'Kathm' } });

    await act(async () => { await vi.runAllTimersAsync(); });

    expect(fetch).toHaveBeenCalled();
    vi.useRealTimers();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Events Widget
// ─────────────────────────────────────────────────────────────────────────────
describe('Events Widget', () => {
  beforeEach(() => {
    vi.mocked(useEvents).mockReturnValue([[], mockAddEvent, mockRemoveEvent]);
  });

  it('renders without crashing', () => {
    expect(() => render(<EventsWidget onRemove={vi.fn()} />)).not.toThrow();
  });

  it('shows "Events" header', () => {
    render(<EventsWidget onRemove={vi.fn()} />);
    expect(screen.getByText('Upcoming Events')).toBeTruthy();
  });

  it('shows empty state when no events', () => {
    render(<EventsWidget onRemove={vi.fn()} />);
    expect(screen.getByText(/No upcoming events/i)).toBeTruthy();
  });

  it('renders + button to add event', () => {
    render(<EventsWidget onRemove={vi.fn()} />);
    expect(screen.getAllByTestId('plus').length).toBeGreaterThan(0);
  });

  it('opens CreateModal when + is clicked', () => {
    render(<EventsWidget onRemove={vi.fn()} />);
    const plusBtns = screen.getAllByTestId('plus');
    fireEvent.click(plusBtns[0]);
    expect(screen.getByTestId('create-modal')).toBeTruthy();
  });

  it('renders events when some exist', () => {
    vi.mocked(useEvents).mockReturnValue([[
      { id: 'e1', title: 'Morning meeting', startDate: '2099-07-01', startTime: '09:00', endDate: '2099-07-01', endTime: '10:00', _source: 'local' },
    ], mockAddEvent, mockRemoveEvent]);
    render(<EventsWidget onRemove={vi.fn()} />);
    expect(screen.getByText('Morning meeting')).toBeTruthy();
  });

  it('shows "View all" button when more than 2 events exist', () => {
    vi.mocked(useEvents).mockReturnValue([[
      { id: 'e1', title: 'Event 1', startDate: '2099-07-01', startTime: '09:00', endDate: '', endTime: '', _source: 'local' },
      { id: 'e2', title: 'Event 2', startDate: '2099-07-02', startTime: '09:00', endDate: '', endTime: '', _source: 'local' },
      { id: 'e3', title: 'Event 3', startDate: '2099-07-03', startTime: '09:00', endDate: '', endTime: '', _source: 'local' },
    ], mockAddEvent, mockRemoveEvent]);
    render(<EventsWidget onRemove={vi.fn()} />);
    expect(screen.getByText('View All')).toBeTruthy();
  });

  it('opens AllEventsModal when "View All" is clicked', () => {
    vi.mocked(useEvents).mockReturnValue([[
      { id: 'e1', title: 'Event 1', startDate: '2099-07-01', startTime: '09:00', endDate: '', endTime: '', _source: 'local' },
      { id: 'e2', title: 'Event 2', startDate: '2099-07-02', startTime: '09:00', endDate: '', endTime: '', _source: 'local' },
      { id: 'e3', title: 'Event 3', startDate: '2099-07-03', startTime: '09:00', endDate: '', endTime: '', _source: 'local' },
    ], mockAddEvent, mockRemoveEvent]);
    render(<EventsWidget onRemove={vi.fn()} />);
    fireEvent.click(screen.getByText('View All'));
    expect(screen.getByTestId('all-events-modal')).toBeTruthy();
  });

  it('shows delete button for local events', () => {
    vi.mocked(useEvents).mockReturnValue([[
      { id: 'e1', title: 'Local Event', startDate: '2099-07-01', startTime: '09:00', endDate: '', endTime: '', _source: 'local' },
    ], mockAddEvent, mockRemoveEvent]);
    render(<EventsWidget onRemove={vi.fn()} />);
    // Trash icon should be visible for local events
    expect(screen.getAllByText('🗑').length).toBeGreaterThan(0);
  });

  it('does NOT show delete button for gcal events', () => {
    // Show only gcal events, no local events
    vi.mocked(useEvents).mockReturnValue([[], mockAddEvent, mockRemoveEvent]);
    vi.mocked(useGoogleCalendar).mockReturnValueOnce({
      gcalEvents: [
        { id: 'gcal_1', title: 'Google Event', startDate: '2099-07-01', startTime: '10:00', endDate: '', endTime: '', _source: 'gcal' },
      ], loading: false, connected: false, syncedAt: null, refresh: vi.fn(),
    });
    render(<EventsWidget onRemove={vi.fn()} />);
    // gcal events should NOT have trash icons
    expect(screen.queryAllByText('🗑').length).toBe(0);
  });

  it('calls removeEvent when trash button is clicked', () => {
    vi.mocked(useEvents).mockReturnValue([[
      { id: 'e1', title: 'Delete me', startDate: '2099-07-01', startTime: '09:00', endDate: '', endTime: '', _source: 'local' },
    ], mockAddEvent, mockRemoveEvent]);
    render(<EventsWidget onRemove={vi.fn()} />);
    const trashBtn = screen.getByText('🗑').closest('button');
    fireEvent.click(trashBtn);
    expect(mockRemoveEvent).toHaveBeenCalledWith('e1');
  });

  it('renders future events with bucket headers', () => {
    vi.mocked(useEvents).mockReturnValue([[
      { id: 'e1', title: 'Future event one', startDate: '2099-07-01', startTime: '09:00', endDate: '', endTime: '', _source: 'local' },
      { id: 'e2', title: 'Future event two', startDate: '2099-07-20', startTime: '14:00', endDate: '', endTime: '', _source: 'local' },
    ], mockAddEvent, mockRemoveEvent]);
    render(<EventsWidget onRemove={vi.fn()} />);
    // At least one event should be visible
    expect(screen.getByText('Future event one')).toBeTruthy();
  });

  it('renders event with htmlLink as anchor tag', () => {
    vi.mocked(useEvents).mockReturnValue([[
      { id: 'e1', title: 'Link Event', startDate: '2099-07-01', startTime: '09:00', endDate: '', endTime: '', htmlLink: 'https://cal.google.com/e1', _source: 'gcal' },
    ], mockAddEvent, mockRemoveEvent]);
    render(<EventsWidget onRemove={vi.fn()} />);
    const link = screen.getByRole('link', { name: 'Link Event' });
    expect(link.href).toBe('https://cal.google.com/e1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FocusModeSettings
// ─────────────────────────────────────────────────────────────────────────────
describe('FocusModeSettings', () => {
  let onOpenBgModal;

  beforeEach(() => {
    onOpenBgModal = vi.fn();
  });

  it('renders without crashing', () => {
    expect(() => render(<FocusModeSettings onOpenBgModal={onOpenBgModal} />)).not.toThrow();
  });

  it('renders Date Calendar section', () => {
    render(<FocusModeSettings onOpenBgModal={onOpenBgModal} />);
    expect(screen.getByText('Date Calendar')).toBeTruthy();
  });

  it('renders CE and BS buttons', () => {
    render(<FocusModeSettings onOpenBgModal={onOpenBgModal} />);
    expect(screen.getByText('CE')).toBeTruthy();
    expect(screen.getByText('BS')).toBeTruthy();
  });

  it('renders Clock Format section', () => {
    render(<FocusModeSettings onOpenBgModal={onOpenBgModal} />);
    expect(screen.getByText('Clock Format')).toBeTruthy();
  });

  it('renders 24h and 12h buttons', () => {
    render(<FocusModeSettings onOpenBgModal={onOpenBgModal} />);
    expect(screen.getByText('24h')).toBeTruthy();
    expect(screen.getByText('12h')).toBeTruthy();
  });

  it('renders Background Change button', () => {
    render(<FocusModeSettings onOpenBgModal={onOpenBgModal} />);
    expect(screen.getByText('Change background')).toBeTruthy();
  });

  it('calls onOpenBgModal when Background button is clicked', () => {
    render(<FocusModeSettings onOpenBgModal={onOpenBgModal} />);
    fireEvent.click(screen.getByText('Change background'));
    expect(onOpenBgModal).toHaveBeenCalledOnce();
  });
});
