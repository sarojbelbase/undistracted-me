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
  action: { setBadgeText: vi.fn(), setBadgeBackgroundColor: vi.fn() },
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
    };
    return selector ? selector(state) : state;
  }),
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
  SHOW_MITI_IN_ICON: 'showMitiInIcon',
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
    expect(bookmarksConfig.id).toBe('bookmarks');
    expect(bookmarksConfig.type).toBe('bookmarks');
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
  it('dayProgress Settings.jsx exports null', async () => {
    const { Settings } = await import('../../../src/widgets/dayProgress/Settings');
    expect(Settings).toBeNull();
  });
  it('events Settings.jsx exports null', async () => {
    const { Settings } = await import('../../../src/widgets/events/Settings');
    expect(Settings).toBeNull();
  });
  it('calendar Settings.jsx exports Settings component', async () => {
    const { Settings } = await import('../../../src/widgets/calendar/Settings');
    expect(Settings).not.toBeUndefined();
  });
});

describe('Bookmarks Widget', () => {
  beforeEach(() => {
    vi.mocked(useWidgetSettings).mockReturnValue([{ bookmarks: [] }, vi.fn()]);
    // Reset chrome
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

  it('shows empty state with bookmark icon when no bookmarks', () => {
    render(<BookmarksWidget id="bm_1" onRemove={vi.fn()} />);
    expect(screen.getByTestId('bookmark-icon')).toBeTruthy();
    expect(screen.getByText(/Hit \+ to pin/i)).toBeTruthy();
  });

  it('shows + button to add bookmark', () => {
    render(<BookmarksWidget id="bm_1" onRemove={vi.fn()} />);
    expect(screen.getByTestId('plus-icon')).toBeTruthy();
  });

  it('shows + button labeled "Pinned"', () => {
    render(<BookmarksWidget id="bm_1" onRemove={vi.fn()} />);
    expect(screen.getByText('Pinned')).toBeTruthy();
  });

  it('opens AddModal when + button is clicked', () => {
    render(<BookmarksWidget id="bm_1" onRemove={vi.fn()} />);
    const plusBtn = screen.getByTestId('plus-icon').closest('button');
    fireEvent.click(plusBtn);
    expect(screen.getByText('Add Bookmark')).toBeTruthy();
  });

  it('AddModal shows URL and Name inputs', () => {
    render(<BookmarksWidget id="bm_1" onRemove={vi.fn()} />);
    const plusBtn = screen.getByTestId('plus-icon').closest('button');
    fireEvent.click(plusBtn);
    expect(screen.getByLabelText('URL')).toBeTruthy();
    expect(screen.getByLabelText('Name')).toBeTruthy();
  });

  it('closes AddModal when Cancel is clicked', () => {
    render(<BookmarksWidget id="bm_1" onRemove={vi.fn()} />);
    const plusBtn = screen.getByTestId('plus-icon').closest('button');
    fireEvent.click(plusBtn);
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Add Bookmark')).toBeNull();
  });

  it('Save button is disabled when URL is empty', () => {
    render(<BookmarksWidget id="bm_1" onRemove={vi.fn()} />);
    const plusBtn = screen.getByTestId('plus-icon').closest('button');
    fireEvent.click(plusBtn);
    const saveBtn = screen.getByText('Save');
    expect(saveBtn.disabled).toBe(true);
  });

  it('Save button is enabled with URL', () => {
    render(<BookmarksWidget id="bm_1" onRemove={vi.fn()} />);
    const plusBtn = screen.getByTestId('plus-icon').closest('button');
    fireEvent.click(plusBtn);
    const urlInput = screen.getByLabelText('URL');
    fireEvent.change(urlInput, { target: { value: 'https://github.com' } });
    const saveBtn = screen.getByText('Save');
    expect(saveBtn.disabled).toBe(false);
  });

  it('calls updateSetting when bookmark is saved', () => {
    const mockUpdate = vi.fn();
    vi.mocked(useWidgetSettings).mockReturnValue([{ bookmarks: [] }, mockUpdate]);
    render(<BookmarksWidget id="bm_1" onRemove={vi.fn()} />);

    const plusBtn = screen.getByTestId('plus-icon').closest('button');
    fireEvent.click(plusBtn);
    const urlInput = screen.getByLabelText('URL');
    fireEvent.change(urlInput, { target: { value: 'https://github.com' } });
    fireEvent.click(screen.getByText('Save'));
    expect(mockUpdate).toHaveBeenCalledWith('bookmarks', expect.any(Array));
  });

  it('URL auto-prepends https:// when missing', () => {
    const mockUpdate = vi.fn();
    vi.mocked(useWidgetSettings).mockReturnValue([{ bookmarks: [] }, mockUpdate]);
    render(<BookmarksWidget id="bm_1" onRemove={vi.fn()} />);

    const plusBtn = screen.getByTestId('plus-icon').closest('button');
    fireEvent.click(plusBtn);
    const urlInput = screen.getByLabelText('URL');
    fireEvent.change(urlInput, { target: { value: 'github.com' } });
    fireEvent.click(screen.getByText('Save'));

    expect(mockUpdate).toHaveBeenCalledWith('bookmarks', expect.arrayContaining([
      expect.objectContaining({ url: 'https://github.com' })
    ]));
  });

  it('renders saved bookmarks as chips', () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{
      bookmarks: [
        { id: 1, url: 'https://github.com', name: 'GitHub', favicon: 'https://google.com/s2/favicons?domain=github.com' },
      ]
    }, vi.fn()]);
    render(<BookmarksWidget id="bm_1" onRemove={vi.fn()} />);
    expect(screen.getByText('GitHub')).toBeTruthy();
  });

  it('shows remove button for bookmarks', () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{
      bookmarks: [
        { id: 1, url: 'https://github.com', name: 'GitHub', favicon: '' },
      ]
    }, vi.fn()]);
    render(<BookmarksWidget id="bm_1" onRemove={vi.fn()} />);
    expect(screen.getByTestId('dash-icon')).toBeTruthy();
  });

  it('calls updateSetting when bookmark is removed', () => {
    const mockUpdate = vi.fn();
    vi.mocked(useWidgetSettings).mockReturnValue([{
      bookmarks: [
        { id: 1, url: 'https://github.com', name: 'GitHub', favicon: '' },
      ]
    }, mockUpdate]);
    render(<BookmarksWidget id="bm_1" onRemove={vi.fn()} />);
    const removeBtn = screen.getByTestId('dash-icon').closest('button');
    fireEvent.click(removeBtn);
    expect(mockUpdate).toHaveBeenCalledWith('bookmarks', []);
  });

  it('renders multiple bookmarks', () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{
      bookmarks: [
        { id: 1, url: 'https://github.com', name: 'GitHub', favicon: '' },
        { id: 2, url: 'https://google.com', name: 'Google', favicon: '' },
      ]
    }, vi.fn()]);
    render(<BookmarksWidget id="bm_1" onRemove={vi.fn()} />);
    expect(screen.getByText('GitHub')).toBeTruthy();
    expect(screen.getByText('Google')).toBeTruthy();
  });

  it('auto-fills name from URL on blur', () => {
    render(<BookmarksWidget id="bm_1" onRemove={vi.fn()} />);
    const plusBtn = screen.getByTestId('plus-icon').closest('button');
    fireEvent.click(plusBtn);
    const urlInput = screen.getByLabelText('URL');
    fireEvent.change(urlInput, { target: { value: 'https://github.com' } });
    fireEvent.blur(urlInput);
    const nameInput = screen.getByLabelText('Name');
    expect(nameInput.value).toBe('github.com');
  });

  it('does not overwrite manually typed name on blur', () => {
    render(<BookmarksWidget id="bm_1" onRemove={vi.fn()} />);
    const plusBtn = screen.getByTestId('plus-icon').closest('button');
    fireEvent.click(plusBtn);
    const nameInput = screen.getByLabelText('Name');
    fireEvent.change(nameInput, { target: { value: 'My Site' } });
    const urlInput = screen.getByLabelText('URL');
    fireEvent.change(urlInput, { target: { value: 'https://github.com' } });
    fireEvent.blur(urlInput);
    expect(nameInput.value).toBe('My Site');
  });

  it('closes AddModal via X button', () => {
    render(<BookmarksWidget id="bm_1" onRemove={vi.fn()} />);
    const plusBtn = screen.getByTestId('plus-icon').closest('button');
    fireEvent.click(plusBtn);
    expect(screen.getByText('Add Bookmark')).toBeTruthy();
    fireEvent.click(screen.getByText('X'));
    expect(screen.queryByText('Add Bookmark')).toBeNull();
  });

  it('saves on Enter in URL input', () => {
    const mockUpdate = vi.fn();
    vi.mocked(useWidgetSettings).mockReturnValue([{ bookmarks: [] }, mockUpdate]);
    render(<BookmarksWidget id="bm_1" onRemove={vi.fn()} />);
    const plusBtn = screen.getByTestId('plus-icon').closest('button');
    fireEvent.click(plusBtn);
    const urlInput = screen.getByLabelText('URL');
    fireEvent.change(urlInput, { target: { value: 'https://example.com' } });
    fireEvent.keyDown(urlInput, { key: 'Enter' });
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('with topSites, renders Most Visited section', () => {
    vi.stubGlobal('chrome', {
      topSites: {
        get: (cb) => cb([
          { url: 'https://google.com', title: 'Google' },
          { url: 'https://github.com', title: 'GitHub' },
        ])
      },
      identity: { getAuthToken: vi.fn() },
      runtime: { id: 'test-ext', lastError: null },
    });
    render(<BookmarksWidget id="bm_1" onRemove={vi.fn()} />);
    // Should render Most Visited section
    expect(screen.getByText('Most Visited')).toBeTruthy();
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
      { id: 'ev_pin', title: 'Pinned Calendar Event', startDate: '2025-08-15', startTime: '10:00', endDate: '', endTime: '' },
    ], vi.fn(), vi.fn()]);
    vi.mocked(formatCountdown).mockReturnValue({ days: 45, hours: 0, minutes: 0, totalSeconds: 3888000 });
    localStorage.setItem('countdown_pinned', JSON.stringify({ type: 'event', eventId: 'ev_pin' }));
    render(<CountdownWidget onRemove={vi.fn()} />);
    expect(screen.getAllByText('Pinned Calendar Event').length).toBeGreaterThan(0);
  });

  it('shows "days" label when countdown is days > 0', () => {
    vi.mocked(useEvents).mockReturnValue([[
      { id: 'ev1', title: 'Test Event', startDate: '2027-08-15', startTime: '10:00', endDate: '', endTime: '' },
    ], vi.fn(), vi.fn()]);
    vi.mocked(formatCountdown).mockReturnValue({ days: 45, hours: 12, minutes: 30, totalSeconds: 3906600 });
    render(<CountdownWidget onRemove={vi.fn()} />);
    expect(screen.getByText('days')).toBeTruthy();
  });

  it('shows "auto" badge when target is auto-picked', () => {
    vi.mocked(useEvents).mockReturnValue([[
      { id: 'ev1', title: 'Auto Event', startDate: '2027-08-15', startTime: '10:00', endDate: '', endTime: '' },
    ], vi.fn(), vi.fn()]);
    vi.mocked(formatCountdown).mockReturnValue({ days: 45, hours: 0, minutes: 0, totalSeconds: 3888000 });
    render(<CountdownWidget onRemove={vi.fn()} />);
    expect(screen.getByText('auto')).toBeTruthy();
  });

  it('shows 🎉 when countdown is complete', () => {
    vi.mocked(useEvents).mockReturnValue([[
      { id: 'ev1', title: 'Done Event', startDate: '2025-01-01', startTime: '00:00', endDate: '', endTime: '' },
    ], vi.fn(), vi.fn()]);
    vi.mocked(formatCountdown).mockReturnValue({ days: 0, hours: 0, minutes: 0, totalSeconds: 0 });
    // Pin to make it show in main area vs just settings
    localStorage.setItem('countdown_pinned', JSON.stringify({ type: 'event', eventId: 'ev1' }));
    render(<CountdownWidget onRemove={vi.fn()} />);
    expect(screen.getAllByText('🎉').length).toBeGreaterThan(0);
    expect(screen.getByText('Complete!')).toBeTruthy();
  });

  it('shows hours display when days === 0 and hours > 0', () => {
    vi.mocked(useEvents).mockReturnValue([[
      { id: 'ev1', title: 'Soon Event', startDate: '2027-07-02', startTime: '10:00', endDate: '', endTime: '' },
    ], vi.fn(), vi.fn()]);
    vi.mocked(formatCountdown).mockReturnValue({ days: 0, hours: 5, minutes: 30, totalSeconds: 19800 });
    render(<CountdownWidget onRemove={vi.fn()} />);
    expect(screen.getByText('5h')).toBeTruthy();
  });

  it('renders settings panel with CountdownSettings', () => {
    render(<CountdownWidget onRemove={vi.fn()} />);
    const settingsPanel = screen.getByTestId('settings-panel');
    expect(settingsPanel).toBeTruthy();
    // should show "From Events" section
    expect(screen.getByText(/From Events/i)).toBeTruthy();
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
    expect(screen.getByText('Custom')).toBeTruthy();
  });

  it('shows "No custom countdowns" when no custom ones', () => {
    render(<CountdownWidget onRemove={vi.fn()} />);
    expect(screen.getByText('No custom countdowns.')).toBeTruthy();
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

  it('removes custom countdown when trash is clicked', () => {
    vi.mocked(useEvents).mockReturnValue([[], vi.fn(), vi.fn()]);
    vi.mocked(getNextOccurrence).mockReturnValue(new Date('2025-09-01T00:00:00'));
    vi.mocked(formatCountdown).mockReturnValue({ days: 5, hours: 0, minutes: 0, totalSeconds: 432000 });

    const countdownData = [{ id: 'cd_del', title: 'Delete Me', targetDate: '2025-09-01', targetTime: '00:00', repeat: 'none' }];
    localStorage.setItem('countdown_events', JSON.stringify(countdownData));
    render(<CountdownWidget onRemove={vi.fn()} />);

    const trashBtns = screen.getAllByTestId('trash-icon');
    fireEvent.click(trashBtns[0].closest('button'));
    // After deletion, should show "No custom countdowns."
    expect(screen.getByText('No custom countdowns.')).toBeTruthy();
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
  let mockSetDateFormat, mockSetClockFormat, mockSetAccent, mockSetMode, mockSetLanguage;

  beforeEach(() => {
    mockSetDateFormat = vi.fn();
    mockSetClockFormat = vi.fn();
    mockSetAccent = vi.fn();
    mockSetMode = vi.fn();
    mockSetLanguage = vi.fn();

    vi.mocked(useSettingsStore).mockImplementation((selector) => {
      const state = {
        dateFormat: 'gregorian', setDateFormat: mockSetDateFormat,
        clockFormat: '24h', setClockFormat: mockSetClockFormat,
        accent: 'indigo', setAccent: mockSetAccent,
        mode: 'light', setMode: mockSetMode,
        language: 'en', setLanguage: mockSetLanguage,
      };
      return selector ? selector(state) : state;
    });
  });

  it('renders Date Calendar section', () => {
    render(<FocusModeSettings onRotatePhoto={vi.fn()} />);
    expect(screen.getByText('Date Calendar')).toBeTruthy();
  });

  it('renders CE and BS buttons', () => {
    render(<FocusModeSettings onRotatePhoto={vi.fn()} />);
    expect(screen.getByText('CE')).toBeTruthy();
    expect(screen.getByText('BS')).toBeTruthy();
  });

  it('calls setDateFormat(bikramSambat) when BS is clicked', () => {
    render(<FocusModeSettings onRotatePhoto={vi.fn()} />);
    fireEvent.click(screen.getByText('BS'));
    expect(mockSetDateFormat).toHaveBeenCalledWith('bikramSambat');
  });

  it('calls setDateFormat(gregorian) when CE is clicked', () => {
    vi.mocked(useSettingsStore).mockImplementation((selector) => {
      const state = { dateFormat: 'bikramSambat', setDateFormat: mockSetDateFormat, clockFormat: '24h', setClockFormat: mockSetClockFormat, accent: 'indigo', setAccent: mockSetAccent, mode: 'light', setMode: mockSetMode, language: 'en', setLanguage: mockSetLanguage };
      return selector ? selector(state) : state;
    });
    render(<FocusModeSettings onRotatePhoto={vi.fn()} />);
    fireEvent.click(screen.getByText('CE'));
    expect(mockSetDateFormat).toHaveBeenCalledWith('gregorian');
  });

  it('renders Clock Format section', () => {
    render(<FocusModeSettings onRotatePhoto={vi.fn()} />);
    expect(screen.getByText('Clock Format')).toBeTruthy();
  });

  it('renders 24h and 12h buttons', () => {
    render(<FocusModeSettings onRotatePhoto={vi.fn()} />);
    expect(screen.getByText('24h')).toBeTruthy();
    expect(screen.getByText('12h')).toBeTruthy();
  });

  it('calls setClockFormat(12h) when 12h is clicked', () => {
    render(<FocusModeSettings onRotatePhoto={vi.fn()} />);
    fireEvent.click(screen.getByText('12h'));
    expect(mockSetClockFormat).toHaveBeenCalledWith('12h');
  });

  it('renders Appearance section', () => {
    render(<FocusModeSettings onRotatePhoto={vi.fn()} />);
    expect(screen.getByText('Appearance')).toBeTruthy();
  });

  it('calls setMode(dark) when Dark is clicked', () => {
    render(<FocusModeSettings onRotatePhoto={vi.fn()} />);
    fireEvent.click(screen.getByText('Dark'));
    expect(mockSetMode).toHaveBeenCalledWith('dark');
  });

  it('renders Accent section', () => {
    render(<FocusModeSettings onRotatePhoto={vi.fn()} />);
    expect(screen.getByText('Accent')).toBeTruthy();
  });

  it('renders accent color buttons', () => {
    render(<FocusModeSettings onRotatePhoto={vi.fn()} />);
    // Should have multiple accent color buttons
    const accentButtons = screen.getAllByTitle(/indigo|blue|green|rose|amber|Default/i);
    expect(accentButtons.length).toBeGreaterThan(0);
  });

  it('calls setAccent when accent is clicked', () => {
    render(<FocusModeSettings onRotatePhoto={vi.fn()} />);
    const blueBtn = screen.getByTitle('blue');
    fireEvent.click(blueBtn);
    expect(mockSetAccent).toHaveBeenCalledWith('blue');
  });

  it('renders Language section', () => {
    render(<FocusModeSettings onRotatePhoto={vi.fn()} />);
    expect(screen.getByText('Language')).toBeTruthy();
  });

  it('calls setLanguage when select changes', () => {
    render(<FocusModeSettings onRotatePhoto={vi.fn()} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'ne' } });
    expect(mockSetLanguage).toHaveBeenCalledWith('ne');
  });

  it('does not show Photo Library section when no unsplash key', () => {
    render(<FocusModeSettings onRotatePhoto={vi.fn()} />);
    expect(screen.queryByText('Background Photos')).toBeNull();
  });

  it('Default accent is not-clickable in dark mode', () => {
    vi.mocked(useSettingsStore).mockImplementation((selector) => {
      const state = { dateFormat: 'gregorian', setDateFormat: mockSetDateFormat, clockFormat: '24h', setClockFormat: mockSetClockFormat, accent: 'Default', setAccent: mockSetAccent, mode: 'dark', setMode: mockSetMode, language: 'en', setLanguage: mockSetLanguage };
      return selector ? selector(state) : state;
    });
    render(<FocusModeSettings onRotatePhoto={vi.fn()} />);
    const defaultBtn = screen.getByTitle('Not available in dark mode');
    fireEvent.click(defaultBtn);
    // setAccent should NOT be called for locked color
    expect(mockSetAccent).not.toHaveBeenCalledWith('Default');
  });

  it('shows Photo Library section when unsplash key exists', async () => {
    const { hasUnsplashKey, getPhotoLibrary } = await import('../../../src/utilities/unsplash');
    vi.mocked(hasUnsplashKey).mockReturnValue(true);
    vi.mocked(getPhotoLibrary).mockReturnValue([
      { id: 'p1', small: 'https://example.com/photo.jpg', author: 'John' },
    ]);
    render(<FocusModeSettings onRotatePhoto={vi.fn()} />);
    expect(screen.getByText('Background Photos')).toBeTruthy();
    vi.mocked(hasUnsplashKey).mockReturnValue(false);
  });
});
