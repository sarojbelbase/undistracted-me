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
  XLg: () => <span aria-hidden="true">✕</span>,
  MusicNoteBeamed: () => <span data-testid="music-icon">Music</span>,
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
}));

// Prevent store init crash (circular dep via widget registry)
vi.mock('../../../app/store/useWidgetInstancesStore', () => ({
  useWidgetInstancesStore: vi.fn((selector) =>
    typeof selector === 'function' ? selector({ instances: [], widgetSettings: {} }) : undefined
  ),
}));

// Mock BaseWidget to just render children
vi.mock('../../../app/widgets/BaseWidget', () => ({
  BaseWidget: React.forwardRef(({ children, className, settingsContent, onRemove }, ref) => (
    <div ref={ref} data-testid="base-widget" className={className}>
      {children}
      {settingsContent && <div data-testid="settings-slot">{typeof settingsContent === 'function' ? settingsContent(vi.fn()) : settingsContent}</div>}
    </div>
  )),
}));

// Mock useWidgetSettings hook
vi.mock('../../../app/widgets/useWidgetSettings', () => ({
  useWidgetSettings: vi.fn(),
}));

// Mock spotify utils (media/utils) — kept for any transitive import
vi.mock('../../../app/widgets/media/utils', () => ({
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
  getSpotifyProfile: vi.fn(() => Promise.resolve(null)),
  getChromeMedia: vi.fn(() => Promise.resolve([])),
}));

// Mock stock utils for Stock widget tests
vi.mock('../../../app/widgets/stock/utils', () => ({
  fetchChart: vi.fn(() => Promise.resolve(null)),
  fetchCompanies: vi.fn(() => Promise.resolve([])),
  buildSparklinePaths: vi.fn(() => ({ line: '', area: '' })),
  priceStats: vi.fn(() => ({ dir: 'flat', change: 0, pct: 0 })),
  fmtPrice: vi.fn(v => (v != null ? String(v) : '—')),
  fmtOHL: vi.fn(v => (v != null ? String(v) : '—')),
  fmtVolume: vi.fn(v => (v != null ? String(v) : '—')),
  humanizeAge: vi.fn(() => 'just now'),
}));

// The stock widget reads chart data from the shared useStocks hook (DataHub).
vi.mock('../../../app/widgets/stock/useStocks', () => ({
  useStocks: vi.fn(),
}));

import { Settings as ClockSettings } from '../../../app/widgets/clock/Settings';
import { Widget as StockWidget } from '../../../app/widgets/stock/Widget';

