/**
 * Best-effort, fixed-window rate limiter backed by the `TRIES` KV namespace.
 *
 * Why KV and not a real atomic counter: Cloudflare KV has no atomic increment,
 * so a fixed-window counter with read-modify-write is approximate under bursts
 * (two concurrent requests may both pass). That is acceptable for abuse
 * prevention — the goal is to stop a single client from hammering the endpoint
 * hundreds of times a minute, not to be a precise quota system. For hard limits
 * use Cloudflare's WAF rate-limiting rules (paid) or a Durable Object.
 *
 * Keyed on `CF-Connecting-IP` (Cloudflare injects the real client IP) + the
 * request pathname, so each endpoint has its own bucket per IP.
 *
 * Fails open (returns null) when the KV binding is absent or errors, so the
 * limiter can never break legitimate traffic.
 */

import { corsHeaders } from './_config.js';

const DEFAULT_LIMIT = 120;
const WINDOW_MS = 60_000; // 1 minute

export async function rateLimit(env, request, { limit = DEFAULT_LIMIT, windowMs = WINDOW_MS } = {}) {
  if (!env?.TRIES) return null; // no KV binding → skip (local dev, unconfigured)

  const ip = (request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '')
    .split(',')[0]
    .trim();
  if (!ip) return null; // can't identify the client → don't throttle

  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const path = new URL(request.url).pathname;
  const key = `rl:${ip}:${path}`;

  try {
    const raw = await env.TRIES.get(key);
    let count = 0;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.start === windowStart) count = parsed.count;
      } catch { /* malformed value → treat as empty */ }
    }

    if (count >= limit) {
      return new Response(JSON.stringify({ error: 'Too Many Requests' }), {
        status: 429,
        headers: {
          ...corsHeaders(request),
          'Content-Type': 'application/json; charset=utf-8',
          'Retry-After': String(Math.ceil(windowMs / 1000)),
        },
      });
    }

    await env.TRIES.put(key, JSON.stringify({ start: windowStart, count: count + 1 }), {
      expirationTtl: Math.max(60, Math.ceil(windowMs / 1000)),
    });
    return null;
  } catch {
    return null; // KV read/write failed → fail open
  }
}
