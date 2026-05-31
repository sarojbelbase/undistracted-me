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
import { STORAGE_KEYS } from '../constants/storageKeys';
import syncEngine from '../utilities/syncEngine';
import { useSettingsStore } from './useSettingsStore';

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

/** Read persisted instances synchronously — no WIDGET_REGISTRY needed. */
const readStoredInstances = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY));
    const stored = parsed?.state?.instances;
    return Array.isArray(stored) && stored.length > 0 ? stored : [];
  } catch {
    return [];
  }
};

export const useWidgetInstancesStore = create(
  persist(
    (set, get) => ({
      instances: readStoredInstances(),

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
      // Schedule sync push after rehydration (debounced, no-op if sync disabled)
      onRehydrateStorage: () => () => {
        syncEngine.schedulePush(STORAGE_KEYS.WIDGET_INSTANCES);
      },
    },
  ),
);

// After hydration, subscribe to state changes and schedule sync pushes.
// Checks syncEnabled from settings store — only pushes if user has sync on.
let _wiHydrated = false;
useWidgetInstancesStore.persist.onFinishHydration(() => {
  _wiHydrated = true;
});
useWidgetInstancesStore.subscribe(() => {
  if (!_wiHydrated) return;
  if (useSettingsStore.getState().syncEnabled) {
    syncEngine.schedulePush(STORAGE_KEYS.WIDGET_INSTANCES);
  }
});
