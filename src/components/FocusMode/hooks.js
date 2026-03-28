import { useState, useEffect, useCallback, useRef } from 'react';
import { API_KEY, getCoords, fetchWeatherByCoords, parseWeather } from '../../widgets/weather/utils.jsx';
import { fetchChart } from '../../widgets/stock/utils';
import { getCurrentPhoto, rotatePhoto, jumpToPhotoById, getCachedPhotoSync } from '../../utilities/unsplash';
import { useWidgetInstancesStore } from '../../store';

// ─── Weather ──────────────────────────────────────────────────────────────────

export const useFocusWeather = () => {
  const [weather, setWeather] = useState(null);
  useEffect(() => {
    if (!API_KEY) return;
    let location = null, unit = 'metric';
    try {
      // Try fixed legacy key first, then scan instances for the actual UUID-based key
      let ws = JSON.parse(localStorage.getItem('widgetSettings_weather') || 'null');
      if (!ws) {
        const raw = JSON.parse(localStorage.getItem('widget_instances') || 'null');
        const instancesList = Array.isArray(raw) ? raw : (raw?.state?.instances || []);
        const wid = instancesList.find(i => i.type === 'weather')?.id;
        if (wid) ws = JSON.parse(localStorage.getItem(`widgetSettings_${wid}`) || 'null');
      }
      if (ws) { location = ws.location || null; unit = ws.unit || 'metric'; }
    } catch { }
    const load = async () => {
      try {
        let lat, lon;
        if (location) { lat = location.lat; lon = location.lon; }
        else { try { ({ lat, lon } = await getCoords()); } catch { return; } }
        const data = await fetchWeatherByCoords(lat, lon, unit);
        setWeather({ ...parseWeather(data), unit });
      } catch { }
    };
    load();
    const id = setInterval(load, 30 * 60_000);
    return () => clearInterval(id);
  }, []);
  return weather;
};

// ─── Stocks ───────────────────────────────────────────────────────────────────

export const useFocusStocks = () => {
  const [stocks, setStocks] = useState([]);
  useEffect(() => {
    let symbols = [];
    try {
      const direct = JSON.parse(localStorage.getItem('widgetSettings_stock') || 'null');
      if (direct?.symbols?.length) {
        symbols = direct.symbols;
      } else {
        const raw = JSON.parse(localStorage.getItem('widget_instances') || 'null');
        const instancesList = Array.isArray(raw) ? raw : (raw?.state?.instances || []);
        const id = instancesList.find(i => i.type === 'stock')?.id;
        if (id) {
          const ws = JSON.parse(localStorage.getItem(`widgetSettings_${id}`) || 'null');
          if (ws?.symbols?.length) symbols = ws.symbols;
        }
      }
    } catch { }
    if (!symbols.length) return;
    const load = async () => {
      const results = await Promise.all(symbols.map(s => fetchChart(s).catch(() => null)));
      setStocks(symbols.map((sym, i) => ({ sym, data: results[i] })));
    };
    load();
    const id = setInterval(load, 5 * 60_000);
    return () => clearInterval(id);
  }, []);
  return stocks;
};

// ─── Photo (crossfade slots) ──────────────────────────────────────────────────

export const useFocusPhoto = () => {
  const [photo, setPhoto] = useState(() => getCachedPhotoSync());
  const [slotA, setSlotA] = useState(() => getCachedPhotoSync()?.regular || null);
  const [slotB, setSlotB] = useState(null);
  const [activeSlot, setActiveSlot] = useState('a');
  const prevUrlRef = useRef(null);

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
    const url = activeSlot === 'a' ? slotA : slotB;
    if (!url) return;
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
  const [timezones, setTimezones] = useState([]);
  // Use the store directly — reliable even when widget_instances hasn't been
  // written to localStorage yet (Zustand persist only writes on first change).
  const instances = useWidgetInstancesStore(s => s.instances);

  useEffect(() => {
    const clockInst = instances.find(i => i.type === 'clock');
    if (!clockInst) { setTimezones([]); return; }

    const read = () => {
      try {
        const ws = JSON.parse(localStorage.getItem(`widgetSettings_${clockInst.id}`) || '{}');
        setTimezones(ws.timezones || []);
      } catch { setTimezones([]); }
    };

    read();
    // Poll every 5 s to pick up same-tab changes (storage event is cross-tab only).
    const pollId = setInterval(read, 5_000);
    const onStorage = (e) => { if (e.key?.startsWith('widgetSettings_')) read(); };
    window.addEventListener('storage', onStorage);
    return () => { clearInterval(pollId); window.removeEventListener('storage', onStorage); };
  }, [instances]);

  return timezones;
};
