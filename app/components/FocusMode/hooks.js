import { useState, useEffect, useCallback, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { useWeather } from "../../hooks/useWeather";
import {
  getCurrentPhoto,
  rotatePhoto,
  jumpToPhotoById,
  getCachedPhotoSync,
  getPhotoLibrary,
  setCurrentPhotoId,
} from "../../utilities/unsplash";
import { useWidgetInstancesStore } from "../../store";
import { useLocationStore } from "../../store/useLocationStore";
import {
  isGoogleAuthAvailable,
  getGoogleUserProfile,
} from "../../utilities/googleAuth";
import { useGoogleAccountStore } from "../../store/useGoogleAccountStore";

const HISTORY_KEY = "fm_search_history";

// ─── Weather ──────────────────────────────────────────────────────────────────

export const useFocusWeather = () => {
  // Read from Zustand widgetSettings — reactive to same-tab setting changes.
  // Use a two-step selector to avoid creating a new reference on every
  // unrelated store mutation (e.g. notes keystrokes, RSS refresh).
  // Step 1: find the weather instance id (stable unless instances array reorders).
  // Returns a primitive string — no useShallow needed (identity compare is enough).
  const weatherInstId = useWidgetInstancesStore((s) => {
    const inst = s.instances.find((i) => i.type === "weather");
    return inst?.id ?? "weather";
  });
  // Step 2: read only that instance's settings — isolated from other widget writes.
  const weatherSettings = useWidgetInstancesStore(
    useShallow((s) => s.widgetSettings[weatherInstId] ?? null),
  );

  // Fall back to the centralized location store when no manual location is set
  const { geoLat, geoLon, geoSource } = useLocationStore(
    useShallow((s) => ({ geoLat: s.lat, geoLon: s.lon, geoSource: s.source })),
  );

  const location = weatherSettings?.location ?? null;
  const unit = weatherSettings?.unit ?? "metric";

  // Resolve coords: manual location → geo store → nothing
  const useGeo = geoSource !== "default";
  const lat = location?.lat ?? (useGeo ? geoLat : null);
  const lon = location?.lon ?? (useGeo ? geoLon : null);
  const city = location?.name || "";

  const { weather } = useWeather({ lat, lon, unit, cityName: city });
  return weather ? { ...weather, unit } : null;
};

// ─── Stocks (delegates to shared hook) ───────────────────────────────────────

export { useStocks as useFocusStocks } from "../../widgets/stock/useStocks";

// ─── Photo (crossfade slots) ──────────────────────────────────────────────────

export const useFocusPhoto = () => {
  // Read cached photo once at mount via useRef — avoids repeated localStorage reads.
  const initRef = useRef(undefined);
  if (initRef.current === undefined)
    initRef.current = getCachedPhotoSync() ?? null;
  const cached = initRef.current;
  const [photo, setPhoto] = useState(cached);
  const [slotA, setSlotA] = useState(cached?.regular ?? null);
  const [slotB, setSlotB] = useState(null);
  const [activeSlot, setActiveSlot] = useState("a");
  // Seed with the already-displayed URL so the mount effect's applyPhoto
  // short-circuits when getCachedPhotoSync and getCurrentPhoto return the same
  // photo — preventing a spurious slot-switch on first render.
  const cachedUrl = cached?.regular ?? cached?.url ?? null;
  const prevUrlRef = useRef(cachedUrl);
  // Mirror of activeSlot so applyPhoto can decide which slot to write without
  // nesting setState inside another setState's updater (impure updater).
  const activeSlotRef = useRef("a");

  const applyPhoto = useCallback((p) => {
    if (!p) return;
    const url = p.regular || p.url;
    if (url === prevUrlRef.current) return;
    prevUrlRef.current = url;
    setCurrentPhotoId(p.id);
    setPhoto(p);
    const next = activeSlotRef.current === "a" ? "b" : "a";
    if (activeSlotRef.current === "a") setSlotB(url);
    else setSlotA(url);
    activeSlotRef.current = next;
    setActiveSlot(next);
  }, []);

  // Called with no args: advance to next photo (shuffle).
  // Called with a photo id (+ optional photo object): jump to that specific photo.
  // The photo object, when provided, is used directly — skipping the cache lookup
  // that was prone to returning the wrong photo when a concurrent download
  // rewrote the cache between the user's click and the timer firing.
  const rotate = useCallback(
    async (targetId, targetPhoto) => {
      prevUrlRef.current = null; // force re-apply even if same URL
      if (targetId) {
        jumpToPhotoById(targetId);
        // Use the passed photo object if available; otherwise fall back to cache lookup.
        const p =
          targetPhoto ??
          getPhotoLibrary().find((ph) => ph.id === targetId) ??
          (await getCurrentPhoto());
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
    },
    [applyPhoto],
  );

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      // Always restore the user's last explicit selection to cache head before
      // reading — handles the 45-min auto-rotate and concurrent download cases.
      const p = await getCurrentPhoto();
      if (mounted && p) applyPhoto(p);
    };
    init();
    const id = setInterval(() => {
      if (!mounted || document.hidden) return;
      rotatePhoto().then((p) => {
        if (mounted && p) applyPhoto(p);
      });
    }, 45 * 60_000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
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
      if (!("wakeLock" in navigator)) return;
      try {
        lockRef.current = await navigator.wakeLock.request("screen");
      } catch { }
    };
    acquire();
    const onVisible = () => {
      if (document.visibilityState === "visible" && !lockRef.current) acquire();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      lockRef.current?.release().catch(() => { });
      lockRef.current = null;
    };
  }, [active]);
};

