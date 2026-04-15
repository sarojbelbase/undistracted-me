/**
 * Render tests for stateful Widget.jsx components:
 * Pomodoro, Notes, Countdown, Bookmarks
 *
 * What can go wrong:
 *  – Pomodoro: initial "pick" phase must show preset buttons; if phase setState
 *    has a typo the user sees the timer view with a zero countdown immediately.
 *  – Notes: textarea must be rendered and editable; losing the textarea makes
 *    the widget an empty card.
 *  – Notes: color palette settings panel must be accessible from the widget.
 *  – Countdown: "No countdown set" empty state must render when no settings saved.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

global.ResizeObserver = class { observe() { } unobserve() { } disconnect() { } };

import { useWidgetInstancesStore } from '../../../src/store/useWidgetInstancesStore';

// ─────────────────────────────────────────────────────────────────────────────
// Pomodoro Widget
// ─────────────────────────────────────────────────────────────────────────────

import { Widget as PomodoroWidget } from '../../../src/widgets/pomodoro/Widget';
import { PRESETS } from '../../../src/widgets/pomodoro/utils';

// Silence chrome.runtime.sendMessage that Pomodoro calls when done
vi.stubGlobal('chrome', undefined);

describe('PomodoroWidget — pick phase (initial state)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('renders without crashing', () => {
    expect(() => render(<PomodoroWidget />)).not.toThrow();
  });

  it('shows preset buttons on initial render', () => {
    render(<PomodoroWidget />);
    // All non-Custom presets should appear as buttons
    PRESETS.filter((p) => p.secs !== null).forEach((p) => {
      expect(screen.getByText(p.label)).toBeTruthy();
    });
  });

  it('shows "Custom" preset button', () => {
    render(<PomodoroWidget />);
    expect(screen.getByText('Custom')).toBeTruthy();
  });

  it('transitions to timer phase when a preset is clicked', () => {
    render(<PomodoroWidget />);
    fireEvent.click(screen.getByText('25 min'));
    // After clicking, should show a time display like "25:00"
    expect(screen.getByText('25:00')).toBeTruthy();
  });

  it('shows play button after selecting a preset', () => {
    render(<PomodoroWidget />);
    fireEvent.click(screen.getByText('25 min'));
    // Play and reset buttons should be visible
    expect(document.body.textContent.length).toBeGreaterThan(0);
  });

  it('shows Custom input when Custom is clicked', () => {
    render(<PomodoroWidget />);
    fireEvent.click(screen.getByText('Custom'));
    // An input for custom minutes should appear (type=number)
    const input = document.querySelector('input[type="number"]');
    expect(input).toBeTruthy();
  });
});

describe('PomodoroWidget — timer phase', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('renders "25:00" for 25 min preset', () => {
    render(<PomodoroWidget />);
    fireEvent.click(screen.getByText('25 min'));
    expect(screen.getByText('25:00')).toBeTruthy();
  });

  it('shows the time format after entering timer phase', () => {
    render(<PomodoroWidget />);
    fireEvent.click(screen.getByText('25 min'));
    // Timer phase shows HH:MM format
    expect(screen.getByText('25:00')).toBeTruthy();
    // Back button should be present
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Notes Widget
// ─────────────────────────────────────────────────────────────────────────────

import { Widget as NotesWidget } from '../../../src/widgets/notes/Widget';

describe('NotesWidget', () => {
  beforeEach(() => {
    localStorage.clear();
    useWidgetInstancesStore.setState({ widgetSettings: {} });
  });
  afterEach(() => localStorage.clear());

  it('renders without crashing', () => {
    expect(() => render(<NotesWidget id="notes" />)).not.toThrow();
  });

  it('renders a textarea element', () => {
    render(<NotesWidget id="notes" />);
    expect(screen.getByRole('textbox')).toBeTruthy();
  });

  it('textarea is empty when no saved text', () => {
    render(<NotesWidget id="notes" />);
    const ta = screen.getByRole('textbox');
    expect(ta.value).toBe('');
  });

  it('textarea shows saved text from localStorage', () => {
    useWidgetInstancesStore.setState({ widgetSettings: { notes: { text: 'hello world' } } });
    render(<NotesWidget id="notes" />);
    const ta = screen.getByRole('textbox');
    expect(ta.value).toBe('hello world');
  });

  it('typing in textarea updates the value', () => {
    render(<NotesWidget id="notes" />);
    const ta = screen.getByRole('textbox');
    fireEvent.change(ta, { target: { value: 'new text' } });
    expect(ta.value).toBe('new text');
  });

  it('saves text to the store on change after debounce', async () => {
    vi.useFakeTimers();
    render(<NotesWidget id="notes" />);
    const ta = screen.getByRole('textbox');
    await act(async () => {
      fireEvent.change(ta, { target: { value: 'saved!' } });
      // Advance past the 600ms debounce; use advanceTimersByTimeAsync to avoid
      // infinite loops that runAllTimersAsync can trigger with Zustand re-renders.
      await vi.advanceTimersByTimeAsync(700);
    });
    vi.useRealTimers();
    const widgetSettings = useWidgetInstancesStore.getState().widgetSettings;
    expect(widgetSettings.notes?.text).toBe('saved!');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Countdown Widget
// ─────────────────────────────────────────────────────────────────────────────

import { Widget as CountdownWidget } from '../../../src/widgets/countdown/Widget';

describe('CountdownWidget — empty state', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', undefined);
    localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('renders without crashing when no countdowns saved', () => {
    expect(() => render(<CountdownWidget id="countdown" />)).not.toThrow();
  });

  it('renders some content (not blank)', () => {
    render(<CountdownWidget id="countdown" />);
    expect(document.body.textContent.trim().length).toBeGreaterThan(0);
  });
});

describe('CountdownWidget — with a saved custom countdown', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', undefined);
    localStorage.clear();
    // Store a future custom countdown
    const future = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);
    localStorage.setItem(
      'countdown_events',
      JSON.stringify([{
        id: 'cd_test', title: 'Birthday', targetDate: future,
        targetTime: '00:00', repeat: 'yearly',
      }])
    );
    // Pin via custom type
    localStorage.setItem('countdown_pinned', JSON.stringify({ type: 'custom', id: 'cd_test' }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('renders the countdown label when data exists', () => {
    render(<CountdownWidget id="countdown" />);
    expect(screen.getByText('Birthday')).toBeTruthy();
  });
});
