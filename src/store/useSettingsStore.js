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
import { DEFAULT_NOTIFICATION_TYPES } from "../constants/notifications";

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
  try {
    const stored = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.SETTINGS) || "null",
    );
    if (stored?.state)
      return {
        language: stored.state.language ?? "en",
        accent: stored.state.accent ?? "Matte Black",
        mode: stored.state.mode ?? "light",
        defaultView: stored.state.defaultView ?? "canvas",
        dateFormat: stored.state.dateFormat ?? "gregorian",
        lookAwayEnabled: stored.state.lookAwayEnabled ?? false,
        lookAwayInterval: stored.state.lookAwayInterval ?? 20,
        canvasBg: (() => {
          const cb = stored.state.canvasBg ?? {
            type: "solid",
            orbId: "accent",
            url: null,
          };
          return cb.type === "orb" && cb.orbId && cb.orbId !== "accent"
            ? { ...cb, orbId: "accent" }
            : cb;
        })(),
        cardStyle: stored.state.cardStyle ?? "glass",
        modePrefs: stored.state.modePrefs ?? {
          light: { cardStyle: stored.state.cardStyle ?? "glass" },
          dark: { cardStyle: stored.state.cardStyle ?? "glass" },
        },
        notificationsEnabled: stored.state.notificationsEnabled ?? true,
        notificationTypes:
          stored.state.notificationTypes ?? DEFAULT_NOTIFICATION_TYPES,
        quickTourSeenVersion: stored.state.quickTourSeenVersion ?? null,
      };
  } catch {
    /* ignore */
  }
  // Legacy single-key fallback
  const _prefersDark =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false);
  return {
    language: localStorage.getItem(STORAGE_KEYS._LEGACY.LANGUAGE) || "en",
    accent: localStorage.getItem(STORAGE_KEYS._LEGACY.ACCENT) || "Matte Black",
    mode:
      localStorage.getItem(STORAGE_KEYS._LEGACY.MODE) ||
      (_prefersDark ? "dark" : "light"),
    defaultView:
      localStorage.getItem(STORAGE_KEYS._LEGACY.DEFAULT_VIEW) || "canvas",
    dateFormat:
      localStorage.getItem(STORAGE_KEYS._LEGACY.DATE_FORMAT) || "gregorian",
    lookAwayEnabled: false,
    lookAwayInterval: 20,
    canvasBg: { type: "solid", orbId: "accent", url: null },
    cardStyle: "glass",
    modePrefs: {
      light: { cardStyle: "flat" },
      dark: { cardStyle: "glass" },
    },
    notificationsEnabled: true,
    notificationTypes: DEFAULT_NOTIFICATION_TYPES,
    quickTourSeenVersion: null,
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

      clockFormat: "24h",
      focusSearchBar: true,
      focusTasks: true,
      focusSearchTopSites: true,
      focusSearchWeb: true,

      focusPanels: {
        pomodoro: true,
        event: true,
        occasion: true,
        stock: true,
        spotify: true,
      },

      // ── Helpers ────────────────────────────────────────────────────────

      // ── Actions ────────────────────────────────────────────────────────

      /**
       * Call once the user finishes or dismisses the quick tour.
       * Pass the current app version string, e.g. '3.0.0'.
       */
      markQuickTourSeen: (version) => set({ quickTourSeenVersion: version }),

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

      /** Widget surface style — 'flat' | 'glass' */
      setCardStyle: (cardStyle) => {
        const key = resolvedModeKey(get().mode);
        const modePrefs = {
          ...get().modePrefs,
          [key]: { ...get().modePrefs?.[key], cardStyle },
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
          applyTheme(
            state.accent || "Matte Black",
            state.mode || "light",
            state.cardStyle || "glass",
          );
        }
      },
    },
  ),
);