// ─── Center-zone contrast sampler ─────────────────────────────────────────────

/**
 * Per-zone luminance detection — samples three image regions independently
 * so each text element can adapt to the background directly behind it.
 *
 * Approach (Samsung / iOS lock screen pattern):
 *   • Sample a region that covers only the area where the text actually appears.
 *   • Compute relative luminance (WCAG formula, gamma-corrected sRGB).
 *   • Return a boolean per zone: true = text zone is dark → use white text.
 *   • Default to true (safe: white text never disappears on dark photos).
 *
 * Returns: { clock: bool, greet: bool }
 */
export const useCenterOnDark = (slotA, slotB, activeSlot) => {
  const [zones, setZones] = useState({
    clock: true,
    search: true,
    greet: true,
  });
  useEffect(() => {
    // slotA/slotB hold CDN image URLs (p.regular). Never use the Unsplash page
    // URL (p.url) here — that origin blocks cross-origin canvas reads.
    const url = activeSlot === "a" ? slotA : slotB;
    if (!url || url.includes("unsplash.com/photos/")) return;

    // Immediately assume dark (safe default) while the analysis runs.
    setZones({ clock: true, search: true, greet: true });

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      try {
        // Render the full image into a fixed-size canvas for sampling.
        const W = 320;
        const H = Math.round((img.naturalHeight / img.naturalWidth) * W);
        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, W, H);

        // Helper: compute a perceptual luminance estimate for a pixel rectangle.
        //
        // Algorithm: percentile-weighted blend with complexity bias.
        //  • p20 (dark quintile) weighted most  — ensures text stays readable
        //    against the brightest patches too, not just the average.
        //  • Median (p50) for the "typical" look of the zone.
        //  • p80 (bright quintile) weighted least.
        //  • complexityBias: when the zone has a large bright↔dark range (sunset,
        //    edge of window, etc.), nudge the score downward so we lean toward
        //    white text. White + a subtle shadow is legible on BOTH light and dark
        //    patches; pure black text has no fallback on a dark patch.
        //
        // Uses gamma-corrected sRGB → relative luminance (WCAG 2.1).
        const lumOf = (x, y, w, h) => {
          x = Math.max(0, Math.round(x));
          y = Math.max(0, Math.round(y));
          w = Math.min(W - x, Math.round(w));
          h = Math.min(H - y, Math.round(h));
          if (w <= 0 || h <= 0) return 0.5;
          const d = ctx.getImageData(x, y, w, h).data;
          const n = d.length / 4;
          const vals = new Float32Array(n);
          for (let i = 0, j = 0; i < d.length; i += 4, j++) {
            const r = (d[i] / 255) ** 2.2;
            const g = (d[i + 1] / 255) ** 2.2;
            const b = (d[i + 2] / 255) ** 2.2;
            vals[j] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          }
          vals.sort(); // Float32Array sorts numerically by default
          const p20 = vals[Math.floor(n * 0.2)];
          const p50 = vals[Math.floor(n * 0.5)];
          const p80 = vals[Math.floor(n * 0.8)];
          // Clamp bias to 0.10 — prevents overcorrection on very contrasty images.
          const complexityBias = Math.min((p80 - p20) * 0.4, 0.1);
          return 0.35 * p20 + 0.45 * p50 + 0.2 * p80 - complexityBias;
        };

        // Clock zone: center 56% wide × middle 30% of height.
        const clockLum = lumOf(W * 0.22, H * 0.33, W * 0.56, H * 0.3);

        // Search bar zone: center 64% wide × band at 52–70% of height.
        // The search bar sits just below the clock, often over the horizon or
        // water — a region that can be much lighter than the sky above.
        const searchLum = lumOf(W * 0.18, H * 0.52, W * 0.64, H * 0.18);

        // Greeting zone: center 72% wide × bottom 22% of height.
        // Samples where the greeting text actually sits (near the bottom).
        const greetLum = lumOf(W * 0.14, H * 0.74, W * 0.72, H * 0.22);

        setZones({
          // Use 0.45 threshold (slightly below midpoint) — biases toward
          // keeping white text on ambiguous backgrounds for safety.
          clock: clockLum < 0.45,
          search: searchLum < 0.45,
          greet: greetLum < 0.45,
        });
      } catch { }
    };
    img.src = url;
    return () => {
      cancelled = true;
      img.onload = null;
      img.src = ""; // cancels any in-flight network request
    };
  }, [slotA, slotB, activeSlot]);
  return zones;
};

