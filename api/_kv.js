/**
 * KV-backed "web app visits" counter.
 *
 * Shared by /visits (increment + read) and /stats (read). Two things must line
 * up for the counter to actually count:
 *
 *   1. A KV namespace binding named `TRIES` on the api.undistracted.me Pages
 *      project (Cloudflare dashboard → Pages → undistracted-me-api → Settings
 *      → Functions → KV namespace bindings). That's what makes `env.TRIES`
 *      resolve to the namespace. The binding is also used by `_ratelimit.js`
 *      as a shared KV bucket, so its name is historical.
 *   2. The key inside that namespace (below, `APP_VISITS`) — already created.
 *
 * Until the binding is added, every read resolves to 0 and every increment is
 * a no-op, so nothing throws and the tally simply shows "0".
 */

export const VISITS_KEY = 'APP_VISITS';

/** Read the current count (0 when the KV binding is absent or unreadable). */
export async function getVisits(env) {
  if (!env || !env.TRIES) return 0;
  try {
    const raw = await env.TRIES.get(VISITS_KEY);
    const n = parseInt(raw || '0', 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/** Increment and return the new count (no-op when the binding is absent). */
export async function incrementVisits(env) {
  if (!env || !env.TRIES) return 0;
  try {
    const next = (await getVisits(env)) + 1;
    await env.TRIES.put(VISITS_KEY, String(next));
    return next;
  } catch {
    return 0;
  }
}
