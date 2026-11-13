/**
 * Tests for:
 * - BaseWidget.jsx (currently 37%)
 * - dateToday/ClockWidget.jsx (currently 0%)
 * - FocusMode/TopBar.jsx (currently 45%)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

global.ResizeObserver = class { observe() { } unobserve() { } disconnect() { } };

// Mock react-bootstrap-icons — keep the real exports (components import many
// icons) and only override the ones this suite asserts on.
vi.mock('react-bootstrap-icons', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    GearFill: ({ size, ...props }) => <span data-testid="gear-icon" {...props}>⚙</span>,
    ArrowsFullscreen: () => <span>⛶</span>,
    FullscreenExit: () => <span>⛶</span>,
    CalendarDateFill: () => <span data-testid="calendar-date-icon">📅</span>,
  };
});

// Mock weather utils for TopBar (it imports weather/utils.jsx)
vi.mock('../../../src/widgets/weather/utils.jsx', () => ({
  getWeatherIcon: vi.fn(() => <span>☀</span>),
}));
vi.mock('../../../src/widgets/weather/utils', () => ({
  getWeatherIcon: vi.fn(() => <span>☀</span>),
}));

// Mock FocusModeSettings (lazy-loaded via Suspense in TopBar)
vi.mock('../../../src/components/FocusMode/Settings', () => ({
  FocusModeSettings: ({ onRotatePhoto }) => (
    <div data-testid="focus-mode-settings">
      <button onClick={onRotatePhoto}>Rotate</button>
    </div>
  ),
}));

// Mock BaseSettingsModal
vi.mock('../../../src/widgets/BaseSettingsModal', () => ({
  BaseSettingsModal: ({ title, children, onClose }) => (
    <div data-testid="settings-modal">
      <span>{title}</span>
      <button onClick={onClose} aria-label="Close modal">✕</button>
      {children}
    </div>
  ),
}));

// Mock useWidgetSettings for ClockWidget
vi.mock('../../../src/widgets/useWidgetSettings', () => ({
  useWidgetSettings: vi.fn((id, defaults) => [defaults, vi.fn()]),
}));

// Mock utilities/index and constants for ClockWidget
vi.mock('../../../src/utilities/index', () => ({
  getTimeZoneAwareDayJsInstance: vi.fn(() => ({
    day: () => 1, // Monday
    month: () => 5, // June (0-indexed)
    date: () => 15,
    year: () => 2025,
    format: () => '2025 6 15',
  })),
  convertEnglishToNepali: vi.fn(() => '2082 3 1'), // Returns string like real function
  convertThisNumberToNepali: vi.fn(n => String(n)),
}));
vi.mock('../../../src/utilities', () => ({
  getTimeZoneAwareDayJsInstance: vi.fn(() => ({
    day: () => 1,
    month: () => 5,
    date: () => 15,
    year: () => 2025,
    format: () => '2025 6 15',
  })),
  convertEnglishToNepali: vi.fn(() => '2082 3 1'), // Returns string
  convertThisNumberToNepali: vi.fn(n => String(n)),
}));

vi.mock('../../../src/constants', () => ({
  LANGUAGES: { en: 'en', ne: 'ne' },
  MONTH_NAMES: ['बैशाख', 'जेठ', 'आषाढ', 'श्रावण', 'भाद्र', 'आश्विन', 'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत्र'],
  MONTH_NAMES_IN_NEPALI: ['बैशाख', 'जेठ', 'आषाढ', 'श्रावण', 'भाद्र', 'आश्विन', 'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत्र'],
  DAY_NAMES: ['आइत', 'सोम', 'मंगल', 'बुध', 'बिहि', 'शुक्र', 'शनि'],
}));
vi.mock('../../../src/constants/settings', () => ({
  LANGUAGES: { en: 'en', ne: 'ne' },
}));

// Mock store for TopBar's lazy Settings
vi.mock('../../../src/store', () => ({
  useSettingsStore: vi.fn((selector) => {
    const state = {
      dateFormat: 'gregorian',
      clockFormat: '24h',
      accent: '#6366f1',
      mode: 'canvas',
      language: 'en',
      setDateFormat: vi.fn(),
      setClockFormat: vi.fn(),
      setAccent: vi.fn(),
      setMode: vi.fn(),
      setLanguage: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

// Mock unsplash for FocusModeSettings
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

vi.mock('../../../src/theme', () => ({
  ACCENT_COLORS: [{ name: 'indigo', value: '#6366f1' }],
}));

import { BaseWidget } from '../../../src/widgets/BaseWidget';
import { Widget as ClockWidget } from '../../../src/widgets/dateToday/Widget';
import { useWidgetSettings } from '../../../src/widgets/useWidgetSettings';

const dateParts = { dow: 'Monday', month: 'June', day: 15, year: 2025 };

// ─────────────────────────────────────────────────────────────────────────────
// BaseWidget
// ─────────────────────────────────────────────────────────────────────────────
describe('BaseWidget', () => {
  it('renders children', () => {
    render(<BaseWidget><div>Hello Widget</div></BaseWidget>);
    expect(screen.getByText('Hello Widget')).toBeTruthy();
  });

  it('renders without options button when no settingsContent or onRemove', () => {
    render(<BaseWidget><div>No menu</div></BaseWidget>);
    expect(screen.queryByLabelText('Widget options')).toBeNull();
  });

  it('renders options button when onRemove is provided', () => {
    render(<BaseWidget onRemove={vi.fn()}><div>With remove</div></BaseWidget>);
    expect(screen.getByLabelText('Widget options')).toBeTruthy();
  });

  it('renders options button when settingsContent is provided', () => {
    render(<BaseWidget settingsContent={<div>Settings</div>}><div>Widget</div></BaseWidget>);
    expect(screen.getByLabelText('Widget options')).toBeTruthy();
  });

  it('opens context menu when options button is clicked', () => {
    render(<BaseWidget settingsContent={<div>Settings content</div>} onRemove={vi.fn()}><div>Widget</div></BaseWidget>);
    const optionsBtn = screen.getByLabelText('Widget options');
    fireEvent.click(optionsBtn);
    expect(screen.getByRole('menu')).toBeTruthy();
  });

  it('shows Settings option in menu when settingsContent provided', () => {
    render(<BaseWidget settingsContent={<div>Settings content</div>}><div>Widget</div></BaseWidget>);
    fireEvent.click(screen.getByLabelText('Widget options'));
    expect(screen.getByRole('menuitem', { name: 'Settings' })).toBeTruthy();
  });

  it('shows Remove option in menu when onRemove provided', () => {
    render(<BaseWidget onRemove={vi.fn()}><div>Widget</div></BaseWidget>);
    fireEvent.click(screen.getByLabelText('Widget options'));
    expect(screen.getByRole('menuitem', { name: 'Remove widget' })).toBeTruthy();
  });

  it('opens settings modal when Settings menuitem is clicked', () => {
    render(<BaseWidget settingsContent={<div data-testid="inner-settings">Inner</div>}><div>Widget</div></BaseWidget>);
    fireEvent.click(screen.getByLabelText('Widget options'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Settings' }));
    expect(screen.getByTestId('settings-modal')).toBeTruthy();
  });

  it('closes modal when onClose is called', () => {
    render(<BaseWidget settingsContent={<div>Inner</div>}><div>Widget</div></BaseWidget>);
    fireEvent.click(screen.getByLabelText('Widget options'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Settings' }));
    expect(screen.getByTestId('settings-modal')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Close modal'));
    expect(screen.queryByTestId('settings-modal')).toBeNull();
  });

  it('calls onRemove when Remove menuitem is clicked', () => {
    const onRemove = vi.fn();
    render(<BaseWidget onRemove={onRemove}><div>Widget</div></BaseWidget>);
    fireEvent.click(screen.getByLabelText('Widget options'));
    // Remove is a two-step ConfirmButton — first click arms, second confirms.
    fireEvent.click(screen.getByRole('menuitem', { name: 'Remove widget' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Confirm — click again to proceed' }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('passes settingsTitle to modal', () => {
    render(<BaseWidget settingsContent={<div>Inner</div>} settingsTitle="Custom Title"><div>Widget</div></BaseWidget>);
    fireEvent.click(screen.getByLabelText('Widget options'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Settings' }));
    expect(screen.getByText('Custom Title')).toBeTruthy();
  });

  it('calls settingsContent function with onClose when it is a function', () => {
    const settingsFn = vi.fn(() => <div data-testid="fn-settings">Fn Settings</div>);
    render(<BaseWidget settingsContent={settingsFn}><div>Widget</div></BaseWidget>);
    fireEvent.click(screen.getByLabelText('Widget options'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Settings' }));
    expect(screen.getByTestId('fn-settings')).toBeTruthy();
    expect(settingsFn).toHaveBeenCalledWith(expect.any(Function));
  });

  it('closes context menu when clicking outside', () => {
    render(<BaseWidget onRemove={vi.fn()}><div>Widget</div></BaseWidget>);
    fireEvent.click(screen.getByLabelText('Widget options'));
    expect(screen.getByRole('menu')).toBeTruthy();
    // Click outside
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('applies custom cardStyle', () => {
    const { container } = render(
      <BaseWidget cardStyle={{ backgroundColor: 'red' }}><div>Widget</div></BaseWidget>
    );
    const card = container.querySelector('.flex.flex-col.overflow-hidden');
    expect(card.style.backgroundColor).toBe('red');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ClockWidget (dateToday)
// ─────────────────────────────────────────────────────────────────────────────
describe('ClockWidget (dateToday)', () => {
  it('renders without crashing', () => {
    expect(() => render(<ClockWidget id="date-1" onRemove={vi.fn()} />)).not.toThrow();
  });

  it('shows month name in English', () => {
    render(<ClockWidget id="date-1" onRemove={vi.fn()} />);
    expect(screen.getByText('June')).toBeTruthy();
  });

  it('shows short weekday', () => {
    render(<ClockWidget id="date-1" onRemove={vi.fn()} />);
    expect(screen.getByText('Monday')).toBeTruthy();
  });

  it('renders in Nepali language mode without crashing', () => {
    // Temporarily set useWidgetSettings to return Nepali language
    vi.mocked(useWidgetSettings).mockImplementationOnce((id, defaults) => [{ ...defaults, language: 'ne' }, vi.fn()]);
    expect(() => render(<ClockWidget id="date-1" onRemove={vi.fn()} />)).not.toThrow();
  });

  it('renders BaseWidget wrapper', () => {
    vi.mocked(useWidgetSettings).mockReturnValueOnce([{ language: 'en' }, vi.fn()]);
    render(<ClockWidget id="date-1" onRemove={vi.fn()} />);
    expect(screen.queryByLabelText('Widget options')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TopBar was removed in the Focus Mode redesign — its back/fullscreen/settings
// controls now live in src/components/FocusMode/zones/TopZone.jsx.
// ─────────────────────────────────────────────────────────────────────────────
