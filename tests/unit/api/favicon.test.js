import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeReq, makeRes, ORIGINS } from './helpers.js';

vi.mock('../../../public/manifest.json', () => ({
  default: { homepage_url: 'https://undistractedme.sarojbelbase.com.np' },
  homepage_url: 'https://undistractedme.sarojbelbase.com.np',
}));

// Import handler after mock is set up
const { default: handler } = await import('../../../api/favicon.js');

const allowedOrigin = ORIGINS.production;

/** Build a mock upstream fetch response */
const mockUpstream = (ok = true, contentType = 'image/png') => ({
  ok,
  arrayBuffer: async () => new ArrayBuffer(8),
  headers: { get: (k) => k === 'content-type' ? contentType : null },
});

describe('GET /api/favicon', () => {
  let fetchSpy;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockUpstream());
  });

  afterEach(() => { vi.restoreAllMocks(); });

  // ── Origin gate ──────────────────────────────────────────────────────────

  it('OPTIONS preflight returns 204 for valid origin', async () => {
    const req = makeReq({ method: 'OPTIONS', origin: allowedOrigin });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(204);
  });

  it('rejects unknown origin with 403', async () => {
    const req = makeReq({ method: 'GET', origin: ORIGINS.bad, query: { domain: 'example.com' } });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(403);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects no origin with 403', async () => {
    const req = makeReq({ method: 'GET', origin: '', query: { domain: 'example.com' } });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(403);
  });

  // ── Method enforcement ────────────────────────────────────────────────────

  it('rejects POST with 405', async () => {
    const req = makeReq({ method: 'POST', origin: allowedOrigin });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(405);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // ── Input validation ──────────────────────────────────────────────────────

  it('rejects missing domain with 400', async () => {
    const req = makeReq({ method: 'GET', origin: allowedOrigin, query: {} });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects malformed domain with 400', async () => {
    const req = makeReq({ method: 'GET', origin: allowedOrigin, query: { domain: '<script>alert(1)</script>' } });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects private hostname (localhost) with 204 — no upstream call', async () => {
    const req = makeReq({ method: 'GET', origin: allowedOrigin, query: { domain: 'localhost' } });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(204);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each(['127.0.0.1', '192.168.1.1', '10.0.0.1'])(
    'rejects private IP %s with 204', async (domain) => {
      const req = makeReq({ method: 'GET', origin: allowedOrigin, query: { domain } });
      const res = makeRes();
      await handler(req, res);
      expect(res._status).toBe(204);
      expect(fetchSpy).not.toHaveBeenCalled();
    }
  );

  // ── Happy path ─────────────────────────────────────────────────────────────

  it('returns 200 with image buffer on success', async () => {
    const req = makeReq({ method: 'GET', origin: allowedOrigin, query: { domain: 'github.com' } });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(res._headers['content-type']).toBe('image/png');
    expect(res._headers['cache-control']).toMatch(/s-maxage/);
  });

  it('uses default size 64 when sz is out of allowlist', async () => {
    const req = makeReq({ method: 'GET', origin: allowedOrigin, query: { domain: 'github.com', sz: '999' } });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    // First upstream called with sz=64
    expect(fetchSpy.mock.calls[0][0]).toContain('sz=64');
  });

  it('accepts valid sz values', async () => {
    for (const sz of ['16', '32', '48', '64', '96', '128']) {
      fetchSpy.mockResolvedValueOnce(mockUpstream());
      const req = makeReq({ method: 'GET', origin: allowedOrigin, query: { domain: 'github.com', sz } });
      const res = makeRes();
      await handler(req, res);
      expect(res._status).toBe(200);
    }
  });

  // ── Waterfall fallback ────────────────────────────────────────────────────

  it('falls through to next service when first returns non-ok', async () => {
    fetchSpy
      .mockResolvedValueOnce(mockUpstream(false))  // Google fails
      .mockResolvedValueOnce(mockUpstream(true));  // DDG succeeds
    const req = makeReq({ method: 'GET', origin: allowedOrigin, query: { domain: 'example.com' } });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('returns 204 when all services fail', async () => {
    fetchSpy.mockResolvedValue(mockUpstream(false));
    const req = makeReq({ method: 'GET', origin: allowedOrigin, query: { domain: 'example.com' } });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(204);
    expect(fetchSpy).toHaveBeenCalledTimes(3); // all 3 tried
  });

  it('returns 204 when all services throw (network error)', async () => {
    fetchSpy.mockRejectedValue(new Error('network error'));
    const req = makeReq({ method: 'GET', origin: allowedOrigin, query: { domain: 'example.com' } });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(204);
  });

  // ── Extension origins ─────────────────────────────────────────────────────

  it.each(['chrome', 'firefox'])('allows %s extension origin', async (type) => {
    const req = makeReq({ method: 'GET', origin: ORIGINS[type], query: { domain: 'github.com' } });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(200);
  });
});
