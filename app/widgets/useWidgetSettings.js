import { useCallback, useMemo } from "react";
import { useWidgetInstancesStore } from "../store/useWidgetInstancesStore";

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
 * localStorage keys via the store's `merge` function: so no user data is lost.
 * The legacy localStorage key is also kept in sync on every write so Playwright
 * tests that seed / read it directly continue to work.
 *
 * The per-widget `stored` slice is a stable reference (updateWidgetSetting only
 * replaces the one widget being written, preserving every other widget's entry),
 * so the `useMemo` below returns a stable merged object across unrelated writes.
 */
export const useWidgetSettings = (widgetId, defaults) => {
  const stored = useWidgetInstancesStore((s) => s.widgetSettings[widgetId]);
  const updateWidgetSetting = useWidgetInstancesStore((s) => s.updateWidgetSetting);

  const settings = useMemo(
    () => (stored ? { ...defaults, ...stored } : { ...defaults }),
    [stored, defaults],
  );

  const updateSetting = useCallback(
    (key, value) => updateWidgetSetting(widgetId, key, value),
    [updateWidgetSetting, widgetId],
  );

  return [settings, updateSetting];
};
