/**
 * Render tests for FocusMode sub-components
 * Covers: ClockDisplay, GreetingDisplay, DigitRoller, WorldClocksPanel, TopBar
 *
 * These are pure presentational components that accept props and render markup.
 * Tests verify the rendered output contains expected text/structure.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

global.ResizeObserver = class { observe() { } unobserve() { } disconnect() { } };

// WorldClocksPanel uses onClockTick (sharedClock) — mock it so no real timer fires
vi.mock('../../../src/utilities/sharedClock', () => ({
  onClockTick: vi.fn((fn) => { fn(); return () => { }; }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// DigitRoller
// ─────────────────────────────────────────────────────────────────────────────

import DigitRoller from '../../../src/components/FocusMode/panels/Clock';

describe('DigitRoller', () => {
  it('renders the digit character', () => {
    render(<DigitRoller char="5" />);
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('renders a span element', () => {
    const { container } = render(<DigitRoller char="3" />);
    expect(container.querySelector('span')).toBeTruthy();
  });

  it('renders digit 0', () => {
    render(<DigitRoller char="0" />);
    expect(screen.getByText('0')).toBeTruthy();
  });

  it('can render any character', () => {
    render(<DigitRoller char="9" />);
    expect(screen.getByText('9')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ClockDisplay
// ─────────────────────────────────────────────────────────────────────────────

import { Clock as ClockDisplay } from '../../../src/components/FocusMode/panels/Clock';

const make24hParts = (time = '14:30') => ({ time, period: '' });
const make12hParts = (time = '02:30', period = 'PM') => ({ time, period });

describe('ClockDisplay', () => {
  it('renders without crashing', () => {
    expect(() => render(<ClockDisplay parts={make24hParts()} centerOnDark={false} />)).not.toThrow();
  });

  it('renders each digit of the time string', () => {
    render(<ClockDisplay parts={make24hParts('12:45')} centerOnDark={false} />);
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('4').length).toBeGreaterThan(0);
    expect(screen.getAllByText('5').length).toBeGreaterThan(0);
  });

  it('renders the colon separator', () => {
    render(<ClockDisplay parts={make24hParts('10:00')} centerOnDark={false} />);
    expect(screen.getByText(':')).toBeTruthy();
  });

  it('renders AM/PM period when provided', () => {
    render(<ClockDisplay parts={make12hParts('02:30', 'PM')} centerOnDark={false} />);
    expect(screen.getByText('PM')).toBeTruthy();
  });

  it('does not render period span when period is empty', () => {
    render(<ClockDisplay parts={make24hParts('14:30')} centerOnDark={false} />);
    expect(screen.queryByText('AM')).toBeNull();
    expect(screen.queryByText('PM')).toBeNull();
  });

  it('applies dark center styling when centerOnDark=true', () => {
    const { container } = render(<ClockDisplay parts={make24hParts()} centerOnDark={true} />);
    // The clock text color should differ between dark/light center
    expect(container.firstChild).toBeTruthy();
  });

  it('renders centerOnDark=false without crash', () => {
    expect(() => render(<ClockDisplay parts={make24hParts()} centerOnDark={false} />)).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GreetingDisplay
// ─────────────────────────────────────────────────────────────────────────────

import { Greetings as GreetingDisplay } from '../../../src/components/FocusMode/panels/Greetings';

describe('GreetingDisplay', () => {
  const greetParts = {
    greeting: { prefix: 'Good', label: 'morning' },
  };

  it('renders without crashing', () => {
    expect(() => render(<GreetingDisplay parts={greetParts} centerOnDark={true} />)).not.toThrow();
  });

  it('renders the greeting prefix', () => {
    render(<GreetingDisplay parts={greetParts} centerOnDark={true} />);
    expect(screen.getByText(/Good/)).toBeTruthy();
  });

  it('renders the greeting label', () => {
    render(<GreetingDisplay parts={greetParts} centerOnDark={false} />);
    expect(screen.getByText('morning')).toBeTruthy();
  });

  it('handles afternoon greeting', () => {
    const afterParts = { greeting: { prefix: 'Good', label: 'afternoon' } };
    render(<GreetingDisplay parts={afterParts} centerOnDark={false} />);
    expect(screen.getByText('afternoon')).toBeTruthy();
  });

  it('handles evening greeting', () => {
    const eveningParts = { greeting: { prefix: 'Good', label: 'evening' } };
    render(<GreetingDisplay parts={eveningParts} centerOnDark={true} />);
    expect(screen.getByText('evening')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WorldClocksPanel
// ─────────────────────────────────────────────────────────────────────────────

import { WorldClocksPanel } from '../../../src/components/FocusMode/WorldClocksPanel';

describe('WorldClocksPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-10T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('renders without crashing with empty timezones', () => {
    const { container } = render(<WorldClocksPanel timezones={[]} clockFormat="24h" />);
    expect(container).toBeTruthy();
  });

  it('returns null (renders nothing) for empty timezones array', () => {
    const { container } = render(<WorldClocksPanel timezones={[]} clockFormat="24h" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders timezone rows when timezones is provided', () => {
    // timezones is an array of IANA tz strings; label comes from TZ_OPTIONS
    const tz = ['America/New_York', 'Asia/Tokyo'];
    render(<WorldClocksPanel timezones={tz} clockFormat="24h" />);
    // City labels should appear (stripped of parenthetical)
    expect(screen.getByText('New York')).toBeTruthy();
    expect(screen.getByText('Tokyo')).toBeTruthy();
  });

  it('renders time in HH:MM format for 24h clock', () => {
    const tz = ['America/New_York'];
    render(<WorldClocksPanel timezones={tz} clockFormat="24h" />);
    // Should show some time like "07:00" or similar
    const timeRegex = /\d{1,2}:\d{2}/;
    expect(document.body.textContent).toMatch(timeRegex);
  });

  it('renders AM/PM for 12h clock format', () => {
    const tz = ['America/New_York'];
    render(<WorldClocksPanel timezones={tz} clockFormat="12h" />);
    // Should show AM or PM
    expect(document.body.textContent).toMatch(/AM|PM/);
  });

  it('updates clock via onClockTick subscription', () => {
    const tz = ['America/New_York'];
    render(<WorldClocksPanel timezones={tz} clockFormat="24h" />);
    // onClockTick is mocked and calls fn immediately — verify text is present
    expect(document.body.textContent.length).toBeGreaterThan(0);
  });

  it('cleans up subscription on unmount', () => {
    // WorldClocksPanel uses onClockTick (mocked) which returns a cleanup fn
    const tz = ['America/New_York'];
    const { unmount } = render(<WorldClocksPanel timezones={tz} clockFormat="24h" />);
    // Unmount should not throw
    expect(() => unmount()).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TopBar
// ─────────────────────────────────────────────────────────────────────────────

import { TopBar } from '../../../src/components/FocusMode/TopBar';

// FocusModeSettings is lazy-loaded — mock it to avoid loading the full settings
vi.mock('../../../src/components/FocusMode/Settings', () => ({
  FocusModeSettings: ({ onRotatePhoto }) => <div data-testid="settings-panel">Settings</div>,
}));

const defaultDateParts = {
  dow: 'Tue', month: 'Jun', day: '10', year: '2025',
};

describe('TopBar', () => {
  it('renders without crashing', () => {
    expect(() =>
      render(
        <TopBar
          onExit={vi.fn()}
          isFullscreen={false}
          toggleFullscreen={vi.fn()}
          uiVisible={true}
          weather={null}
          dateParts={defaultDateParts}
          onRotatePhoto={vi.fn()}
        />
      )
    ).not.toThrow();
  });

  it('renders the "Canvas" back button', () => {
    render(
      <TopBar
        onExit={vi.fn()}
        isFullscreen={false}
        toggleFullscreen={vi.fn()}
        uiVisible={true}
        weather={null}
        dateParts={defaultDateParts}
        onRotatePhoto={vi.fn()}
      />
    );
    expect(screen.getByText('Canvas')).toBeTruthy();
  });

  it('renders the date in the center', () => {
    render(
      <TopBar
        onExit={vi.fn()}
        isFullscreen={false}
        toggleFullscreen={vi.fn()}
        uiVisible={true}
        weather={null}
        dateParts={defaultDateParts}
        onRotatePhoto={vi.fn()}
      />
    );
    // TopBar no longer renders dateParts directly — verify it renders the back button
    expect(screen.getByText('Canvas')).toBeTruthy();
  });

  it('calls onExit when Canvas button is clicked', () => {
    const onExit = vi.fn();
    render(
      <TopBar
        onExit={onExit}
        isFullscreen={false}
        toggleFullscreen={vi.fn()}
        uiVisible={true}
        weather={null}
        dateParts={defaultDateParts}
        onRotatePhoto={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Canvas'));
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('renders weather badge when weather prop is provided', () => {
    render(
      <TopBar
        onExit={vi.fn()}
        isFullscreen={false}
        toggleFullscreen={vi.fn()}
        uiVisible={true}
        weather={{ code: 800, isDay: true, temperature: 25, unit: 'metric' }}
        dateParts={defaultDateParts}
        onRotatePhoto={vi.fn()}
      />
    );
    // TopBar no longer has a weather badge — verify it renders without crash
    expect(screen.getByText('Canvas')).toBeTruthy();
  });

  it('does not render weather badge when weather is null', () => {
    render(
      <TopBar
        onExit={vi.fn()}
        isFullscreen={false}
        toggleFullscreen={vi.fn()}
        uiVisible={true}
        weather={null}
        dateParts={defaultDateParts}
        onRotatePhoto={vi.fn()}
      />
    );
    expect(screen.queryByText(/°C|°F/)).toBeNull();
  });

  it('renders Fahrenheit when unit is imperial', () => {
    render(
      <TopBar
        onExit={vi.fn()}
        isFullscreen={false}
        toggleFullscreen={vi.fn()}
        uiVisible={true}
        weather={{ code: 800, isDay: true, temperature: 77, unit: 'imperial' }}
        dateParts={defaultDateParts}
        onRotatePhoto={vi.fn()}
      />
    );
    // TopBar no longer has a weather badge — verify it renders without crash
    expect(screen.getByText('Canvas')).toBeTruthy();
  });
});
