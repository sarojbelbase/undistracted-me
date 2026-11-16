/**
 * What's New — versioned changelog for the in-app update note.
 *
 * Derived from the single source of truth at `changelog/index.js` (the same
 * data that powers /changelogs and the GitHub releases). The note shows the
 * latest entry's `summary` once per version, gated by
 * `useSettingsStore.whatsNewSeenVersion`.
 */
import { latest } from "../../changelog/index.js";

/** App version string (no leading "v"), matching `constants/version.js`. */
const version = latest.version.replace(/^v/, "");

export const CHANGELOG = [
  {
    version,
    notes: latest.summary ?? latest.highlights.flatMap((h) => h.items),
  },
];

export const LATEST_VERSION = version;
