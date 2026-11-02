/**
 * GitHub OAuth (device flow) + gist credential management.
 *
 * Uses the OAuth 2.0 Device Authorization Grant — no client secret, no redirect
 * URI — so it works identically in Chrome and Firefox extensions with no
 * backend. The user is shown a short code to enter at github.com/login/device.
 *
 * Credential storage:
 *   - access token  → chrome.storage.local (sensitive; mirrors Google/Spotify)
 *   - gist id       → chrome.storage.local (paired with the token)
 *   - profile       → chrome.storage.local (cached { login, name, avatar })
 *   - connected flag → localStorage (synchronous, for isConnected())
 */

import { isExtension } from './index';
import {
  GITHUB_DEVICE_CODE_API,
  GITHUB_OAUTH_TOKEN_API,
  GITHUB_USER_API,
  GITHUB_SCOPE,
} from '../constants/urls';

// Obfuscated by obscureEnvKeys Vite plugin at build time (mirrors Spotify/Google).
const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || '';

/** Filename + description used for the sync gist. */
export const GIST_FILENAME = 'undistracted-me-sync.json';
export const GIST_DESCRIPTION = 'Undistracted Me Sync';

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

// ── Token / gist id / profile accessors ──────────────────────────────────────

export const getToken = () => storageGet(TOKEN_KEY);
export const getGistId = () => storageGet(GIST_ID_KEY);
export const setGistId = (id) => storageSet(GIST_ID_KEY, id);
export const getProfile = () => storageGet(PROFILE_KEY);

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

  // 2. Open the verification page in a new tab (best-effort).
  try {
    await chrome.tabs.create({ url: verificationUri.toString() }); // eslint-disable-line no-undef
  } catch {
    /* user can open the URL manually */
  }

  // 3. Poll for the token
  const tokens = await pollForToken(GITHUB_CLIENT_ID, codeData.device_code, codeData.interval);

  // 4. Persist token + connected flag
  await storageSet(TOKEN_KEY, tokens.access_token);
  try {
    localStorage.setItem(CONNECTED_FLAG, '1');
  } catch {
    /* unavailable */
  }

  // 5. Fetch + cache the profile (non-critical)
  let profile = null;
  try {
    const userRes = await fetch(GITHUB_USER_API, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (userRes.ok) {
      const u = await userRes.json();
      profile = { login: u.login, name: u.name || u.login, avatar: u.avatar_url };
      await storageSet(PROFILE_KEY, profile);
    }
  } catch {
    /* profile is non-critical */
  }

  return profile;
}

/** Disconnect — clears token, gist id, and profile. Leaves the gist intact. */
export async function disconnect() {
  await storageRemove(TOKEN_KEY);
  await storageRemove(GIST_ID_KEY);
  await storageRemove(PROFILE_KEY);
  try {
    localStorage.removeItem(CONNECTED_FLAG);
  } catch {
    /* unavailable */
  }
}
