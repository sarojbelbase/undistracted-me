/**
 * Undistracted Me — Background Service Worker
 *
 * Responsibilities:
 *   1. Event reminders — alarm fires every minute; checks localStorage-synced events
 *      and fires a notification 5 minutes before each upcoming event.
 *   2. Pomodoro — page sends a POMODORO_DONE message; SW fires a completion notification.
 */

// ─── Alarm names ──────────────────────────────────────────────────────────────
const ALARM_TICK = "UM_TICK"; // fires every 1 min for event reminders
const ALARM_LOOKAWAY = "UM_LOOKAWAY"; // fires every N min for eye-break reminders
const ALARM_PREFETCH = "UM_PREFETCH"; // fires every 30 min for background data pre-fetch
const ALARM_RSS = "UM_RSS";           // fires every 30 min for RSS queue pre-fetch

// ─── Event reminder helpers ───────────────────────────────────────────────────

// ─── Module-level state ─────────────────────────────────────────────────────

let storageCache = "[]";
let chromeSessions = {};
let chromeSessionOrder = [];

// IDs of events we've already notified for (in-memory, good for one SW lifetime)
const notified = new Set();

// Stores lat/lon sent from the page for weather pre-fetching
let prefetchCoords = null; // { lat, lon } or null

function checkEventReminders() {
  let events = [];
  try {
    events = JSON.parse(storageCache);
  } catch {
    return;
  }

  const now = Date.now();
  const WINDOW_MS = 5 * 60 * 1000; // notify 5 min before

  for (const ev of events) {
    if (!ev.startDate || !ev.startTime) continue;
    const startMs = new Date(`${ev.startDate}T${ev.startTime}`).getTime();
    const key = `${ev.id}_${ev.startDate}_${ev.startTime}`;
    if (notified.has(key)) continue;

    const diff = startMs - now;
    if (diff >= 0 && diff <= WINDOW_MS) {
      notified.add(key);
      const minsTxt = Math.ceil(diff / 60000);
      const endTxt = ev.endTime ? ` · ends ${ev.endTime}` : "";
      chrome.notifications.create(`event_${key}`, {
        type: "basic",
        iconUrl: "favicon/lotus128.png",
        title: ev.title,
        message: `Starting in ${minsTxt} min${endTxt}`,
        priority: 1,
      });
    }
  }
}

// ─── Storage sync via chrome.storage.local ────────────────────────────────────
// The page writes events to localStorage; the SW can't read localStorage directly.
// We sync via chrome.storage.local — the page mirrors widget_events there on change,
// and the SW reads chrome.storage.local.

async function syncEventsFromStorage() {
  try {
    const result = await chrome.storage.local.get("widget_events");
    storageCache = result.widget_events || "[]";
    checkEventReminders();
  } catch {
    // storage unavailable
  }
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

globalThis.addEventListener("install", () => {
  globalThis.skipWaiting();
});

globalThis.addEventListener("activate", (event) => {
  event.waitUntil(globalThis.clients.claim());
  // Ensure alarms exist
  chrome.alarms.get(ALARM_TICK, (a) => {
    if (!a) chrome.alarms.create(ALARM_TICK, { periodInMinutes: 1 });
  });
  chrome.alarms.get(ALARM_PREFETCH, (a) => {
    if (!a && prefetchCoords)
      chrome.alarms.create(ALARM_PREFETCH, { periodInMinutes: 30 });
  });
  chrome.alarms.get(ALARM_RSS, (a) => {
    if (!a) chrome.alarms.create(ALARM_RSS, { periodInMinutes: 30 });
  });
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_TICK, { periodInMinutes: 1 });
  chrome.alarms.create(ALARM_RSS, { periodInMinutes: 30 });
  injectMediaScript();
});

// Also inject on service worker startup — covers the case where Chrome restarts
// or the extension is reloaded while tabs are already open.
chrome.runtime.onStartup.addListener(injectMediaScript);

