// ─── Spotify Client ID ───────────────────────────────────────────────────────
// Set VITE_SPOTIFY_CLIENT_ID in your .env file.
// 1. Go to https://developer.spotify.com/dashboard and create an app.
// 2. Add redirect URI: https://<your-extension-id>.chromiumapp.org/
// 3. Add the Client ID to .env  (it is XOR-encoded at build time — not plain text in bundle).
export const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';

const SCOPES = 'user-read-playback-state user-modify-playback-state user-read-private user-read-email';
const TOKEN_KEY = 'spotify_tokens';
const PROFILE_KEY = 'spotify_profile';
const CONNECTED_FLAG = 'spotify_connected';

// Returns true when running as a plain website (not a Chrome extension).
const isWebMode = () => typeof chrome === 'undefined' || typeof chrome.identity?.launchWebAuthFlow !== 'function'; // eslint-disable-line no-undef

// ─── PKCE helpers ────────────────────────────────────────────────────────────

const generateCodeVerifier = () => {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return btoa(String.fromCodePoint(...arr))
    .replaceAll('+', '-').replaceAll('/', '_').replaceAll(/=+$/g, '');
};

const generateCodeChallenge = async (verifier) => {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCodePoint(...new Uint8Array(digest)))
    .replaceAll('+', '-').replaceAll('/', '_').replaceAll(/=+$/g, '');
};

const getRedirectUri = () => {
  if (isWebMode()) return `${globalThis.location.origin}/auth-callback.html`;
  const id = typeof chrome !== 'undefined' && chrome.runtime?.id; // eslint-disable-line no-undef
  if (!id) throw new Error('Chrome extension context unavailable. Load the extension from chrome://extensions before connecting.');
  return `https://${id}.chromiumapp.org/`;
};

// ─── Auth ────────────────────────────────────────────────────────────────────

export const connectSpotify = async () => {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const redirectUri = getRedirectUri();

  const authParams = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });

  // State param doubles as the postMessage type for the web popup flow.
  if (isWebMode()) authParams.set('state', 'spotify-auth-callback');

  const authUrl = `https://accounts.spotify.com/authorize?${authParams}`;

  let code;
  if (isWebMode()) {
    // Popup-based PKCE flow — mirrors the Google web auth pattern.
    code = await new Promise((resolve, reject) => {
      const w = 500, h = 700;
      const left = Math.round(globalThis.screen.width / 2 - w / 2);
      const top = Math.round(globalThis.screen.height / 2 - h / 2);
      const popup = globalThis.open(authUrl, 'spotify-auth', `width=${w},height=${h},left=${left},top=${top},popup=1`);
      if (!popup) { reject(new Error('Popup blocked — allow popups for this site')); return; }

      const onMessage = (e) => {
        if (e.origin !== globalThis.location.origin) return;
        if (e.data?.type !== 'spotify-auth-callback') return;
        globalThis.removeEventListener('message', onMessage);
        clearInterval(closePoll);
        if (e.data.error) reject(new Error(e.data.error));
        else if (e.data.code) resolve(e.data.code);
        else reject(new Error('No authorization code received'));
      };
      globalThis.addEventListener('message', onMessage);

      const closePoll = setInterval(() => {
        if (popup.closed) {
          clearInterval(closePoll);
          globalThis.removeEventListener('message', onMessage);
          reject(new Error('Sign-in cancelled'));
        }
      }, 500);
    });
  } else {
    // Extension flow: chrome.identity.launchWebAuthFlow
    const responseUrl = await new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.identity?.launchWebAuthFlow) { // eslint-disable-line no-undef
        reject(new Error('chrome.identity API not available — load the extension from chrome://extensions'));
        return;
      }
      chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (url) => { // eslint-disable-line no-undef
        const lastError = chrome.runtime?.lastError; // eslint-disable-line no-undef
        if (lastError) reject(new Error(lastError.message));
        else if (url) resolve(url);
        else reject(new Error('Auth cancelled'));
      });
    });
    code = new URL(responseUrl).searchParams.get('code');
  }

  if (!code) throw new Error('No authorization code received');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: SPOTIFY_CLIENT_ID,
      code_verifier: verifier,
    }),
  });

  if (!res.ok) throw new Error('Token exchange failed');
  const tokens = await res.json();

  const stored = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() + tokens.expires_in * 1000,
  };
  if (isWebMode()) {
    // sessionStorage: tokens scoped to the browser session, not persisted across visits.
    // CONNECTED_FLAG intentionally stays in localStorage (non-sensitive boolean).
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify(stored));
  } else {
    await chrome?.storage?.local?.set({ [TOKEN_KEY]: stored }); // eslint-disable-line no-undef
  }
  localStorage.setItem(CONNECTED_FLAG, '1'); // sync flag so isSpotifyConnected() is immediate
  return stored.access_token;
};

// Web mode: tokens live in sessionStorage (scoped to browser session).
async function getWebAccessToken() {
  const raw = sessionStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  let stored;
  try { stored = JSON.parse(raw); } catch { return null; }
  if (!stored?.access_token) return null;
  if (stored.expires_at - Date.now() > 30_000) return stored.access_token;
  if (!stored.refresh_token) return null;

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: stored.refresh_token,
      client_id: SPOTIFY_CLIENT_ID,
    }),
  });
  if (!res.ok) return null;
  const tokens = await res.json();
  const updated = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || stored.refresh_token,
    expires_at: Date.now() + tokens.expires_in * 1000,
  };
  sessionStorage.setItem(TOKEN_KEY, JSON.stringify(updated));
  return updated.access_token;
}

