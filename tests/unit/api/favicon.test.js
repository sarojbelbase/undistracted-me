import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeReq, ORIGINS } from './helpers.js';
import { onRequest } from '../../../functions/api/favicon.js';

const allowedOrigin = ORIGINS.production;

/** Build a mock upstream fetch response */
const mockUpstream = (ok = true, contentType = 'image/png') => ({
  ok,
  arrayBuffer: async () => new ArrayBuffer(8),
  headers: { get: (k) => (k === 'content-type' ? contentType : null) },
});

describe('GET /api/favicon', () => {
  let fetchSpy;

  const call = (req) => onRequest({ request: req });

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockUpstream());
  });

  afterEach(() => { vi.restoreAllMocks(); });

  // ── Origin gate ──────────────────────────────────────────────────────────

  it('OPTIONS preflight returns 204 for valid origin', async () => {
    const res = await call(makeReq({ method: 'OPTIONS', origin: allowedOrigin }));
    expect(res.status).toBe(204);
  });

  it('rejects unknown origin with 403', async () => {
    const res = await call(makeReq({ method: 'GET', origin: ORIGINS.bad, query: { domain: 'example.com' } }));
    expect(res.status).toBe(403);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('allows same-origin request (empty origin header)', async () => {
    const res = await call(makeReq({ method: 'GET', origin: '', query: { domain: 'example.com' } }));
    expect(res.status).toBe(200);
  });

  // ── Method enforcement ────────────────────────────────────────────────────

  it('rejects POST with 405', async () => {
    const res = await call(makeReq({ method: 'POST', origin: allowedOrigin }));
    expect(res.status).toBe(405);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // ── Input validation ──────────────────────────────────────────────────────

  it('rejects missing domain with 400', async () => {
    const res = await call(makeReq({ method: 'GET', origin: allowedOrigin, query: {} }));
    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects malformed domain with 400', async () => {
    const res = await call(makeReq({ method: 'GET', origin: allowedOrigin, query: { domain: '<script>alert(1)</script>' } }));
    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects private hostname (localhost) with 204 — no upstream call', async () => {
    const res = await call(makeReq({ method: 'GET', origin: allowedOrigin, query: { domain: 'localhost' } }));
    expect(res.status).toBe(204);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each(['127.0.0.1', '192.168.1.1', '10.0.0.1'])(
    'rejects private IP %s with 204', async (domain) => {
      const res = await call(makeReq({ method: 'GET', origin: allowedOrigin, query: { domain } }));
      expect(res.status).toBe(204);
      expect(fetchSpy).not.toHaveBeenCalled();
    }
  );

  // ── Happy path ─────────────────────────────────────────────────────────────

  it('returns 200 with image buffer on success', async () => {
    const res = await call(makeReq({ method: 'GET', origin: allowedOrigin, query: { domain: 'github.com' } }));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('cache-control')).toMatch(/s-maxage/);
  });

  it('uses default size 64 when sz is out of allowlist', async () => {
    const res = await call(makeReq({ method: 'GET', origin: allowedOrigin, query: { domain: 'github.com', sz: '999' } }));
    expect(res.status).toBe(200);
    // First upstream called with sz=64
    expect(fetchSpy.mock.calls[0][0]).toContain('sz=64');
  });

  it('accepts valid sz values', async () => {
    for (const sz of ['16', '32', '48', '64', '96', '128']) {
      fetchSpy.mockResolvedValueOnce(mockUpstream());
      const res = await call(makeReq({ method: 'GET', origin: allowedOrigin, query: { domain: 'github.com', sz } }));
      expect(res.status).toBe(200);
    }
  });

  // ── Waterfall fallback ────────────────────────────────────────────────────

  it('falls through to next service when first returns non-ok', async () => {
    fetchSpy
      .mockResolvedValueOnce(mockUpstream(false))  // Google fails
      .mockResolvedValueOnce(mockUpstream(true));  // DDG succeeds
    const res = await call(makeReq({ method: 'GET', origin: allowedOrigin, query: { domain: 'example.com' } }));
    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('returns 204 when all services fail', async () => {
    fetchSpy.mockResolvedValue(mockUpstream(false));
    const res = await call(makeReq({ method: 'GET', origin: allowedOrigin, query: { domain: 'example.com' } }));
    expect(res.status).toBe(204);
    expect(fetchSpy).toHaveBeenCalledTimes(3); // all 3 tried
  });

  it('returns 204 when all services throw (network error)', async () => {
    fetchSpy.mockRejectedValue(new Error('network error'));
    const res = await call(makeReq({ method: 'GET', origin: allowedOrigin, query: { domain: 'example.com' } }));
    expect(res.status).toBe(204);
  });

  // ── Extension origins ─────────────────────────────────────────────────────

  it.each(['chrome', 'firefox'])('allows %s extension origin', async (type) => {
    const res = await call(makeReq({ method: 'GET', origin: ORIGINS[type], query: { domain: 'github.com' } }));
    expect(res.status).toBe(200);
  });
});
