/**
 * POST /api/auth/google/token
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

const ALLOWED_ORIGINS =
  /^chrome-extension:\/\/|^moz-extension:\/\/|^https:\/\/whatsthemiti\.sarojbelbase\.com\.np|^http:\/\/localhost(:\d+)?$/;

const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

const applyCors = (req, res) => {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
};

export default async function handler(req, res) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).end();

  const clientId = process.env.VITE_GOOGLE_DESKTOP_CLIENT_ID;
  const clientSecret = process.env.VITE_GOOGLE_DESKTOP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(503).json({ error: 'Google OAuth not configured on server' });
  }

  const body = req.body ?? {};
  const grantType = body.grant_type || 'authorization_code';

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: grantType,
  });

  if (grantType === 'refresh_token') {
    if (!body.refresh_token) {
      return res.status(400).json({ error: 'refresh_token is required' });
    }
    params.set('refresh_token', body.refresh_token);
  } else {
    // authorization_code
    const { code, code_verifier, redirect_uri } = body;
    if (!code || !code_verifier || !redirect_uri) {
      return res.status(400).json({ error: 'code, code_verifier and redirect_uri are required' });
    }
    params.set('code', code);
    params.set('code_verifier', code_verifier);
    params.set('redirect_uri', redirect_uri);
  }

  const upstream = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  const data = await upstream.json();
  if (!upstream.ok) {
    return res.status(upstream.status).json({
      error: data.error_description || data.error || 'token_exchange_failed',
    });
  }

  return res.status(200).json({
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? null,
    expires_in: data.expires_in,
  });
}
