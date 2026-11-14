/**
 * Unified Google OAuth2 auth helper — ONE "Web application" OAuth client, ONE
 * PKCE authorization-code flow, works everywhere: Chrome, Brave, Edge, Opera,
 * Vivaldi, Firefox (extension) and the hosted website.
 *
 * Extension (any browser) → chrome.identity.launchWebAuthFlow() + PKCE
 *                          redirect URI = chrome.identity.getRedirectURL()
 *                          (https://<id>.chromiumapp.org/ on Chrome/Chromium,
 *                           https://sha1(<gecko-id>).extensions.allizom.org/ on
 *                           Firefox — Firefox hashes the id, it's not the raw id)
 * Website                → popup + PKCE
 *                          redirect URI = <origin>/callbacks/auth.html
 *
 * Both exchange the authorization code via POST /auth/google/token, so the
 * client_secret never leaves the server. The bundle carries only the public
 * client_id (VITE_GOOGLE_CLIENT_ID).
 */
import { API_BASE_URL } from '../constants/env.js';
import { GOOGLE_SCOPES, GOOGLE_AUTH_ENDPOINT, GOOGLE_USERINFO_API } from '../constants/urls.js';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// Server-side token-exchange endpoint. Absolute URL so it works from
// chrome-extension://, moz-extension://, and https:// origins alike.
// Dev: localhost:3000 (when running a local API); prod: api.undistracted.me.
const isDev = import.meta.env.DEV || false;
const TOKEN_ENDPOINT = isDev
  ? 'http://localhost:3000/auth/google/token'
  : `${API_BASE_URL}/auth/google/token`;

// One logical key. Extension paths persist it in chrome.storage.local; website
// mode persists it in sessionStorage (never exposed across tabs).
const TOKEN_KEY = 'google_tokens';

// ─── Platform detection ───────────────────────────────────────────────────────

/**
 * Returns true when running as a plain website (no chrome.identity available).
 * The only browser distinction left in the whole auth flow: extension vs web.
 */
function isWebPath() {
  return typeof chrome === 'undefined' || typeof chrome.identity?.launchWebAuthFlow !== 'function'; // eslint-disable-line no-undef
}

/**
 * Returns true when Google sign-in is possible. A single client ID covers every
 * environment, so this is true whenever VITE_GOOGLE_CLIENT_ID is set at build
 * time (extension) or bundle time (website).
 */
export function isGoogleAuthAvailable() {
  return !!CLIENT_ID;
}

/**
 * Returns the extension's OAuth redirect URL (chrome.identity.getRedirectURL()).
 * Useful to display in Settings so the developer can register it in Google Cloud
 * Console without computing the hash manually. Null in website mode.
 */
export function getGoogleRedirectUrl() {
  if (typeof chrome === 'undefined' || !chrome.identity?.getRedirectURL) return null; // eslint-disable-line no-undef
  return chrome.identity.getRedirectURL(); // eslint-disable-line no-undef
}

// ─── Token storage (chrome.storage.local ↔ sessionStorage) ────────────────────

async function readStoredToken() {
  if (isWebPath()) {
    try {
      const raw = sessionStorage.getItem(TOKEN_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
  const result = await globalThis.chrome?.storage?.local?.get(TOKEN_KEY) ?? {}; // eslint-disable-line no-undef
  return result[TOKEN_KEY] ?? null;
}

async function writeStoredToken(tokens) {
  if (isWebPath()) {
    try { sessionStorage.setItem(TOKEN_KEY, JSON.stringify(tokens)); } catch { /* ignore */ }
    return;
  }
  await globalThis.chrome?.storage?.local?.set({ [TOKEN_KEY]: tokens }); // eslint-disable-line no-undef
}

async function clearStoredToken() {
  if (isWebPath()) {
    try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
    return;
  }
  await globalThis.chrome?.storage?.local?.remove(TOKEN_KEY); // eslint-disable-line no-undef
}

// ─── Server-side token exchange ───────────────────────────────────────────────

/**
 * Exchange an authorization code for tokens via /auth/google/token.
 * The client_secret stays server-side; the client sends only the public
 * client_id, the code, and the PKCE verifier.
 */
async function exchangeCodeForTokens({ code, codeVerifier, redirectUri }) {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, code_verifier: codeVerifier, redirect_uri: redirectUri }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errCode = body.error || res.status;
    if (String(errCode).includes('invalid_grant')) throw new Error('Your session expired. Please sign in again.');
    throw new Error(`Google token exchange failed: ${errCode}`);
  }
  return {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    // Guard against a missing `expires_in` (→ NaN, which would force a refresh
    // on every call). Default to 1 hour.
    expires_at: Date.now() + (Number(body.expires_in) || 3600) * 1000,
  };
}

/**
 * Refresh an expired access token using its refresh_token. Returns null on any
 * failure so the caller can fall back to a fresh interactive sign-in.
 */
async function refreshStoredToken(refreshToken) {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  });
  if (!res.ok) return null;
  const tokens = await res.json();
  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || refreshToken,
    expires_at: Date.now() + (Number(tokens.expires_in) || 3600) * 1000,
  };
}

// In-flight refresh dedup — Calendar, Contacts, Tasks, and Drive all call
// getValidStoredToken() on the same page load; without this, each expired-token
// caller would kick off its own refreshStoredToken round-trip.
let refreshInFlight = null;

/**
 * Returns a valid stored access token, or null. Silently refreshes via the
 * server when the token is near expiry.
 */
