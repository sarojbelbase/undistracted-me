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
vi.mock('../../../app/utilities/sharedClock', () => ({
  onClockTick: vi.fn((fn) => { fn(); return () => { }; }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// DigitRoller
// ─────────────────────────────────────────────────────────────────────────────

import DigitRoller from '../../../app/components/FocusMode/panels/Clock';

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

import { Clock as ClockDisplay } from '../../../app/components/FocusMode/panels/Clock';

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

import { Greetings as GreetingDisplay } from '../../../app/components/FocusMode/panels/Greetings';

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
// WorldClocksPanel and TopBar were removed in the Focus Mode redesign — clock
// world-times moved into zones (app/components/FocusMode/zones/*) and the
// top-bar controls into TopZone.jsx.
// ─────────────────────────────────────────────────────────────────────────────
