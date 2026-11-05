import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeReq, makeContext, ORIGINS } from './helpers.js';
import { onRequest } from '../../../functions/api/auth/google/token.js';

const KEY = 'test-api-key-xyz';
const CLIENT_ID = 'client-id-123.apps.googleusercontent.com';
const CLIENT_SECRET = 'GOCSPX-secret';

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

  const env = () => ({ API_KEY: KEY, GOOGLE_CLIENT_ID: CLIENT_ID, GOOGLE_CLIENT_SECRET: CLIENT_SECRET });
  const call = (req, e = env()) => onRequest(makeContext(req, e));

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockGoogleOk());
  });

  afterEach(() => { vi.restoreAllMocks(); });

  // ── Origin gate ───────────────────────────────────────────────────────────

  it('OPTIONS preflight returns 204', async () => {
    const res = await call(makeReq({ method: 'OPTIONS', origin: allowedOrigin }));
    expect(res.status).toBe(204);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects unknown origin with 403', async () => {
    const res = await call(makeReq({ method: 'POST', origin: ORIGINS.bad, headers: validHeaders, body: {} }));
    expect(res.status).toBe(403);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // ── API key gate ──────────────────────────────────────────────────────────

  it('rejects missing API key with 401', async () => {
    const res = await call(makeReq({ method: 'POST', origin: allowedOrigin, body: {} }));
    expect(res.status).toBe(401);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects wrong API key with 401', async () => {
    const res = await call(makeReq({ method: 'POST', origin: allowedOrigin, headers: { 'x-api-key': 'bad' }, body: {} }));
    expect(res.status).toBe(401);
  });

  // ── Method enforcement ────────────────────────────────────────────────────

  it('rejects GET with 405', async () => {
    const res = await call(makeReq({ method: 'GET', origin: allowedOrigin, headers: validHeaders }));
    expect(res.status).toBe(405);
  });

  // ── Missing server credentials ────────────────────────────────────────────

  it('returns 503 when GOOGLE_CLIENT_ID is not configured', async () => {
    const res = await call(
      makeReq({ method: 'POST', origin: allowedOrigin, headers: validHeaders, body: { grant_type: 'authorization_code' } }),
      { API_KEY: KEY, GOOGLE_CLIENT_SECRET: CLIENT_SECRET },
    );
    expect(res.status).toBe(503);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // ── authorization_code grant ──────────────────────────────────────────────

  it('exchanges authorization_code successfully', async () => {
    const res = await call(makeReq({
      method: 'POST',
      origin: allowedOrigin,
      headers: validHeaders,
      body: { grant_type: 'authorization_code', code: 'auth-code', code_verifier: 'verifier', redirect_uri: 'https://app.undistracted.me/callbacks/auth.html' },
    }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ access_token: 'ya29.access', refresh_token: 'refresh-tok', expires_in: 3600 });
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it('returns 400 when code is missing from authorization_code grant', async () => {
    const res = await call(makeReq({
      method: 'POST',
      origin: allowedOrigin,
      headers: validHeaders,
      body: { grant_type: 'authorization_code', code_verifier: 'v', redirect_uri: 'https://example.com/cb' },
    }));
    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns 400 when code_verifier is missing', async () => {
    const res = await call(makeReq({
      method: 'POST',
      origin: allowedOrigin,
      headers: validHeaders,
      body: { grant_type: 'authorization_code', code: 'c', redirect_uri: 'https://example.com/cb' },
    }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when redirect_uri is missing', async () => {
    const res = await call(makeReq({
      method: 'POST',
      origin: allowedOrigin,
      headers: validHeaders,
      body: { grant_type: 'authorization_code', code: 'c', code_verifier: 'v' },
    }));
    expect(res.status).toBe(400);
  });

  // ── refresh_token grant ───────────────────────────────────────────────────

  it('refreshes token successfully', async () => {
    fetchSpy.mockResolvedValueOnce(mockGoogleOk({ refresh_token: undefined }));
    const res = await call(makeReq({
      method: 'POST',
      origin: allowedOrigin,
      headers: validHeaders,
      body: { grant_type: 'refresh_token', refresh_token: 'old-refresh' },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.access_token).toBe('ya29.access');
    expect(body.refresh_token).toBeNull(); // no new refresh token returned
  });

  it('returns 400 when refresh_token is missing from refresh grant', async () => {
    const res = await call(makeReq({
      method: 'POST',
      origin: allowedOrigin,
      headers: validHeaders,
      body: { grant_type: 'refresh_token' },
    }));
    expect(res.status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // ── Upstream error handling ───────────────────────────────────────────────

  it('forwards Google error status and message', async () => {
    fetchSpy.mockResolvedValueOnce(mockGoogleFail(400, 'invalid_grant'));
    const res = await call(makeReq({
      method: 'POST',
      origin: allowedOrigin,
      headers: validHeaders,
      body: { grant_type: 'refresh_token', refresh_token: 'expired-token' },
    }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('expired');
  });

  it('does not leak client_secret to the response', async () => {
    const res = await call(makeReq({
      method: 'POST',
      origin: allowedOrigin,
      headers: validHeaders,
      body: { grant_type: 'authorization_code', code: 'c', code_verifier: 'v', redirect_uri: 'https://app.undistracted.me/callbacks/auth.html' },
    }));
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain(CLIENT_SECRET);
    // Also verify it was sent to Google upstream (not returned to client)
    const upstreamBody = fetchSpy.mock.calls[0][1].body.toString();
    expect(upstreamBody).toContain(`client_secret=${CLIENT_SECRET}`);
  });
});
