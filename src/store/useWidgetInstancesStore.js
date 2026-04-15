/**
 * Widget instances store.
 *
 * Single source of truth for:
 *   - `instances`      : the list of active widget slots (id + type)
 *   - `widgetSettings` : per-instance settings map { [widgetId]: { ...settings } }
 *
 * Widget settings were previously written directly to localStorage under
 * `widgetSettings_${id}`. This store migrates those keys on first hydration
 * so existing data is preserved transparently.
 *
 * Playwright tests seed `widgetSettings_clock` etc. in localStorage before
 * page load. The `merge` function in the persist config reads those entries
 * so tests continue to work without any changes.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WIDGET_REGISTRY } from '../widgets';
import { STORAGE_KEYS } from '../constants/storageKeys';

const STORE_KEY = STORAGE_KEYS.WIDGET_INSTANCES;

const mkId = (type) =>
  `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

/**
 * Scan localStorage for any `widgetSettings_*` keys and collect them into
 * { [widgetId]: parsedValue }. Used for initial hydration and migration.
 */
const collectLegacyWidgetSettings = () => {
  const result = {};
  try {
    const prefix = 'widgetSettings_';
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(prefix)) continue;
      const widgetId = key.slice(prefix.length);
      try { result[widgetId] = JSON.parse(localStorage.getItem(key)); }
      catch { /* skip malformed entries */ }
    }
  } catch { /* storage unavailable */ }
  return result;
};

/**
 * Determine the initial instances list with three-level fall-through:
 *  1. New format already stored under `widget_instances`
 *  2. Migrate from legacy `widget_enabled_ids` array
 *  3. Seed from WIDGET_REGISTRY defaults
 */
const KNOWN_TYPES = new Set(WIDGET_REGISTRY.map(w => w.type));
const isValidInstance = (inst) => inst?.id && inst?.type && KNOWN_TYPES.has(inst.type);

const resolveInitialInstances = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (Array.isArray(saved) && saved.length) {
      const valid = saved.filter(isValidInstance);
      if (valid.length) return valid;
    }
  } catch { /* ignore */ }

  try {
    const old = JSON.parse(localStorage.getItem(STORAGE_KEYS._LEGACY.WIDGET_ENABLED_IDS));
    if (Array.isArray(old) && old.length) {
      const valid = old.map((id) => ({ id, type: id })).filter(isValidInstance);
      if (valid.length) return valid;
    }
  } catch { /* ignore */ }

  return WIDGET_REGISTRY.filter((w) => w.enabled).map((w) => ({
    id: w.type,
    type: w.type,
  }));
};

export const useWidgetInstancesStore = create(
  persist(
    (set, get) => ({
      instances: resolveInitialInstances(),

      // ── Per-widget settings ────────────────────────────────────────────────
      // Shape: { [widgetId]: { ...settingValues } }
      // Migration from legacy `widgetSettings_*` localStorage keys happens in
      // the `merge` function below so existing user data is never lost.
      widgetSettings: collectLegacyWidgetSettings(),

      /**
       * Update a single setting key for a widget.
       * Also writes to the legacy localStorage key so Playwright tests that
       * read `widgetSettings_*` directly continue to work.
       */
      updateWidgetSetting: (widgetId, key, value) => {
        set((state) => {
          const current = state.widgetSettings[widgetId] ?? {};
          const updated = { ...current, [key]: value };
          // Mirror to legacy key — keeps Playwright tests and any external
          // readers in sync with the Zustand store.
          try {
            localStorage.setItem(
              STORAGE_KEYS.widgetSettings(widgetId),
              JSON.stringify(updated),
            );
          } catch { /* storage unavailable */ }
          return {
            widgetSettings: {
              ...state.widgetSettings,
              [widgetId]: updated,
            },
          };
        });
      },

      addInstance: (type) => {
        set((state) => {
          const firstOccupied = state.instances.some((i) => i.id === type);
          const id = firstOccupied ? mkId(type) : type;
          return { instances: [...state.instances, { id, type }] };
        });
      },

      removeInstance: (id) => {
        set((state) => ({
          instances: state.instances.filter((i) => i.id !== id),
        }));
      },

      /** Restore a full snapshot (used by settings import). */
      restoreInstances: (list) => set({ instances: list }),
    }),
    {
      name: STORE_KEY,
      partialize: (state) => ({
        instances: state.instances,
        widgetSettings: state.widgetSettings,
      }),
      // Custom merge: if the persisted snapshot is missing widgetSettings
      // (e.g. existing user on the old schema), scan localStorage for legacy
      // `widgetSettings_*` keys so no settings are lost on upgrade.
      merge: (persisted, current) => ({
        ...current,
        ...persisted,
        widgetSettings: {
          ...collectLegacyWidgetSettings(),
          ...persisted?.widgetSettings,
        },
      }),
    },
  ),
);
