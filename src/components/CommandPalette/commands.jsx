/**
 * COMMANDS — the app actions surfaced in the CommandPalette.
 *
 * Each command:
 *   id          string              — stable identifier
 *   label       string              — static label (used for filtering + fallback display)
 *   getLabel    () => string        — optional dynamic display label (e.g. next theme mode)
 *   description string              — short helper text shown next to the label
 *   keywords    string[]            — extra terms matched by filterCommands
 *   icon        React component     — react-bootstrap-icons icon
 *   run         () => void          — executes the action
 *
 * Commands are dispatched through the existing intent pattern in `useUIStore`
 * (App.jsx holds the actual UI state in React hooks and reacts via useEffect),
 * except theme + tour which write straight to `useSettingsStore`.
 */

import {
  GearFill,
  PlusSquare,
  Grid3x3GapFill,
  Fullscreen,
  MoonFill,
  PlayFill,
} from "react-bootstrap-icons";
import { useUIStore } from "../../store/useUIStore";
import { useSettingsStore } from "../../store/useSettingsStore";

const THEME_ORDER = ["light", "dark", "auto"];

const nextMode = () => {
  const mode = useSettingsStore.getState().mode;
  const idx = THEME_ORDER.indexOf(mode);
  return THEME_ORDER[(idx + 1) % THEME_ORDER.length];
};

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const COMMANDS = [
  {
    id: "settings",
    label: "Open Settings",
    description: "App preferences",
    keywords: ["settings", "preferences", "options", "config", "general"],
    icon: GearFill,
    run: () => useUIStore.getState().openSettingsDialog("general"),
  },
  {
    id: "add-widget",
    label: "Add Widget",
    description: "Open the widget catalog",
    keywords: ["add", "widget", "catalog", "new", "widgets"],
    icon: PlusSquare,
    run: () => useUIStore.getState().requestOpenCatalog(),
  },
  {
    id: "arrange",
    label: "Arrange Widgets",
    description: "Toggle arrange mode",
    keywords: ["arrange", "reorder", "move", "layout", "drag", "widgets"],
    icon: Grid3x3GapFill,
    run: () => useUIStore.getState().requestArrangeToggle(),
  },
  {
    id: "focus-mode",
    label: "Focus Mode",
    description: "Switch to distraction-free view",
    keywords: ["focus", "focus mode", "fullscreen", "distraction", "zen"],
    icon: Fullscreen,
    run: () => useUIStore.getState().requestFocusMode(),
  },
  {
    id: "theme",
    label: "Toggle Theme",
    getLabel: () => `Theme: ${cap(nextMode())}`,
    description: "Cycle light, dark, auto",
    keywords: ["theme", "toggle theme", "light", "dark", "auto", "appearance", "mode"],
    icon: MoonFill,
    run: () => useSettingsStore.getState().setMode(nextMode()),
  },
  {
    id: "replay-tour",
    label: "Replay Welcome Tour",
    description: "Show the onboarding tour again",
    keywords: ["replay", "tour", "welcome", "onboarding", "intro", "help"],
    icon: PlayFill,
    run: () => useSettingsStore.getState().resetQuickTourSeen(),
  },
];

/** Case-insensitive match against label + description + keywords. Empty → all. */
export function filterCommands(query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return COMMANDS;
  return COMMANDS.filter((c) => {
    const haystack = [c.label, c.description, ...(c.keywords || [])]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}
