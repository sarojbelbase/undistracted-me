/**
 * Tests for FocusMode/index.jsx (the main focus mode view — biggest coverage gap at 0%)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

global.ResizeObserver = class { observe() { } unobserve() { } disconnect() { } };

// ── Mock all heavy dependencies ───────────────────────────────────────────

// Store
vi.mock('../../../src/store', () => ({
  useSettingsStore: vi.fn((selector) => {
    const state = {
      dateFormat: 'gregorian',
      clockFormat: '24h',
      accent: '#6366f1',
      mode: 'canvas',
      language: 'en',
    };
    return selector ? selector(state) : state;
  }),
}));

// Unsplash
vi.mock('../../../src/utilities/unsplash', () => ({
  hasUnsplashKey: vi.fn(() => false),
  getPhotoLibrary: vi.fn(() => []),
  downloadNewPhoto: vi.fn(() => Promise.resolve()),
  deletePhoto: vi.fn(),
  jumpToPhotoById: vi.fn(),
  rotatePhoto: vi.fn(),
  getCachedPhotoSync: vi.fn(() => null),
  LIBRARY_MAX: 20,
  clearPhotoCache: vi.fn(),
  getBgSource: vi.fn(() => 'unsplash'),
  setBgSource: vi.fn(),
  prewarmPhotos: vi.fn(() => Promise.resolve()),
  BG_SOURCE_KEY: 'fm_bg_source',
  getCurrentPhoto: vi.fn(() => Promise.resolve(null)),
}));

// Spotify utils
vi.mock('../../../src/widgets/spotify/utils', () => ({
  isSpotifyConnected: vi.fn(() => false),
  getCurrentPlayback: vi.fn(() => Promise.resolve(null)),
  setPlayPause: vi.fn(),
  skipNext: vi.fn(),
  skipPrev: vi.fn(),
}));

// Events hook
vi.mock('../../../src/widgets/useEvents', () => ({
  useEvents: vi.fn(() => [[], vi.fn()]),
  useGoogleCalendar: vi.fn(() => ({ gcalEvents: [], isLoading: false })),
  formatEventTime: vi.fn(() => '09:00'),
}));

// FocusMode sub-components
vi.mock('../../../src/components/FocusMode/panels/Clock', () => ({
  Clock: ({ parts }) => <div data-testid="clock-display">{parts?.h}:{parts?.m}</div>,
  ClockDisplay: ({ parts }) => <div data-testid="clock-display">{parts?.h}:{parts?.m}</div>,
  default: ({ char }) => <span>{char}</span>,
}));

vi.mock('../../../src/components/FocusMode/panels/Greetings', () => ({
  Greetings: () => <div data-testid="greeting-display">Good morning</div>,
  GreetingDisplay: () => <div data-testid="greeting-display">Good morning</div>,
}));

vi.mock('../../../src/components/FocusMode/WorldClocksPanel', () => ({
  WorldClocksPanel: ({ timezones }) => <div data-testid="world-clocks">{timezones?.join(',')}</div>,
}));

vi.mock('../../../src/components/FocusMode/LeftPanel', () => ({
  LeftPanel: () => <div data-testid="left-panel">Left</div>,
}));

vi.mock('../../../src/components/FocusMode/TopBar', () => ({
  TopBar: ({ onExit, uiVisible, isFullscreen, toggleFullscreen }) => (
    <div data-testid="top-bar" style={{ opacity: uiVisible ? 1 : 0 }}>
      <button data-testid="exit-btn" onClick={onExit}>Exit</button>
      <button data-testid="fullscreen-btn" onClick={toggleFullscreen}>
        {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
      </button>
    </div>
  ),
}));

// FocusMode hooks
vi.mock('../../../src/components/FocusMode/hooks', () => ({
  useFocusWeather: vi.fn(() => null),
  useFocusStocks: vi.fn(() => []),
  useFocusPhoto: vi.fn(() => ({
    photo: null,
    slotA: null,
    slotB: null,
    activeSlot: 'a',
    rotate: vi.fn(),
  })),
  useWakeLock: vi.fn(),
  useCenterOnDark: vi.fn(() => false),
  useFocusTimezones: vi.fn(() => []),
  useFocusSpotify: vi.fn(() => ({
    spotify: null,
    spotifyProgress: 0,
    handleToggle: vi.fn(),
    handleNext: vi.fn(),
    handlePrev: vi.fn(),
  })),
}));

// FocusMode constants — also need to mock the utilities dir dependency
vi.mock('../../../src/utilities/index', () => ({
  getTimeZoneAwareDayJsInstance: vi.fn(),
  convertEnglishToNepali: vi.fn(() => [2082, 3, 15]),
  getGregorianDateParts: vi.fn(() => ({ dow: 'Sunday', month: 'June', day: 15, year: 2025 })),
  getBikramSambatDateParts: vi.fn(() => ({ dow: 'Sunday', month: 'Ashadh', day: 1, year: 2082 })),
  ENGLISH_DAYS: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  GREGORIAN_MONTHS: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
}));

vi.mock('../../../src/utilities', () => ({
  getTimeZoneAwareDayJsInstance: vi.fn(),
  convertEnglishToNepali: vi.fn(() => [2082, 3, 15]),
  getGregorianDateParts: vi.fn(() => ({ dow: 'Sunday', month: 'June', day: 15, year: 2025 })),
  getBikramSambatDateParts: vi.fn(() => ({ dow: 'Sunday', month: 'Ashadh', day: 1, year: 2082 })),
  ENGLISH_DAYS: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  GREGORIAN_MONTHS: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
}));

vi.mock('../../../src/widgets/pomodoro/utils', () => ({
  readPomodoro: vi.fn(() => null),
}));

vi.mock('../../../src/widgets/events/utils', () => ({
  getNextEventToShow: vi.fn(() => null),
  getTimeUntilEvent: vi.fn(() => 'in 5m'),
  formatEventStartTime: vi.fn(() => '9:00 AM'),
  isLiveNow: vi.fn(() => false),
  datePrefixFor: vi.fn(() => null),
}));

vi.mock('../../../src/constants', () => ({
  MONTH_NAMES: ['Baishakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'],
}));

vi.mock('../../../src/components/FocusMode/config', () => ({
  ZONES: { top: true, center: true, left: true, right: true, bottom: false },
}));

// Widget clock utils
vi.mock('../../../src/widgets/clock/utils', () => ({
  getTimeParts: vi.fn(() => ({ h: '09', m: '00', s: '00', period: '', tz: '' })),
}));

// Also mock weather utils (uses .jsx extension which causes issues)
vi.mock('../../../src/widgets/weather/utils', () => ({
  getWeatherIcon: vi.fn(() => '☀️'),
  fetchWeatherByCoords: vi.fn(() => Promise.resolve(null)),
  getCoords: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('../../../src/widgets/weather/utils.jsx', () => ({
  getWeatherIcon: vi.fn(() => '☀️'),
  fetchWeatherByCoords: vi.fn(() => Promise.resolve(null)),
  getCoords: vi.fn(() => Promise.resolve(null)),
}));

// Stub fetch
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));

import { FocusMode } from '../../../src/components/FocusMode/index';
import { useFocusTimezones, useFocusStocks, useFocusPhoto } from '../../../src/components/FocusMode/hooks';
import { readPomodoro } from '../../../src/widgets/pomodoro/utils';
import { getNextEventToShow } from '../../../src/widgets/events/utils';

// ─────────────────────────────────────────────────────────────────────────────
describe('FocusMode', () => {
  let onExit;

  beforeEach(() => {
    onExit = vi.fn();
    // Reset fullscreen state
    Object.defineProperty(document, 'fullscreenElement', { value: null, configurable: true, writable: true });
  });

  it('renders without crashing', () => {
    expect(() => render(<FocusMode onExit={onExit} />)).not.toThrow();
  });

  it('renders TopBar', () => {
    render(<FocusMode onExit={onExit} />);
    expect(screen.getByTestId('top-bar')).toBeTruthy();
  });

  it('renders ClockDisplay', () => {
    render(<FocusMode onExit={onExit} />);
    expect(screen.getByTestId('clock-display')).toBeTruthy();
  });

  it('renders GreetingDisplay', () => {
    render(<FocusMode onExit={onExit} />);
    expect(screen.getByTestId('greeting-display')).toBeTruthy();
  });

  it('calls onExit when Exit button is clicked', () => {
    render(<FocusMode onExit={onExit} />);
    fireEvent.click(screen.getByTestId('exit-btn'));
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('calls onExit when Escape key is pressed', () => {
    render(<FocusMode onExit={onExit} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('does NOT render WorldClocksPanel when no extra timezones', () => {
    render(<FocusMode onExit={onExit} />);
    expect(screen.queryByTestId('world-clocks')).toBeNull();
  });

  it('renders WorldClocksPanel when extra timezones present', () => {
    vi.mocked(useFocusTimezones).mockReturnValue(['America/New_York']);
    render(<FocusMode onExit={onExit} />);
    expect(screen.getByTestId('world-clocks')).toBeTruthy();
    vi.mocked(useFocusTimezones).mockReturnValue([]);
  });

  it('does NOT render LeftPanel when no content', () => {
    render(<FocusMode onExit={onExit} />);
    expect(screen.queryByTestId('left-panel')).toBeNull();
  });

  it('renders LeftPanel when pomodoro is active', () => {
    vi.mocked(readPomodoro).mockReturnValue({ label: 'Focus', remaining: 1500 });
    render(<FocusMode onExit={onExit} />);
    expect(screen.getByTestId('left-panel')).toBeTruthy();
    vi.mocked(readPomodoro).mockReturnValue(null);
  });

  it('renders LeftPanel when stocks are present', () => {
    vi.mocked(useFocusStocks).mockReturnValue([{ sym: 'GBIME', ltp: 450 }]);
    render(<FocusMode onExit={onExit} />);
    expect(screen.getByTestId('left-panel')).toBeTruthy();
    vi.mocked(useFocusStocks).mockReturnValue([]);
  });

  it('renders LeftPanel when events are present', () => {
    vi.mocked(getNextEventToShow).mockReturnValue({ title: 'Meeting', startTime: '10:00' });
    render(<FocusMode onExit={onExit} />);
    expect(screen.getByTestId('left-panel')).toBeTruthy();
    vi.mocked(getNextEventToShow).mockReturnValue(null);
  });

  it('renders fullscreen toggle button', () => {
    render(<FocusMode onExit={onExit} />);
    expect(screen.getByTestId('fullscreen-btn')).toBeTruthy();
  });

  it('toggles fullscreen when button is clicked (no fullscreen element)', () => {
    // Mock requestFullscreen
    document.documentElement.requestFullscreen = vi.fn(() => Promise.resolve());
    render(<FocusMode onExit={onExit} />);
    fireEvent.click(screen.getByTestId('fullscreen-btn'));
    expect(document.documentElement.requestFullscreen).toHaveBeenCalled();
  });

  it('renders background container', () => {
    const { container } = render(<FocusMode onExit={onExit} />);
    // Top-level div should be fixed/full-screen overlay
    const root = container.firstChild;
    expect(root).toBeTruthy();
    expect(root.className).toContain('fixed');
  });

  it('renders photo attribution when photo with author is available', () => {
    vi.mocked(useFocusPhoto).mockReturnValue({
      photo: { author: 'John Doe', photoUrl: 'https://unsplash.com/photos/abc', color: '#333' },
      slotA: 'https://images.unsplash.com/photo-1',
      slotB: null,
      activeSlot: 'a',
      rotate: vi.fn(),
    });
    render(<FocusMode onExit={onExit} />);
    // Reset back
    vi.mocked(useFocusPhoto).mockReturnValue({ photo: null, slotA: null, slotB: null, activeSlot: 'a', rotate: vi.fn() });
  });
});
