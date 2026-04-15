/**
 * Tests for src/widgets/index.js — WIDGET_REGISTRY and WIDGET_TYPES
 *
 * What can go wrong:
 *  – A widget config typo (e.g. type: 'clokc') means WidgetGrid's renderWidget()
 *    switch-case falls through to `default: return null` — widget renders blank.
 *  – Missing `w` or `h` in a config means the grid uses undefined dimensions
 *    which react-grid-layout treats as 0 — the widget collapses to zero pixels.
 *  – Duplicate ids in WIDGET_REGISTRY cause the grid to mount two widgets with
 *    the same layout key and they overwrite each other.
 *  – WIDGET_TYPES values must stay lowercase to match the switch-case in
 *    WidgetGrid and the id used as localStorage key.
 *  – Every value in WIDGET_TYPES must have a matching entry in WIDGET_REGISTRY.
 *  – WIDGET_TYPES must be frozen to prevent accidental runtime mutation.
 */

import { describe, it, expect, vi } from 'vitest';

// Prevent store init from loading WIDGET_REGISTRY via circular import
vi.mock('../../../src/store/useWidgetInstancesStore', () => ({
  useWidgetInstancesStore: vi.fn((selector) =>
    typeof selector === 'function' ? selector({ instances: [], widgetSettings: {} }) : undefined
  ),
}));

import { WIDGET_REGISTRY, WIDGET_TYPES } from '../../../src/widgets/index.js';

// ────────────────────────────────────────────────────────────────────────────
// WIDGET_TYPES
// ────────────────────────────────────────────────────────────────────────────

describe('WIDGET_TYPES', () => {
  it('is frozen (immutable at runtime)', () => {
    expect(Object.isFrozen(WIDGET_TYPES)).toBe(true);
  });

  it('all values are alphanumeric strings (camelCase allowed, e.g. dateToday)', () => {
    Object.values(WIDGET_TYPES).forEach((v) => {
      expect(v).toMatch(/^[a-zA-Z]+$/);
    });
  });

  it('no value contains spaces, dashes, or underscores', () => {
    Object.values(WIDGET_TYPES).forEach((v) => {
      expect(v).not.toMatch(/[ \-_]/);
    });
  });

  it('has at least 10 widget types', () => {
    expect(Object.keys(WIDGET_TYPES).length).toBeGreaterThanOrEqual(10);
  });

  it('includes essential widget types: clock, weather, calendar, notes', () => {
    const values = Object.values(WIDGET_TYPES);
    ['clock', 'weather', 'calendar', 'notes'].forEach((t) => {
      expect(values).toContain(t);
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// WIDGET_REGISTRY structure
// ────────────────────────────────────────────────────────────────────────────

describe('WIDGET_REGISTRY structure', () => {
  it('is an array', () => {
    expect(Array.isArray(WIDGET_REGISTRY)).toBe(true);
  });

  it('has at least 10 entries', () => {
    expect(WIDGET_REGISTRY.length).toBeGreaterThanOrEqual(10);
  });

  it('every entry has an id field', () => {
    WIDGET_REGISTRY.forEach((w) => {
      expect(w).toHaveProperty('id');
      expect(typeof w.id).toBe('string');
      expect(w.id.length).toBeGreaterThan(0);
    });
  });

  it('every entry has a type field', () => {
    WIDGET_REGISTRY.forEach((w) => {
      expect(w).toHaveProperty('type');
      expect(typeof w.type).toBe('string');
    });
  });

  it('every entry has a label field', () => {
    WIDGET_REGISTRY.forEach((w) => {
      expect(w).toHaveProperty('label');
      expect(w.label.length).toBeGreaterThan(0);
    });
  });

  it('every entry has positive integer width (w)', () => {
    WIDGET_REGISTRY.forEach((w) => {
      expect(typeof w.w).toBe('number');
      expect(w.w).toBeGreaterThan(0);
    });
  });

  it('every entry has positive integer height (h)', () => {
    WIDGET_REGISTRY.forEach((w) => {
      expect(typeof w.h).toBe('number');
      expect(w.h).toBeGreaterThan(0);
    });
  });

  it('every entry has an enabled boolean', () => {
    WIDGET_REGISTRY.forEach((w) => {
      expect(typeof w.enabled).toBe('boolean');
    });
  });

  it('every entry has a category string', () => {
    WIDGET_REGISTRY.forEach((w) => {
      expect(typeof w.category).toBe('string');
      expect(w.category.length).toBeGreaterThan(0);
    });
  });

  it('every entry has a description string', () => {
    WIDGET_REGISTRY.forEach((w) => {
      expect(typeof w.description).toBe('string');
    });
  });

  it('every entry has an icon string', () => {
    WIDGET_REGISTRY.forEach((w) => {
      expect(typeof w.icon).toBe('string');
      expect(w.icon.length).toBeGreaterThan(0);
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// WIDGET_REGISTRY uniqueness
// ────────────────────────────────────────────────────────────────────────────

describe('WIDGET_REGISTRY uniqueness', () => {
  it('no duplicate ids', () => {
    const ids = WIDGET_REGISTRY.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('no duplicate labels', () => {
    const labels = WIDGET_REGISTRY.map((w) => w.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// WIDGET_REGISTRY ↔ WIDGET_TYPES consistency
// ────────────────────────────────────────────────────────────────────────────

describe('WIDGET_REGISTRY ↔ WIDGET_TYPES consistency', () => {
  it('every WIDGET_REGISTRY type is present in WIDGET_TYPES values', () => {
    const typeValues = new Set(Object.values(WIDGET_TYPES));
    WIDGET_REGISTRY.forEach((w) => {
      expect(typeValues.has(w.type)).toBe(true);
    });
  });

  it('every WIDGET_TYPES value has at least one entry in WIDGET_REGISTRY', () => {
    const registryTypes = new Set(WIDGET_REGISTRY.map((w) => w.type));
    Object.values(WIDGET_TYPES).forEach((t) => {
      expect(registryTypes.has(t)).toBe(true);
    });
  });

  it('registry id matches type for single-instance widgets (layout key compat)', () => {
    // For widgets that appear only once, their id should equal type
    // so that old saved layout keys (which equal the type) resolve correctly.
    const typeCount = {};
    WIDGET_REGISTRY.forEach((w) => {
      typeCount[w.type] = (typeCount[w.type] || 0) + 1;
    });
    WIDGET_REGISTRY.forEach((w) => {
      if (typeCount[w.type] === 1) {
        expect(w.id).toBe(w.type);
      }
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Grid dimensions sanity
// ────────────────────────────────────────────────────────────────────────────

describe('WIDGET_REGISTRY grid dimensions sanity', () => {
  it('no widget is wider than 12 columns (react-grid-layout default)', () => {
    WIDGET_REGISTRY.forEach((w) => {
      expect(w.w).toBeLessThanOrEqual(12);
    });
  });

  it('x positions start at 0 or greater', () => {
    WIDGET_REGISTRY.forEach((w) => {
      expect(w.x).toBeGreaterThanOrEqual(0);
    });
  });

  it('y positions start at 0 or greater', () => {
    WIDGET_REGISTRY.forEach((w) => {
      expect(w.y).toBeGreaterThanOrEqual(0);
    });
  });
});
