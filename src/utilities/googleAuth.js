/**
 * Unified Google OAuth2 auth helper — works on Chrome and Firefox.
 *
 * Chrome  → chrome.identity.getAuthToken()
 *           Seamless: uses the signed-in Chrome/Google account, no extra user
 *           setup required.  Tokens are managed entirely by the browser.
 *
 * Firefox → PKCE authorization-code flow via chrome.identity.launchWebAuthFlow()
 *           + server-side token exchange via /api/auth/google/token (Vercel).
 *           Requires a "Desktop app" OAuth client set up once in Google Cloud
 *           Console.  The client_secret lives only in the Vercel environment;
 *           the bundle contains only the client_id (XOR-encoded at build time).
 */
import { PRODUCTION_BASE_URL } from '../constants/env.js';

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/contacts.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';

// Obfuscated by obscureEnvKeys Vite plugin at build time.
const FF_CLIENT_ID = import.meta.env.VITE_GOOGLE_DESKTOP_CLIENT_ID || '';

const API_KEY = import.meta.env.VITE_API_KEY || '';

// Absolute URL — works from moz-extension:// and chrome-extension:// origins.
const FF_BACKEND_TOKEN_URL = `${PRODUCTION_BASE_URL}/api/auth/google/token`;

const FF_TOKEN_KEY = 'google_ff_tokens';

// ─── Platform detection ───────────────────────────────────────────────────────

/**
 * Returns true when running as a plain website (no chrome.identity available).
 * This covers both the hosted Vercel site and local `npm run dev` in web mode.
 */
function isWebPath() {
  return typeof chrome === 'undefined' || typeof chrome.identity?.launchWebAuthFlow !== 'function'; // eslint-disable-line no-undef
}

/**
 * Returns true when running as a Chrome/Chromium extension.
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

// ─── Web (website mode) — popup + PKCE + server-side token exchange ─────────

// sessionStorage keeps web-mode OAuth tokens scoped to the browser session only.
// This prevents cross-tab token leakage and reduces XSS exposure window compared
// to localStorage. Extension paths use chrome.storage.local instead (never this key).
const WEB_TOKEN_KEY = 'google_web_tokens';

/**
 * Returns a valid stored access token for website mode, or null.
 * Silently refreshes via /api/auth/google/token when the token is near expiry.
 */
async function getValidStoredWebToken() {
  try {
    const raw = sessionStorage.getItem(WEB_TOKEN_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw);
    // Still valid with 30-second buffer
    if (stored.expires_at - Date.now() > 30_000) return stored.access_token;
    if (!stored.refresh_token) return null;

    const res = await fetch('/api/auth/google/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': API_KEY },
      body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: stored.refresh_token }),
    });
    if (!res.ok) return null;

    const tokens = await res.json();
    const updated = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || stored.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000,
    };
    sessionStorage.setItem(WEB_TOKEN_KEY, JSON.stringify(updated));
    return updated.access_token;
  } catch { return null; }
}

/**
 * Opens a Google OAuth popup, completes the PKCE dance, exchanges the code
 * via /api/auth/google/token (client_secret stays server-side), and stores
 * the resulting tokens in localStorage.
 */
async function getTokenWeb(interactive) {
  const stored = await getValidStoredWebToken();
  if (stored) return stored;
  if (!interactive) throw new Error('Not authenticated');

  const clientId = FF_CLIENT_ID; // same Desktop-app client, redirect URI just differs
  if (!clientId) throw new Error('Google sign-in not configured — set VITE_GOOGLE_DESKTOP_CLIENT_ID');

  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const redirectUri = `${globalThis.location.origin}/auth-callback.html`;

  const authUrl = new URL(GOOGLE_AUTH_ENDPOINT);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', GOOGLE_SCOPES);
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  // Open a centred popup and wait for the callback postMessage
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

  // Exchange code via server-side endpoint — client_secret never touches the client
  const res = await fetch('/api/auth/google/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': API_KEY },
    body: JSON.stringify({ code, code_verifier: verifier, redirect_uri: redirectUri }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Google token exchange failed: ${body.error || res.status}`);
  }

  const tokens = await res.json();
  const newStored = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() + tokens.expires_in * 1000,
  };
  sessionStorage.setItem(WEB_TOKEN_KEY, JSON.stringify(newStored));
  return newStored.access_token;
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
  return btoa(String.fromCodePoint(...arr))
    .replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCodePoint(...new Uint8Array(digest)))
    .replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

// ─── Firefox token storage ────────────────────────────────────────────────────

async function getValidStoredFFToken() {
  const result = await chrome?.storage?.local?.get(FF_TOKEN_KEY) ?? {}; // eslint-disable-line no-undef
  const stored = result[FF_TOKEN_KEY] ?? null;
  if (!stored) return null;

  // Still valid with 30-second buffer
  if (stored.expires_at - Date.now() > 30_000) return stored.access_token;

  // Try to refresh
  if (!stored.refresh_token) return null;

  const res = await fetch(FF_BACKEND_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': API_KEY },
    body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: stored.refresh_token }),
  });

  if (!res.ok) return null; // let caller decide whether to re-auth

  const tokens = await res.json();
  const updated = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || stored.refresh_token,
    expires_at: Date.now() + tokens.expires_in * 1000,
  };
  await chrome?.storage?.local?.set({ [FF_TOKEN_KEY]: updated }); // eslint-disable-line no-undef
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
  const redirectUri = chrome?.identity?.getRedirectURL?.(); // eslint-disable-line no-undef
  if (!redirectUri) throw new Error('chrome.identity not available');

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
      else if (url) resolve(url);
      else reject(new Error('Auth cancelled'));
    });
  });

  const code = new URL(responseUrl).searchParams.get('code');
  if (!code) throw new Error('No authorization code in response');

  const res = await fetch(FF_BACKEND_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': API_KEY },
    body: JSON.stringify({ code, code_verifier: verifier, redirect_uri: redirectUri }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Google token exchange failed: ${body.error || res.status}`);
  }

  const tokens = await res.json();
  const newStored = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() + tokens.expires_in * 1000,
  };
  await chrome?.storage?.local?.set({ [FF_TOKEN_KEY]: newStored }); // eslint-disable-line no-undef
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
  if (isWebPath()) return getTokenWeb(interactive);
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
  if (isWebPath()) {
    sessionStorage.removeItem(WEB_TOKEN_KEY);
    return;
  }
  if (isChromePath()) {
    if (token) await removeCachedTokenChrome(token);
    return;
  }
  // Firefox: clear our stored token — next call will trigger a full re-auth.
  await chrome?.storage?.local?.remove(FF_TOKEN_KEY); // eslint-disable-line no-undef
}

/**
 * Sign the user out of Google (clears all stored credentials).
 */
export async function signOutGoogle(token) {
  await removeGoogleAuthToken(token);
}

/**
 * Fetch the signed-in user's basic profile from Google.
 * Returns { name, email, picture } or null on failure.
 */
export async function getGoogleUserProfile() {
  try {
    const token = await getGoogleAuthToken(false);
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return { name: data.name ?? null, email: data.email ?? null, picture: data.picture ?? null };
  } catch {
    return null;
  }
}
