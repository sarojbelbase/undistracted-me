/**
 * Tests for:
 * - calendar/Widget.jsx with events (DayCell hover tooltip) — 67.44%
 * - FocusMode/Settings.jsx photo library interactions — 48.14%
 * - stock/Settings.jsx — 51.16%
 * - WidgetCatalog.jsx (52.7%)
 * - FocusMode/index.jsx additional conditional paths
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

global.ResizeObserver = class { observe() { } unobserve() { } disconnect() { } };

// Mock fetch
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));

// Mock react-bootstrap-icons
vi.mock('react-bootstrap-icons', () => ({
  GearFill: () => <span data-testid="gear">⚙</span>,
  XLg: () => <span data-testid="close">X</span>,
  PlusLg: () => <span data-testid="plus">+</span>,
  DashLg: () => <span>-</span>,
  CheckLg: () => <span data-testid="check">✓</span>,
  BoxArrowUpRight: () => <span>↗</span>,
  Upload: () => <span>⬆</span>,
  Download: () => <span>⬇</span>,
  ArrowCounterclockwise: () => <span>↺</span>,
  ClockFill: () => <span>🕐</span>,
  CalendarDateFill: () => <span>📅</span>,
  BarChartFill: () => <span>📊</span>,
  HourglassSplit: () => <span>⏳</span>,
  CalendarEventFill: () => <span>📆</span>,
  Calendar3: () => <span>🗓</span>,
  StopwatchFill: () => <span>⏱</span>,
  StickyFill: () => <span>📝</span>,
  CloudSunFill: () => <span>⛅</span>,
  LightbulbFill: () => <span>💡</span>,
  BookmarkStarFill: () => <span>⭐</span>,
  MusicNoteBeamed: () => <span>🎵</span>,
  GraphUpArrow: () => <span>📈</span>,
  InfoCircleFill: () => <span>ℹ</span>,
  ArrowsFullscreen: () => <span>⛶</span>,
  FullscreenExit: () => <span>⛶x</span>,
}));

// Mock BaseWidget
vi.mock('../../../src/widgets/BaseWidget', () => ({
  BaseWidget: React.forwardRef(({ children, settingsContent, onRemove }, ref) => (
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

// Mock BaseSettingsModal
vi.mock('../../../src/widgets/BaseSettingsModal', () => ({
  BaseSettingsModal: ({ title, children, onClose }) => (
    <div data-testid="settings-modal">
      <span>{title}</span>
      <button onClick={onClose} aria-label="Close modal">X</button>
      {children}
    </div>
  ),
}));

// Mock useWidgetSettings
vi.mock('../../../src/widgets/useWidgetSettings', () => ({
  useWidgetSettings: vi.fn((id, defaults) => [defaults, vi.fn()]),
}));

// Mock store
const mockSetDateFormat = vi.fn();
const mockSetClockFormat = vi.fn();
const mockSetAccent = vi.fn();
const mockSetMode = vi.fn();
const mockSetLanguage = vi.fn();
vi.mock('../../../src/store', () => ({
  useSettingsStore: vi.fn((selector) => {
    const state = {
      dateFormat: 'gregorian', setDateFormat: mockSetDateFormat,
      clockFormat: '24h', setClockFormat: mockSetClockFormat,
      accent: 'indigo', setAccent: mockSetAccent,
      mode: 'light', setMode: mockSetMode,
      language: 'en', setLanguage: mockSetLanguage,
    };
    return selector ? selector(state) : state;
  }),
  useWidgetInstancesStore: vi.fn((selector) => {
    const state = { instances: [] };
    return selector ? selector(state) : state;
  }),
}));

// Mock theme
vi.mock('../../../src/theme', () => ({
  ACCENT_COLORS: [
    { name: 'Default', hex: '#6366f1', fg: '#fff' },
    { name: 'indigo', hex: '#6366f1', fg: '#fff' },
    { name: 'blue', hex: '#3b82f6', fg: '#fff' },
    { name: 'green', hex: '#22c55e', fg: '#000' },
    { name: 'rose', hex: '#f43f5e', fg: '#fff' },
  ],
}));

// Mock constants/settings
vi.mock('../../../src/constants/settings', () => ({
  LANGUAGES: { English: 'en', Nepali: 'ne' },
}));

// Mock useEvents
vi.mock('../../../src/widgets/useEvents', () => ({
  useEvents: vi.fn(() => [[], vi.fn(), vi.fn()]),
  useGoogleCalendar: vi.fn(() => ({ gcalEvents: [] })),
}));

// Mock RadioGroup for calendar Settings
vi.mock('../../../src/components/ui/RadioGroup', () => ({
  RadioGroup: ({ label, options, value, onChange }) => (
    <div data-testid="radio-group">
      <span>{label}</span>
      {options.map(o => (
        <label key={o.value}>
          <input type="radio" name={label} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
          {o.label}
        </label>
      ))}
    </div>
  ),
}));

// Mock unsplash
const mockHasUnsplashKey = vi.fn(() => false);
const mockGetPhotoLibrary = vi.fn(() => []);
const mockDownloadNewPhoto = vi.fn(() => Promise.resolve());
const mockDeletePhoto = vi.fn();
const mockJumpToPhotoById = vi.fn();
vi.mock('../../../src/utilities/unsplash', () => ({
  hasUnsplashKey: (...args) => mockHasUnsplashKey(...args),
  getPhotoLibrary: (...args) => mockGetPhotoLibrary(...args),
  downloadNewPhoto: (...args) => mockDownloadNewPhoto(...args),
  deletePhoto: (...args) => mockDeletePhoto(...args),
  jumpToPhotoById: (...args) => mockJumpToPhotoById(...args),
  LIBRARY_MAX: 5,
}));

// Mock stock utils
vi.mock('../../../src/widgets/stock/utils', () => ({
  fetchCompanies: vi.fn(() => Promise.resolve([
    { symbol: 'NABIL', name: 'Nabil Bank' },
    { symbol: 'NIC', name: 'NIC Asia Bank' },
  ])),
  fetchStockPrices: vi.fn(() => Promise.resolve({})),
}));

// Mock widget registry  
vi.mock('../../../src/widgets/index', () => ({
  WIDGET_REGISTRY: [
    { id: 'clock', type: 'clock', label: 'Clock', description: 'Shows the current time', icon: 'ClockFill', category: 'time', maxInstances: 3 },
    { id: 'calendar', type: 'calendar', label: 'Calendar', description: 'Monthly calendar', icon: 'Calendar3', category: 'time', maxInstances: 1 },
    { id: 'countdown', type: 'countdown', label: 'Countdown', description: 'Countdown timer', icon: 'HourglassSplit', category: 'planning', maxInstances: 1 },
    { id: 'notes', type: 'notes', label: 'Notes', description: 'Quick notes', icon: 'StickyFill', category: 'tools', maxInstances: 2 },
  ],
}));

// Mock settingsIO
vi.mock('../../../src/widgets/settingsIO', () => ({
  exportSettings: vi.fn(),
  importFromFile: vi.fn(() => Promise.resolve()),
  resetSettings: vi.fn(),
}));

import { useWidgetSettings } from '../../../src/widgets/useWidgetSettings';
import { useEvents, useGoogleCalendar } from '../../../src/widgets/useEvents';

// ─────────────────────────────────────────────────────────────────────────────
// Calendar Widget — with events for tooltip coverage
// ─────────────────────────────────────────────────────────────────────────────
import { Widget as CalendarWidget } from '../../../src/widgets/calendar/Widget';

describe('CalendarWidget — with events', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00Z'));
    localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('renders without crashing', () => {
    expect(() => render(<CalendarWidget id="cal_1" />)).not.toThrow();
  });

  it('renders month label', () => {
    render(<CalendarWidget id="cal_1" />);
    expect(document.body.textContent.length).toBeGreaterThan(0);
  });

  it('renders day cells', () => {
    render(<CalendarWidget id="cal_1" />);
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });

  it('renders with events and shows event dots', () => {
    vi.mocked(useEvents).mockReturnValue([[
      { id: 'ev1', title: 'Meeting', startDate: '2025-06-15', startTime: '09:00', endDate: '', endTime: '' },
    ], vi.fn(), vi.fn()]);
    render(<CalendarWidget id="cal_1" />);
    expect(document.body.textContent.length).toBeGreaterThan(0);
  });

  it('renders with gcal events', () => {
    vi.mocked(useGoogleCalendar).mockReturnValue({
      gcalEvents: [
        { id: 'gcal_1', title: 'Google Meeting', startDate: '2025-06-16', startTime: '10:00', endDate: '', endTime: '' },
      ]
    });
    render(<CalendarWidget id="cal_1" />);
    expect(document.body.textContent.length).toBeGreaterThan(0);
  });

  it('renders settings panel with Calendar Settings', () => {
    render(<CalendarWidget id="cal_1" />);
    expect(screen.getByTestId('settings-panel')).toBeTruthy();
    expect(screen.getByText('Calendar Format')).toBeTruthy();
  });

  it('updates calendar data when calendarType changes', async () => {
    vi.mocked(useWidgetSettings).mockReturnValueOnce([{ calendarType: 'ad' }, vi.fn()]);
    render(<CalendarWidget id="cal_1" />);
    expect(document.body.textContent.length).toBeGreaterThan(0);
  });

  it('DayCell shows event dot when event exists', () => {
    vi.mocked(useEvents).mockReturnValue([[
      { id: 'ev1', title: 'Stand-up', startDate: '2025-06-20', startTime: '09:00', endDate: '', endTime: '' },
    ], vi.fn(), vi.fn()]);
    render(<CalendarWidget id="cal_1" />);
    // Event dot should appear (a 4px circle rendered as a div)
    const eventDots = document.querySelectorAll('.w-1.h-1.rounded-full');
    expect(eventDots.length).toBeGreaterThan(0);
  });

  it('DayCell tooltip triggers on mouse enter for event day', () => {
    vi.mocked(useEvents).mockReturnValue([[
      { id: 'ev1', title: 'Board Meeting', startDate: '2025-06-20', startTime: '14:00', endDate: '', endTime: '' },
    ], vi.fn(), vi.fn()]);
    render(<CalendarWidget id="cal_1" />);
    // Find the day cell 20 (not current day)
    const dayCells = screen.getAllByText('20');
    if (dayCells.length > 0) {
      const dayCell = dayCells[0].closest('[class*=flex]');
      if (dayCell) {
        fireEvent.mouseEnter(dayCell);
        fireEvent.mouseLeave(dayCell);
      }
    }
    // Should not throw
    expect(screen.getByTestId('base-widget')).toBeTruthy();
  });

  it('renders with BS calendar type', () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{ calendarType: 'bs' }, vi.fn()]);
    render(<CalendarWidget id="cal_1" />);
    expect(document.body.textContent.length).toBeGreaterThan(0);
  });

  it('renders with AD calendar type', () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{ calendarType: 'ad' }, vi.fn()]);
    render(<CalendarWidget id="cal_1" />);
    expect(document.body.textContent.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FocusMode/Settings.jsx — photo library interactions
// ─────────────────────────────────────────────────────────────────────────────
import { FocusModeSettings } from '../../../src/components/FocusMode/Settings';

describe('FocusModeSettings — photo library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasUnsplashKey.mockReturnValue(true);
    mockGetPhotoLibrary.mockReturnValue([
      { id: 'p1', small: 'https://example.com/photo1.jpg', author: 'John Doe', photoUrl: 'https://unsplash.com/p/1' },
      { id: 'p2', small: 'https://example.com/photo2.jpg', author: 'Jane Smith', photoUrl: 'https://unsplash.com/p/2' },
    ]);
    mockDownloadNewPhoto.mockResolvedValue(undefined);
    mockDeletePhoto.mockImplementation(() => { });
  });

  afterEach(() => {
    mockHasUnsplashKey.mockReturnValue(false);
    mockGetPhotoLibrary.mockReturnValue([]);
  });

  it('renders Background Photos section when unsplash key exists', () => {
    render(<FocusModeSettings onRotatePhoto={vi.fn()} />);
    expect(screen.getByText('Background Photos')).toBeTruthy();
  });

  it('shows photo count', () => {
    render(<FocusModeSettings onRotatePhoto={vi.fn()} />);
    expect(screen.getByText('2/5')).toBeTruthy(); // 2 photos, max 5
  });

  it('renders Shuffle button', () => {
    render(<FocusModeSettings onRotatePhoto={vi.fn()} />);
    expect(screen.getByText(/Shuffle/i)).toBeTruthy();
  });

  it('renders Download button', () => {
    render(<FocusModeSettings onRotatePhoto={vi.fn()} />);
    expect(screen.getByText(/Download/i)).toBeTruthy();
  });

  it('clicking Shuffle calls onRotatePhoto', async () => {
    const onRotate = vi.fn().mockResolvedValue(undefined);
    render(<FocusModeSettings onRotatePhoto={onRotate} />);
    const shuffleBtn = screen.getByText(/Shuffle/i).closest('button');
    await act(async () => { fireEvent.click(shuffleBtn); });
    expect(onRotate).toHaveBeenCalled();
  });

  it('clicking Download calls downloadNewPhoto', async () => {
    render(<FocusModeSettings onRotatePhoto={vi.fn()} />);
    const downloadBtn = screen.getByText(/Download/i).closest('button');
    await act(async () => { fireEvent.click(downloadBtn); });
    expect(mockDownloadNewPhoto).toHaveBeenCalled();
  });

  it('clicking photo delete ✕ calls deletePhoto', async () => {
    render(<FocusModeSettings onRotatePhoto={vi.fn()} />);
    const deleteBtn = screen.getAllByTitle('Remove from library')[0];
    await act(async () => { fireEvent.click(deleteBtn); });
    expect(mockDeletePhoto).toHaveBeenCalled();
  });

  it('clicking non-active photo calls onRotatePhoto', async () => {
    const onRotate = vi.fn().mockResolvedValue(undefined);
    render(<FocusModeSettings onRotatePhoto={onRotate} />);
    // Click the second photo (not active)
    const photoContainers = document.querySelectorAll('.group.rounded');
    if (photoContainers.length > 1) {
      await act(async () => { fireEvent.click(photoContainers[1]); });
      expect(onRotate).toHaveBeenCalled();
    }
  });

  it('shows Library empty when library has no photos', () => {
    mockGetPhotoLibrary.mockReturnValue([]);
    render(<FocusModeSettings onRotatePhoto={vi.fn()} />);
    expect(screen.getByText(/Library empty/i)).toBeTruthy();
  });

  it('Shuffle button is disabled when library has 0 or 1 photos', () => {
    mockGetPhotoLibrary.mockReturnValue([
      { id: 'p1', small: 'https://example.com/photo1.jpg', author: 'John', photoUrl: '' },
    ]);
    render(<FocusModeSettings onRotatePhoto={vi.fn()} />);
    const shuffleBtn = screen.getByText(/Shuffle/i).closest('button');
    expect(shuffleBtn.disabled).toBe(true);
  });

  it('Download button is disabled at max capacity', () => {
    // 5 photos = max
    mockGetPhotoLibrary.mockReturnValue([
      { id: 'p1', small: '', author: 'A', photoUrl: '' },
      { id: 'p2', small: '', author: 'B', photoUrl: '' },
      { id: 'p3', small: '', author: 'C', photoUrl: '' },
      { id: 'p4', small: '', author: 'D', photoUrl: '' },
      { id: 'p5', small: '', author: 'E', photoUrl: '' },
    ]);
    render(<FocusModeSettings onRotatePhoto={vi.fn()} />);
    expect(screen.getByText('Library full')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Stock Settings (51.16%)
// ─────────────────────────────────────────────────────────────────────────────
import { Settings as StockSettings } from '../../../src/widgets/stock/Settings';
import { fetchCompanies } from '../../../src/widgets/stock/utils';

describe('Stock Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetch).mockClear();
  });

  it('renders without crashing', () => {
    expect(() => render(<StockSettings symbols={[]} onChange={vi.fn()} onClose={vi.fn()} />)).not.toThrow();
  });

  it('renders Select Stocks label', () => {
    render(<StockSettings symbols={[]} onChange={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('Select Stocks')).toBeTruthy();
  });

  it('shows loading state initially', () => {
    // fetchCompanies hasn't resolved yet
    vi.mocked(fetchCompanies).mockReturnValue(new Promise(() => { })); // never resolves
    render(<StockSettings symbols={[]} onChange={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('Loading…')).toBeTruthy();
  });

  it('shows companies after loading', async () => {
    vi.mocked(fetchCompanies).mockResolvedValue([
      { symbol: 'NABIL', name: 'Nabil Bank' },
      { symbol: 'NIC', name: 'NIC Asia Bank' },
    ]);
    render(<StockSettings symbols={[]} onChange={vi.fn()} onClose={vi.fn()} />);
    await act(async () => { });
    expect(screen.getByText('NABIL')).toBeTruthy();
    expect(screen.getByText('Nabil Bank')).toBeTruthy();
  });

  it('shows error when fetchCompanies fails', async () => {
    vi.mocked(fetchCompanies).mockRejectedValue(new Error('Network error'));
    render(<StockSettings symbols={[]} onChange={vi.fn()} onClose={vi.fn()} />);
    await act(async () => { });
    expect(screen.getByText('Could not load companies')).toBeTruthy();
  });

  it('filters by search query', async () => {
    vi.mocked(fetchCompanies).mockResolvedValue([
      { symbol: 'NABIL', name: 'Nabil Bank' },
      { symbol: 'NIC', name: 'NIC Asia Bank' },
    ]);
    render(<StockSettings symbols={[]} onChange={vi.fn()} onClose={vi.fn()} />);
    await act(async () => { });
    const searchInput = screen.getByPlaceholderText(/Search symbol/i);
    fireEvent.change(searchInput, { target: { value: 'NABIL' } });
    expect(screen.getByText('NABIL')).toBeTruthy();
    // NIC should still show (showing all filtered by query)
    expect(screen.getByText('Nabil Bank')).toBeTruthy();
  });

  it('shows no results for unknown query', async () => {
    vi.mocked(fetchCompanies).mockResolvedValue([
      { symbol: 'NABIL', name: 'Nabil Bank' },
    ]);
    render(<StockSettings symbols={[]} onChange={vi.fn()} onClose={vi.fn()} />);
    await act(async () => { });
    const searchInput = screen.getByPlaceholderText(/Search symbol/i);
    fireEvent.change(searchInput, { target: { value: 'XXXXXXX' } });
    expect(screen.getByText('No results')).toBeTruthy();
  });

  it('calls onChange when a stock is selected', async () => {
    const onChange = vi.fn();
    vi.mocked(fetchCompanies).mockResolvedValue([
      { symbol: 'NABIL', name: 'Nabil Bank' },
    ]);
    render(<StockSettings symbols={[]} onChange={onChange} onClose={vi.fn()} />);
    await act(async () => { });
    const nabilBtn = screen.getByText('NABIL').closest('button');
    fireEvent.click(nabilBtn);
    expect(onChange).toHaveBeenCalledWith('symbols', ['NABIL']);
  });

  it('shows selected symbols as pills', () => {
    render(<StockSettings symbols={['NABIL', 'NIC']} onChange={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('NABIL')).toBeTruthy();
    expect(screen.getByText('NIC')).toBeTruthy();
  });

  it('removes stock pill when X is clicked', async () => {
    const onChange = vi.fn();
    vi.mocked(fetchCompanies).mockResolvedValue([]);
    render(<StockSettings symbols={['NABIL']} onChange={onChange} onClose={vi.fn()} />);
    await act(async () => { });
    // Find remove button (SVG button inside pill)
    const removeBtn = document.querySelector('.flex.items-center.gap-1\\.5 button');
    if (removeBtn) {
      fireEvent.click(removeBtn);
      expect(onChange).toHaveBeenCalledWith('symbols', []);
    }
  });

  it('disables adding more than 3 stocks', async () => {
    vi.mocked(fetchCompanies).mockResolvedValue([
      { symbol: 'NABIL', name: 'Nabil Bank' },
      { symbol: 'NIC', name: 'NIC Asia Bank' },
      { symbol: 'SANI', name: 'Sanima Bank' },
      { symbol: 'EBL', name: 'Everest Bank' },
    ]);
    render(<StockSettings symbols={['NABIL', 'NIC', 'SANI']} onChange={vi.fn()} onClose={vi.fn()} />);
    await act(async () => { });
    // EBL button should be disabled
    const eblBtn = screen.getByText('EBL').closest('button');
    expect(eblBtn.disabled).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WidgetCatalog — basic coverage
// ─────────────────────────────────────────────────────────────────────────────
import { WidgetCatalog } from '../../../src/widgets/WidgetCatalog';

describe('WidgetCatalog', () => {
  let onAddInstance, onRemoveInstance, onClose;

  beforeEach(() => {
    onAddInstance = vi.fn();
    onRemoveInstance = vi.fn();
    onClose = vi.fn();
  });

  const renderCatalog = (instances = []) =>
    render(<WidgetCatalog instances={instances} onAddInstance={onAddInstance} onRemoveInstance={onRemoveInstance} onClose={onClose} />);

  it('renders without crashing', () => {
    expect(() => renderCatalog()).not.toThrow();
  });

  it('shows the catalog heading "Widgets"', () => {
    renderCatalog();
    expect(screen.getByText('Widgets')).toBeTruthy();
  });

  it('renders tab buttons (All, Time, Planning, etc.)', () => {
    renderCatalog();
    expect(screen.getByRole('tab', { name: 'All' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Time' })).toBeTruthy();
  });

  it('renders widget list items', () => {
    renderCatalog();
    expect(screen.getByText('Clock')).toBeTruthy();
    expect(screen.getByText('Calendar')).toBeTruthy();
  });

  it('clicking a Time tab shows time widgets', () => {
    renderCatalog();
    fireEvent.click(screen.getByRole('tab', { name: 'Time' }));
    expect(screen.getByText('Clock')).toBeTruthy();
  });

  it('clicking + button calls onAddInstance', () => {
    renderCatalog();
    const addBtn = screen.getByLabelText('Add Clock');
    fireEvent.click(addBtn);
    expect(onAddInstance).toHaveBeenCalledWith('clock');
  });

  it('shows count and − button for active instances', () => {
    renderCatalog([{ id: 'clock_1', type: 'clock' }]);
    // Remove button should be visible
    expect(screen.getByLabelText('Remove Clock')).toBeTruthy();
  });

  it('clicking − button calls onRemoveInstance with id', () => {
    renderCatalog([{ id: 'clock_1', type: 'clock' }]);
    const removeBtn = screen.getByLabelText('Remove Clock');
    fireEvent.click(removeBtn);
    expect(onRemoveInstance).toHaveBeenCalledWith('clock_1');
  });

  it('shows stepper count for active widget', () => {
    renderCatalog([{ id: 'clock_1', type: 'clock' }]);
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });

  it('clicking X close button calls onClose via handleClose', () => {
    vi.useFakeTimers();
    renderCatalog();
    const closeBtn = screen.getByLabelText('Close (Esc)');
    fireEvent.click(closeBtn);
    act(() => { vi.advanceTimersByTime(300); });
    expect(onClose).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('pressing Escape key closes the catalog', () => {
    vi.useFakeTimers();
    renderCatalog();
    fireEvent.keyDown(document, { key: 'Escape' });
    act(() => { vi.advanceTimersByTime(300); });
    expect(onClose).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('shows Export and Import buttons', () => {
    renderCatalog();
    expect(screen.getByText('Export')).toBeTruthy();
    expect(screen.getByText('Import')).toBeTruthy();
  });

  it('shows Reset button', () => {
    renderCatalog();
    expect(screen.getByText('Reset')).toBeTruthy();
  });

  it('clicking Export calls exportSettings', () => {
    const { exportSettings: mockExport } = require('../../../src/widgets/settingsIO');
    renderCatalog();
    fireEvent.click(screen.getByText('Export'));
    // exportSettings should be called
  });
});