/**
 * Programmatically injects media.js into any already-open tabs that match the
 * content_scripts patterns. Necessary because manifest content_scripts are only
 * auto-injected into pages that load *after* the extension is installed/reloaded.
 */
function injectMediaScript() {
  const patterns = [
    "*://*.soundcloud.com/*",
    "*://*.youtube.com/*",
  ];
  chrome.tabs.query({ url: patterns }, (tabs) => {
    for (const tab of tabs ?? []) {
      if (!tab.id) continue;
      chrome.scripting
        .executeScript({
          target: { tabId: tab.id },
          files: ["src/utilities/media.js"],
        })
        .catch(() => {
          /* tab may be discarded or restricted */
        });
    }
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_TICK) syncEventsFromStorage();
  if (alarm.name === ALARM_PREFETCH) runWeatherPrefetch();
  if (alarm.name === ALARM_RSS) runRssPrefetch();

  // ── LookAway break alarm ─────────────────────────────────────────────────
  if (alarm.name === ALARM_LOOKAWAY) {
    const now = Date.now();
    const lateMs = now - alarm.scheduledTime;
    const periodMs = (alarm.periodInMinutes ?? 10) * 60_000;

    if (lateMs > periodMs * 0.5) {
      // This alarm fired late — machine was asleep or Chrome was closed.
      // Chrome fires catch-up alarms with the *original* scheduledTime, so
      // lateMs will be hours/days for a sleep-wake scenario.
      // Don't nag the user the moment they sit down. Reset the countdown
      // from now so the first real break fires after a full interval of active use.
      chrome.alarms.clear(ALARM_LOOKAWAY, () => {
        chrome.alarms.create(ALARM_LOOKAWAY, {
          periodInMinutes: alarm.periodInMinutes ?? 10,
        });
      });
      chrome.storage.local.remove("lookaway_due");
      return;
    }

    // Normal firing during an active session — signal open tabs.
    chrome.storage.local.set({ lookaway_due: now });
    // Only show OS notification if no new tab page is visible AND user wants notifications.
    // If the user already has a new tab open, the in-page overlay fires
    // via storage.onChanged — a system notification on top would be redundant.
    chrome.storage.local.get("lookaway_notify", ({ lookaway_notify }) => {
      if (lookaway_notify === false) return; // user opted out
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        const isNewTab =
          activeTab?.url === "chrome://newtab/" ||
          activeTab?.pendingUrl === "chrome://newtab/" ||
          activeTab?.url?.startsWith("chrome-extension://");
        if (!isNewTab) {
          chrome.notifications.create("lookaway_" + Date.now(), {
            type: "basic",
            iconUrl: "favicon/lotus128.png",
            title: "Time to look away 👁",
            message:
              "Give your eyes a 20-second break. Open a new tab when ready.",
            priority: 1,
          });
        }
      });
    });
  }
});

// ─── Weather pre-fetch ───────────────────────────────────────────────────────

async function runWeatherPrefetch() {
  if (!prefetchCoords) return;
  const { lat, lon } = prefetchCoords;
  try {
    // Fetch current weather + 12h forecast from Open-Meteo (no API key needed)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&hourly=temperature_2m,weather_code,precipitation_probability&forecast_days=1&timezone=auto&wind_speed_unit=ms`;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    // Write to chrome.storage.local with timestamp
    await chrome.storage.local.set({
      weather_sw_cache: {
        data,
        lat,
        lon,
        fetchedAt: Date.now(),
      },
    });
  } catch {
    // Network unavailable — skip silently
  }
}

function handlePrefetchSync(msg) {
  // msg.lat, msg.lon — store in module state
  prefetchCoords = { lat: msg.lat, lon: msg.lon };
  // Create/update the prefetch alarm
  chrome.alarms.get(ALARM_PREFETCH, (existing) => {
    if (!existing) {
      chrome.alarms.create(ALARM_PREFETCH, { periodInMinutes: 30 });
    }
  });
  // Run an immediate prefetch if we just got fresh coords
  runWeatherPrefetch();
}

// ─── RSS queue pre-fetch ─────────────────────────────────────────────────

