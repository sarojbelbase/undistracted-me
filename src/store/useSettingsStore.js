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

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { applyTheme } from "../theme";
import { STORAGE_KEYS } from "../constants/storageKeys";
import {
  APP_SETTINGS_DEFAULTS,
  DEFAULT_NOTIFICATION_TYPES,
} from "../constants/defaults";
import syncEngine from "../utilities/syncEngine";

/** Sync notification config to chrome.storage.local so bg.js can read it. */
function _syncNotifications(enabled, types) {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.set({ notif_enabled: enabled, notif_types: types });
    }
  } catch {
    /* unavailable in tests / web build */
  }
}

export const STORE_KEY = STORAGE_KEYS.SETTINGS;

/**
 * Seed initial state. Reads from the Zustand persist key first so accents
 * and mode are correct on the very first render — before async rehydration.
 * Falls back to legacy per-key entries for first-time migration.
 */
const fromLegacy = () => {
  const D = APP_SETTINGS_DEFAULTS;
  try {
    const stored = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.SETTINGS) || "null",
    );
    if (stored?.state)
      return {
        language: stored.state.language ?? D.language,
        accent: stored.state.accent ?? D.accent,
        mode: stored.state.mode ?? D.mode,
        defaultView: stored.state.defaultView ?? D.defaultView,
        dateFormat: stored.state.dateFormat ?? D.dateFormat,
        lookAwayEnabled: stored.state.lookAwayEnabled ?? D.lookAwayEnabled,
        lookAwayInterval: (() => {
          const v = stored.state.lookAwayInterval ?? D.lookAwayInterval;
          // v3.0 shipped a bad 1-minute "screen-timeout" default. Treat any
          // persisted 1 as that bad default and restore the 20-minute cadence.
          return v === 1 ? D.lookAwayInterval : v;
        })(),
        canvasBg: (() => {
          const cb = stored.state.canvasBg ?? D.canvasBg;
          return cb.type === "orb" && cb.orbId && cb.orbId !== "accent"
            ? { ...cb, orbId: "accent" }
            : cb;
        })(),
        cardStyle: stored.state.cardStyle ?? D.cardStyle,
        modePrefs: stored.state.modePrefs ?? {
          light: { cardStyle: stored.state.cardStyle ?? D.cardStyle },
          dark: { cardStyle: stored.state.cardStyle ?? D.cardStyle },
        },
        notificationsEnabled:
          stored.state.notificationsEnabled ?? D.notificationsEnabled,
        notificationTypes:
          stored.state.notificationTypes ?? DEFAULT_NOTIFICATION_TYPES,
        quickTourSeenVersion:
          stored.state.quickTourSeenVersion ?? D.quickTourSeenVersion,
        syncEnabled: stored.state.syncEnabled ?? D.syncEnabled,
      };
  } catch {
    /* ignore */
  }
  // Legacy single-key fallback
  const _prefersDark =
    globalThis.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
  return {
    language: localStorage.getItem(STORAGE_KEYS._LEGACY.LANGUAGE) || D.language,
    accent: localStorage.getItem(STORAGE_KEYS._LEGACY.ACCENT) || D.accent,
    mode:
      localStorage.getItem(STORAGE_KEYS._LEGACY.MODE) ||
      (_prefersDark ? "dark" : D.mode),
    defaultView:
      localStorage.getItem(STORAGE_KEYS._LEGACY.DEFAULT_VIEW) || D.defaultView,
    dateFormat:
      localStorage.getItem(STORAGE_KEYS._LEGACY.DATE_FORMAT) || D.dateFormat,
    lookAwayEnabled: D.lookAwayEnabled,
    lookAwayInterval: D.lookAwayInterval,
    canvasBg: D.canvasBg,
    cardStyle: D.cardStyle,
    modePrefs: D.modePrefs,
    notificationsEnabled: D.notificationsEnabled,
    notificationTypes: DEFAULT_NOTIFICATION_TYPES,
    quickTourSeenVersion: D.quickTourSeenVersion,
    syncEnabled: D.syncEnabled,
  };
};

