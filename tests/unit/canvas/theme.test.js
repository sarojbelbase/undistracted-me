/**
 * Tests for src/theme.js
 *
 * Strategy: Think "what could silently break in production?"
 *
 *  – CSS variable names are strings. A typo (--w-acent instead of --w-accent)
 *    would render silently and every accent button would look wrong.
 *  – The dark-mode / light-mode page background is applied by applyTheme();
 *    if the wrong token object is selected it causes global colour corruption.
 *  – The "Default" accent is #111827 (near-black). In dark mode that accent on
 *    a dark background is invisible — the store guards against this but
 *    applyTheme() itself must faithfully apply whatever it is given.
 *  – hexToRgb is internal (not exported) but its output is observable via the
 *    --w-accent-rgb CSS variable that drives gradient/glow effects in LookAway.
 *    A wrong conversion would silently break all colour overlays.
 *  – applyTheme must handle unknown accent names gracefully (fall back to Default).
 *  – data-mode attribute on <html> drives Tailwind dark-mode selectors.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ACCENT_COLORS, applyTheme } from '../../../src/theme';

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

/** Read a CSS variable set on <html> by applyTheme(). */
const cssVar = (name) => document.documentElement.style.getPropertyValue(name).trim();

beforeEach(() => {
  // Start clean so previous test's styles don't bleed in
  document.documentElement.style.cssText = '';
  document.documentElement.removeAttribute('data-mode');
});

afterEach(() => {
  document.documentElement.style.cssText = '';
  document.documentElement.removeAttribute('data-mode');
});

// ────────────────────────────────────────────────────────────────────────────
// ACCENT_COLORS catalogue
// ────────────────────────────────────────────────────────────────────────────

