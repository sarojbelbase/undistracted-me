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
  "rss_cache_",
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

/** Collect only app-owned localStorage entries into a plain object. */
const collectAppEntries = () => {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!isAppKey(key)) continue;
    const raw = localStorage.getItem(key);
    try {
      data[key] = JSON.parse(raw);
    } catch {
      data[key] = raw;
    }
  }
  return data;
};

/** Download a .json file containing all widget settings and layout. */
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
  // Only clear app-owned keys before restoring from the import file
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (isAppKey(key)) keysToRemove.push(key);
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
  for (const [key, val] of Object.entries(data)) {
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
