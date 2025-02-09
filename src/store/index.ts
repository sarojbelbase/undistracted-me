import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppSettings } from '../types';
import { Widget } from '../types/widgets';

interface AppState {
  widgets: Widget[];
  settings: AppSettings;
  setSettings: (settings: AppSettings) => void;
  updateWidget: (widgetId: string, updates: Partial<Widget>) => void;
  removeWidget: (widgetId: string) => void;
  addWidget: (widget: Widget) => void;
  exportSettings: () => string;
  importSettings: (jsonString: string) => void;
}

const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      widgets: [],
      settings: {
        theme: {
          accentColor: '#141414',
          isDark: false,
        },
        widgets: [],
      },
      setSettings: (settings) => set({ settings }),
      updateWidget: (widgetId, updates) => {
        const { settings } = get();
        const widgetIndex = settings.widgets.findIndex((w) => w.id === widgetId);
        if (widgetIndex === -1) return;

        const newWidgets = [...settings.widgets];
        newWidgets[widgetIndex] = { ...newWidgets[widgetIndex], ...updates };
        
        set({
          settings: {
            ...settings,
            widgets: newWidgets,
          },
        });
      },
      removeWidget: (widgetId) => {
        const { settings } = get();
        set({
          settings: {
            ...settings,
            widgets: settings.widgets.filter((w) => w.id !== widgetId),
          },
        });
      },
      addWidget: (widget) => {
        const { settings } = get();
        set({
          settings: {
            ...settings,
            widgets: [...settings.widgets, widget],
          },
        });
      },
      exportSettings: () => {
        return JSON.stringify(get().settings, null, 2);
      },
      importSettings: (jsonString) => {
        try {
          const settings = JSON.parse(jsonString);
          set({ settings });
        } catch (error) {
          console.error('Failed to import settings:', error);
        }
      },
    }),
    {
      name: 'undistracted-me-tab-storage',
    }
  )
);

export default useStore;