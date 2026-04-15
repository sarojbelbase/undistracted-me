import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { assertOrigin, assertApiKey, PRIVATE_HOST_RE, ALLOWED_ORIGINS } from '../../../api/_config.js';
import { makeReq, makeRes, ORIGINS } from './helpers.js';

// _config.js reads manifest.json via createRequire at module load time.
// We mock it before importing so the module resolves cleanly in Node/Vitest.
vi.mock('../../../public/manifest.json', () => ({
  default: { homepage_url: 'https://undistractedme.sarojbelbase.com.np' },
  homepage_url: 'https://undistractedme.sarojbelbase.com.np',
}));

describe('ALLOWED_ORIGINS regex', () => {
  it.each([
    ['production site', ORIGINS.production, true],
    ['chrome extension', ORIGINS.chrome, true],
    ['firefox extension', ORIGINS.firefox, true],
    ['localhost dev', ORIGINS.localhost, true],
    ['localhost no port', 'http://localhost', true],
    ['unknown domain', ORIGINS.bad, false],
    ['empty origin (same-origin)', ORIGINS.none, false],
    ['subdomain of production', 'https://sub.undistractedme.sarojbelbase.com.np', false],
  ])('%s → %s', (_, origin, expected) => {
    expect(ALLOWED_ORIGINS.test(origin)).toBe(expected);
  });
});

describe('assertOrigin', () => {
  it('allows a valid origin and sets CORS headers', () => {
    const req = makeReq({ origin: ORIGINS.production });
    const res = makeRes();
    expect(assertOrigin(req, res)).toBe(true);
    expect(res.getHeader('access-control-allow-origin')).toBe(ORIGINS.production);
    expect(res.getHeader('vary')).toBe('Origin');
    expect(res._status).toBeNull(); // no rejection
  });

  it('rejects an unknown origin with 403', () => {
    const req = makeReq({ origin: ORIGINS.bad });
    const res = makeRes();
    expect(assertOrigin(req, res)).toBe(false);
    expect(res._status).toBe(403);
    expect(res._body).toMatchObject({ error: 'Forbidden' });
  });

  it('allows same-origin request (empty origin header)', () => {
    const req = makeReq({ origin: '' });
    const res = makeRes();
    expect(assertOrigin(req, res)).toBe(true);
    expect(res._status).toBeNull();
  });

  it('sets custom methods when provided', () => {
    const req = makeReq({ origin: ORIGINS.chrome });
    const res = makeRes();
    assertOrigin(req, res, 'POST, OPTIONS');
    expect(res.getHeader('access-control-allow-methods')).toBe('POST, OPTIONS');
  });

  it.each(Object.entries(ORIGINS).filter(([k]) => k !== 'bad' && k !== 'none'))(
    'allows %s origin', (_, origin) => {
      const req = makeReq({ origin });
      const res = makeRes();
      expect(assertOrigin(req, res)).toBe(true);
    }
  );
});

describe('assertApiKey', () => {
  const KEY = 'test-secret-key-abc123';

  beforeEach(() => { process.env.API_KEY = KEY; });
  afterEach(() => { delete process.env.API_KEY; });

  it('passes when correct key provided', () => {
    const req = makeReq({ headers: { 'x-api-key': KEY } });
    const res = makeRes();
    expect(assertApiKey(req, res)).toBe(true);
    expect(res._status).toBeNull();
  });

  it('rejects missing key with 401', () => {
    const req = makeReq();
    const res = makeRes();
    expect(assertApiKey(req, res)).toBe(false);
    expect(res._status).toBe(401);
    expect(res._body).toMatchObject({ error: 'Unauthorized' });
  });

  it('rejects wrong key with 401', () => {
    const req = makeReq({ headers: { 'x-api-key': 'wrong-key' } });
    const res = makeRes();
    expect(assertApiKey(req, res)).toBe(false);
    expect(res._status).toBe(401);
  });

  it('allows any request when API_KEY is not configured (dev mode)', () => {
    delete process.env.API_KEY;
    const req = makeReq(); // no key header
    const res = makeRes();
    expect(assertApiKey(req, res)).toBe(true);
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
