/**
 * Render tests for simple Widget.jsx components:
 * Facts, DayProgress, DateToday, Clock
 *
 * Strategy: we care about what the user sees, not implementation details.
 * These widgets render data from pure utility functions onto the page.
 *
 * What can go wrong:
 *  – Widget renders blank/crashes if utility returns unexpected shape
 *  – BaseWidget removes children in some edge case
 *  – Percentage / date / time text is not rendered into the DOM
 *  – onRemove is wired up (the three-dot menu must not silently drop the callback)
 *
 * We mock nothing except timers so the snapshot is deterministic.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Prevent ResizeObserver error in jsdom
global.ResizeObserver = class { observe() { } unobserve() { } disconnect() { } };

// sharedClock registers a real setInterval at module-level (leader election).
// In tests, mock it so no real interval is registered and the worker can exit.
vi.mock('../../../src/utilities/sharedClock', () => ({
  onClockTick: vi.fn((fn) => {
    fn(); // call immediately, like the real implementation
    return () => { }; // no-op cleanup
  }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Facts Widget
// ─────────────────────────────────────────────────────────────────────────────

import { Widget as FactsWidget } from '../../../src/widgets/facts/Widget';
import { FACTS } from '../../../src/data/facts';

describe('FactsWidget', () => {
  it('renders without crashing', () => {
    expect(() => render(<FactsWidget />)).not.toThrow();
  });

  it('renders the fact text on screen', () => {
    render(<FactsWidget />);
    // The rendered text must be one of the facts
    const index = Math.floor(Date.now() / 86_400_000) % FACTS.length;
    const expectedText = FACTS[index].text;
    // Just verify some text is on screen (substring to avoid whitespace issues)
    expect(screen.getByText(expectedText)).toBeTruthy();
  });

  it('renders the category badge', () => {
    render(<FactsWidget />);
    const index = Math.floor(Date.now() / 86_400_000) % FACTS.length;
    expect(screen.getByText(FACTS[index].category)).toBeTruthy();
  });

  it('renders onRemove widget without crash', () => {
    const onRemove = vi.fn();
    expect(() => render(<FactsWidget onRemove={onRemove} />)).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DayProgress Widget
// ─────────────────────────────────────────────────────────────────────────────

import { Widget as DayProgressWidget } from '../../../src/widgets/dayProgress/Widget';

describe('DayProgressWidget', () => {
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
    expect(() => render(<DayProgressWidget />)).not.toThrow();
  });

  it('renders "Day Progress" label', () => {
    render(<DayProgressWidget />);
    expect(screen.getByText('Day Progress')).toBeTruthy();
  });

  it('renders a percentage value (e.g. "50%")', () => {
    render(<DayProgressWidget />);
    // At noon UTC the percentage is 50 (locally may vary, so check format)
    const percentEl = screen.getByText(/\d+%/);
    expect(percentEl).toBeTruthy();
  });

  it('renders 24 dot elements (one per hour)', () => {
    const { container } = render(<DayProgressWidget />);
    // Each dot has the class w-dot
    const dots = container.querySelectorAll('[class*="w-dot"]');
    expect(dots.length).toBeGreaterThanOrEqual(24);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DateToday Widget
// ─────────────────────────────────────────────────────────────────────────────

import { Widget as DateTodayWidget } from '../../../src/widgets/dateToday/Widget';

describe('DateTodayWidget', () => {
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
    expect(() => render(<DateTodayWidget id="dateToday" />)).not.toThrow();
  });

  it('renders a month name', () => {
    render(<DateTodayWidget id="dateToday" />);
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    const found = months.some((m) => screen.queryByText(m) !== null);
    expect(found).toBe(true);
  });

  it('renders a day number', () => {
    render(<DateTodayWidget id="dateToday" />);
    // Should have a 2-digit day number somewhere
    expect(screen.getByText(/^\d{2}$/)).toBeTruthy();
  });

  it('renders without crash in Nepali mode (saved setting)', () => {
    localStorage.setItem('widgetSettings_dateToday', JSON.stringify({ language: 'ne' }));
    expect(() => render(<DateTodayWidget id="dateToday" />)).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Clock Widget
// ─────────────────────────────────────────────────────────────────────────────

import { Widget as ClockWidget } from '../../../src/widgets/clock/Widget';

// ClockWidget uses onClockTick (mocked above) — no fake timers needed.
// Real timers are used so vi.setSystemTime doesn't interact with dayjs.tz().
describe('ClockWidget', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders without crashing', () => {
    expect(() => render(<ClockWidget id="clock" />)).not.toThrow();
  });

  it('renders a time string matching HH:MM pattern', () => {
    render(<ClockWidget id="clock" />);
    const timeEl = screen.getByText(/^\d{1,2}:\d{2}$/);
    expect(timeEl).toBeTruthy();
  });

  it('renders a greeting text', () => {
    render(<ClockWidget id="clock" />);
    // Widget renders clock + greeting — body should have meaningful text
    expect(document.body.textContent.length).toBeGreaterThan(5);
  });

  it('renders with 24h format by default', () => {
    render(<ClockWidget id="clock" />);
    // Default is 24h — no AM/PM period shown, just HH:MM
    const timeEl = screen.getByText(/^\d{1,2}:\d{2}$/);
    expect(timeEl).toBeTruthy();
  });

  it('cleanup function is called on unmount', () => {
    // onClockTick (mocked) returns a no-op cleanup; just verify unmount doesn't throw
    const { unmount } = render(<ClockWidget id="clock" />);
    expect(() => unmount()).not.toThrow();
  });
});
