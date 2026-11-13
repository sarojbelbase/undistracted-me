/**
 * LookAway / website-blocker messages — client fetcher.
 *
 * The full message catalog is served from the API (functions/lookaway/messages)
 * so it is no longer bundled into the extension. A small offline fallback keeps
 * the LookAway overlay and blocked page working on first run / when the network
 * is unavailable.
 */

import { API_BASE_URL } from '../constants/env';

const API_URL = `${API_BASE_URL}/lookaway/messages`;

/** Minimal offline subset — only used when the API cannot be reached. */
export const FALLBACK_MESSAGES = [
  { title: "The urge will pass", subtitle: "Every craving has a lifespan. You are watching one die right now. Stay with it." },
  { title: "You already decided", subtitle: "Past you made this choice for a reason. Trust that version of yourself." },
  { title: "The itch is temporary", subtitle: "Scratching it makes it worse. Let it be. Watch it fade." },
  { title: "One decision at a time", subtitle: "You do not have to be disciplined forever. Just for this block." },
  { title: "Boredom is a doorway", subtitle: "The best ideas come from the empty space you are trying to fill." },
  { title: "Where are your shoulders?", subtitle: "Let them drop. They have been holding tension you forgot about." },
  { title: "You are almost there", subtitle: "The hardest part is behind you. What remains is downhill. Breathe." },
  { title: "Finish strong", subtitle: "Not for anyone else. For yourself. Completion is a skill." },
];

let cache = null;

/**
 * Fetch the full message catalog (cached for the session). Resolves to an array
 * of `{ title, subtitle }` — never rejects, falling back to FALLBACK_MESSAGES.
 */
export function loadLookawayMessages() {
  if (!cache) {
    cache = fetch(API_URL, { signal: AbortSignal.timeout(8000) })
      .then((res) => (res.ok ? res.json() : null))
      .then((msgs) =>
        Array.isArray(msgs) && msgs.length > 0 ? msgs : FALLBACK_MESSAGES,
      )
      .catch(() => FALLBACK_MESSAGES);
  }
  return cache;
}
