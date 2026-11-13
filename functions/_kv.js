/**
 * KV-backed "web app tries" counter.
 *
 * Shared by /tries (increment + read) and /stats (read). The counter lives in
 * a Cloudflare KV namespace bound as `TRIES` on the api.undistracted.me Pages
 * project. Until that binding is added, every read resolves to 0 and every
 * increment is a no-op, so nothing throws and the tally simply shows "0".
 */

export const TRIES_KEY = 'tries';

/** Read the current count (0 when the KV binding is absent or unreadable). */
export async function getTries(env) {
  if (!env || !env.TRIES) return 0;
  try {
    const raw = await env.TRIES.get(TRIES_KEY);
    const n = parseInt(raw || '0', 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/** Increment and return the new count (no-op when the binding is absent). */
export async function incrementTries(env) {
  if (!env || !env.TRIES) return 0;
  try {
    const next = (await getTries(env)) + 1;
    await env.TRIES.put(TRIES_KEY, String(next));
    return next;
  } catch {
    return 0;
  }
}