// ─── Focus Mode world clocks (reads from the first clock widget's settings) ──

export const useFocusTimezones = () => {
  // Read directly from Zustand widgetSettings — reactive to same-tab changes,
  // no polling interval or storage event listener needed.
  const timezones = useWidgetInstancesStore(
    useShallow((s) => {
      const clockInst = s.instances.find((i) => i.type === "clock");
      if (!clockInst) return [];
      const ws = s.widgetSettings[clockInst.id] ?? s.widgetSettings["clock"];
      return ws?.timezones ?? [];
    }),
  );
  return timezones;
};

// ─── Spotify (direct re-export of shared hook) ───────────────────────────────

export { useSpotify as useFocusSpotify } from "../../widgets/media/hooks/useSpotify";

// ─── Search bar utilities (used by panels/SearchBar.jsx) ──────────────────────

export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

export function switchToTab(tab) {
  /* eslint-disable no-undef */
  if (typeof chrome === "undefined" || !chrome.tabs?.update) return;
  chrome.tabs.update(tab.id, { active: true });
  if (chrome.windows?.update)
    chrome.windows.update(tab.windowId, { focused: true });
  /* eslint-enable no-undef */
}

// ─── Browser media sessions (SoundCloud, YouTube Music, Apple Music, etc.) ───

/**
 * Shared browser-media hook — re-exported for Focus Mode.
 *
 * Reads live sessions from chrome.storage.local['chrome_media_sessions']
 * (written by bg.js) and returns the actively-playing session as a normalized
 * `track` (same smart selection the canvas Media widget uses), plus `sessions`,
 * `sendAction`, `pending`, and `skipPending`. See
 * `app/widgets/media/hooks/useChromeMedia.js` for the implementation.
 */
