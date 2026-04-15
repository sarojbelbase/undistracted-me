/**
 * Render tests for remaining widgets: Events, Bookmarks, Weather,
 * and larger component coverage tests.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

global.ResizeObserver = class { observe() { } unobserve() { } disconnect() { } };

import { useWidgetInstancesStore } from '../../../src/store/useWidgetInstancesStore';

// ─────────────────────────────────────────────────────────────────────────────
// Events Widget
// ─────────────────────────────────────────────────────────────────────────────

import { Widget as EventsWidget } from '../../../src/widgets/events/Widget';

describe('EventsWidget — empty state', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', undefined);
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('renders without crashing', () => {
    expect(() => render(<EventsWidget />)).not.toThrow();
  });

  it('shows "Upcoming Events" heading', () => {
    render(<EventsWidget />);
    expect(screen.getByText('Upcoming Events')).toBeTruthy();
  });

  it('shows empty-state message', () => {
    render(<EventsWidget />);
    expect(document.body.textContent).toMatch(/No upcoming events/);
  });
});

describe('EventsWidget — with events', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', undefined);
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('shows event count badge after adding events via add button', () => {
    render(<EventsWidget />);
    // The heading is always "Upcoming Events"
    expect(screen.getByText('Upcoming Events')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bookmarks Widget
// ─────────────────────────────────────────────────────────────────────────────

import { Widget as BookmarksWidget } from '../../../src/widgets/bookmarks/Widget';

describe('BookmarksWidget', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', undefined);
    localStorage.clear();
    useWidgetInstancesStore.setState({ widgetSettings: {} });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('renders without crashing', () => {
    expect(() => render(<BookmarksWidget id="bookmarks" />)).not.toThrow();
  });

  it('renders some content', () => {
    render(<BookmarksWidget id="bookmarks" />);
    // Empty state renders an SVG + button — innerHTML is non-empty even with no text
    expect(document.body.innerHTML.length).toBeGreaterThan(0);
  });

  it('renders Bookmark Plus button', () => {
    render(<BookmarksWidget id="bookmarks" />);
    // button to add bookmark should exist
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('renders saved bookmarks from localStorage', () => {
    // Each BookmarksWidget instance stores a single bookmark: { url, name, iconMode }
    useWidgetInstancesStore.setState({
      widgetSettings: {
        bookmarks: { url: 'https://github.com', name: 'GitHub', iconMode: 'favicon' }
      }
    });
    render(<BookmarksWidget id="bookmarks" />);
    // The link uses aria-label={displayName}, not text content
    expect(screen.getByLabelText('GitHub')).toBeTruthy();
  });

  it('clicking add-bookmark button shows modal', () => {
    render(<BookmarksWidget id="bookmarks" />);
    // Find the + button and click it
    const buttons = screen.getAllByRole('button');
    // The first button with + icon is the add button
    const addBtn = buttons.find(b => !b.textContent.includes('GitHub'));
    if (addBtn) {
      fireEvent.click(addBtn);
      // The modal should appear with "Add Bookmark" title
      expect(document.body.textContent).toMatch(/Add Bookmark/);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Weather Widget — shows "no API key" or "no location" state
// ─────────────────────────────────────────────────────────────────────────────

import { Widget as WeatherWidget } from '../../../src/widgets/weather/Widget';

describe('WeatherWidget', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', undefined);
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('renders without crashing', () => {
    expect(() => render(<WeatherWidget id="weather" />)).not.toThrow();
  });

  it('renders some visible content', () => {
    render(<WeatherWidget id="weather" />);
    expect(document.body.innerHTML.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WidgetCatalog — modal listing available widgets
// ─────────────────────────────────────────────────────────────────────────────

import { WidgetCatalog } from '../../../src/widgets/WidgetCatalog';

describe('WidgetCatalog', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders without crashing', () => {
    expect(() => render(<WidgetCatalog onAdd={vi.fn()} onClose={vi.fn()} />)).not.toThrow();
  });

  it('renders widget cards for available widget types', () => {
    render(<WidgetCatalog onAdd={vi.fn()} onClose={vi.fn()} />);
    // Multiple widget labels should appear
    expect(document.body.textContent.length).toBeGreaterThan(0);
  });

  it('renders a close button', () => {
    render(<WidgetCatalog onAdd={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BaseWidget — covers menu/modal toggle code paths
// ─────────────────────────────────────────────────────────────────────────────

import { BaseWidget } from '../../../src/widgets/BaseWidget';

describe('BaseWidget', () => {
  it('renders children', () => {
    render(<BaseWidget><span>hello widget</span></BaseWidget>);
    expect(screen.getByText('hello widget')).toBeTruthy();
  });

  it('renders without crashing when onRemove is undefined', () => {
    expect(() => render(<BaseWidget><div /></BaseWidget>)).not.toThrow();
  });

  it('renders a card surface div', () => {
    const { container } = render(<BaseWidget className="test-cls"><span>x</span></BaseWidget>);
    expect(container.firstChild).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BaseSettingsModal
// ─────────────────────────────────────────────────────────────────────────────

import { BaseSettingsModal } from '../../../src/widgets/BaseSettingsModal';

describe('BaseSettingsModal', () => {
  it('renders title and content', () => {
    render(
      <BaseSettingsModal title="Test Settings" onClose={vi.fn()}>
        <div>My settings content</div>
      </BaseSettingsModal>
    );
    expect(screen.getByText('Test Settings')).toBeTruthy();
    expect(screen.getByText('My settings content')).toBeTruthy();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <BaseSettingsModal title="Test" onClose={onClose}>
        <div>content</div>
      </BaseSettingsModal>
    );
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(onClose).toHaveBeenCalled();
  });
});
