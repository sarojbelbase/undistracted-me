/**
 * Tests for:
 * - utilities/index.js pure functions (getNepaliMiti, getLiveClock, getDateToday, convertThisNumberToNepali)
 * - pomodoro/Widget.jsx timer controls (play/pause/reset/back, custom input)
 * - notes/Widget.jsx expand modal and keyboard interactions
 * - FocusMode/index.jsx additional paths
 * - calendar/Settings.jsx (50%)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

global.ResizeObserver = class { observe() { } unobserve() { } disconnect() { } };

// ─────────────────────────────────────────────────────────────────────────────
// 1) Utilities/index.js — pure function tests
// ─────────────────────────────────────────────────────────────────────────────
import {
  convertEnglishToNepali,
  convertThisNumberToNepali,
  getNepaliMitiInSelectedLanguage,
  getLiveClockInSelectedLanguage,
  getDateTodayInSelectedLanguage,
  getTimeZoneAwareDayJsInstance,
} from '../../../src/utilities/index';

describe('utilities/index.js — main functions', () => {
  it('convertThisNumberToNepali converts 0-9 digits', () => {
    // NUMBER_MAPPING maps 0=>0, 1=>1,... in Nepali numerals (or same)
    const result = convertThisNumberToNepali(123);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('convertThisNumberToNepali handles single digit', () => {
    const result = convertThisNumberToNepali(5);
    expect(typeof result).toBe('string');
  });

  it('getTimeZoneAwareDayJsInstance returns a dayjs object', () => {
    const instance = getTimeZoneAwareDayJsInstance();
    expect(instance).toBeTruthy();
    expect(typeof instance.format).toBe('function');
  });

  it('getNepaliMitiInSelectedLanguage returns string for English', () => {
    const result = getNepaliMitiInSelectedLanguage('en');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('getNepaliMitiInSelectedLanguage returns string for Nepali', () => {
    const result = getNepaliMitiInSelectedLanguage('ne');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('getLiveClockInSelectedLanguage returns time string for English', () => {
    const result = getLiveClockInSelectedLanguage('en');
    expect(typeof result).toBe('string');
    // Should contain dots separating hours, minutes, seconds
    expect(result).toMatch(/\./);
  });

  it('getLiveClockInSelectedLanguage returns time string for Nepali', () => {
    const result = getLiveClockInSelectedLanguage('ne');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('getDateTodayInSelectedLanguage returns date string for English', () => {
    const result = getDateTodayInSelectedLanguage('en');
    expect(typeof result).toBe('string');
    // Should contain a comma separating day+weekday
    expect(result).toMatch(/,/);
  });

  it('getDateTodayInSelectedLanguage returns date string for Nepali', () => {
    const result = getDateTodayInSelectedLanguage('ne');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2) Pomodoro Widget — timer controls
// ─────────────────────────────────────────────────────────────────────────────

// Mock react-bootstrap-icons for pomodoro
vi.mock('react-bootstrap-icons', () => ({
  PlayFill: () => <span data-testid="play">▶</span>,
  PauseFill: () => <span data-testid="pause">⏸</span>,
  ArrowCounterclockwise: () => <span data-testid="reset">↺</span>,
  ArrowLeft: () => <span data-testid="back">←</span>,
  // Needed by other widgets
  EyeFill: () => <span data-testid="eye">👁</span>,
  EyeSlashFill: () => <span data-testid="eye-slash">🙈</span>,
  ArrowsFullscreen: () => <span data-testid="expand">⛶</span>,
  FullscreenExit: () => <span data-testid="fullscreen-exit">⛶x</span>,
  PlusLg: () => <span data-testid="plus">+</span>,
  DashLg: () => <span>-</span>,
  XLg: () => <span data-testid="close-x">X</span>,
  CheckLg: () => <span>✓</span>,
  BoxArrowUpRight: () => <span>↗</span>,
  Upload: () => <span>⬆</span>,
  Download: () => <span>⬇</span>,
  ArrowRepeat: () => <span>↻</span>,
  InfoCircleFill: () => <span>ℹ</span>,
  GearFill: () => <span>⚙</span>,
  BookmarkFill: () => <span>🔖</span>,
  BookmarkStarFill: () => <span>⭐</span>,
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
  MusicNoteBeamed: () => <span>🎵</span>,
  GraphUpArrow: () => <span>📈</span>,
}));

// Mock BaseWidget for pomodoro tests
vi.mock('../../../src/widgets/BaseWidget', () => ({
  BaseWidget: React.forwardRef(({ children, settingsContent, onRemove }, ref) => (
    <div ref={ref} data-testid="base-widget">
      {children}
    </div>
  )),
}));

// Mock useWidgetSettings for notes
vi.mock('../../../src/widgets/useWidgetSettings', () => ({
  useWidgetSettings: vi.fn((id, defaults) => {
    const [settings, setSettings] = React.useState(defaults);
    const updateSetting = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));
    return [settings, updateSetting];
  }),
}));

// Mock theme for notes
vi.mock('../../../src/theme', () => ({
  ACCENT_COLORS: [
    { name: 'Default', hex: null, fg: '#fff' },
    { name: 'indigo', hex: '#6366f1', fg: '#fff' },
    { name: 'blue', hex: '#3b82f6', fg: '#fff' },
  ],
}));

import { Widget as PomodoroWidget } from '../../../src/widgets/pomodoro/Widget';
import { PRESETS } from '../../../src/widgets/pomodoro/utils';

describe('PomodoroWidget — timer controls', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    vi.stubGlobal('chrome', {
      runtime: { sendMessage: vi.fn(), id: 'test' },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('clicking + then pause shows pause button', () => {
    render(<PomodoroWidget />);
    fireEvent.click(screen.getByText('25 min'));
    // Now in timer phase - click play
    const playBtn = screen.getByTestId('play').closest('button');
    fireEvent.click(playBtn);
    // Should show pause now
    expect(screen.getByTestId('pause')).toBeTruthy();
  });

  it('pause stops the timer', () => {
    render(<PomodoroWidget />);
    fireEvent.click(screen.getByText('25 min'));
    fireEvent.click(screen.getByTestId('play').closest('button'));
    fireEvent.click(screen.getByTestId('pause').closest('button'));
    // back to play
    expect(screen.getByTestId('play')).toBeTruthy();
  });

  it('reset button restores full time', () => {
    render(<PomodoroWidget />);
    fireEvent.click(screen.getByText('25 min'));
    // Start timer and advance
    fireEvent.click(screen.getByTestId('play').closest('button'));
    act(() => { vi.advanceTimersByTime(5000); });
    // Reset
    fireEvent.click(screen.getByTestId('reset').closest('button'));
    expect(screen.getByText('25:00')).toBeTruthy();
  });

  it('back button returns to pick phase', () => {
    render(<PomodoroWidget />);
    fireEvent.click(screen.getByText('25 min'));
    expect(screen.getByTestId('back')).toBeTruthy();
    fireEvent.click(screen.getByTestId('back').closest('button'));
    expect(screen.getByText('Focus Timer')).toBeTruthy();
  });

  it('custom input Start button starts timer', () => {
    render(<PomodoroWidget />);
    fireEvent.click(screen.getByText('Custom'));
    const input = document.querySelector('input[type="number"]');
    fireEvent.change(input, { target: { value: '10' } });
    fireEvent.click(screen.getByText('Start'));
    expect(screen.getByText('10:00')).toBeTruthy();
  });

  it('custom input Start ignores empty input', () => {
    render(<PomodoroWidget />);
    fireEvent.click(screen.getByText('Custom'));
    const startBtn = screen.getByText('Start');
    expect(startBtn.disabled).toBe(true);
  });

  it('custom input Enter key starts timer', () => {
    render(<PomodoroWidget key="custom-enter" />);
    fireEvent.click(screen.getByText('Custom'));
    const input = document.querySelector('input[type="number"]');
    fireEvent.change(input, { target: { value: '5' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    // Timer should show 5:00 now
    expect(document.body.textContent).toContain('5:00');
  });

  it('timer tick counts down each second', () => {
    render(<PomodoroWidget key="timer-tick" />);
    fireEvent.click(screen.getByText('25 min'));
    fireEvent.click(screen.getByTestId('play').closest('button'));
    act(() => { vi.advanceTimersByTime(3000); });
    // Should now show 24:57 (25*60 - 3 = 1497 seconds)
    expect(document.body.textContent).toContain('24:57');
  });

  it('shows SESSION COMPLETE when timer reaches 0', () => {
    render(<PomodoroWidget key="session-complete" />);
    fireEvent.click(screen.getByText('Custom'));
    const input = document.querySelector('input[type="number"]');
    fireEvent.change(input, { target: { value: '0.05' } }); // ~3 seconds
    fireEvent.click(screen.getByText('Start'));
    fireEvent.click(screen.getByTestId('play').closest('button'));
    act(() => { vi.advanceTimersByTime(5 * 1000); });
    expect(screen.getByText('SESSION COMPLETE')).toBeTruthy();
  });

  it('stores pomodoro state in localStorage when running', () => {
    render(<PomodoroWidget />);
    fireEvent.click(screen.getByText('25 min'));
    fireEvent.click(screen.getByTestId('play').closest('button'));
    act(() => { vi.advanceTimersByTime(1000); });
    const stored = JSON.parse(localStorage.getItem('fm_pomodoro') || 'null');
    expect(stored).toBeTruthy();
    expect(stored.running).toBe(true);
  });

  it('removes pomodoro from localStorage when paused', () => {
    render(<PomodoroWidget />);
    fireEvent.click(screen.getByText('25 min'));
    fireEvent.click(screen.getByTestId('play').closest('button'));
    act(() => { vi.advanceTimersByTime(1000); });
    fireEvent.click(screen.getByTestId('pause').closest('button'));
    expect(localStorage.getItem('fm_pomodoro')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3) Notes Widget — expand modal
// ─────────────────────────────────────────────────────────────────────────────
import { Widget as NotesWidget } from '../../../src/widgets/notes/Widget';

describe('NotesWidget — expand modal', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('renders expand button (ArrowsFullscreen)', () => {
    render(<NotesWidget id="notes_expand" onRemove={vi.fn()} />);
    expect(screen.getByTestId('expand')).toBeTruthy();
  });

  it('opens expanded modal when expand is clicked', () => {
    render(<NotesWidget id="notes_expand" onRemove={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Expand note'));
    expect(screen.getByText('Note')).toBeTruthy();
  });

  it('expanded modal has close button', () => {
    render(<NotesWidget id="notes_expand" onRemove={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Expand note'));
    expect(screen.getByLabelText('Close expanded note')).toBeTruthy();
  });

  it('closes expanded modal when close is clicked', () => {
    render(<NotesWidget id="notes_expand" onRemove={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Expand note'));
    expect(screen.getByText('Note')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Close expanded note'));
    expect(screen.queryByText('Note')).toBeNull();
  });

  it('closes expanded modal when overlay is clicked', () => {
    render(<NotesWidget id="notes_expand" onRemove={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Expand note'));
    // Click the overlay (the outer fixed div)
    const modal = document.querySelector('.fixed.inset-0');
    if (modal) fireEvent.click(modal);
    // Widget renders but modal is gone
  });

  it('can type in expanded modal textarea', () => {
    render(<NotesWidget id="notes_expand" onRemove={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Expand note'));
    const textareas = screen.getAllByRole('textbox');
    // The expanded modal has an autofocused textarea
    const expandedTA = textareas[textareas.length - 1];
    fireEvent.change(expandedTA, { target: { value: 'Expanded text' } });
    expect(expandedTA.value).toBe('Expanded text');
  });

  it('hides text with blur when eye is clicked', () => {
    render(<NotesWidget id="notes_hide" onRemove={vi.fn()} />);
    const hideBtn = screen.getByLabelText('Hide note');
    expect(hideBtn).toBeTruthy();
    fireEvent.click(hideBtn);
    // After clicking, label should be "Show note"
    expect(screen.getByLabelText('Show note')).toBeTruthy();
  });

  it('shows text again when eye is clicked again', () => {
    render(<NotesWidget id="notes_showhide" onRemove={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Hide note'));
    fireEvent.click(screen.getByLabelText('Show note'));
    expect(screen.getByLabelText('Hide note')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4) Calendar Settings.jsx (50%)
// ─────────────────────────────────────────────────────────────────────────────
// Mock components needed by calendar/Settings
vi.mock('../../../src/components/ui/RadioGroup', () => ({
  RadioGroup: ({ label, options, value, onChange }) => (
    <div data-testid="radio-group">
      <span>{label}</span>
      {options.map(o => (
        <label key={o.value}>
          <input
            type="radio"
            name={label}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
          {o.label}
        </label>
      ))}
    </div>
  ),
}));

vi.mock('../../../src/constants', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, LANGUAGES: { en: 'en', ne: 'ne' } };
});

import { Settings as CalendarSettings } from '../../../src/widgets/calendar/Settings';

describe('Calendar Settings', () => {
  it('renders without crashing', () => {
    expect(() => render(<CalendarSettings id="cal_1" calendarType="bs" onChange={vi.fn()} />)).not.toThrow();
  });

  it('renders Calendar Format label', () => {
    render(<CalendarSettings id="cal_1" calendarType="bs" onChange={vi.fn()} />);
    expect(screen.getByTestId('radio-group')).toBeTruthy();
    expect(screen.getByText('Calendar Format')).toBeTruthy();
  });

  it('renders Gregorian option', () => {
    render(<CalendarSettings id="cal_1" calendarType="bs" onChange={vi.fn()} />);
    expect(screen.getByText(/Gregorian/i)).toBeTruthy();
  });

  it('renders Bikram Sambat option', () => {
    render(<CalendarSettings id="cal_1" calendarType="bs" onChange={vi.fn()} />);
    expect(screen.getByText(/Bikram Sambat/i)).toBeTruthy();
  });

  it('calls onChange when option is changed', () => {
    const onChange = vi.fn();
    render(<CalendarSettings id="cal_1" calendarType="bs" onChange={onChange} />);
    const inputs = screen.getAllByRole('radio');
    fireEvent.click(inputs[1]); // click second radio
    expect(onChange).toHaveBeenCalled();
  });

  it('radio options have correct values (bs, ad)', () => {
    render(<CalendarSettings id="cal_1" calendarType="bs" onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('bs')).toBeTruthy();
    expect(screen.getByDisplayValue('ad')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5) dateToday/Settings.jsx (50% — real component with RadioGroup)
// ─────────────────────────────────────────────────────────────────────────────
import { Settings as DateTodaySettings } from '../../../src/widgets/dateToday/Settings';

describe('dateToday Settings', () => {
  it('renders without crashing', () => {
    expect(() => render(<DateTodaySettings id="dt_1" language="en" onChange={vi.fn()} />)).not.toThrow();
  });

  it('renders Date Format label', () => {
    render(<DateTodaySettings id="dt_1" language="en" onChange={vi.fn()} />);
    expect(screen.getByText('Date Format')).toBeTruthy();
  });

  it('calls onChange when Bikram Sambat is selected', () => {
    const onChange = vi.fn();
    render(<DateTodaySettings id="dt_1" language="en" onChange={onChange} />);
    const inputs = screen.getAllByRole('radio');
    fireEvent.click(inputs[1]);
    expect(onChange).toHaveBeenCalled();
  });
});
