import { describe, it, expect } from 'vitest';
import { onRequest } from '../../../app-functions/index.js';

const sentinel = { passthrough: true };
const next = async () => sentinel;

function ctx(path, accept, method = 'GET') {
  return {
    request: new Request(`https://app.undistracted.me${path}`, {
      method,
      headers: accept ? { Accept: accept } : {},
    }),
    next,
  };
}

describe('app-functions/index.js: markdown content negotiation', () => {
  it('serves markdown for GET / with Accept: text/markdown', async () => {
    const res = await onRequest(ctx('/', 'text/markdown'));
    expect(res).toBeInstanceOf(Response);
    expect(res.headers.get('Content-Type')).toContain('text/markdown');
    expect(res.headers.get('Vary')).toContain('Accept');
    const body = await res.text();
    expect(body.startsWith('# Undistracted Me')).toBe(true);
    expect(body).toContain('## ');
  });

  it('passes through for GET / with Accept: text/html', async () => {
    expect(await onRequest(ctx('/', 'text/html'))).toBe(sentinel);
  });

  it('passes through for non-GET methods', async () => {
    expect(await onRequest(ctx('/', 'text/markdown', 'POST'))).toBe(sentinel);
  });

  it('passes through for non-home paths', async () => {
    expect(await onRequest(ctx('/about', 'text/markdown'))).toBe(sentinel);
  });

  it('passes through for /index.html with markdown', async () => {
    const res = await onRequest(ctx('/index.html', 'text/markdown'));
    expect(res).toBeInstanceOf(Response);
  });
});
