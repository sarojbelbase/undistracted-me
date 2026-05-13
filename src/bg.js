/**
 * Undistracted Me — Background Service Worker
 *
 * Responsibilities:
 *   1. Event reminders — alarm fires every minute; checks localStorage-synced events
 *      and fires a notification 5 minutes before each upcoming event.
 *   2. Pomodoro — page sends a POMODORO_DONE message; SW fires a completion notification.
 */

import {
  OPEN_METEO_WEATHER_API,
  OPEN_METEO_AQI_API,
  MEROLAGANI_CHART_API,
  RSS_FEED_PROXY_URL,
  GCAL_EVENTS_API,
} from './constants/urls.js';
import { buildNotification } from './constants/notifications.js';

// ─── Alarm names ──────────────────────────────────────────────────────────────
const ALARM_TICK = "UM_TICK"; // fires every 1 min for event reminders
const ALARM_LOOKAWAY = "UM_LOOKAWAY"; // fires every N min for eye-break reminders
const ALARM_PREFETCH = "UM_PREFETCH"; // fires every 30 min for background data pre-fetch
const ALARM_RSS = "UM_RSS";           // fires every 30 min for RSS queue pre-fetch
const ALARM_STOCKS = "UM_STOCKS";     // fires every 15 min for stock chart pre-fetch

// ─── Event reminder helpers ───────────────────────────────────────────────────

// ─── Module-level state ─────────────────────────────────────────────────────

let storageCache = "[]";
let chromeSessions = {};
let chromeSessionOrder = [];

// IDs of events we've already notified for (in-memory, good for one SW lifetime)
const notified = new Set();

// Stores lat/lon sent from the page for weather pre-fetching
let prefetchCoords = null; // { lat, lon } or null

// ─── Notification config (synced from page via chrome.storage.local) ─────────
let notifConfig = {
  enabled: true,
  types: { events: true, countdown: true, pomodoro: true, lookaway: true },
};

async function loadNotifConfig() {
  try {
    const result = await chrome.storage.local.get(['notif_enabled', 'notif_types']);
    if (result.notif_enabled !== undefined) notifConfig.enabled = result.notif_enabled;
    if (result.notif_types) notifConfig.types = { ...notifConfig.types, ...result.notif_types };
  } catch { /* storage unavailable */ }
}

/** Returns true if the given notification type is permitted by user config. */
function notifAllowed(type) {
  return notifConfig.enabled && notifConfig.types[type] !== false;
}

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
      if (!notifAllowed('events')) continue;
      chrome.notifications.create(
        `event_${key}`,
        buildNotification('events', { title: ev.title, diffMs: diff, endTime: ev.endTime }),
      );
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

// ─── Occasion reminders (birthdays & anniversaries) ──────────────────────────

async function checkOccasionReminders() {
  if (!notifAllowed('occasion')) return;

  const today = new Date();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();
  const todayHour = today.getHours();
  const year = today.getFullYear();

  // Only fire at 9 AM or later — never at midnight or random wake-up times.
  if (todayHour < 9) return;

  let all = [];
  let firedSet = new Set();
  try {
    const result = await chrome.storage.local.get(['contacts_birthdays_cache', 'occasions_manual', 'occasions_fired']);
    all = [
      ...(result.contacts_birthdays_cache ?? []),
      ...(result.occasions_manual ?? []),
    ];
    // occasions_fired: array of keys already notified (persists across SW restarts)
    firedSet = new Set(result.occasions_fired ?? []);
  } catch { return; }

  const newlyFired = [];

  for (const entry of all) {
    if (!entry.month || !entry.day || !entry.name) continue;
    if (Number(entry.month) !== todayMonth || Number(entry.day) !== todayDay) continue;

    const key = `occasion_${entry.name}_${entry.type}_${year}`;
    if (notified.has(key) || firedSet.has(key)) continue;
    notified.add(key);
    newlyFired.push(key);

    chrome.notifications.create(
      `occ_${Date.now()}`,
      buildNotification('occasion', { name: entry.name, occType: entry.type || 'birthday' }),
    );
  }

  if (newlyFired.length > 0) {
    // Persist so re-opened SW doesn't re-fire the same day.
    // Prune stale keys from previous years to keep storage lean.
    const pruned = [...firedSet].filter(k => k.endsWith(`_${year}`));
    chrome.storage.local.set({ occasions_fired: [...pruned, ...newlyFired] });
  }
}

globalThis.addEventListener("install", () => {
  globalThis.skipWaiting();
});

