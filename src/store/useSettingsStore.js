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
import { STORAGE_KEYS } from '../constants/storageKeys';

export const STORE_KEY = STORAGE_KEYS.SETTINGS;

/**
 * Seed initial state. Reads from the Zustand persist key first so accents
 * and mode are correct on the very first render — before async rehydration.
 * Falls back to legacy per-key entries for first-time migration.
 */
const fromLegacy = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || 'null');
    if (stored?.state) return {
      language: stored.state.language ?? 'en',
      accent: stored.state.accent ?? 'Default',
      mode: stored.state.mode ?? 'light',
      defaultView: stored.state.defaultView ?? 'canvas',
      dateFormat: stored.state.dateFormat ?? 'gregorian',
      lookAwayEnabled: stored.state.lookAwayEnabled ?? false,
      lookAwayInterval: stored.state.lookAwayInterval ?? 20,
      lookAwayNotify: stored.state.lookAwayNotify ?? true,
      canvasBg: stored.state.canvasBg ?? { type: 'orb', orbId: 'blueberry', url: null },
      cardStyle: stored.state.cardStyle ?? 'glass',
      modePrefs: stored.state.modePrefs ?? {
        light: { cardStyle: stored.state.cardStyle ?? 'glass' },
        dark: { cardStyle: stored.state.cardStyle ?? 'glass' },
      },
    };
  } catch { /* ignore */ }
  // Legacy single-key fallback
  return {
    language: localStorage.getItem(STORAGE_KEYS._LEGACY.LANGUAGE) || 'en',
    accent: localStorage.getItem(STORAGE_KEYS._LEGACY.ACCENT) || 'Default',
    mode: localStorage.getItem(STORAGE_KEYS._LEGACY.MODE) || 'light',
    defaultView: localStorage.getItem(STORAGE_KEYS._LEGACY.DEFAULT_VIEW) || 'canvas',
    dateFormat: localStorage.getItem(STORAGE_KEYS._LEGACY.DATE_FORMAT) || 'gregorian',
    lookAwayEnabled: false,
    lookAwayInterval: 20,
    lookAwayNotify: true,
    canvasBg: { type: 'orb', orbId: 'blueberry', url: null },
    cardStyle: 'glass',
    modePrefs: {
      light: { cardStyle: 'flat' },
      dark: { cardStyle: 'glass' },
    },
  };
};

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      // ── State (seeded from legacy keys on first load) ──────────────────
      ...fromLegacy(),
      clockFormat: '24h',

      // ── Helpers ────────────────────────────────────────────────────────
      /** Returns 'light' or 'dark' key for modePrefs based on current mode */
      _resolvedModeKey: () => {
        const m = get().mode;
        return (m === 'dark' || m === 'auto') ? 'dark' : 'light';
      },

      // ── Actions ────────────────────────────────────────────────────────

      setLanguage: (language) => {
        set({ language });
        // Mirror to legacy key — Playwright tests assert localStorage.getItem('language').
        try { localStorage.setItem(STORAGE_KEYS._LEGACY.LANGUAGE, language); } catch { /* storage unavailable */ }
      },

      /** Clock time format shown in Focus Mode: '24h' | '12h' */
      setClockFormat: (clockFormat) => set({ clockFormat }),

      setAccent: (accent) => {
        set({ accent });
        applyTheme(accent, get().mode, get().cardStyle);
      },

      setMode: (mode) => {
        const prevAccent = get().accent;
        // 'Default' accent is only valid in explicit light mode.
        // In 'dark' or 'auto' (which can resolve to dark at night) swap to Blueberry.
        const accent =
          (mode === 'dark' || mode === 'auto') && prevAccent === 'Default'
            ? 'Blueberry'
            : prevAccent;
        // cardStyle is a global preference — never overwritten by mode changes
        const cardStyle = get().cardStyle;
        set({ mode, accent });
        // Mirror to legacy key — Playwright tests assert localStorage.getItem('app_mode').
        try { localStorage.setItem(STORAGE_KEYS._LEGACY.MODE, mode); } catch { /* storage unavailable */ }
        // For 'auto', theme will be applied by useAutoTheme hook after mount.
        if (mode !== 'auto') applyTheme(accent, mode, cardStyle);
      },

      setDefaultView: (defaultView) => set({ defaultView }),

      /** Date calendar format shown in Focus Mode: 'gregorian' | 'bikramSambat' */
      setDateFormat: (dateFormat) => set({ dateFormat }),

      /** LookAway eye-break reminders */
      setLookAwayEnabled: (lookAwayEnabled) => set({ lookAwayEnabled }),
      setLookAwayInterval: (lookAwayInterval) => set({ lookAwayInterval }),
      setLookAwayNotify: (lookAwayNotify) => set({ lookAwayNotify }),

      /** Canvas background — { type: 'solid'|'orb'|'curated'|'custom', orbId?, url? } */
      setCanvasBg: (canvasBg) => {
        set({ canvasBg });
      },

      /** Widget surface style — 'flat' | 'glass' */
      setCardStyle: (cardStyle) => {
        const resolvedKey = get()._resolvedModeKey();
        const modePrefs = {
          ...get().modePrefs,
          [resolvedKey]: { ...get().modePrefs?.[resolvedKey], cardStyle },
        };
        set({ cardStyle, modePrefs });
        applyTheme(get().accent, get().mode, cardStyle);
      },
    }),
    {
      name: STORE_KEY,
      // Re-apply theme CSS vars after Zustand rehydrates from localStorage
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.accent || 'Default', state.mode || 'light', state.cardStyle || 'glass');
        }
      },
    },
  ),
);