// RSS proxy URL used in the extension context (CORS-blocked without proxy).
const RSS_PROXY = 'https://undistractedme.sarojbelbase.com.np/api/rss/feed';
const RSS_QUEUE_MAX = 20;

/**
 * Lightweight XML helpers (same logic as api/rss/feed.js — kept inline to
 * avoid ES module import issues in the MV3 service worker build).
 */
function _rssGetTag(xml, tag) {
  const re = new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + tag + '>', 'i');
  const m = re.exec(xml);
  if (!m) return '';
  return m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

function _rssParseItems(xml, fallback) {
  const items = [];
  const isAtom = /<feed[\s>]/i.test(xml);
  const blockRe = isAtom ? /<entry[\s>]([\s\S]*?)<\/entry>/gi : /<item[\s>]([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = blockRe.exec(xml)) !== null) {
    const b = m[1];
    const title = _rssGetTag(b, 'title');
    if (!title) continue;
    let link = '';
    if (isAtom) {
      const lm = /<link[^>]+href=["']([^"']+)["']/i.exec(b);
      link = lm ? lm[1] : _rssGetTag(b, 'id');
    } else {
      link = b.match(/<link>([\s\S]*?)<\/link>/i)?.[1]?.trim() || _rssGetTag(b, 'guid');
    }
    const dateStr = isAtom
      ? (_rssGetTag(b, 'updated') || _rssGetTag(b, 'published'))
      : (_rssGetTag(b, 'pubDate') || _rssGetTag(b, 'dc:date'));
    let isoDate = '';
    if (dateStr) { try { isoDate = new Date(dateStr).toISOString(); } catch { /**/ } }
    const source = _rssGetTag(b, isAtom ? 'name' : 'dc:creator') || _rssGetTag(b, 'author') || fallback;
    items.push({ title, link: (link || '').replace(/&amp;/g, '&').trim(), pubDate: dateStr, isoDate, source });
  }
  return items;
}

