/**
 * Minimal helpers for Cloudflare Pages Functions unit tests.
 *
 * Handlers follow the signature `onRequest({ request, env }) => Response`.
 * These helpers build real `Request` objects (Node's undici globals) so the
 * functions' `request.headers.get()`, `request.json()`, `request.method` and
 * `new URL(request.url)` calls work exactly as they do in production.
 */

export const makeReq = ({
  method = 'GET',
  origin = '',
  headers = {},
  query = {},
  body = undefined,
  url = 'https://app.undistracted.me/api/test',
} = {}) => {
  const u = new URL(url);
  for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);

  const h = new Headers();
  if (origin) h.set('origin', origin);
  for (const [k, v] of Object.entries(headers)) h.set(k, v);

  const init = { method, headers: h };
  if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
    if (!h.has('content-type')) h.set('content-type', 'application/json');
  }

  return new Request(u.toString(), init);
};

/** Build the `context` object passed to `onRequest` ({ request, env }). */
export const makeContext = (request, env = {}) => ({ request, env });

/** Valid allowed origins for convenience */
export const ORIGINS = {
  production: 'https://app.undistracted.me',
  chrome: 'chrome-extension://abcdefghijklmnoabcdefghijklmno12',
  firefox: 'moz-extension://1071d037-0f17-4c92-b06c-704050d2e2c3',
  localhost: 'http://localhost:3000',
  bad: 'https://evil.com',
  none: '',
};
