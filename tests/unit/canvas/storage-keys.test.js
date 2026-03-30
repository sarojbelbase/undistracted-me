/**
 * Tests for src/constants/storageKeys.js — STORAGE_KEYS registry
 *
 * What can go wrong:
 *  – A key typo in a component (e.g. STORAGE_KEYS.SETTINGS vs the raw string)
 *    makes storage read/write silently go to different keys — data is lost.
 *  – widgetSettings('clock') must produce the exact string that
 *    useWidgetSettings writes to, or per-widget settings are orphaned.
 *  – STORAGE_KEYS must be frozen; if it isn't, any module can overwrite a key
 *    at runtime and cause hard-to-debug data corruption.
 *  – Key names must be consistent with what Zustand persist uses (SETTINGS)
 *    and what WidgetGrid reads (WIDGET_LAYOUT).
 */

import { describe, it, expect } from 'vitest';
import { STORAGE_KEYS } from '../../../src/constants/storageKeys';

describe('STORAGE_KEYS', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(STORAGE_KEYS)).toBe(true);
  });

  // ── Global settings ──────────────────────────────────────────────────────
  it('SETTINGS key matches Zustand persist key', () => {
    expect(STORAGE_KEYS.SETTINGS).toBe('undistracted_settings');
  });

  // ── Widget system ─────────────────────────────────────────────────────────
  it('WIDGET_INSTANCES matches the key used by useWidgetInstancesStore', () => {
    expect(STORAGE_KEYS.WIDGET_INSTANCES).toBe('widget_instances');
  });

  it('WIDGET_LAYOUT matches the key used by WidgetGrid', () => {
    expect(STORAGE_KEYS.WIDGET_LAYOUT).toBe('widget_grid_layouts');
  });

  // ── Widget settings function ──────────────────────────────────────────────
  it('widgetSettings() is a function', () => {
    expect(typeof STORAGE_KEYS.widgetSettings).toBe('function');
  });

  it('widgetSettings("clock") returns "widgetSettings_clock"', () => {
    expect(STORAGE_KEYS.widgetSettings('clock')).toBe('widgetSettings_clock');
  });

  it('widgetSettings("weather") returns "widgetSettings_weather"', () => {
    expect(STORAGE_KEYS.widgetSettings('weather')).toBe('widgetSettings_weather');
  });

  it('widgetSettings uses underscore separator (not dash)', () => {
    const key = STORAGE_KEYS.widgetSettings('notes');
    expect(key).toBe('widgetSettings_notes');
    expect(key).not.toContain('-');
  });

  // ── Widget data ───────────────────────────────────────────────────────────
  it('EVENTS key defined', () => {
    expect(STORAGE_KEYS.EVENTS).toBe('widget_events');
  });

  it('COUNTDOWN_EVENTS key defined', () => {
    expect(typeof STORAGE_KEYS.COUNTDOWN_EVENTS).toBe('string');
    expect(STORAGE_KEYS.COUNTDOWN_EVENTS.length).toBeGreaterThan(0);
  });

  it('POMODORO key defined', () => {
    expect(STORAGE_KEYS.POMODORO).toBe('fm_pomodoro');
  });

  // ── Focus mode ────────────────────────────────────────────────────────────
  it('UNSPLASH_CACHE key defined', () => {
    expect(STORAGE_KEYS.UNSPLASH_CACHE).toBe('fm_unsplash_cache');
  });

  // ── Integrations ──────────────────────────────────────────────────────────
  it('GCAL_ACCESS_TOKEN key defined', () => {
    expect(typeof STORAGE_KEYS.GCAL_ACCESS_TOKEN).toBe('string');
  });

  // ── Legacy ────────────────────────────────────────────────────────────────
  it('LEGACY_WIDGET_ENABLED_IDS key defined', () => {
    expect(STORAGE_KEYS.LEGACY_WIDGET_ENABLED_IDS).toBe('widget_enabled_ids');
  });
});
