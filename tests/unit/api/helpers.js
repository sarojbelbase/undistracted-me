/**
 * Minimal req/res mock factory for Vercel/Next-style API handler tests.
 * Avoids any network dependency — pure unit testing.
 */

export const makeReq = ({ method = 'GET', origin = '', headers = {}, query = {}, body = {} } = {}) => ({
  method,
  headers: { origin, ...headers },
  query,
  body,
});

export const makeRes = () => {
  const res = {
    _status: null,
    _body: null,
    _headers: {},
    status(code) { this._status = code; return this; },
    end(body = '') { this._body = body ?? ''; return this; },
    json(obj) { this._body = obj; return this; },
    send(buf) { this._body = buf; return this; },
    setHeader(k, v) { this._headers[k.toLowerCase()] = v; },
    getHeader(k) { return this._headers[k.toLowerCase()]; },
  };
  return res;
};

/** Valid allowed origins for convenience */
export const ORIGINS = {
  production: 'https://undistractedme.sarojbelbase.com.np',
  chrome: 'chrome-extension://abcdefghijklmnoabcdefghijklmno12',
  firefox: 'moz-extension://1071d037-0f17-4c92-b06c-704050d2e2c3',
  localhost: 'http://localhost:3000',
  bad: 'https://evil.com',
  none: '',
};