async function getValidStoredToken() {
  const stored = await readStoredToken();
  if (!stored) return null;

  // Still valid with a 30-second buffer.
  if (stored.expires_at - Date.now() > 30_000) return stored.access_token;
  if (!stored.refresh_token) return null;

  if (!refreshInFlight) {
    refreshInFlight = refreshStoredToken(stored.refresh_token)
      .then(async (refreshed) => {
        if (refreshed) await writeStoredToken(refreshed);
        return refreshed;
      })
      .catch(() => null) // network failure → treat as "no token", don't throw
      .finally(() => {
        refreshInFlight = null;
      });
  }
  const refreshed = await refreshInFlight;
  return refreshed?.access_token ?? null;
}

// ─── PKCE helpers ─────────────────────────────────────────────────────────────

function generateCodeVerifier() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return btoa(String.fromCodePoint(...arr))
    .replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCodePoint(...new Uint8Array(digest)))
    .replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function buildAuthUrl(redirectUri, challenge) {
  const url = new URL(GOOGLE_AUTH_ENDPOINT);
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', GOOGLE_SCOPES);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent'); // ensures refresh_token is issued
  return url;
}

// ─── Authorization-code acquisition (extension vs web) ────────────────────────

/** Extension: chrome.identity.launchWebAuthFlow (Chrome, Brave, Edge, Firefox…). */
async function getAuthorizationCodeExtension() {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const redirectUri = chrome.identity.getRedirectURL(); // eslint-disable-line no-undef
  if (!redirectUri) throw new Error('chrome.identity not available');

  const authUrl = buildAuthUrl(redirectUri, challenge);
  const responseUrl = await new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url: authUrl.toString(), interactive: true }, (url) => { // eslint-disable-line no-undef
      const err = chrome.runtime?.lastError; // eslint-disable-line no-undef
      if (err) reject(new Error(err.message));
      else if (url) resolve(url);
      else reject(new Error('Sign-in cancelled'));
    });
  });

  const code = new URL(responseUrl).searchParams.get('code');
  if (!code) throw new Error('Sign-in was interrupted. Please try again.');
  return { code, verifier, redirectUri };
}

/** Website: centred popup + postMessage callback. */
async function getAuthorizationCodeWeb() {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const redirectUri = `${globalThis.location.origin}/callbacks/auth.html`;
  const authUrl = buildAuthUrl(redirectUri, challenge);

  const code = await new Promise((resolve, reject) => {
    const w = 500, h = 620;
    const left = Math.round(globalThis.screen.width / 2 - w / 2);
    const top = Math.round(globalThis.screen.height / 2 - h / 2);
    const popup = globalThis.open(
      authUrl.toString(), 'google-auth',
      `width=${w},height=${h},left=${left},top=${top},popup=1`
    );
    if (!popup) { reject(new Error('Popup blocked — allow popups for this site')); return; }

    const onMessage = (e) => {
      if (e.origin !== globalThis.location.origin) return;
      if (e.data?.type !== 'google-auth-callback') return;
      globalThis.removeEventListener('message', onMessage);
      clearInterval(closePoll);
      if (e.data.error) reject(new Error(e.data.error));
      else if (e.data.code) resolve(e.data.code);
      else reject(new Error('No authorization code received'));
    };
    globalThis.addEventListener('message', onMessage);

    // Detect popup closed without completing OAuth
    const closePoll = setInterval(() => {
      if (popup.closed) {
        clearInterval(closePoll);
        globalThis.removeEventListener('message', onMessage);
        reject(new Error('Sign-in cancelled'));
      }
    }, 500);
  });

  return { code, verifier, redirectUri };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get a valid Google API access token.
 *
 * @param {boolean} interactive - Prompt the user if no token is available.
 *   Pass false for silent background checks; the call throws "Not authenticated"
 *   if no valid token is already stored.
 */
export async function getGoogleAuthToken(interactive = true) {
  const stored = await getValidStoredToken();
  if (stored) return stored;
  if (!interactive) throw new Error('Not authenticated');
  if (!CLIENT_ID) throw new Error('Google sign-in not configured — set VITE_GOOGLE_CLIENT_ID');

  const { code, verifier, redirectUri } = isWebPath()
    ? await getAuthorizationCodeWeb()
    : await getAuthorizationCodeExtension();

  const tokens = await exchangeCodeForTokens({ code, codeVerifier: verifier, redirectUri });
  await writeStoredToken(tokens);
  return tokens.access_token;
}

/**
 * Discard the stored token so the next call re-authenticates. The optional
 * `token` argument is accepted for backward compatibility only — it is unused
 * (it was only ever needed by chrome.identity.removeCachedAuthToken, which the
 * unified launchWebAuthFlow flow no longer uses).
 */
export async function removeGoogleAuthToken() {
  await clearStoredToken();
}

/**
 * Sign the user out of Google (clears the stored token). Accepts an optional
 * ignored argument for backward compatibility with the old Chrome-only flow.
 */
export async function signOutGoogle() {
  await clearStoredToken();
}

/**
 * Fetch the signed-in user's basic profile from Google.
 * Returns { name, email, picture } or null on failure.
 */
export async function getGoogleUserProfile() {
  try {
    const token = await getGoogleAuthToken(false);
    const res = await fetch(GOOGLE_USERINFO_API, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { name: data.name ?? null, email: data.email ?? null, picture: data.picture ?? null };
  } catch {
    return null;
  }
}
