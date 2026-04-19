import { useState, useEffect, useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { fetchOpenMeteo, parseWeather } from '../../widgets/weather/utils.jsx';
import { getCurrentPhoto, rotatePhoto, jumpToPhotoById, getCachedPhotoSync } from '../../utilities/unsplash';
import { useWidgetInstancesStore } from '../../store';
import { useLocationStore } from '../../store/useLocationStore';
import { searchDriveFiles } from '../../utilities/googleDrive';
// Shared hooks — also usable by canvas-mode widgets
import { useSpotify } from '../../widgets/spotify/useSpotify';

const HISTORY_KEY = 'fm_search_history';
const MAX_HISTORY = 12;

// ─── Weather ──────────────────────────────────────────────────────────────────

export const useFocusWeather = () => {
  const [weather, setWeather] = useState(null);
  // Read from Zustand widgetSettings — reactive to same-tab setting changes.
  const weatherSettings = useWidgetInstancesStore(s => {
    const inst = s.instances.find(i => i.type === 'weather');
    const ws = inst ? (s.widgetSettings[inst.id] ?? s.widgetSettings['weather']) : s.widgetSettings['weather'];
    return ws ?? null;
  });

  // Fall back to the centralized location store when no manual location is set
  const { geoLat, geoLon, geoSource } = useLocationStore(
    useShallow(s => ({ geoLat: s.lat, geoLon: s.lon, geoSource: s.source })),
  );

  useEffect(() => {
    const location = weatherSettings?.location ?? null;
    const unit = weatherSettings?.unit ?? 'metric';
    const load = async () => {
      try {
        let lat, lon;
        if (location) {
          lat = location.lat;
          lon = location.lon;
        } else if (geoSource !== 'default' && geoLat != null) {
          lat = geoLat;
          lon = geoLon;
        } else {
          return; // No usable location
        }
        const cityName = location?.name || '';
        const data = await fetchOpenMeteo(lat, lon, unit);
        setWeather({ ...parseWeather(data, cityName), unit });
      } catch { }
    };
    load();
    const timerId = setInterval(load, 30 * 60_000);
    return () => clearInterval(timerId);
  }, [weatherSettings, geoLat, geoLon, geoSource]);
  return weather;
};

// ─── Stocks (delegates to shared hook) ───────────────────────────────────────

export { useStocks as useFocusStocks } from '../../widgets/stock/useStocks';

// ─── Photo (crossfade slots) ──────────────────────────────────────────────────

export const useFocusPhoto = () => {
  // Read cached photo once at mount via useRef — avoids repeated localStorage reads.
  const initRef = useRef(undefined);
  if (initRef.current === undefined) initRef.current = getCachedPhotoSync() ?? null;
  const cached = initRef.current;
  const [photo, setPhoto] = useState(cached);
  const [slotA, setSlotA] = useState(cached?.regular ?? null);
  const [slotB, setSlotB] = useState(null);
  const [activeSlot, setActiveSlot] = useState('a');
  // Seed with the already-displayed URL so the mount effect's applyPhoto
  // short-circuits when getCachedPhotoSync and getCurrentPhoto return the same
  // photo — preventing a spurious slot-switch on first render.
  const cachedUrl = cached?.regular ?? cached?.url ?? null;
  const prevUrlRef = useRef(cachedUrl);

  const applyPhoto = useCallback((p) => {
    if (!p) return;
    const url = p.regular || p.url;
    if (url === prevUrlRef.current) return;
    prevUrlRef.current = url;
    setPhoto(p);
    setActiveSlot(cur => {
      if (cur === 'a') { setSlotB(url); return 'b'; }
      else { setSlotA(url); return 'a'; }
    });
  }, []);

  // Called with no args: advance to next photo (shuffle).
  // Called with a photo id: jump to that specific photo without advancing others.
  const rotate = useCallback(async (targetId) => {
    prevUrlRef.current = null; // force re-apply even if same URL
    if (targetId) {
      jumpToPhotoById(targetId);
      const p = await getCurrentPhoto();
      if (p) applyPhoto(p);
      return p;
    }
    const p = await rotatePhoto();
    if (p) applyPhoto(p);
    else {
      const fallback = await getCurrentPhoto();
      if (fallback) applyPhoto(fallback);
    }
    return p;
  }, [applyPhoto]);

  useEffect(() => {
    let mounted = true;
    getCurrentPhoto().then(p => { if (mounted && p) applyPhoto(p); });
    const id = setInterval(() => {
      if (!mounted) return;
      rotatePhoto().then(p => { if (mounted && p) applyPhoto(p); });
    }, 45 * 60_000);
    return () => { mounted = false; clearInterval(id); };
  }, [applyPhoto]);

  return { photo, slotA, slotB, activeSlot, rotate };
};

// ─── Wake Lock ────────────────────────────────────────────────────────────────

export const useWakeLock = (active) => {
  const lockRef = useRef(null);
  useEffect(() => {
    if (!active) {
      lockRef.current?.release().catch(() => { });
      lockRef.current = null;
      return;
    }
    const acquire = async () => {
      if (!('wakeLock' in navigator)) return;
      try { lockRef.current = await navigator.wakeLock.request('screen'); } catch { }
    };
    acquire();
    const onVisible = () => { if (document.visibilityState === 'visible') acquire(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      lockRef.current?.release().catch(() => { });
      lockRef.current = null;
    };
  }, [active]);
};

// ─── Center-zone contrast sampler ─────────────────────────────────────────────

export const useCenterOnDark = (slotA, slotB, activeSlot) => {
  const [centerOnDark, setCenterOnDark] = useState(true);
  useEffect(() => {
    // slotA/slotB hold CDN image URLs (p.regular). Never use the Unsplash page
    // URL (p.url) here — that origin blocks cross-origin canvas reads.
    const url = activeSlot === 'a' ? slotA : slotB;
    if (!url || url.includes('unsplash.com/photos/')) return;

    // Immediately assume dark (safe default) while the analysis runs, so the
    // white-shadow style never flashes on during a transition.
    setCenterOnDark(true);

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement('canvas');
        const W = 320, H = 140;
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');
        const srcX = img.naturalWidth * 0.2;
        const srcW = img.naturalWidth * 0.6;
        const srcY = img.naturalHeight * 0.35;
        const srcH = img.naturalHeight * 0.33;
        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, W, H);
        const d = ctx.getImageData(0, 0, W, H).data;
        let r = 0, g = 0, b = 0;
        const pixels = d.length / 4;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
        r /= pixels; g /= pixels; b /= pixels;
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        setCenterOnDark(lum < 0.5);
      } catch { }
    };
    img.src = url;
    return () => { cancelled = true; };
  }, [slotA, slotB, activeSlot]);
  return centerOnDark;
};

