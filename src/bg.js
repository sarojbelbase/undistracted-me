/**
 * Undistracted Me — Background Service Worker
 *
 * Responsibilities:
 *   1. Badge — update extension icon badge with today's Nepali date on install/startup/alarm.
 *   2. Event reminders — alarm fires every minute; checks localStorage-synced events
 *      and fires a notification 5 minutes before each upcoming event.
 *   3. Pomodoro — page sends a POMODORO_DONE message; SW fires a completion notification.
 */

// ─── Badge helpers ────────────────────────────────────────────────────────────

/**
 * Minimal Nepali date conversion — self-contained here so the SW has no import chain.
 * Returns today's Nepali date as a short string like "२०८१" or "2081 चैत 3" etc.
 * We only need the day number for the badge.
 */
const NEPALI_MONTHS_DAYS = [
  [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2000
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2001
  [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2002
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2003
  [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2004
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2005
  [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2006
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2007
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2008
  [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2009
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2010
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2011
  [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2012
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2013
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2014
  [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2015
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2016
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2017
  [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2018
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2019
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2020
  [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2021
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2022
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2023
  [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2024
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2025
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2026
  [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2027
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2028
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2029
  [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2030
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2031
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2032
  [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2033
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2034
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2035
  [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2036
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2037
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2038
  [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2039
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2040
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2041
  [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2042
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2043
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2044
  [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2045
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2046
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2047
  [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2048
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2049
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2050
  [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2051
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2052
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2053
  [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2054
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2055
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2056
  [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2057
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2058
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2059
  [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2060
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2061
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2062
  [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2063
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2064
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2065
  [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2066
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2067
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2068
  [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2069
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2070
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2071
  [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2072
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2073
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2074
  [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2075
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2076
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2077
  [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2078
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2079
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2080
  [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2081
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2082
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2083
  [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2084
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2085
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2086
  [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2087
  [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31], // 2088
  [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30], // 2089
  [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30], // 2090
];

const START_YEAR = 2000;
// English date that corresponds to Nepali 2000/01/01
const EN_START = { y: 1943, m: 4, d: 14 }; // April 14, 1943

function todayNepaliDay() {
  try {
    // Use Nepal timezone offset: UTC+5:45
    const now = new Date();
    const nepalOffsetMs = (5 * 60 + 45) * 60 * 1000;
    const nepalTime = new Date(now.getTime() + nepalOffsetMs);
    const ey = nepalTime.getUTCFullYear();
    const em = nepalTime.getUTCMonth() + 1;
    const ed = nepalTime.getUTCDate();

    // Total days from EN_START to today
    const startDate = new Date(Date.UTC(EN_START.y, EN_START.m - 1, EN_START.d));
    const todayDate = new Date(Date.UTC(ey, em - 1, ed));
    let remaining = Math.floor((todayDate - startDate) / 86400000);

    let ny = START_YEAR, nm = 1, nd = 1;
    for (let yi = 0; yi < NEPALI_MONTHS_DAYS.length; yi++) {
      const months = NEPALI_MONTHS_DAYS[yi];
      let daysInYear = months.reduce((a, b) => a + b, 0);
      if (remaining < daysInYear) {
        for (let mi = 0; mi < months.length; mi++) {
          if (remaining < months[mi]) { nd = remaining + 1; nm = mi + 1; break; }
          remaining -= months[mi];
        }
        ny = START_YEAR + yi;
        break;
      }
      remaining -= daysInYear;
    }
    return nd; // just the day number for the badge
  } catch (e) {
    return null;
  }
}

function updateBadge() {
  const day = todayNepaliDay();
  if (day == null) return;
  chrome.action.setBadgeText({ text: String(day) });
  chrome.action.setBadgeBackgroundColor({ color: '#ffc107' });
}

// ─── Alarm names ──────────────────────────────────────────────────────────────
const ALARM_TICK = 'UM_TICK';        // fires every 1 min for event reminders
const ALARM_BADGE = 'UM_BADGE';      // fires at midnight to refresh date badge
const ALARM_LOOKAWAY = 'UM_LOOKAWAY'; // fires every N min for eye-break reminders

// ─── Event reminder helpers ───────────────────────────────────────────────────

// IDs of events we've already notified for (in-memory, good for one SW lifetime)
const notified = new Set();

function checkEventReminders() {
  let events = [];
  try {
    events = JSON.parse(self.storageCache || '[]');
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
      chrome.notifications.create(`event_${key}`, {
        type: 'basic',
        iconUrl: 'favicon/lotus128.png',
        title: ev.title,
        message: `Starting in ${Math.ceil(diff / 60000)} min${ev.endTime ? ` · ends ${ev.endTime}` : ''}`,
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
    const result = await chrome.storage.local.get('widget_events');
    self.storageCache = result.widget_events || '[]';
    checkEventReminders();
  } catch {
    // storage unavailable
  }
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
  updateBadge();
  // Ensure alarms exist
  chrome.alarms.get(ALARM_TICK, (a) => {
    if (!a) chrome.alarms.create(ALARM_TICK, { periodInMinutes: 1 });
  });
  chrome.alarms.get(ALARM_BADGE, (a) => {
    if (!a) {
      // Fire at next midnight (Nepal time) then every 24h
      chrome.alarms.create(ALARM_BADGE, { periodInMinutes: 24 * 60 });
    }
  });
});

chrome.runtime.onInstalled.addListener(() => {
  updateBadge();
  chrome.alarms.create(ALARM_TICK, { periodInMinutes: 1 });
  chrome.alarms.create(ALARM_BADGE, { periodInMinutes: 24 * 60 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_BADGE) updateBadge();
  if (alarm.name === ALARM_TICK) syncEventsFromStorage();

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
        chrome.alarms.create(ALARM_LOOKAWAY, { periodInMinutes: alarm.periodInMinutes ?? 10 });
      });
      chrome.storage.local.remove('lookaway_due');
      return;
    }

    // Normal firing during an active session — signal open tabs.
    chrome.storage.local.set({ lookaway_due: now });
    // Only show OS notification if no new tab page is visible AND user wants notifications.
    // If the user already has a new tab open, the in-page overlay fires
    // via storage.onChanged — a system notification on top would be redundant.
    chrome.storage.local.get('lookaway_notify', ({ lookaway_notify }) => {
      if (lookaway_notify === false) return; // user opted out
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        const isNewTab = activeTab?.url === 'chrome://newtab/' ||
          activeTab?.pendingUrl === 'chrome://newtab/' ||
          (activeTab?.url && activeTab.url.startsWith('chrome-extension://'));
        if (!isNewTab) {
          chrome.notifications.create('lookaway_' + Date.now(), {
            type: 'basic',
            iconUrl: 'favicon/lotus128.png',
            title: 'Time to look away 👁',
            message: 'Give your eyes a 20-second break. Open a new tab when ready.',
            priority: 1,
          });
        }
      });
    });
  }
});

// ─── Messages from the page ───────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Pomodoro session complete
  if (msg.type === 'POMODORO_DONE') {
    chrome.notifications.create('pomodoro_done', {
      type: 'basic',
      iconUrl: 'favicon/lotus128.png',
      title: '🍅 Focus session complete!',
      message: msg.preset
        ? `Your ${msg.preset} session is done. Take a break.`
        : 'Your focus session is done. Take a break.',
      priority: 2,
    });
  }

  // Countdown complete
  if (msg.type === 'COUNTDOWN_DONE') {
    chrome.notifications.create(`countdown_done_${Date.now()}`, {
      type: 'basic',
      iconUrl: 'favicon/lotus128.png',
      title: '⏳ Countdown complete!',
      message: msg.title || 'Your countdown has ended.',
      priority: 2,
    });
  }

  // Page syncing events to SW storage cache
  if (msg.type === 'EVENTS_UPDATED' && msg.events) {
    self.storageCache = JSON.stringify(msg.events);
    chrome.storage.local.set({ widget_events: self.storageCache });
  }

  // ── LookAway schedule sync ───────────────────────────────────────────────
  // Page sends this whenever enabled/interval changes in settings.
  if (msg.type === 'LOOKAWAY_SYNC') {
    // Persist the notify preference so the alarm handler can read it
    chrome.storage.local.set({ lookaway_notify: msg.notify !== false });

    if (msg.enabled) {
      // Only clear+recreate if the interval changed or alarm doesn't exist yet.
      // If we recreated it on every new tab open the countdown would always reset.
      chrome.alarms.get(ALARM_LOOKAWAY, (existing) => {
        if (!existing || Math.round(existing.periodInMinutes) !== Number(msg.intervalMins)) {
          chrome.alarms.clear(ALARM_LOOKAWAY, () => {
            chrome.alarms.create(ALARM_LOOKAWAY, { periodInMinutes: msg.intervalMins });
          });
        }
        // else: correct alarm already ticking — leave it alone
      });
    } else {
      chrome.alarms.clear(ALARM_LOOKAWAY);
      chrome.storage.local.remove('lookaway_due'); // clear any pending break
    }
  }

  // ── LookAway manual preview / fire-now ──────────────────────────────────
  // Triggered by the Preview button in Settings or WidgetCatalog.
  if (msg.type === 'LOOKAWAY_FIRE') {
    chrome.storage.local.set({ lookaway_due: Date.now() });
  }

  // ── Chrome Media Session ─────────────────────────────────────────────────
  // Up to 3 concurrent browser media sessions are tracked in a map keyed by tabId.
  // chromeSessionOrder keeps insertion order (newest first) for easy array return.
  if (msg.type === 'MEDIA_SESSION_UPDATE') {
    if (!self.chromeSessions) self.chromeSessions = {};
    if (!self.chromeSessionOrder) self.chromeSessionOrder = [];
    const tabId = sender?.tab?.id ?? null;
    if (tabId === null) return;
    self.chromeSessions[tabId] = { ...msg.data, tabId };
    // Move this tab to front of order (most recently active), then cap at 3
    self.chromeSessionOrder = [tabId, ...self.chromeSessionOrder.filter(id => id !== tabId)].slice(0, 3);
    // Remove any sessions that fell off the cap
    for (const id of Object.keys(self.chromeSessions)) {
      if (!self.chromeSessionOrder.includes(Number(id))) delete self.chromeSessions[id];
    }
  }

  if (msg.type === 'MEDIA_SESSION_CLEAR') {
    const tabId = sender?.tab?.id ?? null;
    if (tabId !== null && self.chromeSessions?.[tabId]) {
      delete self.chromeSessions[tabId];
      self.chromeSessionOrder = (self.chromeSessionOrder ?? []).filter(id => id !== tabId);
    }
  }

  if (msg.type === 'GET_CHROME_MEDIA') {
    const order = self.chromeSessionOrder ?? [];
    const sessions = self.chromeSessions ?? {};
    sendResponse(order.map(id => sessions[id]).filter(Boolean));
    return true;
  }

  if (msg.type === 'CHROME_MEDIA_ACTION') {
    const VALID_MEDIA_ACTIONS = new Set(['play', 'pause', 'next', 'previous']);
    if (!VALID_MEDIA_ACTIONS.has(msg.action)) return;
    const sessions = self.chromeSessions ?? {};
    const order = self.chromeSessionOrder ?? [];
    // If requester specifies a tabId use it, otherwise fall back to most recently updated tab
    const tabId = msg.tabId != null ? msg.tabId : (order[0] ?? null);
    if (tabId != null && sessions[tabId]) {
      chrome.tabs.sendMessage(tabId, { type: 'MEDIA_ACTION', action: msg.action }).catch(() => { });
    }
  }
});

// Clear stored Chrome media state when the source tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (self.chromeSessions?.[tabId]) {
    delete self.chromeSessions[tabId];
    self.chromeSessionOrder = (self.chromeSessionOrder ?? []).filter(id => id !== tabId);
  }
});
