/**
 * KV-backed "web app tries" counter.
 *
 * Shared by /tries (increment + read) and /stats (read). Two things must line
 * up for the counter to actually count:
 *
 *   1. A KV namespace binding named `TRIES` on the api.undistracted.me Pages
 *      project (Cloudflare dashboard → Pages → undistracted-me-api → Settings
 *      → Functions → KV namespace bindings). That's what makes `env.TRIES`
 *      resolve to the namespace.
 *   2. The key inside that namespace (below, `APP_VISTS`) — already created.
 *
 * Until the binding is added, every read resolves to 0 and every increment is
 * a no-op, so nothing throws and the tally simply shows "0".
 */

export const TRIES_KEY = 'APP_VISTS';

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