/** Returns 'light' or 'dark' modePrefs key based on the current mode value. */
const resolvedModeKey = (mode) =>
  mode === "dark" || mode === "auto" ? "dark" : "light";

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      // ── State (seeded from legacy keys on first load) ──────────────────
      ...fromLegacy(),

      // ── Onboarding ────────────────────────────────────────────────────────
      /** Unix-ms timestamp of the very first time this store was initialised. */
      firstInstalledAt: Date.now(),

      clockFormat: APP_SETTINGS_DEFAULTS.clockFormat,
      focusSearchBar: APP_SETTINGS_DEFAULTS.focusSearchBar,
      focusTasks: APP_SETTINGS_DEFAULTS.focusTasks,
      focusSearchTopSites: APP_SETTINGS_DEFAULTS.focusSearchTopSites,
      focusSearchWeb: APP_SETTINGS_DEFAULTS.focusSearchWeb,

      focusPanels: APP_SETTINGS_DEFAULTS.focusPanels,

      // ── Helpers ────────────────────────────────────────────────────────

      // ── Actions ────────────────────────────────────────────────────────

      /**
       * Call once the user finishes or dismisses the quick tour.
       * Pass the current app version string, e.g. '4.0.0'.
       */
      markQuickTourSeen: (version) => set({ quickTourSeenVersion: version }),

      /** Re-show the quick tour on next mount by resetting the seen version. */
      resetQuickTourSeen: () => set({ quickTourSeenVersion: null }),

      setLanguage: (language) => {
        set({ language });
        // Mirror to legacy key — Playwright tests assert localStorage.getItem('language').
        try {
          localStorage.setItem(STORAGE_KEYS._LEGACY.LANGUAGE, language);
        } catch {
          /* storage unavailable */
        }
      },

      /** Clock time format shown in Focus Mode: '24h' | '12h' */
      setClockFormat: (clockFormat) => set({ clockFormat }),

      /** Toggle search bar visibility in Focus Mode */
      setFocusSearchBar: (focusSearchBar) => set({ focusSearchBar }),

      /** Toggle tasks panel visibility in Focus Mode */
      setFocusTasks: (focusTasks) => set({ focusTasks }),

      /** Show browser top sites in empty-state search dropdown */
      setFocusSearchTopSites: (v) => set({ focusSearchTopSites: v }),

      /** Include web autocomplete suggestions in results */
      setFocusSearchWeb: (v) => set({ focusSearchWeb: v }),

      /** Toggle a single Focus Mode panel on/off by key */
      setFocusPanelEnabled: (key, enabled) =>
        set((s) => ({ focusPanels: { ...s.focusPanels, [key]: enabled } })),

      setAccent: (accent) => {
        set({ accent });
        applyTheme(accent, get().mode, get().cardStyle);
      },

      setMode: (mode) => {
        const accent = get().accent;
        // cardStyle is a global preference — never overwritten by mode changes
        const cardStyle = get().cardStyle;
        set({ mode });
        // Mirror to legacy key — Playwright tests assert localStorage.getItem('app_mode').
        try {
          localStorage.setItem(STORAGE_KEYS._LEGACY.MODE, mode);
        } catch {
          /* storage unavailable */
        }
        // For 'auto', theme will be applied by useAutoTheme hook after mount.
        if (mode !== "auto") applyTheme(accent, mode, cardStyle);
      },

      setDefaultView: (defaultView) => set({ defaultView }),

      /** Date calendar format shown in Focus Mode: 'gregorian' | 'bikramSambat' */
      setDateFormat: (dateFormat) => set({ dateFormat }),

      /** LookAway eye-break reminders */
      setLookAwayEnabled: (lookAwayEnabled) => set({ lookAwayEnabled }),
      setLookAwayInterval: (lookAwayInterval) => set({ lookAwayInterval }),

      /** Master switch for all extension browser notifications. */
      setNotificationsEnabled: (enabled) => {
        set({ notificationsEnabled: enabled });
        _syncNotifications(enabled, get().notificationTypes);
      },

      /** Toggle a single notification type on/off by id. */
      setNotificationType: (type, enabled) => {
        const types = { ...get().notificationTypes, [type]: enabled };
        set({ notificationTypes: types });
        _syncNotifications(get().notificationsEnabled, types);
      },

      /** Canvas background — { type: 'solid'|'orb'|'curated'|'custom', orbId?, url? } */
      setCanvasBg: (canvasBg) => {
        set({ canvasBg });
      },

      /** Widget surface style — 'paper' | 'glass' */
      setCardStyle: (cardStyle) => {
        const key = resolvedModeKey(get().mode);
        const modePrefs = {
          ...get().modePrefs,
          [key]: { ...get().modePrefs?.[key], cardStyle },
        };
        set({ cardStyle, modePrefs });
        applyTheme(get().accent, get().mode, cardStyle);
      },

      /** Enable / disable cross-device sync via chrome.storage.sync */
      setSyncEnabled: (syncEnabled) => {
        set({ syncEnabled });
        if (syncEnabled) {
          syncEngine.enableSync();
        } else {
          syncEngine.disableSync();
        }
      },
    }),
    {
      name: STORE_KEY,
      version: 1,
      // Migrate the v3.0 bad 1-minute lookaway interval back to a 20-minute
      // cadence. States persisted before this migration carry version 0; a
      // value of 1 is the bad default, not a real user choice.
      migrate: (persistedState) => {
        if (persistedState?.lookAwayInterval === 1) {
          return {
            ...persistedState,
            lookAwayInterval: APP_SETTINGS_DEFAULTS.lookAwayInterval,
          };
        }
        return persistedState;
      },
      // Re-apply theme CSS vars after Zustand rehydrates from localStorage
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(
            state.accent || APP_SETTINGS_DEFAULTS.accent,
            state.mode || APP_SETTINGS_DEFAULTS.mode,
            state.cardStyle || APP_SETTINGS_DEFAULTS.cardStyle,
          );
          // Schedule sync push after rehydration (debounced, no-op if sync disabled)
          if (state.syncEnabled) {
            syncEngine.schedulePush(STORAGE_KEYS.SETTINGS);
          }
        }
      },
    },
  ),
);

// After hydration, subscribe to all state changes and schedule sync pushes.
// Debounced at 500ms — rapid changes (e.g., dragging a slider) result in a
// single push. The _sync_ts stamp prevents ping-pong loops between devices.
let _settingsHydrated = false;
useSettingsStore.persist.onFinishHydration(() => {
  _settingsHydrated = true;
});
useSettingsStore.subscribe((state) => {
  if (!_settingsHydrated) return;
  if (state.syncEnabled) {
    syncEngine.schedulePush(STORAGE_KEYS.SETTINGS);
  }
});
