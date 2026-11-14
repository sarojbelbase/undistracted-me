/**
 * Tests for app/store/useSettingsStore.js
 *
 * What can go wrong:
 *  – Zustand's persist reads state from localStorage at startup. If
 *    fromLegacy() misreads the key it produces the wrong defaults and every
 *    user sees broken settings after a first load.
 *  – The "Default" accent is invalid in dark mode (near-black on near-black
 *    background). setMode('dark') must auto-correct to Blueberry.
 *  – applyTheme() is called as a side-effect of setAccent / setMode. If the
 *    CSS-variable plumbing is broken the UI silently renders with wrong colours.
 *  – Persisted state survives a reload — we simulate this by writing into
 *    localStorage and re-initialising the store.
 *  – Missing or malformed persisted JSON must not throw; fall back to safe defaults.
 *  – Legacy per-key localStorage entries (pre-Zustand build) must be migrated.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// ────────────────────────────────────────────────────────────────────────────
// Reset Zustand store state between tests.
// We re-import the store each time via a fresh module evaluation is NOT
// possible in Vitest without a per-test module reset. Instead we directly
// call the store's setState to reset to a known baseline.
// ────────────────────────────────────────────────────────────────────────────

import { useSettingsStore, STORE_KEY } from '../../../app/store/useSettingsStore';
import { WIDGET_SETTINGS_DEFAULTS } from '../../../app/constants/defaults';

const resetStore = (overrides = {}) =>
  useSettingsStore.setState({
    accent: 'Default',
    mode: 'light',
    defaultView: 'canvas',
    dateFormat: 'gregorian',
    lookAwayEnabled: false,
    lookAwayInterval: 20,
    clockFormat: '24h',
    ...overrides,
  });

beforeEach(() => {
  localStorage.clear();
  resetStore();
});

afterEach(() => {
  localStorage.clear();
  // Clean up any CSS vars that applyTheme may have written
  document.documentElement.style.cssText = '';
  document.documentElement.removeAttribute('data-mode');
});

// ────────────────────────────────────────────────────────────────────────────
// Default initial state
// ────────────────────────────────────────────────────────────────────────────

describe('initial state defaults', () => {
  it('defaultView defaults to "canvas"', () => {
    expect(useSettingsStore.getState().defaultView).toBe('canvas');
  });

  it('mode defaults to "light"', () => {
    expect(useSettingsStore.getState().mode).toBe('light');
  });

  it('accent defaults to "Default"', () => {
    expect(useSettingsStore.getState().accent).toBe('Default');
  });

  it('date language defaults to "en" on the date widget', () => {
    expect(WIDGET_SETTINGS_DEFAULTS.dateToday.language).toBe('en');
  });

  it('lookAwayEnabled defaults to false', () => {
    expect(useSettingsStore.getState().lookAwayEnabled).toBe(false);
  });

  it('lookAwayInterval defaults to 20 minutes', () => {
    expect(useSettingsStore.getState().lookAwayInterval).toBe(20);
  });

  it('clockFormat defaults to "24h"', () => {
    expect(useSettingsStore.getState().clockFormat).toBe('24h');
  });

  it('dateFormat defaults to "gregorian"', () => {
    expect(useSettingsStore.getState().dateFormat).toBe('gregorian');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// setMode — Dark mode / accent guard
// ────────────────────────────────────────────────────────────────────────────

describe('setMode — dark mode accent guard', () => {
  // NOTE: the "Default accent is invalid in dark mode → auto-correct to Blueberry"
  // guard was removed in the accent redesign. Accents now carry dark-tone
  // variants (darkHex/darkFg), so "Matte Black" (the default) stays readable in
  // dark mode and no auto-correction is needed. The guard's behaviour is no
  // longer part of setMode.
  it('switches mode to "dark"', () => {
    useSettingsStore.getState().setMode('dark');
    expect(useSettingsStore.getState().mode).toBe('dark');
  });

  it('switching to dark when accent is already "Blueberry" keeps "Blueberry"', () => {
    resetStore({ accent: 'Blueberry', mode: 'light' });
    useSettingsStore.getState().setMode('dark');
    expect(useSettingsStore.getState().accent).toBe('Blueberry');
  });

  it('switching to dark when accent is "Grape" keeps "Grape"', () => {
    resetStore({ accent: 'Grape', mode: 'light' });
    useSettingsStore.getState().setMode('dark');
    expect(useSettingsStore.getState().accent).toBe('Grape');
  });

  it('switching from dark back to light does NOT change accent', () => {
    resetStore({ accent: 'Mint', mode: 'dark' });
    useSettingsStore.getState().setMode('light');
    expect(useSettingsStore.getState().accent).toBe('Mint');
    expect(useSettingsStore.getState().mode).toBe('light');
  });

  it('does not throw when called with "light"', () => {
    expect(() => useSettingsStore.getState().setMode('light')).not.toThrow();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// setAccent
// ────────────────────────────────────────────────────────────────────────────

describe('setAccent', () => {
  it('updates the accent in state', () => {
    useSettingsStore.getState().setAccent('Strawberry');
    expect(useSettingsStore.getState().accent).toBe('Strawberry');
  });

  it('subsequent setAccent call replaces the previous value', () => {
    useSettingsStore.getState().setAccent('Banana');
    useSettingsStore.getState().setAccent('Cocoa');
    expect(useSettingsStore.getState().accent).toBe('Cocoa');
  });

  it('does not change mode', () => {
    resetStore({ mode: 'dark' });
    useSettingsStore.getState().setAccent('Lime');
    expect(useSettingsStore.getState().mode).toBe('dark');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// setDefaultView
// ────────────────────────────────────────────────────────────────────────────

describe('setDefaultView', () => {
  it('can switch to "focus"', () => {
    useSettingsStore.getState().setDefaultView('focus');
    expect(useSettingsStore.getState().defaultView).toBe('focus');
  });

  it('can switch back to "canvas"', () => {
    useSettingsStore.getState().setDefaultView('focus');
    useSettingsStore.getState().setDefaultView('canvas');
    expect(useSettingsStore.getState().defaultView).toBe('canvas');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Language
// ────────────────────────────────────────────────────────────────────────────
// The global `language` setting was removed — date formatting language is now
// per-widget (`dateToday.language`, see WIDGET_SETTINGS_DEFAULTS). Guard against
// a half-reintroduced global language key.
describe('language', () => {
  it('has no global language setter on the settings store', () => {
    expect(useSettingsStore.getState().setLanguage).toBeUndefined();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// LookAway settings
// ────────────────────────────────────────────────────────────────────────────

describe('lookAway settings', () => {
  it('setLookAwayEnabled(true) enables it', () => {
    useSettingsStore.getState().setLookAwayEnabled(true);
    expect(useSettingsStore.getState().lookAwayEnabled).toBe(true);
  });

  it('setLookAwayEnabled(false) disables it', () => {
    useSettingsStore.getState().setLookAwayEnabled(true);
    useSettingsStore.getState().setLookAwayEnabled(false);
    expect(useSettingsStore.getState().lookAwayEnabled).toBe(false);
  });

  it('setLookAwayInterval changes interval', () => {
    useSettingsStore.getState().setLookAwayInterval(45);
    expect(useSettingsStore.getState().lookAwayInterval).toBe(45);
  });

  it('setLookAwayInterval accepts any positive number', () => {
    useSettingsStore.getState().setLookAwayInterval(1);
    expect(useSettingsStore.getState().lookAwayInterval).toBe(1);
  });

  it('migrates a persisted v0 1-minute interval to 20 minutes on rehydrate', async () => {
    localStorage.setItem(
      'undistracted_settings',
      JSON.stringify({ state: { lookAwayInterval: 1 }, version: 0 }),
    );
    await useSettingsStore.persist.rehydrate();
    expect(useSettingsStore.getState().lookAwayInterval).toBe(20);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// setClockFormat
// ────────────────────────────────────────────────────────────────────────────

describe('setClockFormat', () => {
  it('can switch to 12h', () => {
    useSettingsStore.getState().setClockFormat('12h');
    expect(useSettingsStore.getState().clockFormat).toBe('12h');
  });

  it('can switch back to 24h', () => {
    useSettingsStore.getState().setClockFormat('12h');
    useSettingsStore.getState().setClockFormat('24h');
    expect(useSettingsStore.getState().clockFormat).toBe('24h');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// setDateFormat
// ────────────────────────────────────────────────────────────────────────────

describe('setDateFormat', () => {
  it('can switch to bikramSambat', () => {
    useSettingsStore.getState().setDateFormat('bikramSambat');
    expect(useSettingsStore.getState().dateFormat).toBe('bikramSambat');
  });
  it('can switch back to gregorian', () => {
    useSettingsStore.getState().setDateFormat('bikramSambat');
    useSettingsStore.getState().setDateFormat('gregorian');
    expect(useSettingsStore.getState().dateFormat).toBe('gregorian');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Persistence via localStorage (Zustand persist)
// ────────────────────────────────────────────────────────────────────────────

describe('Zustand persist key', () => {
  it('STORE_KEY is "undistracted_settings"', () => {
    expect(STORE_KEY).toBe('undistracted_settings');
  });

  it('state changes are written to localStorage under STORE_KEY', () => {
    useSettingsStore.getState().setAccent('Orange');
    const raw = localStorage.getItem(STORE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw);
    expect(parsed?.state?.accent).toBe('Orange');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// setNotificationsEnabled (formerly setLookAwayNotify)
// ────────────────────────────────────────────────────────────────────────────

describe('setNotificationsEnabled', () => {
  it('enables notifications', () => {
    useSettingsStore.getState().setNotificationsEnabled(true);
    expect(useSettingsStore.getState().notificationsEnabled).toBe(true);
  });

  it('disables notifications', () => {
    useSettingsStore.getState().setNotificationsEnabled(false);
    expect(useSettingsStore.getState().notificationsEnabled).toBe(false);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// setCanvasBg
// ────────────────────────────────────────────────────────────────────────────

describe('setCanvasBg', () => {
  it('sets orb background', () => {
    useSettingsStore.getState().setCanvasBg({ type: 'orb', orbId: 'blueberry' });
    expect(useSettingsStore.getState().canvasBg).toEqual({ type: 'orb', orbId: 'blueberry' });
  });

  it('sets custom url background', () => {
    useSettingsStore.getState().setCanvasBg({ type: 'custom', url: 'https://example.com/bg.jpg' });
    expect(useSettingsStore.getState().canvasBg.type).toBe('custom');
  });

  it('sets solid background', () => {
    useSettingsStore.getState().setCanvasBg({ type: 'solid' });
    expect(useSettingsStore.getState().canvasBg.type).toBe('solid');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// setCardStyle + _resolvedModeKey
// ────────────────────────────────────────────────────────────────────────────

describe('setCardStyle', () => {
  it('switches card style to flat in light mode', () => {
    resetStore({ mode: 'light', cardStyle: 'glass' });
    useSettingsStore.getState().setCardStyle('flat');
    expect(useSettingsStore.getState().cardStyle).toBe('flat');
  });

  it('switches card style to glass', () => {
    resetStore({ mode: 'light', cardStyle: 'flat' });
    useSettingsStore.getState().setCardStyle('glass');
    expect(useSettingsStore.getState().cardStyle).toBe('glass');
  });

  it('updates modePrefs.light when mode is light', () => {
    resetStore({ mode: 'light' });
    useSettingsStore.getState().setCardStyle('flat');
    expect(useSettingsStore.getState().modePrefs?.light?.cardStyle).toBe('flat');
  });

  it('updates modePrefs.dark when mode is dark (_resolvedModeKey returns "dark")', () => {
    resetStore({ mode: 'dark' });
    useSettingsStore.getState().setCardStyle('glass');
    expect(useSettingsStore.getState().modePrefs?.dark?.cardStyle).toBe('glass');
  });

  it('updates modePrefs.dark when mode is auto (_resolvedModeKey returns "dark")', () => {
    resetStore({ mode: 'auto' });
    useSettingsStore.getState().setCardStyle('flat');
    expect(useSettingsStore.getState().modePrefs?.dark?.cardStyle).toBe('flat');
  });
});
