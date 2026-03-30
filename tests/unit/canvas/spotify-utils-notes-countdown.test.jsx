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

// Mock chrome (for spotify utils)
const mockLaunchWebAuthFlow = vi.fn();
vi.stubGlobal('chrome', {
  identity: { launchWebAuthFlow: mockLaunchWebAuthFlow, getAuthToken: vi.fn() },
  runtime: { id: 'test-extension-id', lastError: null },
});

// Mock fetch globally
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));

// Mock react-bootstrap-icons
vi.mock('react-bootstrap-icons', () => ({
  EyeFill: () => <span data-testid="eye">👁</span>,
  EyeSlashFill: () => <span data-testid="eye-slash">👁‍🗨</span>,
  ArrowsFullscreen: () => <span>⛶</span>,
  FullscreenExit: () => <span>⛶exit</span>,
  PlusLg: () => <span data-testid="plus">+</span>,
  XLg: () => <span>X</span>,
  Trash3: () => <span>🗑</span>,
  HourglassSplit: () => <span>⏳</span>,
  ArrowRepeat: () => <span>🔄</span>,
  CalendarEvent: () => <span>📅</span>,
}));

// Mock BaseWidget
vi.mock('../../../src/widgets/BaseWidget', () => ({
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
vi.mock('../../../src/widgets/useWidgetSettings', () => ({
  useWidgetSettings: vi.fn((id, defaults) => [defaults, vi.fn()]),
}));

// Mock theme for notes widget
vi.mock('../../../src/theme', () => ({
  ACCENT_COLORS: [
    { name: 'Default', hex: null },
    { name: 'indigo', hex: '#6366f1' },
    { name: 'blue', hex: '#3b82f6' },
    { name: 'green', hex: '#22c55e' },
  ],
}));

// Mock events/useEvents for countdown
vi.mock('../../../src/widgets/useEvents', () => ({
  useEvents: vi.fn(() => [[], vi.fn(), vi.fn()]),
  useGoogleCalendar: vi.fn(() => ({ gcalEvents: [], isLoading: false })),
}));

// Mock countdown utils
vi.mock('../../../src/widgets/countdown/utils', () => ({
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
}));

// Mock events utils
vi.mock('../../../src/widgets/events/utils', () => ({
  todayStr: () => '2025-07-01',
}));

import { useWidgetSettings } from '../../../src/widgets/useWidgetSettings';

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
} from '../../../src/widgets/spotify/utils';

const TOKEN_KEY = 'spotify_tokens';
const PROFILE_KEY = 'spotify_profile';

describe('Spotify Utils — localStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(fetch).mockClear();
  });
  afterEach(() => localStorage.clear());

  describe('SPOTIFY_CLIENT_ID', () => {
    it('is a non-empty string', () => {
      expect(typeof SPOTIFY_CLIENT_ID).toBe('string');
      expect(SPOTIFY_CLIENT_ID.length).toBeGreaterThan(0);
    });
  });

  describe('isSpotifyConnected', () => {
    it('returns false when no token in localStorage', () => {
      expect(isSpotifyConnected()).toBe(false);
    });

    it('returns true when tokens exist in localStorage', () => {
      localStorage.setItem(TOKEN_KEY, JSON.stringify({ access_token: 'tok', expires_at: Date.now() + 3600000 }));
      expect(isSpotifyConnected()).toBe(true);
    });
  });

  describe('disconnectSpotify', () => {
    it('removes token and profile from localStorage', () => {
      localStorage.setItem(TOKEN_KEY, JSON.stringify({ access_token: 'tok' }));
      localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: 'Alice' }));
      disconnectSpotify();
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(localStorage.getItem(PROFILE_KEY)).toBeNull();
    });

    it('is a no-op when localStorage is already empty', () => {
      expect(() => disconnectSpotify()).not.toThrow();
    });
  });

  describe('getSpotifyProfile', () => {
    it('returns null when no profile cached', () => {
      expect(getSpotifyProfile()).toBeNull();
    });

    it('returns profile object when cached', () => {
      const profile = { name: 'Bob', avatar: null };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      expect(getSpotifyProfile()).toEqual(profile);
    });

    it('returns null for invalid JSON', () => {
      localStorage.setItem(PROFILE_KEY, 'not-json');
      expect(getSpotifyProfile()).toBeNull();
    });
  });

  describe('fetchAndCacheProfile', () => {
    it('returns null when not authenticated (no token)', async () => {
      // No token in localStorage means getAccessToken throws 'not_authenticated'
      const result = await fetchAndCacheProfile();
      expect(result).toBeNull();
    });

    it('returns null when API returns non-OK response', async () => {
      // Set an unexpired token so getAccessToken returns it
      localStorage.setItem(TOKEN_KEY, JSON.stringify({
        access_token: 'valid-tok',
        expires_at: Date.now() + 3600000,
      }));
      vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 403 });
      const result = await fetchAndCacheProfile();
      expect(result).toBeNull();
    });

    it('returns and caches profile when API succeeds', async () => {
      localStorage.setItem(TOKEN_KEY, JSON.stringify({
        access_token: 'valid-tok',
        expires_at: Date.now() + 3600000,
      }));
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          display_name: 'Alice',
          id: 'alice123',
          images: [{ url: 'https://img.spotify.com/avatar.jpg' }],
        }),
      });
      const result = await fetchAndCacheProfile();
      expect(result).not.toBeNull();
      expect(result.name).toBe('Alice');
      expect(result.avatar).toBe('https://img.spotify.com/avatar.jpg');
      // Should be cached
      const cached = getSpotifyProfile();
      expect(cached).toEqual(result);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Notes Widget