export { useChromeMedia } from "../../widgets/media/hooks/useChromeMedia";

// ─── Focus tasks (Google Tasks) ──────────────────────────────────────────────

const gtasks = () => import("../../utilities/googleTasks");

export function useFocusTasks() {
  // Single source of truth — read directly from the Zustand store.
  // When connected flips (connect/disconnect from anywhere in the app),
  // this hook re-renders and the effect below responds immediately.
  const connected = useGoogleAccountStore((s) => s.connected);

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gtasksConnected, setGtasksConnected] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  // Tracks whether the initial auth attempt has completed (success or failure).
  // Until this is true the panel shows skeleton instead of "Connect Tasks".
  const [hasAttempted, setHasAttempted] = useState(false);

  // Ref mirror of tasks — lets mutation callbacks read the current list without
  // being in their dependency arrays (avoids recreating on every task change).
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  const load = useCallback(async () => {
    if (!isGoogleAuthAvailable()) {
      setHasAttempted(true);
      return;
    }
    setLoading(true);
    try {
      const { fetchGoogleTasks } = await gtasks();
      const list = await fetchGoogleTasks();
      setTasks(list);
      setGtasksConnected(true);
      // Fetch profile lazily — non-blocking, don't await
      getGoogleUserProfile()
        .then((p) => {
          if (p) setUserProfile(p);
        })
        .catch(() => {});
    } catch {
      setTasks([]);
      setGtasksConnected(false);
    } finally {
      setLoading(false);
      setHasAttempted(true);
    }
  }, []);

  // React directly to Zustand auth state — no DOM event relay needed.
  // connected=true  → load tasks from API
  // connected=false → wipe all local state immediately, show "not connected"
  useEffect(() => {
    if (connected) {
      load();
    } else {
      setGtasksConnected(false);
      setUserProfile(null);
      setTasks([]);
      setHasAttempted(true);
    }
  }, [connected, load]);

  const add = useCallback(async (title) => {
    if (!title.trim()) return;
    const optimistic = {
      id: `opt-${Date.now()}`,
      title,
      completed: false,
      due: null,
      notes: null,
      listId: "@default",
    };
    setTasks((prev) => [optimistic, ...prev]);
    try {
      const { addGoogleTask } = await gtasks();
      const created = await addGoogleTask(title);
      setTasks((prev) =>
        prev.map((t) => (t.id === optimistic.id ? created : t)),
      );
    } catch {
      setTasks((prev) => prev.filter((t) => t.id !== optimistic.id));
    }
  }, []);

  const toggle = useCallback(async (taskId) => {
    const task = tasksRef.current.find((t) => t.id === taskId);
    if (!task) return;
    const done = !task.completed;
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: done } : t)),
    );
    try {
      const { completeGoogleTask } = await gtasks();
      await completeGoogleTask(taskId, done, task.listId);
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, completed: !done } : t)),
      );
    }
  }, []);

  const edit = useCallback(
    async (taskId, newTitle) => {
      if (!newTitle.trim()) return;
      const task = tasksRef.current.find((t) => t.id === taskId);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, title: newTitle } : t)),
      );
      try {
        const { updateGoogleTask } = await gtasks();
        await updateGoogleTask(taskId, { title: newTitle }, task?.listId);
      } catch {
        load();
      }
    },
    [load],
  );

  const remove = useCallback(
    async (taskId) => {
      const task = tasksRef.current.find((t) => t.id === taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      try {
        const { deleteGoogleTask } = await gtasks();
        await deleteGoogleTask(taskId, task?.listId);
      } catch {
        load();
      }
    },
    [load],
  );

  return {
    tasks,
    loading,
    gtasksConnected,
    setGtasksConnected,
    userProfile,
    setUserProfile,
    hasAttempted,
    add,
    toggle,
    edit,
    remove,
    reload: load,
  };
}
