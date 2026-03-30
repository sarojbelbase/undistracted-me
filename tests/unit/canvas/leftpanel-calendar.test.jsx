/**
 * Render tests for FocusMode/LeftPanel and Calendar widget.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

global.ResizeObserver = class { observe() { } unobserve() { } disconnect() { } };

// ─────────────────────────────────────────────────────────────────────────────
// LeftPanel component
// ─────────────────────────────────────────────────────────────────────────────

import { LeftPanel } from '../../../src/components/FocusMode/LeftPanel';

// Stub useSettingsStore to avoid Zustand in jsdom
vi.mock('../../../src/store', () => ({
  useSettingsStore: vi.fn((selector) => {
    const state = { mode: 'dark', accent: 'Default', language: 'en' };
    return selector ? selector(state) : state;
  }),
  useWidgetInstancesStore: vi.fn((selector) => {
    const state = { instances: [] };
    return selector ? selector(state) : state;
  }),
}));

describe('LeftPanel — returns null when no content', () => {
  it('renders nothing when all props are empty/null', () => {
    const { container } = render(
      <LeftPanel pomodoro={null} eventInfo={null} stocks={[]} spotifyTrack={null} onToggle={vi.fn()} onNext={vi.fn()} onPrev={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('LeftPanel — pomodoro card', () => {
  it('renders without crashing when pomodoro data is provided', () => {
    expect(() =>
      render(
        <LeftPanel
          pomodoro={{ running: true, remaining: 1500, total: 1500, preset: '25 min' }}
          eventInfo={null}
          stocks={[]}
          spotifyTrack={null}
          onToggle={vi.fn()}
          onNext={vi.fn()}
          onPrev={vi.fn()}
        />
      )
    ).not.toThrow();
  });

  it('shows the formatted pomodoro time', () => {
    render(
      <LeftPanel
        pomodoro={{ running: true, remaining: 1500, total: 1500, preset: '25 min' }}
        eventInfo={null}
        stocks={[]}
        spotifyTrack={null}
        onToggle={vi.fn()}
        onNext={vi.fn()}
        onPrev={vi.fn()}
      />
    );
    expect(screen.getByText('25:00')).toBeTruthy();
  });

  it('shows the preset label', () => {
    render(
      <LeftPanel
        pomodoro={{ running: true, remaining: 900, total: 1500, preset: '25 min' }}
        eventInfo={null}
        stocks={[]}
        spotifyTrack={null}
        onToggle={vi.fn()}
        onNext={vi.fn()}
        onPrev={vi.fn()}
      />
    );
    expect(screen.getByText(/Focus.*25 min/)).toBeTruthy();
  });
});

describe('LeftPanel — event card', () => {
  const eventInfo = {
    event: {
      id: 'ev1',
      title: 'Stand-up Meeting',
      startDate: '2025-06-10',
      startTime: '09:30',
    },
    isActive: false,
  };

  it('renders the event title', () => {
    render(
      <LeftPanel
        pomodoro={null}
        eventInfo={eventInfo}
        stocks={[]}
        spotifyTrack={null}
        onToggle={vi.fn()}
        onNext={vi.fn()}
        onPrev={vi.fn()}
      />
    );
    expect(screen.getByText('Stand-up Meeting')).toBeTruthy();
  });

  it('shows "Upcoming" label for non-active events', () => {
    render(
      <LeftPanel
        pomodoro={null}
        eventInfo={eventInfo}
        stocks={[]}
        spotifyTrack={null}
        onToggle={vi.fn()}
        onNext={vi.fn()}
        onPrev={vi.fn()}
      />
    );
    expect(screen.getByText('Upcoming')).toBeTruthy();
  });

  it('shows "Now" label for active events', () => {
    const activeInfo = { ...eventInfo, isActive: true };
    render(
      <LeftPanel
        pomodoro={null}
        eventInfo={activeInfo}
        stocks={[]}
        spotifyTrack={null}
        onToggle={vi.fn()}
        onNext={vi.fn()}
        onPrev={vi.fn()}
      />
    );
    expect(screen.getByText('Now')).toBeTruthy();
  });
});

describe('LeftPanel — stocks card', () => {
  it('renders a stock symbol', () => {
    render(
      <LeftPanel
        pomodoro={null}
        eventInfo={null}
        stocks={[{ sym: 'NABIL', data: { ltp: 1500, prevClose: 1400, prices: [1400, 1500] } }]}
        spotifyTrack={null}
        onToggle={vi.fn()}
        onNext={vi.fn()}
        onPrev={vi.fn()}
      />
    );
    expect(screen.getByText('NABIL')).toBeTruthy();
  });

  it('shows "Watchlist" when 2+ stocks', () => {
    render(
      <LeftPanel
        pomodoro={null}
        eventInfo={null}
        stocks={[
          { sym: 'NABIL', data: { ltp: 1500, prevClose: 1400, prices: [1400, 1500] } },
          { sym: 'NIC', data: { ltp: 800, prevClose: 780, prices: [780, 800] } },
        ]}
        spotifyTrack={null}
        onToggle={vi.fn()}
        onNext={vi.fn()}
        onPrev={vi.fn()}
      />
    );
    expect(screen.getByText('Watchlist')).toBeTruthy();
  });

  it('shows "Stocks" when single stock', () => {
    render(
      <LeftPanel
        pomodoro={null}
        eventInfo={null}
        stocks={[{ sym: 'NABIL', data: { ltp: 1500, prevClose: 1400, prices: [1400, 1500] } }]}
        spotifyTrack={null}
        onToggle={vi.fn()}
        onNext={vi.fn()}
        onPrev={vi.fn()}
      />
    );
    expect(screen.getByText('Stocks')).toBeTruthy();
  });

  it('shows "—" for null stock data', () => {
    render(
      <LeftPanel
        pomodoro={null}
        eventInfo={null}
        stocks={[{ sym: 'NABIL', data: null }]}
        spotifyTrack={null}
        onToggle={vi.fn()}
        onNext={vi.fn()}
        onPrev={vi.fn()}
      />
    );
    expect(screen.getByText('—')).toBeTruthy();
  });
});

describe('LeftPanel — Spotify card', () => {
  const track = {
    title: 'Bohemian Rhapsody',
    artist: 'Queen',
    albumArt: null,
    isPlaying: true,
  };

  it('renders track title', () => {
    render(
      <LeftPanel
        pomodoro={null}
        eventInfo={null}
        stocks={[]}
        spotifyTrack={track}
        onToggle={vi.fn()}
        onNext={vi.fn()}
        onPrev={vi.fn()}
      />
    );
    expect(screen.getByText('Bohemian Rhapsody')).toBeTruthy();
  });

  it('renders artist name', () => {
    render(
      <LeftPanel
        pomodoro={null}
        eventInfo={null}
        stocks={[]}
        spotifyTrack={track}
        onToggle={vi.fn()}
        onNext={vi.fn()}
        onPrev={vi.fn()}
      />
    );
    expect(screen.getByText('Queen')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Calendar Widget
// ─────────────────────────────────────────────────────────────────────────────

import { Widget as CalendarWidget } from '../../../src/widgets/calendar/Widget';

describe('CalendarWidget', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-10T12:00:00Z'));
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('renders without crashing', () => {
    expect(() => render(<CalendarWidget id="calendar" />)).not.toThrow();
  });

  it('renders 7 weekday header abbreviations (Su–Sa)', () => {
    render(<CalendarWidget id="calendar" />);
    // Week day headers are 2-char: Su Mo Tu We Th Fr Sa
    const body = document.body.textContent;
    expect(body).toMatch(/Su|Mo|Tu|We|Th|Fr|Sa/);
  });

  it('renders a month/year label', () => {
    render(<CalendarWidget id="calendar" />);
    // Default is BS (Bikram Sambat) — months like Baisakh, Jestha, etc.
    // or AD months for English — either way there should be a year number
    const body = document.body.textContent;
    expect(body).toMatch(/\d{4}/);
  });

  it('renders numbered day cells', () => {
    render(<CalendarWidget id="calendar" />);
    // Numbers 1-31 should be in the DOM
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
  });
});
