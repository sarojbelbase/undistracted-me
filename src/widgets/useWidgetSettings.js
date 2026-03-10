import { useState } from 'react';

/**
 * Persists per-widget settings in localStorage keyed by widgetId.
 *
 * Usage:
 *   const [settings, updateSetting] = useWidgetSettings('clock', { language: 'en' });
 *   updateSetting('language', 'ne');
 */
export const useWidgetSettings = (widgetId, defaults) => {
  const storageKey = `widgetSettings_${widgetId}`;

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch {
      return defaults;
    }
  });

  const updateSetting = (key, value) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });
  };

  return [settings, updateSetting];
};