// ─── Focus Mode world clocks (reads from the first clock widget's settings) ──

export const useFocusTimezones = () => {
  // Read directly from Zustand widgetSettings — reactive to same-tab changes,
  // no polling interval or storage event listener needed.
  const timezones = useWidgetInstancesStore(useShallow(s => {
    const clockInst = s.instances.find(i => i.type === 'clock');
    if (!clockInst) return [];
    const ws = s.widgetSettings[clockInst.id] ?? s.widgetSettings['clock'];
    return ws?.timezones ?? [];
  }));
  return timezones;
};

// ─── Spotify (delegates to shared hook) ──────────────────────────────────────
//
// useFocusSpotify is an alias of useSpotify with the old return shape
// (spotifyProgress) preserved for backward-compat with index.jsx.
export const useFocusSpotify = () => {
  const { spotify, progress: spotifyProgress, ...rest } = useSpotify();
  return { spotify, spotifyProgress, ...rest };
};

// ─── Search bar utilities (used by panels/SearchBar.jsx) ──────────────────────

export function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}

export function pushHistory(query) {
  if (!query.trim()) return;
  const prev = getHistory().filter(q => q !== query);
  localStorage.setItem(HISTORY_KEY, JSON.stringify([query, ...prev].slice(0, MAX_HISTORY)));
}

// Autocomplete fetch — CORS is bypassed in the extension via host_permissions;
// in Vite dev mode the suggestProxy middleware in vite.config.ts handles it.
const IS_DEV = typeof location !== 'undefined' && location.hostname === 'localhost';

