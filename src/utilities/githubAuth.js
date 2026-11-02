/**
 * GitHub OAuth (device flow) + gist credential management.
 *
 * Uses the OAuth 2.0 Device Authorization Grant — no client secret, no redirect
 * URI — so it works identically in Chrome and Firefox extensions with no
 * backend. The user is shown a short code to enter at github.com/login/device.
 *
 * Credential storage:
 *   - access token  → chrome.storage.local (the one secret; mirrors Google/Spotify)
 *   - gist id       → localStorage (non-secret; needed for the gist link)
 *   - profile       → localStorage (cached { login, name, avatar })
 *   - connected flag → localStorage (synchronous, for isConnected())
 */

import { isExtension } from './index';
import {
  GITHUB_DEVICE_CODE_API,
  GITHUB_OAUTH_TOKEN_API,
  GITHUB_GISTS_API,
  GITHUB_USER_API,
  GITHUB_SCOPE,
} from '../constants/urls';

// Obfuscated by obscureEnvKeys Vite plugin at build time (mirrors Spotify/Google).
const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || '';

/** Filename + description used for the sync gist. */
export const GIST_FILENAME = 'undistracted-me-sync.json';
export const GIST_DESCRIPTION = 'Undistracted Me Sync';

/**
 * User-Agent sent on GitHub REST API requests. GitHub rejects requests without
 * one with a 403 ("Request forbidden by administrative rules").
 */
export const GITHUB_USER_AGENT = 'undistracted-me';

const TOKEN_KEY = 'github_gist_token';
const GIST_ID_KEY = 'github_gist_id';
const PROFILE_KEY = 'github_gist_profile';
const CONNECTED_FLAG = 'github_connected';

// ── chrome.storage.local helpers ──────────────────────────────────────────────

async function storageGet(key) {
  if (!isExtension()) return null;
  try {
    const res = await chrome.storage.local.get(key); // eslint-disable-line no-undef
    return res[key] ?? null;
  } catch {
    return null;
  }
}

async function storageSet(key, value) {
  if (!isExtension()) return;
  try {
    await chrome.storage.local.set({ [key]: value }); // eslint-disable-line no-undef
  } catch {
    /* unavailable */
  }
}

async function storageRemove(key) {
  if (!isExtension()) return;
  try {
    await chrome.storage.local.remove(key); // eslint-disable-line no-undef
  } catch {
    /* unavailable */
  }
}

// ── localStorage helpers (gist id + profile — non-secret, sync) ──────────────

function readLocal(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function writeLocal(key, value) {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}
function removeLocal(key) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

// ── Token / gist id / profile accessors ──────────────────────────────────────

export const getToken = () => storageGet(TOKEN_KEY);
export const getGistId = () => readLocal(GIST_ID_KEY);
export const setGistId = (id) => writeLocal(GIST_ID_KEY, id);
export const getProfile = async () => {
  const raw = readLocal(PROFILE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

/**
 * Build the browsable URL for the user's sync gist (or null when not connected).
 * Prefers the canonical `https://gist.github.com/<login>/<id>` form.
 */
export async function getGistUrl() {
  const gistId = await getGistId();
  if (!gistId) return null;
  const profile = await getProfile();
  if (profile?.login) return `https://gist.github.com/${profile.login}/${gistId}`;
  return `https://gist.github.com/${gistId}`;
}

/** Synchronous connected check — backed by a localStorage flag. */
export function isConnected() {
  try {
    return localStorage.getItem(CONNECTED_FLAG) === '1';
  } catch {
    return false;
  }
}

// ── Device flow ──────────────────────────────────────────────────────────────

async function postForm(url, body) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams(body).toString(),
  });
}

/** Poll the token endpoint until the user authorizes, errors, or times out. */
async function pollForToken(clientId, deviceCode, intervalSec) {
  const deadline = Date.now() + 15 * 60 * 1000; // 15 min device-code lifetime
  let waitMs = Math.max(Number(intervalSec) || 5, 5) * 1000;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));

    const res = await postForm(GITHUB_OAUTH_TOKEN_API, {
      client_id: clientId,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    });
    const data = await res.json().catch(() => ({}));

    if (res.ok && data.access_token) return data;
    if (data.error === 'authorization_pending') continue;
    if (data.error === 'slow_down') {
      waitMs += 5000; // GitHub asks us to slow down
      continue;
    }
    if (data.error === 'access_denied') throw new Error('GitHub authorization was denied.');
    if (data.error === 'expired_token') throw new Error('The sign-in code expired. Please try again.');
    throw new Error(data.error_description || data.error || 'GitHub sign-in failed.');
  }

  throw new Error('GitHub sign-in timed out. Please try again.');
}

