import { describe, it, expect } from 'vitest';
import { assertOrigin, assertStrictOrigin, corsHeaders, PRIVATE_HOST_RE, ALLOWED_ORIGINS } from '../../../functions/_config.js';
import { makeReq, ORIGINS } from './helpers.js';

describe('ALLOWED_ORIGINS regex', () => {
  it.each([
    ['production site', ORIGINS.production, true],
    ['chrome extension', ORIGINS.chrome, true],
    ['firefox extension', ORIGINS.firefox, true],
    ['localhost dev', ORIGINS.localhost, true],
    ['localhost no port', 'http://localhost', true],
    ['unknown domain', ORIGINS.bad, false],
    ['empty origin (same-origin)', ORIGINS.none, false],
    ['subdomain of production', 'https://sub.undistracted.me', false],
  ])('%s → %s', (_, origin, expected) => {
    expect(ALLOWED_ORIGINS.test(origin)).toBe(expected);
  });
});

describe('assertOrigin', () => {
  it('allows a valid origin (returns null)', () => {
    const req = makeReq({ origin: ORIGINS.production });
    expect(assertOrigin(req)).toBeNull();
  });

  it('rejects an unknown origin with a 403 Response', async () => {
    const req = makeReq({ origin: ORIGINS.bad });
    const res = assertOrigin(req);
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({ error: 'Forbidden' });
  });

  it('allows same-origin request (empty origin header)', () => {
    const req = makeReq({ origin: '' });
    expect(assertOrigin(req)).toBeNull();
  });
});

describe('assertStrictOrigin', () => {
  it('allows a valid origin (returns null)', () => {
    expect(assertStrictOrigin(makeReq({ origin: ORIGINS.production }))).toBeNull();
  });

  it('rejects an Origin-less request with 403 (blocks curl that omits Origin)', () => {
    const res = assertStrictOrigin(makeReq({ origin: '' }));
    expect(res.status).toBe(403);
  });

  it('rejects an unknown origin with 403', () => {
    expect(assertStrictOrigin(makeReq({ origin: ORIGINS.bad })).status).toBe(403);
  });
});

describe('corsHeaders', () => {
  it('returns CORS headers for an allowed origin', () => {
    const req = makeReq({ origin: ORIGINS.production });
    expect(corsHeaders(req)['Access-Control-Allow-Origin']).toBe(ORIGINS.production);
    expect(corsHeaders(req)['Vary']).toBe('Origin');
  });

  it('returns an empty object when no Origin header is present', () => {
    const req = makeReq({});
    expect(corsHeaders(req)).toEqual({});
  });

  it('honors a custom methods argument', () => {
    const req = makeReq({ origin: ORIGINS.chrome });
    expect(corsHeaders(req, 'POST, OPTIONS')['Access-Control-Allow-Methods']).toBe('POST, OPTIONS');
  });
});

describe('PRIVATE_HOST_RE', () => {
  it.each([
    ['localhost', true],
    ['127.0.0.1', true],
    ['192.168.1.1', true],
    ['10.0.0.1', true],
    ['::1', true],
    ['my.local', true],
    ['service.internal', true],
    ['example.com', false],
    ['google.com', false],
    ['github.com', false],
    ['youtube.com', false],
  ])('%s → private=%s', (host, expected) => {
    expect(PRIVATE_HOST_RE.test(host)).toBe(expected);
  });
});
