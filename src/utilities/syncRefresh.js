/**
 * Sync refresh bridge — rehydrates the Zustand stores after a sync pull/merge
 * writes incoming changes to localStorage.
 *
 * The settings and widget-instances stores hydrate from localStorage once at
 * startup. When the sync engine pulls or merges remote changes it writes
 * straight to localStorage, which the in-memory stores never see. This module
 * registers a refresh listener with the sync engine and rehydrates the affected
 * stores so the UI reflects merged settings and widget instances immediately.
 *
 * Kept in its own module (imported once from App) to avoid a circular import:
 * the stores import `syncEngine`, and `syncEngine` must never import the stores.
 */

import syncEngine from './syncEngine';
import { useSettingsStore } from '../store/useSettingsStore';
import { useWidgetInstancesStore } from '../store/useWidgetInstancesStore';

/** Register the rehydrate listener. Call once at app startup. */
export const initSyncRefresh = () => {
  syncEngine.registerRefreshListener((changedKeys) => {
    if (!changedKeys) return;
    if (changedKeys['undistracted_settings']) {
      useSettingsStore.persist.rehydrate();
    }
    if (changedKeys['widget_instances']) {
      useWidgetInstancesStore.persist.rehydrate();
    }
  });
};