import { useWidgetSettings } from '../../../app/widgets/useWidgetSettings';
import { fetchChart } from '../../../app/widgets/stock/utils';
import { useStocks } from '../../../app/widgets/stock/useStocks';

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

  it('shows "0/2" counter initially', () => {
    render(<ClockSettings format="24h" timezones={[]} onChange={onChange} />);
    expect(screen.getByText('0/2')).toBeTruthy();
  });

  it('shows a timezone search input when a slot is free', () => {
    render(<ClockSettings format="24h" timezones={[]} onChange={onChange} />);
    expect(screen.getByPlaceholderText('Search city, country, or timezone…')).toBeTruthy();
  });

  it('calls onChange with timezones when timezone is selected', () => {
    render(<ClockSettings format="24h" timezones={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText('New York'));
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
    expect(screen.getByLabelText('Remove')).toBeTruthy();
  });

  it('calls onChange to remove timezone when Remove is clicked', () => {
    render(<ClockSettings format="24h" timezones={['America/New_York']} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Remove'));
    expect(onChange).toHaveBeenCalledWith('timezones', []);
  });

  it('shows a search input for the second slot when slot 0 is filled', () => {
    render(<ClockSettings format="24h" timezones={['America/New_York']} onChange={onChange} />);
    expect(screen.getByPlaceholderText('Search city, country, or timezone…')).toBeTruthy();
  });

  it('shows "1/2" counter when one timezone is set', () => {
    render(<ClockSettings format="24h" timezones={['America/New_York']} onChange={onChange} />);
    expect(screen.getByText('1/2')).toBeTruthy();
  });

  it('shows slots for two existing timezones', () => {
    render(<ClockSettings format="24h" timezones={['America/New_York', 'Asia/Tokyo']} onChange={onChange} />);
    expect(screen.getByText('New York')).toBeTruthy();
    expect(screen.getByText('Tokyo')).toBeTruthy();
    expect(screen.getByText('2/2')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Media Widget (formerly Spotify) — the Spotify player moved into the media
// widget (app/widgets/media/Widget.jsx), which is covered by other suites.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Stock Widget
// ─────────────────────────────────────────────────────────────────────────────
describe('Stock Widget', () => {
  const makeData = (ltp) => ({
    ltp, prevClose: ltp - 100, prices: [ltp - 100, ltp],
    open: ltp - 50, high: ltp, low: ltp - 80,
  });

  beforeEach(() => {
    vi.mocked(useWidgetSettings).mockReturnValue([{ symbols: ['GBIME'] }, vi.fn()]);
    vi.mocked(useStocks).mockReturnValue({ stocks: [], refresh: vi.fn(), updatedAt: null });
  });

  it('renders BaseWidget', () => {
    render(<StockWidget id="stock-1" onRemove={vi.fn()} />);
    expect(screen.getByTestId('base-widget')).toBeTruthy();
  });

  it('renders symbol label for single stock', () => {
    vi.mocked(useStocks).mockReturnValue({
      stocks: [{ sym: 'GBIME', data: makeData(1500) }],
      refresh: vi.fn(),
      updatedAt: Date.now(),
    });
    render(<StockWidget id="stock-1" onRemove={vi.fn()} />);
    expect(screen.getAllByText('GBIME').length).toBeGreaterThan(0);
  });

  it('renders skeleton when no chart data loaded', () => {
    render(<StockWidget id="stock-1" onRemove={vi.fn()} />);
    // stocks empty → isFirstLoad → skeleton rendered (no price/symbol yet)
    expect(screen.getByTestId('base-widget')).toBeTruthy();
  });

  it('renders Watchlist label for multi-stock view', () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{ symbols: ['GBIME', 'NABIL'] }, vi.fn()]);
    render(<StockWidget id="stock-1" onRemove={vi.fn()} />);
    expect(screen.getByText('Watchlist')).toBeTruthy();
  });

  it('renders all symbols in list view', () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{ symbols: ['GBIME', 'NABIL', 'SCB'] }, vi.fn()]);
    vi.mocked(useStocks).mockReturnValue({
      stocks: [
        { sym: 'GBIME', data: makeData(1500) },
        { sym: 'NABIL', data: makeData(800) },
        { sym: 'SCB', data: makeData(300) },
      ],
      refresh: vi.fn(),
      updatedAt: Date.now(),
    });
    render(<StockWidget id="stock-1" onRemove={vi.fn()} />);
    expect(screen.getAllByText('GBIME').length).toBeGreaterThan(0);
    expect(screen.getAllByText('NABIL').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SCB').length).toBeGreaterThan(0);
  });

  it('renders stock refresh button', () => {
    vi.mocked(useStocks).mockReturnValue({
      stocks: [{ sym: 'GBIME', data: makeData(1500) }],
      refresh: vi.fn(),
      updatedAt: Date.now(),
    });
    render(<StockWidget id="stock-1" onRemove={vi.fn()} />);
    expect(screen.getByRole('button', { name: /refresh/i })).toBeTruthy();
  });

  it('renders with empty symbols array', () => {
    vi.mocked(useWidgetSettings).mockReturnValue([{ symbols: [] }, vi.fn()]);
    render(<StockWidget id="stock-1" onRemove={vi.fn()} />);
    expect(screen.getByTestId('base-widget')).toBeTruthy();
  });
});