globalThis.addEventListener("activate", (event) => {
  event.waitUntil(
    globalThis.clients.claim().then(() => loadNotifConfig()),
  );
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
  chrome.alarms.get(ALARM_STOCKS, (a) => {
    if (!a) chrome.alarms.create(ALARM_STOCKS, { periodInMinutes: 15 });
  });
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_TICK, { periodInMinutes: 1 });
  chrome.alarms.create(ALARM_RSS, { periodInMinutes: 30 });
  chrome.alarms.create(ALARM_STOCKS, { periodInMinutes: 15 });
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
  if (alarm.name === ALARM_TICK) {
    syncEventsFromStorage();
    checkOccasionReminders();
  }
  if (alarm.name === ALARM_PREFETCH) {
    runWeatherPrefetch();
    runGcalPrefetch();
  }
  if (alarm.name === ALARM_RSS) runRssPrefetch();
  if (alarm.name === ALARM_STOCKS) runStocksPrefetch();

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
      if (!notifAllowed('lookaway')) return; // master/type toggle off
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        const isNewTab =
          activeTab?.url === "chrome://newtab/" ||
          activeTab?.pendingUrl === "chrome://newtab/" ||
          activeTab?.url?.startsWith("chrome-extension://");
        if (!isNewTab) {
          chrome.notifications.create(
            'lookaway_' + Date.now(),
            buildNotification('lookaway'),
          );
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
    // Use the same Open-Meteo params as the widget's fetchOpenMeteo() (always metric
    // because the widget's per-instance unit preference isn't accessible in the SW).
    const weatherParams = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      current: 'temperature_2m,apparent_temperature,weather_code,wind_gusts_10m,precipitation,is_day',
      hourly: 'precipitation_probability,weather_code,wind_gusts_10m',
      forecast_hours: 12,
      temperature_unit: 'celsius',
      wind_speed_unit: 'kmh',
      timezone: 'auto',
    });
    const aqiParams = new URLSearchParams({
      latitude: lat,
      longitude: lon,
      current: 'us_aqi,pm2_5',
      timezone: 'auto',
    });

    // Fetch weather + AQI in parallel; AQI failure is non-fatal
    const [weatherResult, aqiResult] = await Promise.allSettled([
      fetch(`${OPEN_METEO_WEATHER_API}?${weatherParams}`, {
        signal: AbortSignal.timeout(10000),
      }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`OM ${r.status}`)))),
      fetch(`${OPEN_METEO_AQI_API}?${aqiParams}`, {
        signal: AbortSignal.timeout(6000),
      }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`AQI ${r.status}`)))),
    ]);

    if (weatherResult.status !== 'fulfilled') return; // weather is mandatory
    const data = weatherResult.value;
    const aqiData = aqiResult.status === 'fulfilled' ? aqiResult.value : null;

    await chrome.storage.local.set({
      weather_sw_cache: {
        data,
        aqiData,
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
  runGcalPrefetch();
}

// ─── GCal pre-fetch ───────────────────────────────────────────────────────────

/**
 * Returns a valid Google OAuth access token for use in the service worker, or null.
 * Chrome: uses chrome.identity.getAuthToken() directly (silent, no UI).
 * Firefox: reads the stored PKCE token from chrome.storage.local.
 */
async function getGcalToken() {
  // Chrome extension path — chrome.identity is available in MV3 service workers
  if (typeof chrome.identity?.getAuthToken === 'function') {
    return new Promise((resolve) => {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (chrome.runtime.lastError || !token) resolve(null);
        else resolve(token);
      });
    });
  }
  // Firefox / other: read stored PKCE access token (written by googleAuth.js)
  try {
    const result = await chrome.storage.local.get('google_ff_tokens');
    const stored = result.google_ff_tokens ?? null;
    if (!stored?.access_token) return null;
    // Only use if not expired (with 60 s buffer); let the page handle refresh
    if (stored.expires_at - Date.now() > 60_000) return stored.access_token;
  } catch { /* storage unavailable */ }
  return null;
}

/**
 * Fetches upcoming Google Calendar events and writes them to
 * chrome.storage.local['gcal_events_cache'] so the page gets instant data
 * on the next new-tab open (loadCachedGcalEvents reads from that key).
 */