describe('ACCENT_COLORS catalogue', () => {
  it('exports an array', () => {
    expect(Array.isArray(ACCENT_COLORS)).toBe(true);
  });

  it('contains at least 10 accents', () => {
    expect(ACCENT_COLORS.length).toBeGreaterThanOrEqual(10);
  });

  it('every entry has name, hex, and fg properties', () => {
    ACCENT_COLORS.forEach((a) => {
      expect(a).toHaveProperty('name');
      expect(a).toHaveProperty('hex');
      expect(a).toHaveProperty('fg');
    });
  });

  it('every hex value is a valid 7-char #rrggbb string', () => {
    ACCENT_COLORS.forEach((a) => {
      expect(a.hex).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  it('every fg value is either white or near-black', () => {
    const validFg = ['#ffffff', '#111827'];
    ACCENT_COLORS.forEach((a) => {
      expect(validFg).toContain(a.fg);
    });
  });

  it('contains a "Default" accent', () => {
    expect(ACCENT_COLORS.find((a) => a.name === 'Default')).toBeDefined();
  });

  it('Default accent uses near-black hex (readable on light backgrounds)', () => {
    const def = ACCENT_COLORS.find((a) => a.name === 'Default');
    expect(def.hex).toBe('#111827');
  });

  it('Banana and Latte use dark fg (light accents need dark text)', () => {
    const lightAccents = ['Banana', 'Latte'];
    lightAccents.forEach((name) => {
      const a = ACCENT_COLORS.find((x) => x.name === name);
      if (a) expect(a.fg).toBe('#111827');
    });
  });

  it('has no duplicate accent names', () => {
    const names = ACCENT_COLORS.map((a) => a.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('has no duplicate hex values', () => {
    const hexes = ACCENT_COLORS.map((a) => a.hex.toLowerCase());
    expect(new Set(hexes).size).toBe(hexes.length);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// applyTheme — light mode
// ────────────────────────────────────────────────────────────────────────────

describe('applyTheme — light mode', () => {
  beforeEach(() => applyTheme('Default', 'light'));

  it('sets data-mode attribute to "light"', () => {
    expect(document.documentElement.getAttribute('data-mode')).toBe('light');
  });

  it('sets --w-page-bg to the light page background', () => {
    expect(cssVar('--w-page-bg')).toBe('#F0F0F2');
  });

  it('sets --w-surface to #ffffff in light mode', () => {
    expect(cssVar('--w-surface')).toBe('#ffffff');
  });

  it('sets --w-border to light border colour', () => {
    expect(cssVar('--w-border')).toBe('#e5e7eb');
  });

  it('sets --w-ink-1 to near-black in light mode', () => {
    expect(cssVar('--w-ink-1')).toBe('#111827');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// applyTheme — dark mode
// ────────────────────────────────────────────────────────────────────────────

describe('applyTheme — dark mode', () => {
  beforeEach(() => applyTheme('Blueberry', 'dark'));

  it('sets data-mode attribute to "dark"', () => {
    expect(document.documentElement.getAttribute('data-mode')).toBe('dark');
  });

  it('sets --w-page-bg to the dark page background', () => {
    expect(cssVar('--w-page-bg')).toBe('#141414');
  });

  it('sets --w-surface to dark surface', () => {
    expect(cssVar('--w-surface')).toBe('#1c1c1c');
  });

  it('sets --w-border to dark border colour', () => {
    expect(cssVar('--w-border')).toBe('#333333');
  });

  it('sets --w-ink-1 to near-white in dark mode', () => {
    expect(cssVar('--w-ink-1')).toBe('#f2f2f2');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// applyTheme — accent CSS variables
// ────────────────────────────────────────────────────────────────────────────

describe('applyTheme — accent variables', () => {
  it('sets --w-accent to the accent hex for Blueberry', () => {
    applyTheme('Blueberry', 'light');
    const blueberry = ACCENT_COLORS.find((a) => a.name === 'Blueberry');
    expect(cssVar('--w-accent')).toBe(blueberry.hex);
  });

  it('sets --w-accent-fg to the accent foreground', () => {
    applyTheme('Blueberry', 'light');
    const blueberry = ACCENT_COLORS.find((a) => a.name === 'Blueberry');
    expect(cssVar('--w-accent-fg')).toBe(blueberry.fg);
  });

  it('sets --w-accent-rgb as comma-separated r,g,b (no spaces, no #)', () => {
    applyTheme('Blueberry', 'light');
    const rgb = cssVar('--w-accent-rgb');
    // Should be digits and commas only, e.g. "54,137,230"
    expect(rgb).toMatch(/^\d+,\d+,\d+$/);
  });

  it('--w-accent-rgb is numerically correct for Blueberry (#3689E6)', () => {
    applyTheme('Blueberry', 'light');
    // #36=54, #89=137, #E6=230
    expect(cssVar('--w-accent-rgb')).toBe('54,137,230');
  });

  it('--w-accent-rgb is correct for Banana (#F9C440)', () => {
    applyTheme('Banana', 'light');
    // #F9=249, #C4=196, #40=64
    expect(cssVar('--w-accent-rgb')).toBe('249,196,64');
  });

  it('falls back to Default accent for unknown accent name', () => {
    applyTheme('ThisAccentDoesNotExist', 'light');
    const def = ACCENT_COLORS.find((a) => a.name === 'Default');
    expect(cssVar('--w-accent')).toBe(def.hex);
  });

  it('works for every known accent name without throwing', () => {
    expect(() => {
      ACCENT_COLORS.forEach((a) => applyTheme(a.name, 'light'));
    }).not.toThrow();
  });

  it('can switch accent from Blueberry to Mint without stale Blueberry value', () => {
    applyTheme('Blueberry', 'light');
    applyTheme('Mint', 'light');
    const mint = ACCENT_COLORS.find((a) => a.name === 'Mint');
    expect(cssVar('--w-accent')).toBe(mint.hex);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// applyTheme — mode switching
// ────────────────────────────────────────────────────────────────────────────

describe('applyTheme — mode switching idempotency', () => {
  it('calling applyTheme twice with the same args produces the same result', () => {
    applyTheme('Grape', 'dark');
    const afterFirst = cssVar('--w-accent');
    applyTheme('Grape', 'dark');
    expect(cssVar('--w-accent')).toBe(afterFirst);
  });

  it('switching from dark to light updates --w-page-bg correctly', () => {
    applyTheme('Blueberry', 'dark');
    expect(cssVar('--w-page-bg')).toBe('#141414');
    applyTheme('Blueberry', 'light');
    expect(cssVar('--w-page-bg')).toBe('#F0F0F2');
  });

  it('switching from light to dark updates data-mode attribute', () => {
    applyTheme('Blueberry', 'light');
    expect(document.documentElement.getAttribute('data-mode')).toBe('light');
    applyTheme('Blueberry', 'dark');
    expect(document.documentElement.getAttribute('data-mode')).toBe('dark');
  });
});
