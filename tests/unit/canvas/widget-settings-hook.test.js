/**
 * Tests for src/widgets/useWidgetSettings.js
 *
 * What can go wrong:
 *  – If the storageKey is wrong (e.g. widgetSettings_clock vs widgetSettings-clock)
 *    settings are written to one key and read from another → always defaults.
 *  – Malformed JSON in localStorage (external edit, corruption) must not crash
 *    the widget and must fall back to defaults.
 *  – updateSetting must merge the new value into the existing settings rather
 *    than replacing the whole object — otherwise changing one field wipes all
 *    other saved settings.
 *  – If `defaults` contains a field not yet stored, it must be present in the
 *    returned settings (safe upgrade path when new defaults are added).
 *  – Settings must be stringified on write (localStorage is string-only).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWidgetSettings } from '../../../src/widgets/useWidgetSettings';
import { useWidgetInstancesStore } from '../../../src/store/useWidgetInstancesStore';

// Reset both localStorage and the Zustand store between tests
beforeEach(() => {
  localStorage.clear();
  useWidgetInstancesStore.setState({ widgetSettings: {} });
});
afterEach(() => {
  localStorage.clear();
  useWidgetInstancesStore.setState({ widgetSettings: {} });
});

/**
 * Seed a widget's settings into both localStorage (legacy mirror) and
 * the Zustand store so useWidgetSettings picks it up correctly.
 */
const seedSettings = (widgetId, value) => {
  localStorage.setItem(`widgetSettings_${widgetId}`, JSON.stringify(value));
  useWidgetInstancesStore.setState((s) => ({
    widgetSettings: { ...s.widgetSettings, [widgetId]: value },
  }));
};

// ────────────────────────────────────────────────────────────────────────────
// Initial read
// ────────────────────────────────────────────────────────────────────────────

describe('initial read', () => {
  it('returns defaults when localStorage has nothing', () => {
    const { result } = renderHook(() =>
      useWidgetSettings('clock', { language: 'en', format: '24h' })
    );
    const [settings] = result.current;
    expect(settings).toEqual({ language: 'en', format: '24h' });
  });

  it('reads saved settings and merges with defaults', () => {
    seedSettings('clock', { language: 'ne' });
    const { result } = renderHook(() =>
      useWidgetSettings('clock', { language: 'en', format: '24h' })
    );
    const [settings] = result.current;
    expect(settings.language).toBe('ne');
    // `format` was not saved — should come from defaults
    expect(settings.format).toBe('24h');
  });

  it('uses key pattern "widgetSettings_<id>"', () => {
    seedSettings('weather', { unit: 'imperial' });
    const { result } = renderHook(() =>
      useWidgetSettings('weather', { unit: 'metric' })
    );
    const [settings] = result.current;
    expect(settings.unit).toBe('imperial');
  });

  it('does NOT read from a key with a different id prefix', () => {
    seedSettings('clock', { language: 'ne' });
    const { result } = renderHook(() =>
      useWidgetSettings('weather', { language: 'en' })
    );
    const [settings] = result.current;
    expect(settings.language).toBe('en'); // should be default, not 'ne'
  });

  it('gracefully falls back to defaults on malformed JSON', () => {
    // Only seed localStorage (no valid JSON) — store remains empty → defaults
    localStorage.setItem('widgetSettings_clock', 'NOT_VALID_JSON{{{');
    const { result } = renderHook(() =>
      useWidgetSettings('clock', { language: 'en' })
    );
    const [settings] = result.current;
    expect(settings).toEqual({ language: 'en' });
  });

  it('default field added later is present in merged output', () => {
    // Simulate saved settings from older build that did not have "showSeconds"
    seedSettings('clock', { language: 'ne' });
    const { result } = renderHook(() =>
      useWidgetSettings('clock', { language: 'en', showSeconds: false })
    );
    const [settings] = result.current;
    expect(settings.showSeconds).toBe(false); // new default, not in storage
    expect(settings.language).toBe('ne');     // existing saved value kept
  });
});

// ────────────────────────────────────────────────────────────────────────────
// updateSetting
// ────────────────────────────────────────────────────────────────────────────

describe('updateSetting', () => {
  it('updates one field without wiping others', () => {
    const { result } = renderHook(() =>
      useWidgetSettings('clock', { language: 'en', format: '24h' })
    );
    act(() => result.current[1]('language', 'ne'));
    const [settings] = result.current;
    expect(settings.language).toBe('ne');
    expect(settings.format).toBe('24h'); // must not be wiped
  });

  it('persists the updated value to localStorage', () => {
    const { result } = renderHook(() =>
      useWidgetSettings('clock', { language: 'en' })
    );
    act(() => result.current[1]('language', 'ne'));
    const raw = JSON.parse(localStorage.getItem('widgetSettings_clock'));
    expect(raw?.language).toBe('ne');
  });

  it('writes the full merged object to localStorage (not just the changed key)', () => {
    seedSettings('clock', { language: 'en', format: '12h' });
    const { result } = renderHook(() =>
      useWidgetSettings('clock', { language: 'en', format: '24h' })
    );
    act(() => result.current[1]('language', 'ne'));
    const raw = JSON.parse(localStorage.getItem('widgetSettings_clock'));
    expect(raw?.format).toBe('12h'); // unchanged field must still be in storage
  });

  it('updates a boolean value correctly', () => {
    const { result } = renderHook(() =>
      useWidgetSettings('clock', { showSeconds: false })
    );
    act(() => result.current[1]('showSeconds', true));
    expect(result.current[0].showSeconds).toBe(true);
  });

  it('calling updateSetting twice keeps the last value', () => {
    const { result } = renderHook(() =>
      useWidgetSettings('notes', { color: 'yellow' })
    );
    act(() => result.current[1]('color', 'blue'));
    act(() => result.current[1]('color', 'green'));
    expect(result.current[0].color).toBe('green');
  });

  it('writes to the correct localStorage key for the widget id', () => {
    const { result } = renderHook(() =>
      useWidgetSettings('countdown', { label: '' })
    );
    act(() => result.current[1]('label', 'Birthday'));
    expect(localStorage.getItem('widgetSettings_countdown')).toBeTruthy();
    expect(localStorage.getItem('widgetSettings_clock')).toBeNull(); // different widget
  });
});
