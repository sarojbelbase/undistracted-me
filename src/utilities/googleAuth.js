/**
 * Unified Google OAuth2 auth helper — works on Chrome and Firefox.
 *
 * Chrome  → chrome.identity.getAuthToken()
 *           Seamless: uses the signed-in Chrome/Google account, no extra user
 *           setup required.  Tokens are managed entirely by the browser.
 *
 * Firefox → PKCE authorization-code flow via chrome.identity.launchWebAuthFlow()
 *           + manual token exchange against https://oauth2.googleapis.com/token.
 *           Requires a "Desktop app" OAuth client set up once in Google Cloud
 *           Console.  Client ID and secret are XOR-encoded at build time via the
 *           obscureEnvKeys Vite plugin — they never appear as plain text in the
 *           bundle.
 */

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

// Obfuscated by obscureEnvKeys Vite plugin at build time.
const FF_CLIENT_ID = import.meta.env.VITE_GOOGLE_DESKTOP_CLIENT_ID || '';
const FF_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_DESKTOP_CLIENT_SECRET || '';

const FF_TOKEN_KEY = 'google_ff_tokens';

// ─── Platform detection ───────────────────────────────────────────────────────

/**
 * Chrome/Chromium: chrome.identity.getAuthToken() is present.
 * Firefox: only launchWebAuthFlow() is available — getAuthToken is undefined.
 */
function isChromePath() {
  return typeof chrome !== 'undefined' && typeof chrome.identity?.getAuthToken === 'function'; // eslint-disable-line no-undef
}

/**
 * Returns true when Google sign-in is possible in the current browser.
 * Chrome: always (uses built-in account).
 * Firefox: only when VITE_GOOGLE_DESKTOP_CLIENT_ID is configured.
 */
export function isGoogleAuthAvailable() {
  if (isChromePath()) return true;
  return !!(typeof chrome !== 'undefined' && chrome.identity?.launchWebAuthFlow && FF_CLIENT_ID); // eslint-disable-line no-undef
}

/**
 * Returns the redirect URL used by this extension for the Firefox OAuth flow.
 * Useful to display in Settings so the developer can register it in Google
 * Cloud Console without having to compute the hash manually.
 */
export function getGoogleRedirectUrl() {
  if (typeof chrome === 'undefined' || !chrome.identity?.getRedirectURL) return null; // eslint-disable-line no-undef
  return chrome.identity.getRedirectURL(); // eslint-disable-line no-undef
}

// ─── Chrome path ──────────────────────────────────────────────────────────────

function getTokenChrome(interactive) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => { // eslint-disable-line no-undef
      if (chrome.runtime.lastError) { // eslint-disable-line no-undef
        reject(new Error(chrome.runtime.lastError.message)); // eslint-disable-line no-undef
      } else {
        resolve(token);
      }
    });
  });
}

function removeCachedTokenChrome(token) {
  return new Promise((resolve) => {
    chrome.identity.removeCachedAuthToken({ token }, resolve); // eslint-disable-line no-undef
  });
}

// ─── Firefox PKCE helpers ─────────────────────────────────────────────────────

function generateCodeVerifier() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// ─── Firefox token storage ────────────────────────────────────────────────────

async function getValidStoredFFToken() {
  const result = await chrome.storage.local.get(FF_TOKEN_KEY); // eslint-disable-line no-undef
  const stored = result[FF_TOKEN_KEY] ?? null;
  if (!stored) return null;

  // Still valid with 30-second buffer
  if (stored.expires_at - Date.now() > 30_000) return stored.access_token;

  // Try to refresh
  if (!stored.refresh_token) return null;

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: FF_CLIENT_ID,
      client_secret: FF_CLIENT_SECRET,
      refresh_token: stored.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) return null; // let caller decide whether to re-auth

  const tokens = await res.json();
  const updated = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || stored.refresh_token,
    expires_at: Date.now() + tokens.expires_in * 1000,
  };
  await chrome.storage.local.set({ [FF_TOKEN_KEY]: updated }); // eslint-disable-line no-undef
  return updated.access_token;
}

// ─── Firefox interactive PKCE flow ────────────────────────────────────────────

async function getTokenFirefox(interactive) {
  // Try stored / auto-refresh first (no UI interaction)
  const stored = await getValidStoredFFToken();
  if (stored) return stored;

  if (!interactive) throw new Error('Not authenticated');
  if (!FF_CLIENT_ID) {
    throw new Error(
      'Google sign-in is not configured for Firefox. ' +
      'See the extension settings for setup instructions.'
    );
  }

  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  // getRedirectURL() is available in both Chrome and Firefox MV3
  const redirectUri = chrome.identity.getRedirectURL(); // eslint-disable-line no-undef

  const authUrl = new URL(GOOGLE_AUTH_ENDPOINT);
  authUrl.searchParams.set('client_id', FF_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', GOOGLE_SCOPES);
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent'); // ensures refresh_token is issued

  const responseUrl = await new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url: authUrl.toString(), interactive: true }, (url) => { // eslint-disable-line no-undef
      const err = chrome.runtime?.lastError; // eslint-disable-line no-undef
      if (err) reject(new Error(err.message));
      else if (!url) reject(new Error('Auth cancelled'));
      else resolve(url);
    });
  });

  const code = new URL(responseUrl).searchParams.get('code');
  if (!code) throw new Error('No authorization code in response');

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: FF_CLIENT_ID,
      client_secret: FF_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: verifier,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Google token exchange failed: ${body.error_description || res.status}`);
  }

  const tokens = await res.json();
  const newStored = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() + tokens.expires_in * 1000,
  };
  await chrome.storage.local.set({ [FF_TOKEN_KEY]: newStored }); // eslint-disable-line no-undef
  return newStored.access_token;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get a valid Google API access token.
 * Works on both Chrome (getAuthToken) and Firefox (PKCE launchWebAuthFlow).
 *
 * @param {boolean} interactive - Prompt the user if no token is available.
 *   Pass false for silent background checks; the call will throw if not
 *   already authenticated.
 */
export async function getGoogleAuthToken(interactive = true) {
  if (isChromePath()) return getTokenChrome(interactive);
  return getTokenFirefox(interactive);
}

/**
 * Invalidate a specific access token so the next call fetches a fresh one.
 * Handles both Chrome (removeCachedAuthToken) and Firefox (clear storage).
 *
 * @param {string|null} token - The token to remove (used on Chrome path only).
 */
export async function removeGoogleAuthToken(token) {
  if (isChromePath()) {
    if (token) await removeCachedTokenChrome(token);
    return;
  }
  // Firefox: clear our stored token — next call will trigger a full re-auth.
  await chrome.storage.local.remove(FF_TOKEN_KEY); // eslint-disable-line no-undef
}

/**
 * Sign the user out of Google (clears all stored credentials).
 */
export async function signOutGoogle(token) {
  await removeGoogleAuthToken(token);
}
