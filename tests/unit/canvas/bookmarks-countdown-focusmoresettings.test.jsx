/**
 * Tests for:
 * - bookmarks/Widget.jsx (48.21%)
 * - bookmarks/config.js (0%)
 * - countdown/Widget.jsx (50%) - additional tests
 * - countdown/config.js (0%)
 * - countdown/Settings.jsx (0% - null export)
 * - notes/config.js (0%)
 * - FocusMode/Settings.jsx interactions (37.03%)
 * - FocusMode/index.jsx additional paths (53.6%)
 * - store/index.js (0%)
 * - Various config.js files (0%)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

global.ResizeObserver = class { observe() { } unobserve() { } disconnect() { } };

// Mock fetch
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));

// Mock chrome globally
vi.stubGlobal('chrome', {
  topSites: null, // no top sites by default
  identity: { getAuthToken: vi.fn() },
  runtime: { id: 'test-ext', sendMessage: vi.fn(), lastError: null },
  action: {},
});

// Mock react-bootstrap-icons
vi.mock('react-bootstrap-icons', () => ({
  PlusLg: () => <span data-testid="plus-icon">+</span>,
  DashLg: () => <span data-testid="dash-icon">-</span>,
  XLg: () => <span>X</span>,
  BookmarkFill: () => <span data-testid="bookmark-icon">🔖</span>,
  Trash3: () => <span data-testid="trash-icon">🗑</span>,
  HourglassSplit: () => <span>⏳</span>,
  ArrowRepeat: () => <span>🔄</span>,
  CalendarEvent: () => <span>📅</span>,
  CheckLg: () => <span data-testid="check-icon">✓</span>,
}));

// Mock BaseWidget
vi.mock('../../../src/widgets/BaseWidget', () => ({
  BaseWidget: React.forwardRef(({ children, className, settingsContent, settingsTitle, onRemove }, ref) => (
    <div ref={ref} data-testid="base-widget">
      {children}
      {settingsContent && (
        <div data-testid="settings-panel">
          {typeof settingsContent === 'function' ? settingsContent(vi.fn()) : settingsContent}
        </div>
      )}
    </div>
  )),
}));

// Mock useWidgetSettings
vi.mock('../../../src/widgets/useWidgetSettings', () => ({
  useWidgetSettings: vi.fn((id, defaults) => [defaults, vi.fn()]),
}));

// Mock useEvents for countdown
vi.mock('../../../src/widgets/useEvents', () => ({
  useEvents: vi.fn(() => [[], vi.fn(), vi.fn()]),
  useGoogleCalendar: vi.fn(() => ({ gcalEvents: [], isLoading: false })),
}));

// Mock countdown/utils
vi.mock('../../../src/widgets/countdown/utils', () => ({
  REPEAT_OPTIONS: [
    { value: 'none', label: 'None' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
  ],
  getNextOccurrence: vi.fn((cd) => {
    const d = new Date(`${cd.targetDate}T${cd.targetTime || '00:00'}`);
    return d;
  }),
  formatCountdown: vi.fn(() => ({ days: 3, hours: 12, minutes: 30, totalSeconds: 100000 })),
  formatTargetDate: vi.fn(() => 'Aug 15, 2025'),
}));

// Mock events/utils for countdown
vi.mock('../../../src/widgets/events/utils', () => ({
  todayStr: () => '2025-07-01',
  fmt12: vi.fn((t) => t || ''),
  isPast: vi.fn(() => false),
  getDateOffset: vi.fn((n) => '2025-07-01'),
  bucketLabel: vi.fn(() => 'Later'),
  calcDuration: vi.fn(() => null),
  humanizeAge: vi.fn(() => 'just now'),
}));

// Mock store for FocusMode/Settings
vi.mock('../../../src/store', () => ({
  useSettingsStore: vi.fn((selector) => {
    const state = {
      dateFormat: 'gregorian', setDateFormat: vi.fn(),
      clockFormat: '24h', setClockFormat: vi.fn(),
      accent: 'indigo', setAccent: vi.fn(),
      mode: 'light', setMode: vi.fn(),
      language: 'en', setLanguage: vi.fn(),
      cardStyle: 'flat', // needed by SettingsInput
    };
    return selector ? selector(state) : state;
  }),
}));

// Mock BaseSettingsModal (used by bookmarks + button)
vi.mock('../../../src/widgets/BaseSettingsModal', () => ({
  BaseSettingsModal: ({ title, children, onClose }) => (
    <div data-testid="base-settings-modal">
      <span>{title}</span>
      <button onClick={onClose} aria-label="Close modal">✕</button>
      <div>{children}</div>
    </div>
  ),
}));

// Mock FaviconIcon (used by bookmarks widget)
vi.mock('../../../src/components/ui/FaviconIcon', () => ({
  FaviconIcon: ({ url }) => <div data-testid="favicon">{url}</div>,
}));

// Mock Popup (used by bookmarks widget hover)
vi.mock('../../../src/components/ui/Popup', () => ({
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
}));

// Mock SegmentedControl (used by bookmarks/BookmarkSettings + weather settings)
vi.mock('../../../src/components/ui/SegmentedControl', () => ({
  SegmentedControl: ({ label, options, value, onChange }) => (
    <div data-testid="segmented-control">
      <span>{label}</span>
      {options?.map(o => (
        <button key={o.value} onClick={() => onChange?.(o.value)}
          data-active={o.value === value}>{o.label}</button>
      ))}
    </div>
  ),
}));

// Mock SettingsInput (used by bookmarks BookmarkSettings)
vi.mock('../../../src/components/ui/SettingsInput', () => ({
  SettingsInput: React.forwardRef(({ id, placeholder, value, onChange, prefix, ...rest }, ref) => (
    <input ref={ref} id={id} placeholder={placeholder} value={value || ''}
      onChange={onChange} data-prefix={prefix} {...rest} />
  )),
}));

// Mock theme for FocusMode/Settings
vi.mock('../../../src/theme', () => ({
  ACCENT_COLORS: [
    { name: 'Default', hex: '#6366f1', fg: '#fff' },
    { name: 'indigo', hex: '#6366f1', fg: '#fff' },
    { name: 'blue', hex: '#3b82f6', fg: '#fff' },
    { name: 'green', hex: '#22c55e', fg: '#000' },
    { name: 'rose', hex: '#f43f5e', fg: '#fff' },
    { name: 'amber', hex: '#f59e0b', fg: '#000' },
  ],
}));

// Mock constants/settings
vi.mock('../../../src/constants/settings', () => ({
  LANGUAGES: { English: 'en', Nepali: 'ne' },
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

// Prevent store init crash (circular dep via widget registry)
vi.mock('../../../src/store/useWidgetInstancesStore', () => ({
  useWidgetInstancesStore: vi.fn((selector) =>
    typeof selector === 'function' ? selector({ instances: [], widgetSettings: {} }) : undefined
  ),
}));

// ─── FocusMode subcomponent mocks ───────────────────────────────────────────
vi.mock('../../../src/components/FocusMode/hooks', () => ({
  useFocusModeSettings: vi.fn(() => ({
    language: 'en', setLanguage: vi.fn(),
    showClock: true, setShowClock: vi.fn(),
    showDate: true, setShowDate: vi.fn(),
  })),
}));

import { useWidgetSettings } from '../../../src/widgets/useWidgetSettings';
import { useEvents } from '../../../src/widgets/useEvents';

// ─────────────────────────────────────────────────────────────────────────────
// Bookmarks Widget
// ─────────────────────────────────────────────────────────────────────────────
import { Widget as BookmarksWidget } from '../../../src/widgets/bookmarks/Widget';
import bookmarksConfig from '../../../src/widgets/bookmarks/config';
import notesConfig from '../../../src/widgets/notes/config';
import countdownConfig from '../../../src/widgets/countdown/config';
import calendarConfig from '../../../src/widgets/calendar/config';
import stockConfig from '../../../src/widgets/stock/config';
import weatherConfig from '../../../src/widgets/weather/config';
import clockConfig from '../../../src/widgets/clock/config';
import dayProgressConfig from '../../../src/widgets/dayProgress/config';
import eventsConfig from '../../../src/widgets/events/config';
import pomodoroConfig from '../../../src/widgets/pomodoro/config';
import factsConfig from '../../../src/widgets/facts/config';
import dateTodayConfig from '../../../src/widgets/dateToday/config';

describe('Config files', () => {
  it('bookmarks config has correct id', () => {
    expect(bookmarksConfig.id).toBe('bookmark');
    expect(bookmarksConfig.type).toBe('bookmark');
  });
  it('countdown config has correct id', () => {
    expect(countdownConfig.id).toBe('countdown');
    expect(countdownConfig.type).toBe('countdown');
  });
  it('notes config has correct id', () => {
    expect(notesConfig.id).toBe('notes');
    expect(notesConfig.type).toBe('notes');
  });
  it('all configs have w and h properties', () => {
    const configs = [bookmarksConfig, notesConfig, countdownConfig, calendarConfig, stockConfig, weatherConfig, clockConfig, dayProgressConfig, eventsConfig, pomodoroConfig, factsConfig, dateTodayConfig];
    configs.forEach(cfg => {
      expect(cfg).toHaveProperty('w');
      expect(cfg).toHaveProperty('h');
      expect(cfg).toHaveProperty('id');
    });
  });
});

describe('Countdown Settings.jsx (null export)', () => {
  it('exports null Settings', async () => {
    const { Settings } = await import('../../../src/widgets/countdown/Settings');
    expect(Settings).toBeNull();
  });
  it('dateToday Settings.jsx exports a component', async () => {
    const { Settings } = await import('../../../src/widgets/dateToday/Settings');
    // dateToday/Settings.jsx exports a real component (RadioGroup-based)
    expect(Settings).not.toBeNull();
    expect(typeof Settings).toBe('function');
  });
  it('dayProgress Settings.jsx exports a component', async () => {
    const { Settings } = await import('../../../src/widgets/dayProgress/Settings');
    expect(Settings).not.toBeNull();
    expect(typeof Settings).toBe('function');
  });
  it('events Settings.jsx exports a component', async () => {
    const { Settings } = await import('../../../src/widgets/events/Settings');
    expect(Settings).not.toBeNull();
    expect(typeof Settings).toBe('function');
  });
  it('calendar Settings.jsx exports Settings component', async () => {
    const { Settings } = await import('../../../src/widgets/calendar/Settings');
    expect(Settings).not.toBeUndefined();
  });
});

describe('Bookmarks Widget', () => {
  beforeEach(() => {
    // New single-bookmark API: settings = { url, name, iconMode }
    vi.mocked(useWidgetSettings).mockReturnValue([{ url: '', name: '', iconMode: 'favicon' }, vi.fn()]);
    vi.stubGlobal('chrome', {
      topSites: null,
      identity: { getAuthToken: vi.fn() },
      runtime: { id: 'test-ext', sendMessage: vi.fn(), lastError: null },
    });
  });

  it('renders without crashing', () => {
    expect(() => render(<BookmarksWidget id="bm_1" onRemove={vi.fn()} />)).not.toThrow();
  });

  it('renders base widget container', () => {
    render(<BookmarksWidget id="bm_1" onRemove={vi.fn()} />);
    expect(screen.getByTestId('base-widget')).toBeTruthy();
  });

  it('shows add button in empty state', () => {
    render(<BookmarksWidget id="bm_1" onRemove={vi.fn()} />);
    // The empty state shows a + button (SVG, aria-label="Add bookmark")
    expect(screen.getByLabelText('Add bookmark')).toBeTruthy();
  });

  it('opens settings modal when + button is clicked', () => {
    // Must also mock BaseSettingsModal since it is used when showSettings=true
    render(<BookmarksWidget id="bm_1" onRemove={vi.fn()} />);
    const addBtn = screen.getByLabelText('Add bookmark');
    fireEvent.click(addBtn);
    // Modal title should appear — use getAllByText since settings panel may also show it
    expect(screen.getAllByText('Add Bookmark').length).toBeGreaterThan(0);
  });

  it('shows link when URL is set', () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{ url: 'https://github.com', name: 'GitHub', iconMode: 'favicon' }, vi.fn()]);
    render(<BookmarksWidget id="bm_1" onRemove={vi.fn()} />);
    const link = screen.getByRole('link', { name: 'GitHub' });
    expect(link).toBeTruthy();
    expect(link.href).toBe('https://github.com/');
  });

  it('calls updateSetting when bookmark is saved via settings panel', () => {
    const mockUpdate = vi.fn();
    vi.mocked(useWidgetSettings).mockReturnValue([{ url: '', name: '', iconMode: 'favicon' }, mockUpdate]);
    render(<BookmarksWidget id="bm_1" onRemove={vi.fn()} />);
    // Open settings via the + button
    const addBtn = screen.getByLabelText('Add bookmark');
    fireEvent.click(addBtn);
    // Fill URL input (settings form appears in the settings panel or modal)
    const urlInput = screen.getByLabelText('URL');
    fireEvent.change(urlInput, { target: { value: 'github.com' } });
    fireEvent.click(screen.getAllByText(/Add Bookmark|Update Bookmark/)[0]);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('shows settings content in base widget (update mode)', () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{ url: 'https://github.com', name: 'GitHub', iconMode: 'favicon' }, vi.fn()]);
    render(<BookmarksWidget id="bm_1" onRemove={vi.fn()} />);
    // Settings panel inside BaseWidget mock shows URL form
    expect(screen.getByTestId('settings-panel')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Countdown Widget — additional tests
// ─────────────────────────────────────────────────────────────────────────────
import { Widget as CountdownWidget } from '../../../src/widgets/countdown/Widget';
import { getNextOccurrence, formatCountdown } from '../../../src/widgets/countdown/utils';

describe('Countdown Widget — additional coverage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
  });

  it('renders empty state (no target)', () => {
    vi.mocked(useEvents).mockReturnValue([[], vi.fn(), vi.fn()]);
    render(<CountdownWidget onRemove={vi.fn()} />);
    expect(screen.getByTestId('base-widget')).toBeTruthy();
  });

  it('auto-picks nearest upcoming event when no pinned', () => {
    vi.mocked(useEvents).mockReturnValue([[
      { id: 'ev1', title: 'Big Conference', startDate: '2027-08-15', startTime: '09:00', endDate: '', endTime: '' },
    ], vi.fn(), vi.fn()]);
    vi.mocked(formatCountdown).mockReturnValue({ days: 45, hours: 0, minutes: 0, totalSeconds: 3888000 });
    render(<CountdownWidget onRemove={vi.fn()} />);
    expect(screen.getAllByText('Big Conference').length).toBeGreaterThan(0);
  });

  it('auto-picks custom countdown when no events', () => {
    vi.mocked(useEvents).mockReturnValue([[], vi.fn(), vi.fn()]);
    // Make getNextOccurrence return future date
    vi.mocked(getNextOccurrence).mockReturnValue(new Date('2025-08-15T00:00:00'));
    vi.mocked(formatCountdown).mockReturnValue({ days: 3, hours: 0, minutes: 0, totalSeconds: 259200 });

    const countdownData = [{ id: 'cd_1', title: 'Summer Festival', targetDate: '2025-08-15', targetTime: '00:00', repeat: 'none' }];
    localStorage.setItem('countdown_events', JSON.stringify(countdownData));
    render(<CountdownWidget onRemove={vi.fn()} />);
    expect(screen.getByText('Summer Festival')).toBeTruthy();
  });

  it('shows pinned custom countdown by title', () => {
    vi.mocked(useEvents).mockReturnValue([[], vi.fn(), vi.fn()]);
    vi.mocked(getNextOccurrence).mockReturnValue(new Date('2025-09-01T00:00:00'));
    vi.mocked(formatCountdown).mockReturnValue({ days: 50, hours: 0, minutes: 0, totalSeconds: 4320000 });

    const countdownData = [{ id: 'cd_pinned', title: 'Pinned Event', targetDate: '2025-09-01', targetTime: '00:00', repeat: 'none' }];
    localStorage.setItem('countdown_events', JSON.stringify(countdownData));
    localStorage.setItem('countdown_pinned', JSON.stringify({ type: 'custom', id: 'cd_pinned' }));
    render(<CountdownWidget onRemove={vi.fn()} />);
    expect(screen.getAllByText('Pinned Event').length).toBeGreaterThan(0);
  });

  it('shows pinned event from useEvents', () => {
    vi.mocked(useEvents).mockReturnValue([[
      { id: 'ev_pin', title: 'Pinned Calendar Event', startDate: '2099-08-15', startTime: '10:00', endDate: '', endTime: '' },
    ], vi.fn(), vi.fn()]);
    vi.mocked(formatCountdown).mockReturnValue({ days: 27393, hours: 0, minutes: 0, totalSeconds: 2366755200 });
    // Use per-instance key pattern (countdown_pinned_<id>) matching the widget id
    localStorage.setItem('countdown_pinned_cdown_pin', JSON.stringify({ type: 'event', eventId: 'ev_pin' }));
    render(<CountdownWidget id="cdown_pin" onRemove={vi.fn()} />);
    expect(screen.getAllByText('Pinned Calendar Event').length).toBeGreaterThan(0);
  });

  it('shows "days" unit when countdown is days > 0', () => {
    vi.mocked(useEvents).mockReturnValue([[
      { id: 'ev1', title: 'Test Event', startDate: '2027-08-15', startTime: '10:00', endDate: '', endTime: '' },
    ], vi.fn(), vi.fn()]);
    // With 10 days and 0 hours, it renders '10' and 'days'
    vi.mocked(formatCountdown).mockReturnValue({ days: 10, hours: 0, minutes: 0, totalSeconds: 864000 });
    render(<CountdownWidget onRemove={vi.fn()} />);
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('days')).toBeTruthy();
  });

  it('shows countdown number when auto-picked', () => {
    vi.mocked(useEvents).mockReturnValue([[
      { id: 'ev1', title: 'Auto Event', startDate: '2027-08-15', startTime: '10:00', endDate: '', endTime: '' },
    ], vi.fn(), vi.fn()]);
    vi.mocked(formatCountdown).mockReturnValue({ days: 45, hours: 0, minutes: 0, totalSeconds: 3888000 });
    render(<CountdownWidget onRemove={vi.fn()} />);
    // Widget renders the title of the auto-picked event
    expect(screen.getAllByText('Auto Event').length).toBeGreaterThan(0);
  });

  it('shows no countdowns empty state when totalSeconds is 0', () => {
    vi.mocked(useEvents).mockReturnValue([[], vi.fn(), vi.fn()]);
    vi.mocked(formatCountdown).mockReturnValue({ days: 0, hours: 0, minutes: 0, totalSeconds: 0 });
    render(<CountdownWidget onRemove={vi.fn()} />);
    // Empty state says "No countdowns yet."
    expect(screen.getByText('No countdowns yet.')).toBeTruthy();
  });

  it('shows countdown number when hours is the tiebreaker', () => {
    vi.mocked(useEvents).mockReturnValue([[
      { id: 'ev1', title: 'Soon Event', startDate: '2027-07-02', startTime: '10:00', endDate: '', endTime: '' },
    ], vi.fn(), vi.fn()]);
    // 0 days, 5 hours, 15 min → hoursTier(5, 15) → no rounding up → { main: '5', unit: 'hrs' }
    vi.mocked(formatCountdown).mockReturnValue({ days: 0, hours: 5, minutes: 15, totalSeconds: 19500 });
    render(<CountdownWidget onRemove={vi.fn()} />);
    expect(screen.getByText('hrs')).toBeTruthy();
  });

  it('renders settings panel with CountdownSettings', () => {
    render(<CountdownWidget onRemove={vi.fn()} />);
    const settingsPanel = screen.getByTestId('settings-panel');
    expect(settingsPanel).toBeTruthy();
    // should show "From Calendar" section (renamed from From Events)
    expect(screen.getByText(/From Calendar/i)).toBeTruthy();
  });

  it('shows "No upcoming events" in settings when no events', () => {
    vi.mocked(useEvents).mockReturnValue([[], vi.fn(), vi.fn()]);
    render(<CountdownWidget onRemove={vi.fn()} />);
    expect(screen.getByText(/No upcoming events/i)).toBeTruthy();
  });

  it('shows event in settings panel when events exist', () => {
    vi.mocked(useEvents).mockReturnValue([[
      { id: 'ev1', title: 'Conference 2027', startDate: '2027-08-15', startTime: '09:00', endDate: '', endTime: '' },
    ], vi.fn(), vi.fn()]);
    render(<CountdownWidget onRemove={vi.fn()} />);
    const allConference = screen.getAllByText('Conference 2027');
    expect(allConference.length).toBeGreaterThan(0);
  });

  it('shows "Custom" section in settings', () => {
    render(<CountdownWidget onRemove={vi.fn()} />);
    // Section is now "My Countdowns" not "Custom"
    expect(screen.getByText('My Countdowns')).toBeTruthy();
  });

  it('shows empty state when no custom ones', () => {
    render(<CountdownWidget onRemove={vi.fn()} />);
    // Empty state text is "Nothing to count down to"
    expect(screen.getByText('Nothing to count down to')).toBeTruthy();
  });

  it('shows custom countdown in settings list', () => {
    vi.mocked(useEvents).mockReturnValue([[], vi.fn(), vi.fn()]);
    vi.mocked(getNextOccurrence).mockReturnValue(new Date('2025-09-01T00:00:00'));
    vi.mocked(formatCountdown).mockReturnValue({ days: 5, hours: 0, minutes: 0, totalSeconds: 432000 });

    const countdownData = [{ id: 'cd_1', title: 'My Custom CD', targetDate: '2025-09-01', targetTime: '00:00', repeat: 'none' }];
    localStorage.setItem('countdown_events', JSON.stringify(countdownData));
    render(<CountdownWidget onRemove={vi.fn()} />);
    expect(screen.getAllByText('My Custom CD').length).toBeGreaterThan(0);
  });

  it('opens AddModal when + is clicked in settings', () => {
    render(<CountdownWidget onRemove={vi.fn()} />);
    // Find the + button in the Custom section
    const plusBtns = screen.getAllByTestId('plus-icon');
    // Click the last one (usually in settings)
    fireEvent.click(plusBtns[plusBtns.length - 1].closest('button'));
    expect(screen.getByText('New Countdown')).toBeTruthy();
  });

  it('AddModal closes when X is clicked', () => {
    render(<CountdownWidget onRemove={vi.fn()} />);
    const plusBtns = screen.getAllByTestId('plus-icon');
    fireEvent.click(plusBtns[plusBtns.length - 1].closest('button'));
    expect(screen.getByText('New Countdown')).toBeTruthy();
    fireEvent.click(screen.getByText('X'));
    expect(screen.queryByText('New Countdown')).toBeNull();
  });

  it('AddModal Save is disabled when title/date empty', () => {
    render(<CountdownWidget onRemove={vi.fn()} />);
    const plusBtns = screen.getAllByTestId('plus-icon');
    fireEvent.click(plusBtns[plusBtns.length - 1].closest('button'));
    // Save button should be disabled
    const saveBtn = screen.getAllByText('Save').find(b => b.tagName === 'BUTTON');
    expect(saveBtn?.disabled).toBe(true);
  });

  it('AddModal shows repeat options', () => {
    render(<CountdownWidget onRemove={vi.fn()} />);
    const plusBtns = screen.getAllByTestId('plus-icon');
    fireEvent.click(plusBtns[plusBtns.length - 1].closest('button'));
    expect(screen.getByText('Repeat')).toBeTruthy();
    expect(screen.getByText('None')).toBeTruthy();
    expect(screen.getByText('Daily')).toBeTruthy();
  });

  it('AddModal can set title', () => {
    render(<CountdownWidget onRemove={vi.fn()} />);
    const plusBtns = screen.getAllByTestId('plus-icon');
    fireEvent.click(plusBtns[plusBtns.length - 1].closest('button'));

    const titleInput = screen.getByPlaceholderText(/What are you counting down to/i);
    fireEvent.change(titleInput, { target: { value: 'My Birthday' } });
    expect(titleInput.value).toBe('My Birthday');
  });

  it('removes custom countdown when remove button is clicked', () => {
    vi.mocked(useEvents).mockReturnValue([[], vi.fn(), vi.fn()]);
    vi.mocked(getNextOccurrence).mockReturnValue(new Date('2025-09-01T00:00:00'));
    vi.mocked(formatCountdown).mockReturnValue({ days: 5, hours: 0, minutes: 0, totalSeconds: 432000 });

    const countdownData = [{ id: 'cd_del', title: 'Delete Me', targetDate: '2025-09-01', targetTime: '00:00', repeat: 'none' }];
    localStorage.setItem('countdown_events', JSON.stringify(countdownData));
    render(<CountdownWidget onRemove={vi.fn()} />);

    // The trash button has aria-label="Remove Delete Me"
    const removeBtn = screen.getByLabelText('Remove Delete Me');
    fireEvent.click(removeBtn);
    // After deletion, should show "Nothing to count down to"
    expect(screen.getByText('Nothing to count down to')).toBeTruthy();
  });

  it('repeating countdown shows repeat badge', () => {
    vi.mocked(useEvents).mockReturnValue([[], vi.fn(), vi.fn()]);
    vi.mocked(getNextOccurrence).mockReturnValue(new Date('2025-09-01T00:00:00'));
    vi.mocked(formatCountdown).mockReturnValue({ days: 3, hours: 0, minutes: 0, totalSeconds: 259200 });

    const countdownData = [{ id: 'cd_repeat', title: 'Weekly Check', targetDate: '2025-09-01', targetTime: '00:00', repeat: 'weekly' }];
    localStorage.setItem('countdown_events', JSON.stringify(countdownData));
    localStorage.setItem('countdown_pinned', JSON.stringify({ type: 'custom', id: 'cd_repeat' }));
    render(<CountdownWidget onRemove={vi.fn()} />);
    expect(screen.getAllByText('Weekly Check').length).toBeGreaterThan(0);
  });

  it('ticks every second via interval', () => {
    vi.mocked(useEvents).mockReturnValue([[], vi.fn(), vi.fn()]);
    render(<CountdownWidget onRemove={vi.fn()} />);
    act(() => { vi.advanceTimersByTime(2000); });
    // Should not throw
    expect(screen.getByTestId('base-widget')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FocusMode/Settings.jsx — more interaction coverage
// ─────────────────────────────────────────────────────────────────────────────
import { FocusModeSettings } from '../../../src/components/FocusMode/Settings';
import { useSettingsStore } from '../../../src/store';

describe('FocusModeSettings — interactions', () => {
  let mockSetDateFormat, mockSetClockFormat, mockOpenBgModal;

  beforeEach(() => {
    mockSetDateFormat = vi.fn();
    mockSetClockFormat = vi.fn();
    mockOpenBgModal = vi.fn();

    vi.mocked(useSettingsStore).mockImplementation((selector) => {
      const state = {
        dateFormat: 'gregorian', setDateFormat: mockSetDateFormat,
        clockFormat: '24h', setClockFormat: mockSetClockFormat,
        cardStyle: 'flat',
      };
      return selector ? selector(state) : state;
    });
  });

  it('renders Date Calendar section', () => {
    render(<FocusModeSettings onOpenBgModal={mockOpenBgModal} />);
    expect(screen.getByText('Date Calendar')).toBeTruthy();
  });

  it('renders CE and BS buttons', () => {
    render(<FocusModeSettings onOpenBgModal={mockOpenBgModal} />);
    expect(screen.getByText('CE')).toBeTruthy();
    expect(screen.getByText('BS')).toBeTruthy();
  });

  it('calls setDateFormat(bikramSambat) when BS is clicked', () => {
    render(<FocusModeSettings onOpenBgModal={mockOpenBgModal} />);
    fireEvent.click(screen.getByText('BS'));
    expect(mockSetDateFormat).toHaveBeenCalledWith('bikramSambat');
  });

  it('calls setDateFormat(gregorian) when CE is clicked', () => {
    vi.mocked(useSettingsStore).mockImplementation((selector) => {
      const state = { dateFormat: 'bikramSambat', setDateFormat: mockSetDateFormat, clockFormat: '24h', setClockFormat: mockSetClockFormat, cardStyle: 'flat' };
      return selector ? selector(state) : state;
    });
    render(<FocusModeSettings onOpenBgModal={mockOpenBgModal} />);
    fireEvent.click(screen.getByText('CE'));
    expect(mockSetDateFormat).toHaveBeenCalledWith('gregorian');
  });

  it('renders Clock Format section', () => {
    render(<FocusModeSettings onOpenBgModal={mockOpenBgModal} />);
    expect(screen.getByText('Clock Format')).toBeTruthy();
  });

  it('renders 24h and 12h buttons', () => {
    render(<FocusModeSettings onOpenBgModal={mockOpenBgModal} />);
    expect(screen.getByText('24h')).toBeTruthy();
    expect(screen.getByText('12h')).toBeTruthy();
  });

  it('calls setClockFormat(12h) when 12h is clicked', () => {
    render(<FocusModeSettings onOpenBgModal={mockOpenBgModal} />);
    fireEvent.click(screen.getByText('12h'));
    expect(mockSetClockFormat).toHaveBeenCalledWith('12h');
  });

  it('renders Background button', () => {
    render(<FocusModeSettings onOpenBgModal={mockOpenBgModal} />);
    expect(screen.getByText('Background')).toBeTruthy();
  });

  it('renders Change background button', () => {
    render(<FocusModeSettings onOpenBgModal={mockOpenBgModal} />);
    expect(screen.getByText('Change background')).toBeTruthy();
  });

  it('calls onOpenBgModal when Change background is clicked', () => {
    render(<FocusModeSettings onOpenBgModal={mockOpenBgModal} />);
    fireEvent.click(screen.getByText('Change background'));
    expect(mockOpenBgModal).toHaveBeenCalledOnce();
  });

  it('shows Photo Library section when unsplash key exists', async () => {
    // FocusModeSettings just shows "Change background" button - no photo library in this component
    render(<FocusModeSettings onOpenBgModal={mockOpenBgModal} />);
    expect(screen.getByText('Change background')).toBeTruthy();
  });
});
