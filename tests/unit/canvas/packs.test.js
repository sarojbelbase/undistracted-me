/**
 * Tests for app/utilities/packs.js — first-run setup actions.
 *
 * What can go wrong:
 *  – A pack references a widget `type` that isn't in WIDGET_REGISTRY, so the
 *    grid silently drops it (ghost/empty dashboard after onboarding).
 *  – applyPack mutates global stores in a way that leaks across tests.
 *  – addTaskToday writes a malformed event shape that the events widget can't read.
 *  – blockSocialDefaults aborts on the first failure instead of best-effort.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  setState: vi.fn(),
  setAccent: vi.fn(),
  updateWidgetSetting: vi.fn(),
  blockSite: vi.fn(),
}));

vi.mock('../../../app/store/useWidgetInstancesStore', () => ({
  useWidgetInstancesStore: {
    setState: mocks.setState,
    getState: () => ({ updateWidgetSetting: mocks.updateWidgetSetting }),
  },
}));

vi.mock('../../../app/store/useSettingsStore', () => ({
  useSettingsStore: {
    getState: () => ({ setAccent: mocks.setAccent }),
  },
}));

vi.mock('../../../app/utilities/siteBlocker', () => ({
  blockSite: mocks.blockSite,
}));

import {
  PACKS,
  PACK_LIST,
  applyPack,
  blockSocialDefaults,
  addTaskToday,
  todayIso,
  SOCIAL_BLOCK_DEFAULTS,
  SOCIAL_BLOCK_MINUTES,
} from '../../../app/utilities/packs';
import { STORAGE_KEYS } from '../../../app/constants/storageKeys';

// The canonical set of widget types (mirrors WIDGET_REGISTRY). A pack that
// references an unknown type would produce empty grid cells.
const VALID_TYPES = new Set([
  'clock', 'dateToday', 'progress', 'events', 'calendar', 'pomodoro', 'notes',
  'weather', 'bookmark', 'quickAccess', 'media', 'stock', 'occasions', 'dailys',
  'rss', 'expense', 'countdown', 'pocket',
]);

describe('packs', () => {
  beforeEach(() => {
    mocks.setState.mockClear();
    mocks.setAccent.mockClear();
    mocks.updateWidgetSetting.mockClear();
    mocks.blockSite.mockClear();
    mocks.blockSite.mockResolvedValue([]);
    localStorage.clear();
  });

  describe('PACKS', () => {
    it('defines the four starter packs', () => {
      expect(PACK_LIST.map((p) => p.id)).toEqual([
        'minimal', 'student', 'developer', 'nepal',
      ]);
    });

    it('every pack uses only registered widget types', () => {
      for (const pack of PACK_LIST) {
        expect(pack.widgets.length).toBeGreaterThan(0);
        for (const t of pack.widgets) {
          expect(VALID_TYPES.has(t), `${pack.id} uses unknown type "${t}"`).toBe(true);
        }
      }
    });

    it('every pack has an accent and an rss list', () => {
      for (const pack of PACK_LIST) {
        expect(typeof pack.accent).toBe('string');
        expect(Array.isArray(pack.rss)).toBe(true);
      }
    });
  });

  describe('applyPack', () => {
    it('sets instances + accent for a known pack', () => {
      const pack = applyPack('developer');
      expect(pack).toBe(PACKS.developer);

      expect(mocks.setState).toHaveBeenCalledWith({
        instances: PACKS.developer.widgets.map((type) => ({ id: type, type })),
      });
      expect(mocks.setAccent).toHaveBeenCalledWith(PACKS.developer.accent);
    });

    it('sets RSS feeds only when the pack defines them', () => {
      applyPack('minimal'); // rss: []
      expect(mocks.updateWidgetSetting).not.toHaveBeenCalled();

      mocks.updateWidgetSetting.mockClear();
      applyPack('nepal');
      expect(mocks.updateWidgetSetting).toHaveBeenCalledWith(
        'rss', 'activeFeedIds', PACKS.nepal.rss,
      );
    });

    it('returns null for an unknown pack', () => {
      expect(applyPack('does-not-exist')).toBeNull();
      expect(mocks.setState).not.toHaveBeenCalled();
    });
  });

  describe('blockSocialDefaults', () => {
    it('blocks each default domain best-effort', async () => {
      const out = await blockSocialDefaults();
      expect(mocks.blockSite).toHaveBeenCalledTimes(SOCIAL_BLOCK_DEFAULTS.length);
      for (const d of SOCIAL_BLOCK_DEFAULTS) {
        expect(mocks.blockSite).toHaveBeenCalledWith(d, SOCIAL_BLOCK_MINUTES);
      }
      expect(out).toEqual(SOCIAL_BLOCK_DEFAULTS);
    });

    it('continues past a failed block', async () => {
      mocks.blockSite.mockRejectedValueOnce(new Error('boom'));
      await expect(blockSocialDefaults()).resolves.toEqual(SOCIAL_BLOCK_DEFAULTS);
      expect(mocks.blockSite).toHaveBeenCalledTimes(SOCIAL_BLOCK_DEFAULTS.length);
    });
  });

  describe('todayIso', () => {
    it('returns a YYYY-MM-DD string', () => {
      expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('addTaskToday', () => {
    it('ignores empty/whitespace text', () => {
      expect(addTaskToday('')).toBeNull();
      expect(addTaskToday('   ')).toBeNull();
      expect(localStorage.getItem(STORAGE_KEYS.EVENTS)).toBeNull();
    });

    it('appends a today event with the right shape', () => {
      const event = addTaskToday('  Finish the draft  ');
      expect(event).toBeTruthy();
      expect(event.title).toBe('Finish the draft');
      expect(event.startDate).toBe(todayIso());
      expect(event).toHaveProperty('id');

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS));
      expect(stored).toHaveLength(1);
      expect(stored[0].title).toBe('Finish the draft');
    });

    it('preserves existing events', () => {
      localStorage.setItem(
        STORAGE_KEYS.EVENTS,
        JSON.stringify([{ id: 'x', title: 'existing', startDate: '2026-01-01' }]),
      );
      addTaskToday('new one');
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS));
      expect(stored).toHaveLength(2);
    });
  });
});