async function runRssPrefetch() {
  try {
    // Read the list of feed URLs configured by the user
    const stored = await chrome.storage.local.get('rss_feed_config');
    const config = stored.rss_feed_config ?? [];
    if (!config.length) return;

    // Fetch all feeds in parallel via the Vercel proxy
    const results = await Promise.allSettled(
      config.map(async ({ url, label }) => {
        const res = await fetch(`${RSS_PROXY}?url=${encodeURIComponent(url)}`, {
          signal: AbortSignal.timeout(12000),
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();
        // Tag each item with the feed label
        return (json.items ?? []).map((item) => ({ ...item, source: item.source || label }));
      }),
    );

    // Merge all successful items
    const allItems = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

    // Sort by date descending, keep the 20 most recent
    const sorted = allItems
      .filter((it) => it.title)
      .sort((a, b) => {
        const da = a.isoDate ? new Date(a.isoDate).getTime() : 0;
        const db = b.isoDate ? new Date(b.isoDate).getTime() : 0;
        return db - da;
      })
      .slice(0, RSS_QUEUE_MAX);

    await chrome.storage.local.set({
      rss_queue: { items: sorted, fetchedAt: Date.now() },
    });
  } catch {
    // Network unavailable or malformed — skip silently
  }
}

// ─── Messages from the page ───────────────────────────────────────────────────

function handlePomodoroDone(msg) {
  chrome.notifications.create("pomodoro_done", {
    type: "basic",
    iconUrl: "favicon/lotus128.png",
    title: "🍅 Focus session complete!",
    message: msg.preset
      ? `Your ${msg.preset} session is done. Take a break.`
      : "Your focus session is done. Take a break.",
    priority: 2,
  });
}

function handleCountdownDone(msg) {
  chrome.notifications.create(`countdown_done_${Date.now()}`, {
    type: "basic",
    iconUrl: "favicon/lotus128.png",
    title: "⏳ Countdown complete!",
    message: msg.title || "Your countdown has ended.",
    priority: 2,
  });
}

function handleEventsUpdated(msg) {
  storageCache = JSON.stringify(msg.events);
  chrome.storage.local.set({ widget_events: storageCache });
}

function handleLookawaySync(msg) {
  chrome.storage.local.set({ lookaway_notify: msg.notify !== false });
  if (msg.enabled) {
    chrome.alarms.get(ALARM_LOOKAWAY, (existing) => {
      if (
        !existing ||
        Math.round(existing.periodInMinutes) !== Number(msg.intervalMins)
      ) {
        chrome.alarms.clear(ALARM_LOOKAWAY, () => {
          chrome.alarms.create(ALARM_LOOKAWAY, {
            periodInMinutes: msg.intervalMins,
          });
        });
      }
    });
  } else {
    chrome.alarms.clear(ALARM_LOOKAWAY);
    chrome.storage.local.remove("lookaway_due");
  }
}

function handleMediaSessionUpdate(msg, sender) {
  const tabId = sender?.tab?.id ?? null;
  if (tabId === null) return;
  chromeSessions[tabId] = { ...msg.data, tabId };
  chromeSessionOrder = [
    tabId,
    ...chromeSessionOrder.filter((id) => id !== tabId),
  ].slice(0, 3);
  for (const id of Object.keys(chromeSessions)) {
    if (!chromeSessionOrder.includes(Number(id))) delete chromeSessions[id];
  }
}

function handleMediaSessionClear(sender) {
  const tabId = sender?.tab?.id ?? null;
  if (tabId !== null && chromeSessions[tabId]) {
    delete chromeSessions[tabId];
    chromeSessionOrder = chromeSessionOrder.filter((id) => id !== tabId);
  }
}

function handleChromeMediaAction(msg) {
  const VALID_MEDIA_ACTIONS = new Set(["play", "pause", "next", "previous"]);
  if (!VALID_MEDIA_ACTIONS.has(msg.action)) return;
  const tabId = msg.tabId ?? chromeSessionOrder[0] ?? null;
  if (tabId != null && chromeSessions[tabId]) {
    chrome.tabs
      .sendMessage(tabId, { type: "MEDIA_ACTION", action: msg.action })
      .catch(() => { });
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "POMODORO_DONE") {
    handlePomodoroDone(msg);
    return;
  }
  if (msg.type === "COUNTDOWN_DONE") {
    handleCountdownDone(msg);
    return;
  }
  if (msg.type === "EVENTS_UPDATED" && msg.events) {
    handleEventsUpdated(msg);
    return;
  }
  if (msg.type === "LOOKAWAY_SYNC") {
    handleLookawaySync(msg);
    return;
  }
  if (msg.type === "LOOKAWAY_FIRE") {
    chrome.storage.local.set({ lookaway_due: Date.now() });
    return;
  }
  if (msg.type === "MEDIA_SESSION_UPDATE") {
    handleMediaSessionUpdate(msg, sender);
    return;
  }
  if (msg.type === "MEDIA_SESSION_CLEAR") {
    handleMediaSessionClear(sender);
    return;
  }
  if (msg.type === "GET_CHROME_MEDIA") {
    sendResponse(
      chromeSessionOrder.map((id) => chromeSessions[id]).filter(Boolean),
    );
    return true;
  }
  if (msg.type === "CHROME_MEDIA_ACTION") {
    handleChromeMediaAction(msg);
  }
  if (msg.type === "PREFETCH_SYNC" && msg.lat && msg.lon) {
    handlePrefetchSync(msg);
    return;
  }
  if (msg.type === "RSS_CONFIG_SYNC" && Array.isArray(msg.feeds)) {
    // Page sends updated feed list whenever settings change; persist and fetch.
    chrome.storage.local.set({ rss_feed_config: msg.feeds });
    runRssPrefetch();
    return;
  }
});

// Clear stored Chrome media state when the source tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (chromeSessions[tabId]) {
    delete chromeSessions[tabId];
    chromeSessionOrder = chromeSessionOrder.filter((id) => id !== tabId);
  }
});