async function getExtensionAccessToken() {
  // One-time migration: move tokens from old localStorage storage to chrome.storage.local.
  // This runs silently on first invocation after an update and removes the insecure copy.
  const legacyRaw = localStorage.getItem(TOKEN_KEY);
  if (legacyRaw) {
    try {
      const legacy = JSON.parse(legacyRaw);
      if (legacy?.access_token) {
        await chrome?.storage?.local?.set({ [TOKEN_KEY]: legacy }); // eslint-disable-line no-undef
        localStorage.setItem(CONNECTED_FLAG, '1');
      }
    } catch { /* ignore malformed legacy data */ }
    localStorage.removeItem(TOKEN_KEY); // always clear — even if parse failed
  }

  const result = await chrome?.storage?.local?.get(TOKEN_KEY) ?? {}; // eslint-disable-line no-undef
  const stored = result[TOKEN_KEY] ?? null;
  if (!stored) return null;

  // Still valid
  if (stored.expires_at - Date.now() > 30_000) return stored.access_token;

  // Refresh
  if (!stored.refresh_token) return null;

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: stored.refresh_token,
      client_id: SPOTIFY_CLIENT_ID,
    }),
  });

  // Don't clear stored tokens on a transient refresh failure — only disconnectSpotify() should do that.
  // This prevents the connect screen from reappearing after a network hiccup or token expiry.
  if (!res.ok) return null;

  const tokens = await res.json();
  const updated = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || stored.refresh_token,
    expires_at: Date.now() + tokens.expires_in * 1000,
  };
  await chrome?.storage?.local?.set({ [TOKEN_KEY]: updated }); // eslint-disable-line no-undef
  return updated.access_token;
}

export const getAccessToken = async () => {
  if (isWebMode()) return getWebAccessToken();
  return getExtensionAccessToken();
};

export const disconnectSpotify = () => {
  if (isWebMode()) {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(PROFILE_KEY);
  } else {
    chrome?.storage?.local?.remove([TOKEN_KEY, PROFILE_KEY]); // eslint-disable-line no-undef
  }
  localStorage.removeItem(CONNECTED_FLAG);
};

// Synchronous — reads only the non-sensitive boolean flag, not the token itself.
export const isSpotifyConnected = () => !!localStorage.getItem(CONNECTED_FLAG);

export const getSpotifyProfile = async () => {
  if (isWebMode()) {
    const raw = sessionStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }
  const result = await chrome?.storage?.local?.get(PROFILE_KEY) ?? {}; // eslint-disable-line no-undef
  return result[PROFILE_KEY] ?? null;
};

// ─── Playback API ─────────────────────────────────────────────────────────────

const apiCall = async (method, path, body = null) => {
  const token = await getAccessToken();
  if (!token) throw new Error('not_authenticated');
  const opts = { method, headers: { Authorization: `Bearer ${token}` } };
  if (body) { opts.body = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json'; }
  return fetch(`https://api.spotify.com/v1${path}`, opts);
};

export const getCurrentPlayback = async () => {
  const res = await apiCall('GET', '/me/player');
  if (res.status === 204 || !res.ok) return null;
  return res.json();
};

export const fetchAndCacheProfile = async () => {
  try {
    const res = await apiCall('GET', '/me');
    if (!res.ok) return null;
    const data = await res.json();
    const profile = {
      name: data.display_name || data.id || 'Spotify User',
      avatar: data.images?.[0]?.url ?? null,
    };
    if (isWebMode()) {
      sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } else {
      await chrome?.storage?.local?.set({ [PROFILE_KEY]: profile }); // eslint-disable-line no-undef
    }
    return profile;
  } catch { return null; }
};

export const setPlayPause = (play) => apiCall('PUT', play ? '/me/player/play' : '/me/player/pause');
export const skipNext = () => apiCall('POST', '/me/player/next');
export const skipPrev = () => apiCall('POST', '/me/player/previous');

// ─── Chrome Media Session helpers ────────────────────────────────────────────

/** Queries the background SW for all currently-active browser media sessions (up to 3). */
export const getChromeMedia = () =>
  new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.runtime) { resolve([]); return; }
    try {
      chrome.runtime.sendMessage({ type: 'GET_CHROME_MEDIA' }, (data) => {
        if (chrome.runtime.lastError) { resolve([]); return; }
        let normalized;
        if (Array.isArray(data)) normalized = data;
        else normalized = data ? [data] : [];
        resolve(normalized);
      });
    } catch { resolve([]); }
  });

/** Tells the background SW to dispatch a media action to the given tab (or the most recently active media tab). */
export const sendChromeMediaAction = (action, tabId) => {
  if (typeof chrome === 'undefined' || !chrome.runtime) return;
  try { chrome.runtime.sendMessage({ type: 'CHROME_MEDIA_ACTION', action, ...(tabId != null && { tabId }) }); } catch { }
};

// ─── Album art color extraction ───────────────────────────────────────────────

export const extractAlbumColor = (imageUrl) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 4; canvas.height = 4;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, 4, 4);
      const data = ctx.getImageData(0, 0, 4, 4).data;
      let r = 0, g = 0, b = 0;
      const n = data.length / 4;
      for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
      resolve({ r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) });
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
