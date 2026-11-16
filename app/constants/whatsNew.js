/**
 * What's New — versioned changelog for the in-app update note.
 *
 * Newest entry first. The note shows once per `LATEST_VERSION` (gated by
 * `useSettingsStore.whatsNewSeenVersion`).
 */
import { APP_VERSION } from "./version";

export const CHANGELOG = [
  {
    version: APP_VERSION,
    notes: [
      "A new first-run welcome — pick your theme and your first three widgets.",
      "An About panel, plus a review prompt after 10 focus sessions.",
    ],
  },
];

export const LATEST_VERSION = CHANGELOG[0].version;
