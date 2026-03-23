/**
 * Global app settings store.
 *
 * Single source of truth for every user-facing setting. Zustand's `persist`
 * middleware automatically serialises the state to `localStorage` under the
 * key `undistracted_settings`, so all components always see the same value —
 * no prop-drilling required.
 *
 * First-time migration: if the new key is absent the initial-state function
 * reads from the legacy per-key localStorage entries so existing user
 * preferences are preserved automatically.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { applyTheme } from '../theme';

export const STORE_KEY = 'undistracted_settings';

/**
 * Read from legacy localStorage keys for one-time migration.
 * Zustand persist will override these defaults once `STORE_KEY` exists.
 */
const fromLegacy = () => ({
  language: localStorage.getItem('language') || 'en',
  accent: localStorage.getItem('app_accent') || 'Default',
  mode: localStorage.getItem('app_mode') || 'light',
  defaultView: localStorage.getItem('defaultView') || 'canvas',
  dateFormat: localStorage.getItem('focusDateFormat') || 'gregorian',
  showMitiInIcon: localStorage.getItem('showMitiInIcon') || '0',
});

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      // ── State (seeded from legacy keys on first load) ──────────────────
      ...fromLegacy(),
      clockFormat: '24h',

      // ── Actions ────────────────────────────────────────────────────────

      setLanguage: (language) => set({ language }),

      /** Clock time format shown in Focus Mode: '24h' | '12h' */
      setClockFormat: (clockFormat) => set({ clockFormat }),

      setAccent: (accent) => {
        set({ accent });
        applyTheme(accent, get().mode);
      },

      setMode: (mode) => {
        const prevAccent = get().accent;
        // 'Default' accent is not valid in dark mode
        const accent =
          mode === 'dark' && prevAccent === 'Default' ? 'Blueberry' : prevAccent;
        set({ mode, accent });
        applyTheme(accent, mode);
      },

      setDefaultView: (defaultView) => set({ defaultView }),

      /** Date calendar format shown in Focus Mode: 'gregorian' | 'bikramSambat' */
      setDateFormat: (dateFormat) => set({ dateFormat }),

      setShowMitiInIcon: (showMitiInIcon) => set({ showMitiInIcon }),
    }),
    {
      name: STORE_KEY,
      // Re-apply theme CSS vars after Zustand rehydrates from localStorage
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.accent || 'Default', state.mode || 'light');
        }
      },
    },
  ),
);
