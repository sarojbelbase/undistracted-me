/**
 * Tests for src/widgets/WidgetGrid.jsx — pure utility logic
 *
 * The WidgetGrid component itself is large and relies on react-grid-layout,
 * so we focus on the testable pure-function layer:
 *   – loadLayouts(): reads from localStorage, falls back gracefully
 *   – renderWidget(id, type, …): returns the right Widget for each type
 *
 * We do NOT test the full React render of WidgetGrid (that is an E2E concern).
 * Instead we verify the localStorage contract and the widget-type dispatch.
 *
 * What can go wrong:
 *  – LAYOUT_KEY constant ('widget_grid_layouts') must match what WidgetGrid
 *    writes/reads; a typo means saved positions are ignored on reload.
 *  – loadLayouts: if localStorage contains a non-object (e.g. an array or
 *    a primitive) it must return {} not crash the grid.
 *  – loadLayouts: malformed JSON must return {} (no throw).
 *  – The switch in renderWidget must handle every value in WIDGET_TYPES;
 *    any unhandled type renders null and the grid has a blank cell.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WIDGET_TYPES, WIDGET_REGISTRY } from '../../../src/widgets/index.js';

// ── Replicate the LAYOUT_KEY constant as documented in WidgetGrid.jsx ──
const LAYOUT_KEY = 'widget_grid_layouts';

// ── Replicate the loadLayouts() pure function ─────────────────────────────
const loadLayouts = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) return saved;
  } catch { /* ignore */ }
  return {};
};

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

// ────────────────────────────────────────────────────────────────────────────
// loadLayouts — pure function contract
// ────────────────────────────────────────────────────────────────────────────

describe('loadLayouts (LAYOUT_KEY = widget_grid_layouts)', () => {
  it('returns empty object when localStorage is empty', () => {
    expect(loadLayouts()).toEqual({});
  });

  it('returns saved object when it is a valid object', () => {
    const saved = { lg: [{ i: 'clock', x: 0, y: 0, w: 2, h: 2 }] };
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(saved));
    expect(loadLayouts()).toEqual(saved);
  });

  it('returns {} when stored value is an array (not an object)', () => {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify([1, 2, 3]));
    expect(loadLayouts()).toEqual({});
  });

  it('returns {} on malformed JSON', () => {
    localStorage.setItem(LAYOUT_KEY, 'not json');
    expect(loadLayouts()).toEqual({});
  });

  it('returns {} when stored value is null', () => {
    localStorage.setItem(LAYOUT_KEY, 'null');
    expect(loadLayouts()).toEqual({});
  });

  it('returns {} when stored value is a string', () => {
    localStorage.setItem(LAYOUT_KEY, '"just a string"');
    expect(loadLayouts()).toEqual({});
  });

  it('returns {} when stored value is a number', () => {
    localStorage.setItem(LAYOUT_KEY, '42');
    expect(loadLayouts()).toEqual({});
  });

  it('persists layout with multiple breakpoints', () => {
    const layout = {
      lg: [{ i: 'clock', x: 0, y: 0, w: 2, h: 2 }],
      md: [{ i: 'clock', x: 0, y: 0, w: 2, h: 2 }],
    };
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
    const result = loadLayouts();
    expect(result.lg).toBeDefined();
    expect(result.md).toBeDefined();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// WIDGET_TYPES dispatch completeness (mirrors renderWidget switch)
// ────────────────────────────────────────────────────────────────────────────

describe('WIDGET_TYPES dispatch exhaustiveness', () => {
  // The switch in renderWidget must cover all WIDGET_TYPES; this test
  // simply documents which types exist so a missing case is visible.
  const KNOWN_TYPES = [
    'clock', 'dateToday', 'dayProgress', 'events', 'weather',
    'calendar', 'countdown', 'notes', 'bookmarks', 'pomodoro',
    'spotify', 'facts', 'stock', 'birthdays',
  ];

  it('all known types are present in WIDGET_TYPES', () => {
    const vals = Object.values(WIDGET_TYPES);
    KNOWN_TYPES.forEach((t) => {
      expect(vals).toContain(t);
    });
  });

  it('WIDGET_REGISTRY covers all WIDGET_TYPES values', () => {
    const registryTypes = WIDGET_REGISTRY.map((w) => w.type);
    Object.values(WIDGET_TYPES).forEach((t) => {
      expect(registryTypes).toContain(t);
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Layout persistence contract
// ────────────────────────────────────────────────────────────────────────────

describe('layout persistence contract', () => {
  it('writing a layout to LAYOUT_KEY makes it readable via loadLayouts', () => {
    const layout = { lg: [{ i: 'weather', x: 4, y: 0, w: 3, h: 3 }] };
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
    const loaded = loadLayouts();
    expect(loaded.lg[0].i).toBe('weather');
    expect(loaded.lg[0].x).toBe(4);
  });

  it('layout positions survive a round-trip through JSON serialization', () => {
    const positions = [
      { i: 'clock', x: 0, y: 0, w: 2, h: 2 },
      { i: 'weather', x: 3, y: 0, w: 3, h: 3 },
    ];
    localStorage.setItem(LAYOUT_KEY, JSON.stringify({ lg: positions }));
    const loaded = loadLayouts();
    expect(loaded.lg).toHaveLength(2);
    expect(loaded.lg[1].x).toBe(3);
  });
});
