import { describe, it, expect } from 'vitest';
import { makeReq, makeContext, ORIGINS } from './helpers.js';
import { onRequest } from '../../../functions/photos/curated.js';

const KEY = 'test-api-key-xyz';
const allowedOrigin = ORIGINS.production;

const call = (req, env = { API_KEY: KEY }) => onRequest(makeContext(req, env));

describe('GET /api/photos/curated', () => {
  // ── Origin gate ───────────────────────────────────────────────────────────

  it('OPTIONS preflight returns 204', async () => {
    const res = await call(makeReq({ method: 'OPTIONS', origin: allowedOrigin }));
    expect(res.status).toBe(204);
  });

  it('rejects unknown origin with 403', async () => {
    const res = await call(makeReq({ method: 'GET', origin: ORIGINS.bad, headers: { 'x-api-key': KEY } }));
    expect(res.status).toBe(403);
  });

  // ── API key gate ──────────────────────────────────────────────────────────

  it('rejects missing API key with 401', async () => {
    const res = await call(makeReq({ method: 'GET', origin: allowedOrigin }));
    expect(res.status).toBe(401);
  });

  it('rejects wrong API key with 401', async () => {
    const res = await call(makeReq({ method: 'GET', origin: allowedOrigin, headers: { 'x-api-key': 'wrong' } }));
    expect(res.status).toBe(401);
  });

  // ── Method enforcement ────────────────────────────────────────────────────

  it('rejects POST with 405', async () => {
    const res = await call(makeReq({ method: 'POST', origin: allowedOrigin, headers: { 'x-api-key': KEY } }));
    expect(res.status).toBe(405);
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('returns 200 with the static media manifest mapped to photo objects', async () => {
    const res = await call(makeReq({ method: 'GET', origin: allowedOrigin, headers: { 'x-api-key': KEY } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  it('maps each background to the expected shape', async () => {
    const res = await call(makeReq({ method: 'GET', origin: allowedOrigin, headers: { 'x-api-key': KEY } }));
    const body = await res.json();
    const first = body[0];
    expect(first.id).toBe('1');
    expect(first.url).toBe('https://media.undistracted.me/backgrounds/1.jpg');
    expect(first.regular).toBe(first.url);
    expect(first.small).toBe('https://media.undistracted.me/backgrounds/thumbs/1.webp');
    expect(first.thumb).toBe('https://media.undistracted.me/backgrounds/thumbs/1.webp');
    expect(first.color).toBe('#18191b');
  });

  it('sets client cache headers', async () => {
    const res = await call(makeReq({ method: 'GET', origin: allowedOrigin, headers: { 'x-api-key': KEY } }));
    expect(res.headers.get('cache-control')).toBe('private, max-age=3600');
  });

  // ── Dev mode (no key configured) ─────────────────────────────────────────

  it('allows request without key when API_KEY is not set (dev mode)', async () => {
    const res = await call(makeReq({ method: 'GET', origin: allowedOrigin }), {});
    expect(res.status).toBe(200);
  });

  // ── Extension origins ─────────────────────────────────────────────────────

  it.each(['chrome', 'firefox'])('allows %s extension origin with valid key', async (type) => {
    const res = await call(makeReq({ method: 'GET', origin: ORIGINS[type], headers: { 'x-api-key': KEY } }));
    expect(res.status).toBe(200);
  });
});
