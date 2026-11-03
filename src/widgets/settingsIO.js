import { useSettingsStore } from "../store/useSettingsStore";
import { applyFirstRunDefaultsToStorage } from "../utilities/applyFirstRunDefaults";

/** Check whether a localStorage key belongs to the app. */
const APP_KEY_PREFIXES = [
  "undistracted_",
  "widget_",
  "countdown_",
  "fm_",
  "gcal_",
  "spotify_",
  "pomodoro_",
  "location_state",
  "auto_theme_coords",
  // Legacy keys
  "language",
  "app_accent",
  "app_mode",
  "defaultView",
  "focusDateFormat",
  "widget_enabled_ids",
];

const isAppKey = (key) => APP_KEY_PREFIXES.some((p) => key.startsWith(p));

/**
 * Keys that must NEVER be exported or imported via the settings backup.
 *
 * These are either secrets, regenerable caches, transient runtime state, or —
 * now that notes sync through their own per-note private gists — note content
 * and its sync metadata. Keeping them out of the backup also means importing a
 * backup never clobbers the user's auth state or their separately-synced notes.
 */
const EXPORT_EXCLUDED = new Set([
  // ── Notes (synced via per-note gists, not part of the config backup) ──
  "widgetSettings_notes",
  "notes_index",
  "notes_deleted",

  // ── Sync auth + metadata (device-local, rebuilt on reconnect/sync) ──
  "github_gist_id",
  "github_gist_profile",
  "github_connected",
  "sync_timestamps",
  "sync_merge_meta",
  "sync_fingerprint",
  "sync_version",
  "sync_enabled",
  "sync_device_id",

  // ── Google Calendar / Contacts tokens + caches ──
  "gcal_access_token",
  "gcal_events_cache",
  "gcal_profile_cache",
  "gcal_disconnected",
  "gcal_synced_at",
  "contacts_birthdays_cache",
  "contacts_birthdays_synced_at",
  "contacts_disconnected",

  // ── Spotify tokens + profile cache + connection flag ──
  "spotify_tokens",
  "spotify_profile",
  "spotify_connected",

  // ── Focus Mode caches + transient runtime state ──
  "fm_unsplash_cache",
  "fm_selected_photo_id",
  "fm_current_photo_id",
  "fm_pomodoro",
  "weather_cache_v1",
  "dailys_joke_cache",
  "holidays_cache",
  "holidays_fetched_at",
]);

/** Prefixes excluded from the backup (per-instance timers, feed caches, …). */
const EXPORT_EXCLUDED_PREFIXES = [
  "pomodoro_timer_state_",
  "rss_cache_",
  "expense_migrated_",
];

/** App-owned key that is safe to back up and restore. */
const isPortableKey = (key) =>
  isAppKey(key) &&
  !EXPORT_EXCLUDED.has(key) &&
  !EXPORT_EXCLUDED_PREFIXES.some((p) => key.startsWith(p));

/**
 * Strip the notes widget's content from a `widget_instances` snapshot before
 * export. Notes live in per-note gists, so the config backup must not carry the
 * note text — but the widget slot itself (its position/type) is preserved.
 */
const stripNotesFromInstances = (value) => {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value;
  const state = value.state && typeof value.state === "object" ? value.state : null;
  if (!state || !state.widgetSettings || typeof state.widgetSettings !== "object") {
    return value;
  }
  const { notes, ...restWidgetSettings } = state.widgetSettings;
  return {
    ...value,
    state: { ...state, widgetSettings: restWidgetSettings },
  };
};

/** Collect only portable app-owned entries into a plain object. */
const collectAppEntries = () => {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!isPortableKey(key)) continue;
    const raw = localStorage.getItem(key);
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }
    data[key] = key === "widget_instances" ? stripNotesFromInstances(parsed) : parsed;
  }
  return data;
};

/** Download a .json file containing all portable settings and data. */
export const exportSettings = () => {
  const payload = {
    undistracted_me: collectAppEntries(),
    exported_at: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `undistracted-me-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/** Parse a JSON string and restore all settings, then reload. */
export const importSettings = (jsonString) => {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error("File is not valid JSON.");
  }
  const data = parsed?.undistracted_me ?? parsed;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Invalid settings file — expected a JSON object.");
  }
  // Clear only portable keys before restoring — leave auth tokens, sync
  // metadata, and separately-synced notes untouched so an import can't wipe them.
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (isPortableKey(key)) keysToRemove.push(key);
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
  for (const [key, val] of Object.entries(data)) {
    if (!isPortableKey(key)) continue; // ignore excluded keys in an old file
    localStorage.setItem(
      key,
      typeof val === "string" ? val : JSON.stringify(val),
    );
  }
  window.location.reload();
};

/** Open a file-picker for the user to choose a .json file, then import it. */
export const importFromFile = (onError) => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      importSettings(text);
    } catch (err) {
      onError?.(err.message || "Import failed.");
    }
  };
  input.click();
};

/** Clear every localStorage key and reload.
 *  Preserves quickTourSeenVersion so the onboarding tour is not shown again.
 *  Re-applies first-run widget defaults so the dashboard starts populated. */
export const resetSettings = () => {
  // Preserve tour seen status — user has already completed onboarding.
  const tourVersion = useSettingsStore.getState().quickTourSeenVersion;

  // Only clear app-owned keys — never touch browser or third-party localStorage entries.
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (isAppKey(key)) keysToRemove.push(key);
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
  if (tourVersion) {
    localStorage.setItem(
      "undistracted_settings",
      JSON.stringify({
        state: { quickTourSeenVersion: tourVersion },
        version: 0,
      }),
    );
  }
  // Re-populate widget data with first-run defaults.
  applyFirstRunDefaultsToStorage();
  globalThis.location.reload();
};
