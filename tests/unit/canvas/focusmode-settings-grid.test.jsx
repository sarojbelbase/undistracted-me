/**
 * Tests for FocusMode/Settings.jsx and WidgetGrid.jsx
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

global.ResizeObserver = class { observe() { } unobserve() { } disconnect() { } };

// ─────────────────────────────────────────────────────────────────────────────
// Mock dependencies
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('../../../src/store', () => ({
  useSettingsStore: vi.fn((selector) => {
    const state = {
      mode: 'dark', accent: 'Default', language: 'en',
      dateFormat: 'gregorian', clockFormat: '24h',
      setMode: vi.fn(), setAccent: vi.fn(), setLanguage: vi.fn(),
      setDateFormat: vi.fn(), setClockFormat: vi.fn(),
    };
    return selector ? selector(state) : state;
  }),
  useWidgetInstancesStore: vi.fn((selector) => {
    const state = { instances: [], widgetSettings: {} };
    return selector ? selector(state) : state;
  }),
}));

// Also mock the direct import path used by widget dependencies
vi.mock('../../../src/store/useWidgetInstancesStore', () => ({
  useWidgetInstancesStore: vi.fn((selector) =>
    typeof selector === 'function' ? selector({ instances: [], widgetSettings: {} }) : undefined
  ),
}));

vi.mock('../../../src/utilities/unsplash', () => ({
  hasUnsplashKey: vi.fn(() => false),
  getPhotoLibrary: vi.fn(() => []),
  downloadNewPhoto: vi.fn(() => Promise.resolve(null)),
  deletePhoto: vi.fn(),
  jumpToPhotoById: vi.fn(),
  LIBRARY_MAX: 10,
  getBgSource: vi.fn(() => 'unsplash'),
  setBgSource: vi.fn(),
  getCachedPhotoSync: vi.fn(() => null),
  getCurrentPhoto: vi.fn(() => Promise.resolve(null)),
}));

// ─────────────────────────────────────────────────────────────────────────────
// FocusModeSettings
// ─────────────────────────────────────────────────────────────────────────────

import { FocusModeSettings } from '../../../src/components/FocusMode/Settings';

describe('FocusModeSettings', () => {
  it('renders without crashing', () => {
    expect(() => render(<FocusModeSettings onRotatePhoto={vi.fn()} />)).not.toThrow();
  });

  it('shows Date Calendar section', () => {
    render(<FocusModeSettings onRotatePhoto={vi.fn()} />);
    expect(document.body.textContent).toMatch(/Date Calendar/i);
  });

  it('shows Clock Format section', () => {
    render(<FocusModeSettings onRotatePhoto={vi.fn()} />);
    expect(document.body.textContent).toMatch(/Clock Format/i);
  });

  it('shows CE and BS buttons for date format', () => {
    render(<FocusModeSettings onRotatePhoto={vi.fn()} />);
    expect(screen.getByText('CE')).toBeTruthy();
    expect(screen.getByText('BS')).toBeTruthy();
  });

  it('shows 24h and 12h buttons for clock format', () => {
    render(<FocusModeSettings onRotatePhoto={vi.fn()} />);
    expect(screen.getByText('24h')).toBeTruthy();
    expect(screen.getByText('12h')).toBeTruthy();
  });

  it('shows Background section', () => {
    render(<FocusModeSettings onRotatePhoto={vi.fn()} />);
    // Background section should exist
    expect(document.body.textContent).toMatch(/Background/i);
  });

  it('clicking CE and BS buttons does not throw', () => {
    render(<FocusModeSettings onRotatePhoto={vi.fn()} />);
    expect(() => fireEvent.click(screen.getByText('CE'))).not.toThrow();
    expect(() => fireEvent.click(screen.getByText('BS'))).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WidgetGrid — with instances
// ─────────────────────────────────────────────────────────────────────────────

import { WidgetGrid } from '../../../src/widgets/WidgetGrid';

describe('WidgetGrid', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', undefined);
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('renders without crashing with empty instances', () => {
    expect(() => render(<WidgetGrid instances={[]} onRemoveInstance={vi.fn()} />)).not.toThrow();
  });

  it('renders a facts widget when instances contains one', () => {
    render(<WidgetGrid instances={[{ id: 'facts', type: 'facts' }]} onRemoveInstance={vi.fn()} />);
    // Facts widget renders fact text
    expect(document.body.textContent.length).toBeGreaterThan(0);
  });

  it('renders a notes widget', () => {
    render(<WidgetGrid instances={[{ id: 'notes', type: 'notes' }]} onRemoveInstance={vi.fn()} />);
    // Notes widget renders a textarea — use DOM query since react-grid-layout may affect role detection
    expect(document.body.querySelector('textarea')).toBeTruthy();
  });

  it('renders a clock widget', () => {
    render(<WidgetGrid instances={[{ id: 'clock', type: 'clock' }]} onRemoveInstance={vi.fn()} />);
    // Clock shows HH:MM pattern
    expect(document.body.textContent).toMatch(/\d:\d/);
  });

  it('renders a dayProgress widget', () => {
    render(<WidgetGrid instances={[{ id: 'dayProgress', type: 'dayProgress' }]} onRemoveInstance={vi.fn()} />);
    expect(document.body.textContent).toMatch(/Day Progress/);
  });

  it('renders multiple widgets', () => {
    render(
      <WidgetGrid
        instances={[
          { id: 'facts', type: 'facts' },
          { id: 'notes', type: 'notes' },
        ]}
        onRemoveInstance={vi.fn()}
      />
    );
    expect(document.body.querySelector('textarea')).toBeTruthy(); // notes
  });
});
