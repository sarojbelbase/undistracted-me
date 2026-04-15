import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeReq, makeRes, ORIGINS } from './helpers.js';

const KEY = 'test-api-key-xyz';

vi.mock('../../../public/manifest.json', () => ({
  default: { homepage_url: 'https://undistractedme.sarojbelbase.com.np' },
  homepage_url: 'https://undistractedme.sarojbelbase.com.np',
}));

vi.mock('@vercel/blob', () => ({
  list: vi.fn(),
}));

const { default: handler } = await import('../../../api/photos/curated.js');
const { list } = await import('@vercel/blob');

const SAMPLE_BLOBS = [
  { pathname: 'backgrounds/mountain-dawn.jpg', url: 'https://blob.vercel.com/mountain-dawn.jpg' },
  { pathname: 'backgrounds/forest-mist.jpg', url: 'https://blob.vercel.com/forest-mist.jpg' },
];

const allowedOrigin = ORIGINS.production;

describe('GET /api/photos/curated', () => {
  beforeEach(() => {
    process.env.API_KEY = KEY;
    list.mockResolvedValue({ blobs: SAMPLE_BLOBS });
  });

  afterEach(() => {
    delete process.env.API_KEY;
    vi.clearAllMocks();
  });

  // ── Origin gate ───────────────────────────────────────────────────────────

  it('OPTIONS preflight returns 204', async () => {
    const req = makeReq({ method: 'OPTIONS', origin: allowedOrigin });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(204);
    expect(list).not.toHaveBeenCalled();
  });

  it('rejects unknown origin with 403', async () => {
    const req = makeReq({ method: 'GET', origin: ORIGINS.bad, headers: { 'x-api-key': KEY } });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(403);
    expect(list).not.toHaveBeenCalled();
  });

  // ── API key gate ──────────────────────────────────────────────────────────

  it('rejects missing API key with 401', async () => {
    const req = makeReq({ method: 'GET', origin: allowedOrigin });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(401);
    expect(list).not.toHaveBeenCalled();
  });

  it('rejects wrong API key with 401', async () => {
    const req = makeReq({ method: 'GET', origin: allowedOrigin, headers: { 'x-api-key': 'wrong' } });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(401);
    expect(list).not.toHaveBeenCalled();
  });

  // ── Method enforcement ────────────────────────────────────────────────────

  it('rejects POST with 405', async () => {
    const req = makeReq({ method: 'POST', origin: allowedOrigin, headers: { 'x-api-key': KEY } });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(405);
  });

  // ── Happy path ────────────────────────────────────────────────────────────

  it('returns 200 with mapped photo array', async () => {
    const req = makeReq({ method: 'GET', origin: allowedOrigin, headers: { 'x-api-key': KEY } });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(Array.isArray(res._body)).toBe(true);
    expect(res._body).toHaveLength(2);
  });

  it('maps blob pathname to correct id and url', async () => {
    const req = makeReq({ method: 'GET', origin: allowedOrigin, headers: { 'x-api-key': KEY } });
    const res = makeRes();
    await handler(req, res);
    const [first] = res._body;
    expect(first.id).toBe('mountain-dawn');
    expect(first.url).toBe('https://blob.vercel.com/mountain-dawn.jpg');
    expect(first.color).toBe('#18191b');
  });

  it('sets CDN cache headers', async () => {
    const req = makeReq({ method: 'GET', origin: allowedOrigin, headers: { 'x-api-key': KEY } });
    const res = makeRes();
    await handler(req, res);
    expect(res._headers['cache-control']).toBe('private, max-age=3600');
  });

  it('returns 200 with empty array when no blobs exist', async () => {
    list.mockResolvedValueOnce({ blobs: [] });
    const req = makeReq({ method: 'GET', origin: allowedOrigin, headers: { 'x-api-key': KEY } });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(res._body).toEqual([]);
  });

  // ── Error handling ────────────────────────────────────────────────────────

  it('returns 502 when blob list throws', async () => {
    list.mockRejectedValueOnce(new Error('Blob store unavailable'));
    const req = makeReq({ method: 'GET', origin: allowedOrigin, headers: { 'x-api-key': KEY } });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(502);
    expect(res._body).toMatchObject({ error: 'Failed to list backgrounds' });
    // Must NOT leak internal error message
    expect(JSON.stringify(res._body)).not.toContain('Blob store unavailable');
  });

  // ── Dev mode (no key configured) ─────────────────────────────────────────

  it('allows request without key when API_KEY is not set (dev mode)', async () => {
    delete process.env.API_KEY;
    const req = makeReq({ method: 'GET', origin: allowedOrigin }); // no x-api-key
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(200);
  });

  // ── Extension origins ─────────────────────────────────────────────────────

  it.each(['chrome', 'firefox'])('allows %s extension origin with valid key', async (type) => {
    const req = makeReq({ method: 'GET', origin: ORIGINS[type], headers: { 'x-api-key': KEY } });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(200);
  });
});