async function runGcalPrefetch() {
  try {
    const token = await getGcalToken();
    if (!token) return;

    const params = new URLSearchParams({
      maxResults: '32',
      orderBy: 'startTime',
      singleEvents: 'true',
      timeMin: new Date().toISOString(),
    });

    const res = await fetch(
      `${GCAL_EVENTS_API}?${params}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10000),
      },
    );

    if (res.status === 401) {
      // Token expired — evict from Chrome's cache so the next getAuthToken call
      // triggers a silent refresh rather than returning the stale token again.
      if (typeof chrome.identity?.removeCachedAuthToken === 'function') {
        chrome.identity.removeCachedAuthToken({ token }, () => { });
      }
      return;
    }
    if (!res.ok) return;

    const data = await res.json();
    const events = (data.items ?? [])
      .filter((e) => e.eventType === 'default')
      .map((e) => ({
        id: `gcal_${e.id}`,
        title: e.summary || '(No title)',
        description: e.description || '',
        startDate: (e.start?.dateTime || e.start?.date || '').slice(0, 10),
        startTime: e.start?.dateTime ? e.start.dateTime.slice(11, 16) : '',
        endDate: (e.end?.dateTime || e.end?.date || '').slice(0, 10),
        endTime: e.end?.dateTime ? e.end.dateTime.slice(11, 16) : '',
        htmlLink: e.htmlLink || null,
        meetLink: e.hangoutLink || null,
        _source: 'gcal',
      }));

    await chrome.storage.local.set({ gcal_events_cache: events });
  } catch {
    // Network or auth error — skip silently
  }
}

// ─── Stocks pre-fetch ─────────────────────────────────────────────────────────

/**
 * Fetches chart data for all configured stock symbols from merolagani.com
 * and caches results in chrome.storage.local['stocks_sw_cache'].
 * The service worker runs in extension context so direct fetch is allowed.
 */
async function runStocksPrefetch() {
  try {
    const stored = await chrome.storage.local.get('stocks_config');
    const symbols = stored.stocks_config ?? [];
    if (!symbols.length) return;

    const now = Math.floor(Date.now() / 1000);
    const start = now - 90 * 24 * 60 * 60;

    const results = await Promise.allSettled(
      symbols.map(async (sym) => {
        const url = `${MEROLAGANI_CHART_API}?type=get_advanced_chart&symbol=${encodeURIComponent(sym)}&resolution=1D&rangeStartDate=${start}&rangeEndDate=${now}&from=&isAdjust=1`;
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json?.s !== 'ok') return { sym, data: null };
        const c = json.c;
        const o = json.o;
        const h = json.h;
        const l = json.l;
        const v = json.v;
        if (!Array.isArray(c) || c.length < 2) return { sym, data: null };
        const n = c.length;
        return {
          sym,
          data: {
            prices: c,
            ltp: c[n - 1],
            prevClose: c[n - 2],
            open: o?.[n - 1],
            high: h?.[n - 1],
            low: l?.[n - 1],
            volume: v?.[n - 1],
          },
        };
      }),
    );

    const data = results.map((r, i) =>
      r.status === 'fulfilled' ? r.value : { sym: symbols[i], data: 'error' },
    );

    await chrome.storage.local.set({
      stocks_sw_cache: { data, fetchedAt: Date.now() },
    });
  } catch {
    // Network unavailable — skip silently
  }
}

// ─── RSS queue pre-fetch ─────────────────────────────────────────────────

// RSS queue constants
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
        const res = await fetch(`${RSS_FEED_PROXY_URL}?url=${encodeURIComponent(url)}`, {
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
  if (!notifAllowed('pomodoro')) return;
  chrome.notifications.create(
    'pomodoro_done',
    buildNotification('pomodoro', { preset: msg.preset }),
  );
}

function handleCountdownDone(msg) {
  if (!notifAllowed('countdown')) return;
  chrome.notifications.create(
    `countdown_done_${Date.now()}`,
    buildNotification('countdown', { title: msg.title }),
  );
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
  if (msg.type === "NOTIFICATIONS_SYNC") {
    if (msg.enabled !== undefined) notifConfig.enabled = msg.enabled;
    if (msg.types) notifConfig.types = { ...notifConfig.types, ...msg.types };
    chrome.storage.local.set({ notif_enabled: notifConfig.enabled, notif_types: notifConfig.types });
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
  if (msg.type === "STOCKS_CONFIG_SYNC" && Array.isArray(msg.symbols)) {
    // Page sends updated symbol list whenever settings change; persist and fetch.
    chrome.storage.local.set({ stocks_config: msg.symbols });
    runStocksPrefetch();
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
