import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeReq, makeRes, ORIGINS } from './helpers.js';

const KEY = 'test-api-key-xyz';

vi.mock('../../../public/manifest.json', () => ({
  default: { homepage_url: 'https://undistractedme.sarojbelbase.com.np' },
  homepage_url: 'https://undistractedme.sarojbelbase.com.np',
}));

const { default: handler } = await import('../../../api/auth/google/token.js');

const allowedOrigin = ORIGINS.production;
const validHeaders = { 'x-api-key': KEY, 'content-type': 'application/json' };

const mockGoogleOk = (extra = {}) => ({
  ok: true,
  status: 200,
  json: async () => ({
    access_token: 'ya29.access',
    refresh_token: 'refresh-tok',
    expires_in: 3600,
    ...extra,
  }),
});

const mockGoogleFail = (status = 400, error = 'invalid_grant') => ({
  ok: false,
  status,
  json: async () => ({ error, error_description: 'Token has been expired or revoked.' }),
});

describe('POST /api/auth/google/token', () => {
  let fetchSpy;

  beforeEach(() => {
    process.env.API_KEY = KEY;
    process.env.GOOGLE_CLIENT_ID = 'client-id-123.apps.googleusercontent.com';
    process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-secret';
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockGoogleOk());
  });

  afterEach(() => {
    delete process.env.API_KEY;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    vi.restoreAllMocks();
  });

  // ── Origin gate ───────────────────────────────────────────────────────────

  it('OPTIONS preflight returns 204', async () => {
    const req = makeReq({ method: 'OPTIONS', origin: allowedOrigin });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(204);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects unknown origin with 403', async () => {
    const req = makeReq({ method: 'POST', origin: ORIGINS.bad, headers: validHeaders, body: {} });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(403);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // ── API key gate ──────────────────────────────────────────────────────────

  it('rejects missing API key with 401', async () => {
    const req = makeReq({ method: 'POST', origin: allowedOrigin, body: {} });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects wrong API key with 401', async () => {
    const req = makeReq({ method: 'POST', origin: allowedOrigin, headers: { 'x-api-key': 'bad' }, body: {} });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(401);
  });

  // ── Method enforcement ────────────────────────────────────────────────────

  it('rejects GET with 405', async () => {
    const req = makeReq({ method: 'GET', origin: allowedOrigin, headers: validHeaders });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(405);
  });

  // ── Missing server credentials ────────────────────────────────────────────

  it('returns 503 when GOOGLE_CLIENT_ID is not configured', async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    const req = makeReq({ method: 'POST', origin: allowedOrigin, headers: validHeaders, body: { grant_type: 'authorization_code' } });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(503);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // ── authorization_code grant ──────────────────────────────────────────────

  it('exchanges authorization_code successfully', async () => {
    const req = makeReq({
      method: 'POST',
      origin: allowedOrigin,
      headers: validHeaders,
      body: { grant_type: 'authorization_code', code: 'auth-code', code_verifier: 'verifier', redirect_uri: 'https://example.com/callback' },
    });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(res._body).toMatchObject({ access_token: 'ya29.access', refresh_token: 'refresh-tok', expires_in: 3600 });
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it('returns 400 when code is missing from authorization_code grant', async () => {
    const req = makeReq({
      method: 'POST',
      origin: allowedOrigin,
      headers: validHeaders,
      body: { grant_type: 'authorization_code', code_verifier: 'v', redirect_uri: 'https://example.com/cb' },
    });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns 400 when code_verifier is missing', async () => {
    const req = makeReq({
      method: 'POST',
      origin: allowedOrigin,
      headers: validHeaders,
      body: { grant_type: 'authorization_code', code: 'c', redirect_uri: 'https://example.com/cb' },
    });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(400);
  });

  it('returns 400 when redirect_uri is missing', async () => {
    const req = makeReq({
      method: 'POST',
      origin: allowedOrigin,
      headers: validHeaders,
      body: { grant_type: 'authorization_code', code: 'c', code_verifier: 'v' },
    });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(400);
  });

  // ── refresh_token grant ───────────────────────────────────────────────────

  it('refreshes token successfully', async () => {
    fetchSpy.mockResolvedValueOnce(mockGoogleOk({ refresh_token: undefined }));
    const req = makeReq({
      method: 'POST',
      origin: allowedOrigin,
      headers: validHeaders,
      body: { grant_type: 'refresh_token', refresh_token: 'old-refresh' },
    });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(200);
    expect(res._body.access_token).toBe('ya29.access');
    expect(res._body.refresh_token).toBeNull(); // no new refresh token returned
  });

  it('returns 400 when refresh_token is missing from refresh grant', async () => {
    const req = makeReq({
      method: 'POST',
      origin: allowedOrigin,
      headers: validHeaders,
      body: { grant_type: 'refresh_token' },
    });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // ── Upstream error handling ───────────────────────────────────────────────

  it('forwards Google error status and message', async () => {
    fetchSpy.mockResolvedValueOnce(mockGoogleFail(400, 'invalid_grant'));
    const req = makeReq({
      method: 'POST',
      origin: allowedOrigin,
      headers: validHeaders,
      body: { grant_type: 'refresh_token', refresh_token: 'expired-token' },
    });
    const res = makeRes();
    await handler(req, res);
    expect(res._status).toBe(400);
    expect(res._body.error).toContain('expired');
  });

  it('does not leak client_secret to the response', async () => {
    const req = makeReq({
      method: 'POST',
      origin: allowedOrigin,
      headers: validHeaders,
      body: { grant_type: 'authorization_code', code: 'c', code_verifier: 'v', redirect_uri: 'https://example.com/cb' },
    });
    const res = makeRes();
    await handler(req, res);
    expect(JSON.stringify(res._body)).not.toContain('GOCSPX-secret');
    // Also verify it was sent to Google upstream (not returned to client)
    const upstreamBody = fetchSpy.mock.calls[0][1].body.toString();
    expect(upstreamBody).toContain('client_secret=GOCSPX-secret');
  });
});
