/**
 * Tests for:
 * - spotify/utils.js local storage functions (disconnectSpotify, isSpotifyConnected, getSpotifyProfile, fetchAndCacheProfile)
 * - notes/Widget.jsx
 * - countdown/Widget.jsx additional tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

global.ResizeObserver = class { observe() { } unobserve() { } disconnect() { } };

// ─────────────────────────────────────────────────────────────────────────────
// Setup mocks before component test files
// ─────────────────────────────────────────────────────────────────────────────

// Mock chrome globally (without launchWebAuthFlow so isWebMode() returns true, enabling localStorage path)
vi.stubGlobal('chrome', {
  runtime: { id: 'test-extension-id', lastError: null },
});

// Mock fetch globally
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));

// Mock react-bootstrap-icons — override the icons this suite asserts on and keep
// the real exports so any other icon a component imports still resolves.
vi.mock('react-bootstrap-icons', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    EyeFill: () => <span data-testid="eye">👁</span>,
    EyeSlashFill: () => <span data-testid="eye-slash">👁‍🗨</span>,
    ArrowsFullscreen: () => <span>⛶</span>,
    FullscreenExit: () => <span>⛶exit</span>,
    PlusLg: () => <span data-testid="plus">+</span>,
    Plus: () => <span data-testid="plus">+</span>,
    DashLg: () => <span>-</span>,
    ArrowLeft: () => <span>←</span>,
    ArrowClockwise: () => <span>↻</span>,
    CheckCircleFill: () => <span>✓</span>,
    ChevronLeft: () => <span>‹</span>,
    ChevronRight: () => <span>›</span>,
    XLg: () => <span>X</span>,
    Trash3: () => <span>🗑</span>,
    HourglassSplit: () => <span>⏳</span>,
    ArrowRepeat: () => <span>🔄</span>,
    CalendarEvent: () => <span>📅</span>,
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
  };
});

// Prevent store init crash (circular dep via widget registry)
vi.mock('../../../app/store/useWidgetInstancesStore', () => ({
  useWidgetInstancesStore: vi.fn((selector) =>
    typeof selector === 'function' ? selector({ instances: [], widgetSettings: {} }) : undefined
  ),
}));

// Mock BaseWidget
vi.mock('../../../app/widgets/BaseWidget', () => ({
  BaseWidget: React.forwardRef(({ children, className, settingsContent, cardStyle, onRemove }, ref) => (
    <div ref={ref} data-testid="base-widget" style={cardStyle}>
      {children}
      {settingsContent && (
        <div data-testid="settings-content">
          {typeof settingsContent === 'function' ? settingsContent(vi.fn()) : settingsContent}
        </div>
      )}
    </div>
  )),
}));

// Mock useWidgetSettings
vi.mock('../../../app/widgets/useWidgetSettings', () => ({
  useWidgetSettings: vi.fn((id, defaults) => [defaults, vi.fn()]),
}));

// Mock theme for notes widget
vi.mock('../../../app/theme', () => ({
  ACCENT_COLORS: [
    { name: 'Default', hex: null },
    { name: 'indigo', hex: '#6366f1' },
    { name: 'blue', hex: '#3b82f6' },
    { name: 'green', hex: '#22c55e' },
  ],
}));

// Mock events/useEvents for countdown
vi.mock('../../../app/widgets/useEvents', () => ({
  useEvents: vi.fn(() => [[], vi.fn(), vi.fn()]),
  useGoogleCalendar: vi.fn(() => ({ gcalEvents: [], isLoading: false })),
}));

// Mock countdown utils — override only the deterministic bits; keep the rest of
// the module real so a newly imported helper doesn't break the suite.
vi.mock('../../../app/widgets/countdown/utils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    REPEAT_OPTIONS: [
      { value: 'none', label: 'None' },
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
    ],
    getNextOccurrence: vi.fn((cd) => {
      const d = new Date(`${cd.targetDate}T${cd.targetTime || '00:00'}`);
      return d;
    }),
    formatCountdown: vi.fn(() => ({ days: 3, hours: 12, minutes: 30, totalSeconds: 100000 })),
    formatTargetDate: vi.fn(() => 'Jul 4, 2025'),
    saveCustom: vi.fn(),
  };
});

// Mock events utils
vi.mock('../../../app/widgets/events/utils', () => ({
  todayStr: () => '2025-07-01',
}));

import { useWidgetSettings } from '../../../app/widgets/useWidgetSettings';

// ─────────────────────────────────────────────────────────────────────────────
// Spotify Utils (localStorage-based)
// ─────────────────────────────────────────────────────────────────────────────
// Import the real spotify utils (NOT mocked in this test file)
import {
  disconnectSpotify,
  isSpotifyConnected,
  getSpotifyProfile,
  fetchAndCacheProfile,
  SPOTIFY_CLIENT_ID,
} from '../../../app/widgets/media/utils';

const TOKEN_KEY = 'spotify_tokens';
const PROFILE_KEY = 'spotify_profile';

describe('Spotify Utils — media/utils', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.mocked(fetch).mockClear();
  });
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('SPOTIFY_CLIENT_ID', () => {
    it('is a string (set via env at build time)', () => {
      expect(typeof SPOTIFY_CLIENT_ID).toBe('string');
    });
  });

  describe('isSpotifyConnected', () => {
    it('returns false when no token is stored', () => {
      expect(isSpotifyConnected()).toBe(false);
    });

    it('returns true when a token is stored (web mode)', () => {
      sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ access_token: 'tok', expires_at: Date.now() + 3600000 }));
      expect(isSpotifyConnected()).toBe(true);
    });
  });

  describe('disconnectSpotify', () => {
    it('is a no-op when localStorage/sessionStorage are empty', () => {
      expect(() => disconnectSpotify()).not.toThrow();
    });

    it('clears the connected flag', () => {
      localStorage.setItem('spotify_connected', '1');
      disconnectSpotify();
      expect(localStorage.getItem('spotify_connected')).toBeNull();
    });
  });

  describe('getSpotifyProfile', () => {
    it('returns null when no profile cached', async () => {
      expect(await getSpotifyProfile()).toBeNull();
    });

    it('returns profile object when cached', async () => {
      const profile = { name: 'Bob', product: 'premium' };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      expect(await getSpotifyProfile()).toEqual(profile);
    });

    it('returns null for invalid JSON', async () => {
      localStorage.setItem(PROFILE_KEY, 'not-json');
      expect(await getSpotifyProfile()).toBeNull();
    });
  });

  describe('fetchAndCacheProfile', () => {
    it('returns null when not authenticated (no token)', async () => {
      const result = await fetchAndCacheProfile();
      expect(result).toBeNull();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Notes Widget
// ─────────────────────────────────────────────────────────────────────────────
import { Widget as NotesWidget } from '../../../app/widgets/notes/Widget';

describe('Notes Widget', () => {
  beforeEach(() => {
    vi.mocked(useWidgetSettings).mockReturnValue([{ notes: [''], idx: 0 }, vi.fn()]);
  });

  it('renders without crashing', () => {
    expect(() => render(<NotesWidget id="notes-1" onRemove={vi.fn()} />)).not.toThrow();
  });

  it('renders textarea for note text', () => {
    render(<NotesWidget id="notes-1" onRemove={vi.fn()} />);
    expect(screen.getByRole('textbox')).toBeTruthy();
  });

  it('renders with existing note body in textarea', () => {
    vi.mocked(useWidgetSettings).mockReturnValue([
      { notes: [{ id: 'n1', text: 'Title\nHello World', updatedAt: Date.now() }], idx: 0 },
      vi.fn(),
    ]);
    render(<NotesWidget id="notes-1" onRemove={vi.fn()} />);
    expect(screen.getByDisplayValue('Hello World')).toBeTruthy();
  });

  it('renders a full-screen button', () => {
    render(<NotesWidget id="notes-1" onRemove={vi.fn()} />);
    expect(screen.getByLabelText('Open in full screen')).toBeTruthy();
  });

  it('opens full-screen view when full-screen button is clicked', () => {
    render(<NotesWidget id="notes-1" onRemove={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Open in full screen'));
    // Full-screen mode renders a "Back to widget" button + title input
    expect(screen.getByLabelText('Back to widget')).toBeTruthy();
  });

  it('textarea accepts text input', () => {
    const mockUpdate = vi.fn();
    vi.mocked(useWidgetSettings).mockReturnValue([{ notes: [''], idx: 0 }, mockUpdate]);
    render(<NotesWidget id="notes-1" onRemove={vi.fn()} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'New text' } });
    expect(textarea.value).toBe('New text');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Countdown Widget
// ─────────────────────────────────────────────────────────────────────────────
import { Widget as CountdownWidget } from '../../../app/widgets/countdown/Widget';

describe('Countdown Widget', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it('renders without crashing', () => {
    expect(() => render(<CountdownWidget onRemove={vi.fn()} />)).not.toThrow();
  });

  it('renders BaseWidget wrapper', () => {
    render(<CountdownWidget onRemove={vi.fn()} />);
    expect(screen.getByTestId('base-widget')).toBeTruthy();
  });

  it('renders add countdown button', () => {
    render(<CountdownWidget onRemove={vi.fn()} />);
    expect(screen.getAllByTestId('plus').length).toBeGreaterThan(0);
  });

  it('opens AddModal when + button is clicked', () => {
    render(<CountdownWidget onRemove={vi.fn()} />);
    const plusBtn = screen.getAllByTestId('plus')[0];
    fireEvent.click(plusBtn);
    // Should show the new countdown modal
    expect(screen.getByText('New Countdown')).toBeTruthy();
  });

  it('shows empty state when no countdowns', () => {
    render(<CountdownWidget onRemove={vi.fn()} />);
    // Should show hourglass or similar empty state icon
    expect(screen.queryByTestId('base-widget')).toBeTruthy();
  });

  it('renders countdown item from localStorage and shows its title', () => {
    const countdownData = [
      {
        id: 'cd_1',
        title: 'Summer Festival',
        targetDate: '2025-08-15',
        targetTime: '12:00',
        repeat: 'none',
      },
      {
        id: 'cd_2',
        title: 'New Year',
        targetDate: '2026-01-01',
        targetTime: '00:00',
        repeat: 'none',
      }
    ];
    localStorage.setItem('countdown_events', JSON.stringify(countdownData));
    render(<CountdownWidget onRemove={vi.fn()} />);
    expect(screen.getByText('Summer Festival')).toBeTruthy();
  });

  it('cancels AddModal when Cancel button is clicked', () => {
    render(<CountdownWidget onRemove={vi.fn()} />);
    fireEvent.click(screen.getAllByTestId('plus')[0]);
    expect(screen.getByText('New Countdown')).toBeTruthy();
    // AddCountdown's footer Cancel button closes the modal without saving.
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('New Countdown')).toBeNull();
  });
});
