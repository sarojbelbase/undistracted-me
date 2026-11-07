/**
 * POST /auth/google/token
 *
 * Server-side Google OAuth token exchange for website mode.
 * Handles two grant types:
 *   - authorization_code  — initial code→token exchange (needs code + verifier + redirect_uri)
 *   - refresh_token       — silent refresh using a stored refresh token
 *
 * The client_secret never leaves the server; the client only sends the
 * authorization code and PKCE verifier it obtained from the popup flow.
 *
 * CORS: allows requests from chrome-extension://, moz-extension://, and
 * the production / local origins so all contexts can call this endpoint.
 */

import { assertOrigin, assertApiKey, json, corsHeaders } from '../../_config.js';

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

// The only valid redirect URIs this server will accept.
// Extending this list requires a deliberate server-side change.
const ALLOWED_REDIRECT_URIS = [
  'https://app.undistracted.me/callbacks/auth.html',
  'http://localhost:3000/callbacks/auth.html',
  'http://localhost:5173/callbacks/auth.html',
];

// Regex to allow extension redirect URIs (Chrome/Firefox MV3)
// Chrome: https://{extension-id}.chromiumapp.org/
// Firefox: https://{sha1(gecko-id)}.extensions.allizom.org/ (Firefox hashes the id)
const EXTENSION_REDIRECT_PATTERN = /^https:\/\/[a-z0-9]+\.(chromiumapp\.org|extensions\.allizom\.org)\/?$/i;

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    const rejected = assertOrigin(request);
    if (rejected) return rejected;
    return new Response(null, { status: 204, headers: corsHeaders(request, 'POST, OPTIONS') });
  }

  const rejected = assertOrigin(request);
  if (rejected) return rejected;
  const keyRejected = assertApiKey(request, env);
  if (keyRejected) return keyRejected;

  if (request.method !== 'POST') {
    return new Response(null, { status: 405, headers: corsHeaders(request, 'POST, OPTIONS') });
  }

  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return json({ error: 'Google OAuth not configured on server' }, 503, { request, methods: 'POST, OPTIONS' });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    // non-JSON / empty body → treated as {}
  }

  const grantType = body.grant_type || 'authorization_code';

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: grantType,
  });

  if (grantType === 'refresh_token') {
    if (!body.refresh_token) {
      return json({ error: 'refresh_token is required' }, 400, { request, methods: 'POST, OPTIONS' });
    }
    params.set('refresh_token', body.refresh_token);
  } else {
    // authorization_code
    const { code, code_verifier, redirect_uri } = body;
    if (!code || !code_verifier || !redirect_uri) {
      return json({ error: 'code, code_verifier and redirect_uri are required' }, 400, { request, methods: 'POST, OPTIONS' });
    }
    const isValidRedirectUri = ALLOWED_REDIRECT_URIS.includes(redirect_uri) || EXTENSION_REDIRECT_PATTERN.test(redirect_uri);
    if (!isValidRedirectUri) {
      return json({ error: 'invalid_redirect_uri' }, 400, { request, methods: 'POST, OPTIONS' });
    }
    params.set('code', code);
    params.set('code_verifier', code_verifier);
    params.set('redirect_uri', redirect_uri);
  }

  const upstream = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
    signal: AbortSignal.timeout(8000),
  });

  const data = await upstream.json();
  if (!upstream.ok) {
    return json(
      { error: data.error_description || data.error || 'token_exchange_failed' },
      upstream.status,
      { request, methods: 'POST, OPTIONS' },
    );
  }

  return json(
    {
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? null,
      expires_in: data.expires_in,
    },
    200,
    { request, methods: 'POST, OPTIONS' },
  );
}
