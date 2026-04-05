// ─── Replace with your Spotify app's Client ID ─────────────────────────────
// 1. Go to https://developer.spotify.com/dashboard and create an app
// 2. Add your extension's redirect URI: https://<your-extension-id>.chromiumapp.org/
//    (find your extension ID at chrome://extensions)
// 3. Paste your Client ID below
export const SPOTIFY_CLIENT_ID = 'a82f9a5c893848aba34a6cee1422739c';

const SCOPES = 'user-read-playback-state user-modify-playback-state user-read-private user-read-email';
const TOKEN_KEY = 'spotify_tokens';
const PROFILE_KEY = 'spotify_profile';

// ─── PKCE helpers ────────────────────────────────────────────────────────────

const generateCodeVerifier = () => {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const generateCodeChallenge = async (verifier) => {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const getRedirectUri = () => {
  const id = typeof chrome !== 'undefined' && chrome.runtime?.id;
  if (!id) throw new Error('Chrome extension context unavailable. Load the extension from chrome://extensions before connecting.');
  return `https://${id}.chromiumapp.org/`;
};

// ─── Auth ────────────────────────────────────────────────────────────────────

export const connectSpotify = async () => {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const redirectUri = getRedirectUri();

  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params}`;

  const responseUrl = await new Promise((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.identity?.launchWebAuthFlow) {
      reject(new Error('chrome.identity API not available — load the extension from chrome://extensions'));
      return;
    }
    chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (url) => {
      const lastError = chrome.runtime?.lastError;
      if (lastError) reject(new Error(lastError.message));
      else if (!url) reject(new Error('Auth cancelled'));
      else resolve(url);
    });
  });

  const code = new URL(responseUrl).searchParams.get('code');
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
  localStorage.setItem(TOKEN_KEY, JSON.stringify(stored));
  return stored.access_token;
};

export const getAccessToken = async () => {
  let stored;
  try { stored = JSON.parse(localStorage.getItem(TOKEN_KEY)); } catch { return null; }
  if (!stored) return null;

  // Still valid
  if (stored.expires_at - Date.now() > 30_000) return stored.access_token;

  // Refresh
  if (!stored.refresh_token) { return null; }

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
  if (!res.ok) { return null; }

  const tokens = await res.json();
  const updated = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || stored.refresh_token,
    expires_at: Date.now() + tokens.expires_in * 1000,
  };
  localStorage.setItem(TOKEN_KEY, JSON.stringify(updated));
  return updated.access_token;
};

export const disconnectSpotify = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PROFILE_KEY);
};

export const isSpotifyConnected = () => !!localStorage.getItem(TOKEN_KEY);

export const getSpotifyProfile = () => {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY)); } catch { return null; }
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
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    return profile;
  } catch { return null; }
};

export const setPlayPause = (play) => apiCall('PUT', play ? '/me/player/play' : '/me/player/pause');
export const skipNext = () => apiCall('POST', '/me/player/next');
export const skipPrev = () => apiCall('POST', '/me/player/previous');

// ─── Chrome Media Session helpers ────────────────────────────────────────────

/** Queries the background SW for any currently-playing browser media session. */
export const getChromeMedia = () =>
  new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.runtime) { resolve(null); return; }
    try {
      chrome.runtime.sendMessage({ type: 'GET_CHROME_MEDIA' }, (data) => {
        if (chrome.runtime.lastError) { resolve(null); return; }
        resolve(data ?? null);
      });
    } catch { resolve(null); }
  });

/** Tells the background SW to dispatch a media action on the active media tab. */
export const sendChromeMediaAction = (action) => {
  if (typeof chrome === 'undefined' || !chrome.runtime) return;
  try { chrome.runtime.sendMessage({ type: 'CHROME_MEDIA_ACTION', action }); } catch { }
};

// ─── Album art color extraction ───────────────────────────────────────────────

export const extractAlbumColor = (imageUrl) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 4; canvas.height = 4;
      const ctx = canvas.getContext('2d');
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
