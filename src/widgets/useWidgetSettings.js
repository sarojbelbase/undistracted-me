import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useWidgetInstancesStore } from '../store/useWidgetInstancesStore';

/**
 * Reads and writes per-widget settings from the Zustand widget instances store.
 *
 * API is identical to the previous localStorage-direct version so all widget
 * components are unchanged:
 *
 *   const [settings, updateSetting] = useWidgetSettings('clock', { format: '24h' });
 *   updateSetting('format', '12h');
 *
 * Migration: on first load, settings are read from existing `widgetSettings_*`
 * localStorage keys via the store's `merge` function — so no user data is lost.
 * The legacy localStorage key is also kept in sync on every write so Playwright
 * tests that seed / read it directly continue to work.
 */
export const useWidgetSettings = (widgetId, defaults) => {
  // Read — shallow-compare the merged settings object so only real changes cause re-renders
  const settings = useWidgetInstancesStore(
    useShallow((s) => {
      const stored = s.widgetSettings[widgetId];
      return stored ? { ...defaults, ...stored } : defaults;
    }),
  );

  const updateWidgetSetting = useWidgetInstancesStore(
    (s) => s.updateWidgetSetting,
  );

  const updateSetting = useCallback(
    (key, value) => updateWidgetSetting(widgetId, key, value),
    [updateWidgetSetting, widgetId],
  );

  return [settings, updateSetting];
};