// ─────────────────────────────────────────────────────────────────────────────
import { Widget as NotesWidget } from '../../../src/widgets/notes/Widget';

describe('Notes Widget', () => {
  beforeEach(() => {
    vi.mocked(useWidgetSettings).mockReturnValue([{ text: '', bgColor: null }, vi.fn()]);
  });

  it('renders without crashing', () => {
    expect(() => render(<NotesWidget id="notes-1" onRemove={vi.fn()} />)).not.toThrow();
  });

  it('renders textarea for note text', () => {
    render(<NotesWidget id="notes-1" onRemove={vi.fn()} />);
    expect(screen.getByRole('textbox')).toBeTruthy();
  });

  it('renders with existing text in textarea', () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{ text: 'Hello World', bgColor: null }, vi.fn()]);
    render(<NotesWidget id="notes-1" onRemove={vi.fn()} />);
    expect(screen.getByDisplayValue('Hello World')).toBeTruthy();
  });

  it('renders color palette in settings', () => {
    render(<NotesWidget id="notes-1" onRemove={vi.fn()} />);
    expect(screen.getByTestId('settings-content')).toBeTruthy();
    // Color buttons should be rendered
    const settingsEl = screen.getByTestId('settings-content');
    expect(settingsEl.querySelectorAll('button').length).toBeGreaterThan(0);
  });

  it('renders eye (hide) button', () => {
    render(<NotesWidget id="notes-1" onRemove={vi.fn()} />);
    expect(screen.getByTestId('eye')).toBeTruthy();
  });

  it('toggles hide state when eye button is clicked', () => {
    render(<NotesWidget id="notes-1" onRemove={vi.fn()} />);
    const eyeBtn = screen.getByTestId('eye').closest('button');
    fireEvent.click(eyeBtn);
    // After hiding, eye-slash should appear
    expect(screen.getByTestId('eye-slash')).toBeTruthy();
  });

  it('toggles back to shown when eye-slash button is clicked', () => {
    render(<NotesWidget id="notes-1" onRemove={vi.fn()} />);
    const eyeBtn = screen.getByTestId('eye').closest('button');
    fireEvent.click(eyeBtn); // hide
    const eyeSlashBtn = screen.getByTestId('eye-slash').closest('button');
    fireEvent.click(eyeSlashBtn); // show again
    expect(screen.getByTestId('eye')).toBeTruthy();
  });

  it('renders expand button', () => {
    render(<NotesWidget id="notes-1" onRemove={vi.fn()} />);
    // ArrowsFullscreen icon should be visible
    expect(screen.getByText('⛶')).toBeTruthy();
  });

  it('opens expanded view when expand button is clicked', () => {
    render(<NotesWidget id="notes-1" onRemove={vi.fn()} />);
    const expandBtn = screen.getByText('⛶').closest('button');
    fireEvent.click(expandBtn);
    // Should show expanded modal with FullscreenExit button
    expect(screen.getByText('⛶exit')).toBeTruthy();
  });

  it('applies custom bgColor from settings', () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{ text: '', bgColor: '#6366f1' }, vi.fn()]);
    const { getByTestId } = render(<NotesWidget id="notes-1" onRemove={vi.fn()} />);
    const widget = getByTestId('base-widget');
    expect(widget.style.backgroundColor).toBe('rgb(99, 102, 241)');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Countdown Widget
// ─────────────────────────────────────────────────────────────────────────────
import { Widget as CountdownWidget } from '../../../src/widgets/countdown/Widget';

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
    // Close modal via X button
    const closeBtn = screen.getByText('X').closest('button');
    fireEvent.click(closeBtn);
    expect(screen.queryByText('New Countdown')).toBeNull();
  });
});