function suggestUrl(engine) {
  if (!engine.suggest) return null;
  if (!IS_DEV) return engine.suggest;
  const u = new URL(engine.suggest);
  const client = u.searchParams.get('client') || 'chrome';
  const ds = u.searchParams.get('ds') || '';
  if (ds) return `/api/suggest?client=${client}&ds=${ds}&q=`;
  if (client === 'ddg') return '/api/suggest?client=ddg&q=';
  return `/api/suggest?client=${client}&q=`;
}

export async function fetchSuggestionsAsync(engine, query) {
  const url = suggestUrl(engine);
  if (!query.trim() || !url) return [];
  try {
    const res = await fetch(`${url}${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return [];
    const data = await res.json();
    let raw = [];
    if (Array.isArray(data) && Array.isArray(data[1])) {
      // Google/YouTube (flat):   ["query", ["s1", "s2", ...]]
      // Google/YouTube (nested): ["query", [["s1", 0, [...]], ...]]
      // DDG type=list:            ["query", ["s1", "s2", ...]]
      raw = data[1].map(item => (typeof item === 'string' ? item : item?.[0]));
    } else if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && data[0]?.phrase) {
      raw = data.map(d => d.phrase); // DDG legacy: [{phrase: '...'}, ...]
    }
    return raw.filter(s => typeof s === 'string').slice(0, 6);
  } catch { return []; }
}

export function searchOpenTabs(query) {
  return new Promise(resolve => {
    /* eslint-disable no-undef */
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) { resolve([]); return; }
    try {
      chrome.tabs.query({ currentWindow: true }, (tabs) => {
        if (chrome.runtime?.lastError) { resolve([]); return; }
        const q = query.toLowerCase();
        const matches = (tabs || [])
          .filter(t => t.title?.toLowerCase().includes(q) || t.url?.toLowerCase().includes(q))
          .slice(0, 3);
        resolve(matches);
      });
    } catch { resolve([]); }
    /* eslint-enable no-undef */
  });
}

export function switchToTab(tab) {
  /* eslint-disable no-undef */
  if (typeof chrome === 'undefined' || !chrome.tabs?.update) return;
  chrome.tabs.update(tab.id, { active: true });
  if (chrome.windows?.update) chrome.windows.update(tab.windowId, { focused: true });
  /* eslint-enable no-undef */
}

/** Search Google Drive files by name. Silent no-op if Drive not authorised. */
export async function searchDriveFilesAsync(query) {
  if (!query?.trim()) return [];
  return searchDriveFiles(query).catch(() => []);
}

// ─── Browser media sessions (SoundCloud, YouTube Music, Apple Music, etc.) ───

import { getChromeMedia, sendChromeMediaAction } from '../../widgets/spotify/utils';

/**
 * Polls the background SW for browser media sessions every 3s.
 * Returns the top session (most recently active) as a normalized track object,
 * or null when nothing is playing.
 * Also returns a `sendAction(action)` helper for play/pause/next/previous.
 */
export function useChromeMedia() {
  const [sessions, setSessions] = useState([]);
  const [pending, setPending] = useState(false);
  const [skipPending, setSkipPending] = useState(null); // 'next' | 'prev' | null

  useEffect(() => {
    let cancelled = false;
    const fetch = async () => {
      const data = await getChromeMedia();
      if (!cancelled) {
        setSessions(data);
        // Clear pending indicators once the next poll arrives — the action has
        // propagated to the source tab by this point.
        setPending(false);
        setSkipPending(null);
      }
    };
    fetch();
    const id = setInterval(fetch, 3000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const top = sessions[0] ?? null;

  const track = top ? {
    title: top.title || 'Playing',
    artist: top.artist || top.host || '',
    albumArt: top.artwork || null,
    isPlaying: top.playbackState === 'playing',
    tabId: top.tabId,
    host: top.host,
    // No duration info from mediaSession, so progress bar is omitted.
    durationMs: null,
    progressMs: null,
  } : null;

  const sendAction = useCallback((action) => {
    if (!top) return;
    if (action === 'play' || action === 'pause') setPending(true);
    if (action === 'next') setSkipPending('next');
    if (action === 'previous') setSkipPending('prev');
    sendChromeMediaAction(action, top.tabId);
  }, [top]);

  return { track, sendAction, pending, skipPending };
}
