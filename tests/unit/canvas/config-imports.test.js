/**
 * Import tests for all widget config.js files (each just exports a config object)
 * and other trivially-testable re-export modules.
 *
 * All config.js files export a default object with at least: id, type, label, w, h.
 * Testing them ensures they're syntactically correct and consistent.
 */

import { describe, it, expect } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// Widget config.js files
// ─────────────────────────────────────────────────────────────────────────────

import bookmarksConfig from '../../../src/widgets/bookmarks/config';
import calendarConfig from '../../../src/widgets/calendar/config';
import clockConfig from '../../../src/widgets/clock/config';
import countdownConfig from '../../../src/widgets/countdown/config';
import dateTodayConfig from '../../../src/widgets/dateToday/config';
import dayProgressConfig from '../../../src/widgets/progress/config';
import eventsConfig from '../../../src/widgets/events/config';
import factsConfig from '../../../src/widgets/facts/config';
import notesConfig from '../../../src/widgets/notes/config';
import pomodoroConfig from '../../../src/widgets/pomodoro/config';
import stockConfig from '../../../src/widgets/stock/config';
import weatherConfig from '../../../src/widgets/weather/config';
import spotifyConfig from '../../../src/widgets/spotify/config';

const ALL_CONFIGS = [
  ['bookmarks', bookmarksConfig],
  ['calendar', calendarConfig],
  ['clock', clockConfig],
  ['countdown', countdownConfig],
  ['dateToday', dateTodayConfig],
  ['progress', dayProgressConfig],
  ['events', eventsConfig],
  ['facts', factsConfig],
  ['notes', notesConfig],
  ['pomodoro', pomodoroConfig],
  ['stock', stockConfig],
  ['weather', weatherConfig],
  ['spotify', spotifyConfig],
];

describe('Widget config.js files — structural integrity', () => {
  ALL_CONFIGS.forEach(([name, config]) => {
    describe(`${name} config`, () => {
      it('exports a non-null object', () => {
        expect(config).toBeTruthy();
        expect(typeof config).toBe('object');
      });

      it('has an id field', () => {
        expect(config).toHaveProperty('id');
        expect(typeof config.id).toBe('string');
      });

      it('has a type field', () => {
        expect(config).toHaveProperty('type');
        expect(typeof config.type).toBe('string');
      });

      it('has a label field', () => {
        expect(config).toHaveProperty('label');
        expect(typeof config.label).toBe('string');
        expect(config.label.length).toBeGreaterThan(0);
      });

      it('has numeric grid dimensions w and h', () => {
        expect(typeof config.w).toBe('number');
        expect(typeof config.h).toBe('number');
        expect(config.w).toBeGreaterThan(0);
        expect(config.h).toBeGreaterThan(0);
      });

      it('has numeric grid position x and y', () => {
        expect(typeof config.x).toBe('number');
        expect(typeof config.y).toBe('number');
      });

      it('id matches the widget name (consistency)', () => {
        // id should be the same as type (both are the widget key)
        expect(config.id).toBe(config.type);
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// src/store/index.js — re-exports
// ─────────────────────────────────────────────────────────────────────────────

import * as storeExports from '../../../src/store';

describe('src/store/index.js re-exports', () => {
  it('exports useSettingsStore', () => {
    expect(storeExports).toHaveProperty('useSettingsStore');
    expect(typeof storeExports.useSettingsStore).toBe('function');
  });

  it('exports useWidgetInstancesStore', () => {
    expect(storeExports).toHaveProperty('useWidgetInstancesStore');
    expect(typeof storeExports.useWidgetInstancesStore).toBe('function');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// src/constants/settings.js — language/setting constants
// ─────────────────────────────────────────────────────────────────────────────

import { LANGUAGES } from '../../../src/constants/settings';

describe('constants/settings.js', () => {
  it('LANGUAGES has ne and en values', () => {
    expect(Object.values(LANGUAGES)).toContain('ne');
    expect(Object.values(LANGUAGES)).toContain('en');
  });

  it('LANGUAGES is frozen', () => {
    expect(Object.isFrozen(LANGUAGES)).toBe(true);
  });
});
