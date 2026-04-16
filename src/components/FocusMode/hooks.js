import { useState, useEffect, useCallback, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { getCoords, fetchOpenMeteo, parseWeather } from '../../widgets/weather/utils.jsx';
import { getCurrentPhoto, rotatePhoto, jumpToPhotoById, getCachedPhotoSync } from '../../utilities/unsplash';
import { useWidgetInstancesStore } from '../../store';
// Shared hooks — also usable by canvas-mode widgets
import { useSpotify } from '../../widgets/spotify/useSpotify';
import { useStocks } from '../../widgets/stock/useStocks';

// ─── Weather ──────────────────────────────────────────────────────────────────

export const useFocusWeather = () => {
  const [weather, setWeather] = useState(null);
  // Read from Zustand widgetSettings — reactive to same-tab setting changes.
  const weatherSettings = useWidgetInstancesStore(s => {
    const inst = s.instances.find(i => i.type === 'weather');
    const ws = inst ? (s.widgetSettings[inst.id] ?? s.widgetSettings['weather']) : s.widgetSettings['weather'];
    return ws ?? null;
  });

  useEffect(() => {
    const location = weatherSettings?.location ?? null;
    const unit = weatherSettings?.unit ?? 'metric';
    const load = async () => {
      try {
        let lat, lon;
        if (location) { lat = location.lat; lon = location.lon; }
        else { try { ({ lat, lon } = await getCoords()); } catch { return; } }
        const cityName = location?.name || '';
        const data = await fetchOpenMeteo(lat, lon, unit);
        setWeather({ ...parseWeather(data, cityName), unit });
      } catch { }
    };
    load();
    const timerId = setInterval(load, 30 * 60_000);
    return () => clearInterval(timerId);
  }, [weatherSettings]);
  return weather;
};

// ─── Stocks (delegates to shared hook) ───────────────────────────────────────

export const useFocusStocks = useStocks;

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
