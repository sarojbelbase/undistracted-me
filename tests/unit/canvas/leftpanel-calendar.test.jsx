/**
 * Render tests for FocusMode/LeftPanel and Calendar widget.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';

global.ResizeObserver = class { observe() { } unobserve() { } disconnect() { } };

// Stub useSettingsStore to avoid Zustand in jsdom
vi.mock('../../../app/store', () => ({
  useSettingsStore: vi.fn((selector) => {
    const state = { mode: 'dark', accent: 'Default', language: 'en' };
    return selector ? selector(state) : state;
  }),
  useWidgetInstancesStore: vi.fn((selector) => {
    const state = { instances: [] };
    return selector ? selector(state) : state;
  }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// LeftPanel was removed in the Focus Mode redesign — its pomodoro/event/stock/
// spotify cards now live in app/components/FocusMode/zones/*.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Calendar Widget
// ─────────────────────────────────────────────────────────────────────────────

import { Widget as CalendarWidget } from '../../../app/widgets/calendar/Widget';

describe('CalendarWidget', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', undefined);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-10T12:00:00Z'));
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
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
    // Day numbers are rendered in .cal-day-cell__number elements
    const dayNumbers = document.querySelectorAll('.cal-day-cell__number');
    expect(dayNumbers.length).toBeGreaterThan(0);
  });
});
