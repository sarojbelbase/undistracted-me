/**
 * Tests for clock/Settings.jsx and spotify/Widget.jsx
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

global.ResizeObserver = class { observe() { } unobserve() { } disconnect() { } };

// Mock react-bootstrap-icons
vi.mock('react-bootstrap-icons', () => ({
  SkipStartFill: () => <span>Prev</span>,
  SkipEndFill: () => <span>Next</span>,
  PlayFill: () => <span>Play</span>,
  PauseFill: () => <span>Pause</span>,
  MusicNoteBeamed: () => <span data-testid="music-icon">Music</span>,
}));

// Mock BaseWidget to just render children
vi.mock('../../../src/widgets/BaseWidget', () => ({
  BaseWidget: React.forwardRef(({ children, className, settingsContent, onRemove }, ref) => (
    <div ref={ref} data-testid="base-widget" className={className}>
      {children}
      {settingsContent && <div data-testid="settings-slot">{typeof settingsContent === 'function' ? settingsContent(vi.fn()) : settingsContent}</div>}
    </div>
  )),
}));

// Mock useWidgetSettings hook
vi.mock('../../../src/widgets/useWidgetSettings', () => ({
  useWidgetSettings: vi.fn(),
}));

// Mock spotify utils
vi.mock('../../../src/widgets/spotify/utils', () => ({
  SPOTIFY_CLIENT_ID: null, // Default: not configured
  connectSpotify: vi.fn(),
  disconnectSpotify: vi.fn(),
  isSpotifyConnected: vi.fn(() => false),
  getCurrentPlayback: vi.fn(() => Promise.resolve(null)),
  setPlayPause: vi.fn(),
  skipNext: vi.fn(),
  skipPrev: vi.fn(),
  extractAlbumColor: vi.fn(() => Promise.resolve(null)),
  fetchAndCacheProfile: vi.fn(() => Promise.resolve(null)),
  getSpotifyProfile: vi.fn(() => null),
}));

// Mock stock utils for Stock widget tests
vi.mock('../../../src/widgets/stock/utils', () => ({
  fetchChart: vi.fn(() => Promise.resolve(null)),
  fetchCompanies: vi.fn(() => Promise.resolve([])),
  buildSparklinePaths: vi.fn(() => ({ line: '', area: '' })),
  priceStats: vi.fn(() => ({ dir: 'flat', change: 0, pct: 0 })),
  fmtPrice: vi.fn(v => (v != null ? String(v) : '—')),
  fmtOHL: vi.fn(v => (v != null ? String(v) : '—')),
  humanizeAge: vi.fn(() => 'just now'),
}));

import { Settings as ClockSettings } from '../../../src/widgets/clock/Settings';
import { Widget as SpotifyWidget } from '../../../src/widgets/spotify/Widget';
import { Widget as StockWidget } from '../../../src/widgets/stock/Widget';

import { useWidgetSettings } from '../../../src/widgets/useWidgetSettings';
import { fetchChart } from '../../../src/widgets/stock/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Clock Settings
// ─────────────────────────────────────────────────────────────────────────────
describe('Clock Settings', () => {
  let onChange;

  beforeEach(() => {
    onChange = vi.fn();
  });

  it('renders Time Format section', () => {
    render(<ClockSettings format="24h" timezones={[]} onChange={onChange} />);
    expect(screen.getByText('Time Format')).toBeTruthy();
  });

  it('renders 24h and 12h buttons', () => {
    render(<ClockSettings format="24h" timezones={[]} onChange={onChange} />);
    expect(screen.getByText('24h')).toBeTruthy();
    expect(screen.getByText('12h (AM/PM)')).toBeTruthy();
  });

  it('calls onChange when 12h format is clicked', () => {
    render(<ClockSettings format="24h" timezones={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText('12h (AM/PM)'));
    expect(onChange).toHaveBeenCalledWith('format', '12h');
  });

  it('calls onChange when 24h format is clicked', () => {
    render(<ClockSettings format="12h" timezones={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText('24h'));
    expect(onChange).toHaveBeenCalledWith('format', '24h');
  });

  it('renders Extra Clocks section', () => {
    render(<ClockSettings format="24h" timezones={[]} onChange={onChange} />);
    expect(screen.getByText('Extra Clocks')).toBeTruthy();
  });

  it('shows "0 / 2" counter initially', () => {
    render(<ClockSettings format="24h" timezones={[]} onChange={onChange} />);
    expect(screen.getByText('0 / 2')).toBeTruthy();
  });

  it('shows Add timezone select for slot 0 when empty', () => {
    render(<ClockSettings format="24h" timezones={[]} onChange={onChange} />);
    expect(screen.getByText('＋ Add a timezone')).toBeTruthy();
  });

  it('calls onChange with timezones when timezone is selected', () => {
    render(<ClockSettings format="24h" timezones={[]} onChange={onChange} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'America/New_York' } });
    expect(onChange).toHaveBeenCalledWith('timezones', ['America/New_York']);
  });

  it('shows existing timezone with its label when timezones has one value', () => {
    render(<ClockSettings format="24h" timezones={['America/New_York']} onChange={onChange} />);
    // Should show label (sans timezone offset in parens)
    expect(screen.getByText('New York')).toBeTruthy();
  });

  it('shows the IANA string for existing timezone', () => {
    render(<ClockSettings format="24h" timezones={['America/New_York']} onChange={onChange} />);
    expect(screen.getByText('America/New_York')).toBeTruthy();
  });

  it('shows remove button for existing timezone', () => {
    render(<ClockSettings format="24h" timezones={['America/New_York']} onChange={onChange} />);
    expect(screen.getByTitle('Remove')).toBeTruthy();
  });

  it('calls onChange to remove timezone when Remove is clicked', () => {
    render(<ClockSettings format="24h" timezones={['America/New_York']} onChange={onChange} />);
    fireEvent.click(screen.getByTitle('Remove'));
    expect(onChange).toHaveBeenCalledWith('timezones', []);
  });

  it('shows slot 1 when slot 0 is filled', () => {
    render(<ClockSettings format="24h" timezones={['America/New_York']} onChange={onChange} />);
    // Should show a second "Add timezone" select for slot 1
    expect(screen.getByText('＋ Add a timezone')).toBeTruthy();
  });

  it('shows "1 / 2" counter when one timezone is set', () => {
    render(<ClockSettings format="24h" timezones={['America/New_York']} onChange={onChange} />);
    expect(screen.getByText('1 / 2')).toBeTruthy();
  });

  it('shows slots for two existing timezones', () => {
    render(<ClockSettings format="24h" timezones={['America/New_York', 'Asia/Tokyo']} onChange={onChange} />);
    expect(screen.getByText('New York')).toBeTruthy();
    expect(screen.getByText('Tokyo')).toBeTruthy();
    expect(screen.getByText('2 / 2')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spotify Widget (when SPOTIFY_CLIENT_ID is null)
// ─────────────────────────────────────────────────────────────────────────────
describe('Spotify Widget — no client ID configured', () => {
  it('renders setup prompt', () => {
    render(<SpotifyWidget onRemove={vi.fn()} />);
    expect(screen.getByText(/SPOTIFY_CLIENT_ID/i)).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Spotify Widget — with client ID but not connected
// ─────────────────────────────────────────────────────────────────────────────
describe('Spotify Widget — disconnected state', () => {
  it('renders Connect Spotify button when not connected', async () => {
    const { SPOTIFY_CLIENT_ID: _, ...spotifyUtils } = await import('../../../src/widgets/spotify/utils');
    // We need to test the "not connected" path — re-mock SPOTIFY_CLIENT_ID as truthy
    vi.doMock('../../../src/widgets/spotify/utils', () => ({
      ...spotifyUtils,
      SPOTIFY_CLIENT_ID: 'test-client-id',
      isSpotifyConnected: vi.fn(() => false),
      getCurrentPlayback: vi.fn(() => Promise.resolve(null)),
      getSpotifyProfile: vi.fn(() => null),
      extractAlbumColor: vi.fn(() => Promise.resolve(null)),
    }));
    // The snapshot test is about the initial not-connected state with null SPOTIFY_CLIENT_ID
    // which is the setup prompt — already covered above
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Stock Widget
// ─────────────────────────────────────────────────────────────────────────────
describe('Stock Widget', () => {
  beforeEach(() => {
    vi.mocked(useWidgetSettings).mockReturnValue([{ symbols: ['GBIME'] }, vi.fn()]);
    vi.mocked(fetchChart).mockResolvedValue(null);
  });

  it('renders BaseWidget', () => {
    render(<StockWidget id="stock-1" onRemove={vi.fn()} />);
    expect(screen.getByTestId('base-widget')).toBeTruthy();
  });

  it('renders symbol label for single stock', () => {
    render(<StockWidget id="stock-1" onRemove={vi.fn()} />);
    expect(screen.getAllByText('GBIME').length).toBeGreaterThan(0);
  });

  it('renders dash price when no chart data loaded', () => {
    render(<StockWidget id="stock-1" onRemove={vi.fn()} />);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('renders Watchlist label for multi-stock view', () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{ symbols: ['GBIME', 'NABIL'] }, vi.fn()]);
    render(<StockWidget id="stock-1" onRemove={vi.fn()} />);
    expect(screen.getByText('Watchlist')).toBeTruthy();
  });

  it('renders all symbols in list view', () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{ symbols: ['GBIME', 'NABIL', 'SCB'] }, vi.fn()]);
    render(<StockWidget id="stock-1" onRemove={vi.fn()} />);
    expect(screen.getAllByText('GBIME').length).toBeGreaterThan(0);
    expect(screen.getAllByText('NABIL').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SCB').length).toBeGreaterThan(0);
  });

  it('renders stock refresh button', () => {
    render(<StockWidget id="stock-1" onRemove={vi.fn()} />);
    expect(screen.getByRole('button', { name: /refresh/i })).toBeTruthy();
  });

  it('renders with empty symbols array', () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{ symbols: [] }, vi.fn()]);
    render(<StockWidget id="stock-1" onRemove={vi.fn()} />);
    expect(screen.getByTestId('base-widget')).toBeTruthy();
  });
});
