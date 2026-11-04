/**
 * Import tests for all widget config.js files (each just exports a config object)
 * and other trivially-testable re-export modules.
 *
 * All config.js files export a default object with at least: type, title, w, h.
 * Testing them ensures they're syntactically correct and consistent.
 */

import { describe, it, expect } from 'vitest';

// ─────────────────────────────────────────────────────────────────────────────
// Widget config.js files
// ─────────────────────────────────────────────────────────────────────────────

import bookmarkConfig from '../../../src/widgets/bookmark/config';
import calendarConfig from '../../../src/widgets/calendar/config';
import clockConfig from '../../../src/widgets/clock/config';
import countdownConfig from '../../../src/widgets/countdown/config';
import dateTodayConfig from '../../../src/widgets/dateToday/config';
import dayProgressConfig from '../../../src/widgets/progress/config';
import eventsConfig from '../../../src/widgets/events/config';
import dailysConfig from '../../../src/widgets/dailys/config';
import notesConfig from '../../../src/widgets/notes/config';
import pomodoroConfig from '../../../src/widgets/pomodoro/config';
import stockConfig from '../../../src/widgets/stock/config';
import weatherConfig from '../../../src/widgets/weather/config';
import mediaConfig from '../../../src/widgets/media/config';

const ALL_CONFIGS = [
  ['bookmark', bookmarkConfig],
  ['calendar', calendarConfig],
  ['clock', clockConfig],
  ['countdown', countdownConfig],
  ['dateToday', dateTodayConfig],
  ['progress', dayProgressConfig],
  ['events', eventsConfig],
  ['dailys', dailysConfig],
  ['notes', notesConfig],
  ['pomodoro', pomodoroConfig],
  ['stock', stockConfig],
  ['weather', weatherConfig],
  ['media', mediaConfig],
];

describe('Widget config.js files — structural integrity', () => {
  ALL_CONFIGS.forEach(([name, config]) => {
    describe(`${name} config`, () => {
      it('exports a non-null object', () => {
        expect(config).toBeTruthy();
        expect(typeof config).toBe('object');
      });

      it('has a type field', () => {
        expect(config).toHaveProperty('type');
        expect(typeof config.type).toBe('string');
      });

      it('has a title field', () => {
        expect(config).toHaveProperty('title');
        expect(typeof config.title).toBe('string');
        expect(config.title.length).toBeGreaterThan(0);
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

      it('type matches the widget name (consistency)', () => {
        // The registry key is the config `type`; verify it equals the widget name.
        expect(config.type).toBe(name);
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
// src/constants — language/setting constants
// ─────────────────────────────────────────────────────────────────────────────

import { LANGUAGES } from '../../../src/constants';

describe('constants (LANGUAGES)', () => {
  it('LANGUAGES has ne and en values', () => {
    expect(Object.values(LANGUAGES)).toContain('ne');
    expect(Object.values(LANGUAGES)).toContain('en');
  });

  it('LANGUAGES is frozen', () => {
    expect(Object.isFrozen(LANGUAGES)).toBe(true);
  });
});