/**
 * Connect: run the device flow, persist the token + profile, return the profile.
 *
 * @param {{ onCode?: ({ userCode: string, verificationUri: string }) => void }} [opts]
 *        `onCode` fires right after the code is issued so the UI can display it
 *        while the user completes authorization.
 * @returns {Promise<{ login: string, name: string, avatar: string } | null>}
 */
export async function connect({ onCode } = {}) {
  if (!GITHUB_CLIENT_ID) throw new Error('GitHub client ID is not configured.');
  if (!isExtension()) throw new Error('GitHub sync is only available in the browser extension.');

  // 1. Request a device + user code
  const codeRes = await postForm(GITHUB_DEVICE_CODE_API, {
    client_id: GITHUB_CLIENT_ID,
    scope: GITHUB_SCOPE,
  });
  const codeData = await codeRes.json().catch(() => ({}));
  if (!codeRes.ok || !codeData.device_code) {
    throw new Error(codeData.error_description || 'Could not start GitHub sign-in.');
  }

  const userCode = codeData.user_code || '';
  const verificationUri = new URL(codeData.verification_uri || 'https://github.com/login/device');

  // Pre-fill the user code via deep link when GitHub supports it.
  if (userCode) verificationUri.searchParams.set('user_code', userCode);
  onCode?.({ userCode, verificationUri: verificationUri.toString() });

  // 2. Poll for the token — the UI shows the code and lets the user open the
  //    device page themselves (no auto-redirect).
  const tokens = await pollForToken(GITHUB_CLIENT_ID, codeData.device_code, codeData.interval);

  // 3. Persist token + connected flag
  await storageSet(TOKEN_KEY, tokens.access_token);
  console.log('[sync] GitHub token scope:', tokens.scope || '(none)');
  try {
    localStorage.setItem(CONNECTED_FLAG, '1');
  } catch {
    /* unavailable */
  }

  // 3b. Ensure the sync gist exists so the gist link is available immediately.
  // Non-fatal — the sync engine creates it on first push if this fails.
  try {
    await ensureGist(tokens.access_token);
  } catch {
    /* non-fatal */
  }

  // 4. Fetch + cache the profile (non-critical)
  let profile = null;
  try {
    const userRes = await fetch(GITHUB_USER_API, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': GITHUB_USER_AGENT,
      },
    });
    if (userRes.ok) {
      const u = await userRes.json();
      profile = { login: u.login, name: u.name || u.login, avatar: u.avatar_url };
      writeLocal(PROFILE_KEY, JSON.stringify(profile));
    }
  } catch {
    /* profile is non-critical */
  }

  return profile;
}

/** Disconnect — clears token, gist id, and profile. Leaves the gist intact. */
export async function disconnect() {
  await storageRemove(TOKEN_KEY);
  removeLocal(GIST_ID_KEY);
  removeLocal(PROFILE_KEY);
  try {
    localStorage.removeItem(CONNECTED_FLAG);
  } catch {
    /* unavailable */
  }
}

/**
 * Ensure the sync gist exists, creating an empty one if needed. Returns its id.
 * Called during connect so the gist is browsable right after sign-in.
 */
async function ensureGist(token) {
  const existing = await getGistId();
  if (existing) return existing;

  const res = await fetch(GITHUB_GISTS_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': GITHUB_USER_AGENT,
    },
    body: JSON.stringify({
      description: GIST_DESCRIPTION,
      public: false,
      files: { [GIST_FILENAME]: { content: JSON.stringify({ v: 1, keys: {} }) } },
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Failed to create gist (${res.status}): ${body.message || res.statusText}`);
  }

  const created = await res.json();
  await setGistId(created.id);
  return created.id;
}
