/**
 * Countdown widget utilities — dual-mode (countdown + since).
 */

import { humanizeTime } from '../../utilities/humanizeTime';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { todayStr } from '../../utilities';
import { notifyUser } from '../../utilities/chrome';

export const REPEAT_OPTIONS = [
  { label: 'Once', value: 'none' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
];

export const MODE_OPTIONS = [
  { label: 'Countdown', value: 'countdown' },
  { label: 'Since', value: 'since' },
];

/**
 * Returns the next future occurrence of a countdown.
 * For 'none' repeat, returns the target Date as-is (may be in the past).
 * For repeating countdowns, advances until the next future occurrence.
 */
export const getNextOccurrence = ({ targetDate, targetTime, repeat }) => {
  const base = new Date(`${targetDate}T${targetTime || '00:00'}`);
  if (!repeat || repeat === 'none') return base;

  const now = new Date();
  if (base > now) return base;

  let next = new Date(base);
  while (next <= now) {
    if (repeat === 'weekly') next.setDate(next.getDate() + 7);
    else if (repeat === 'monthly') next.setMonth(next.getMonth() + 1);
    else if (repeat === 'yearly') next.setFullYear(next.getFullYear() + 1);
    else break;
  }
  return next;
};

/**
 * Returns { days, hours, minutes, totalSeconds } remaining until a target Date (min 0).
 * Uses Math.ceil so "1 second remaining" still shows as 1 minute, not 0.
 */
export const formatCountdown = (targetDate, nowTs) => {
  const now = nowTs ?? Date.now();
  const diffMs = Math.max(0, targetDate - now);
  const totalSeconds = Math.ceil(diffMs / 1_000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return { days, hours, minutes, totalSeconds };
};

/**
 * Returns time elapsed SINCE a past date.
 * { days, months, years, totalSeconds } — all >= 0.
 */
export const formatSince = (targetDate, nowTs) => {
  const now = nowTs ?? Date.now();
  const diffMs = Math.max(0, now - targetDate);
  const totalSeconds = Math.floor(diffMs / 1_000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const months = Math.floor(days / 30.44); // average month
  const years = Math.floor(days / 365.25); // average year (leap-aware)
  return { days, hours, minutes, months, years, totalSeconds };
};

/**
 * Formats a Date as "Jan 1, 2026".
 */
export const formatTargetDate = (date) => {
  if (!date) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

// ─── Humanized display (delegates to unified humanizeTime) ────────────────────

export function formatCountdownPhrase(_d, _h, _m, totalSecs) {
  const targetMs = Date.now() + (totalSecs ?? 0) * 1000;
  return humanizeTime(new Date(targetMs)).full;
}

export function formatSincePhrase(days) {
  const targetMs = Date.now() - days * 86400000;
  return humanizeTime(new Date(targetMs)).full.replace(/ ago$/, '');
}

export function humanizeDuration(days, hours, mins, direction = 'future') {
  const sign = direction === 'past' ? -1 : 1;
  const targetMs = Date.now() + sign * (days * 86400000 + hours * 3600000 + mins * 60000);
  return humanizeTime(new Date(targetMs)).full;
}

// ─── localStorage helpers ────────────────────────────────────────────────────

export const loadCustom = () => {
  try {
    return JSON.parse(
      localStorage.getItem(STORAGE_KEYS.COUNTDOWN_EVENTS) || "[]",
    );
  } catch {
    return [];
  }
};
export const saveCustom = (list) =>
  localStorage.setItem(STORAGE_KEYS.COUNTDOWN_EVENTS, JSON.stringify(list));
export const loadPinned = (id) => {
  try {
    return JSON.parse(
      localStorage.getItem(STORAGE_KEYS.countdownPinned(id)) || "null",
    );
  } catch {
    return null;
  }
};
export const savePinned = (id, p) =>
  localStorage.setItem(STORAGE_KEYS.countdownPinned(id), JSON.stringify(p));

// ─── Notification helpers ────────────────────────────────────────────────────

const _today = todayStr;
export const wasNotified = (id) => {
  try {
    const map = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.COUNTDOWN_NOTIFIED) || "{}",
    );
    return map[id] === _today();
  } catch {
    return false;
  }
};
export const markNotified = (id) => {
  try {
    const map = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.COUNTDOWN_NOTIFIED) || "{}",
    );
    Object.keys(map).forEach((k) => {
      if (map[k] !== _today()) delete map[k];
    });
    map[id] = _today();
    localStorage.setItem(STORAGE_KEYS.COUNTDOWN_NOTIFIED, JSON.stringify(map));
  } catch { }
};
export const sendNotification = (title, body) =>
  notifyUser(title, body, "COUNTDOWN_DONE");

// ─── Target resolution ───────────────────────────────────────────────────────

export function resolveEventTarget(pinned, allEvents) {
  const ev = allEvents.find((e) => e.id === pinned.eventId);
  if (!ev) return { target: null, shouldClearPin: false };
  const nextDate = new Date(`${ev.startDate}T${ev.startTime || "00:00"}`);
  if (nextDate < new Date(Date.now() - 2 * 60 * 1000)) {
    return { target: null, shouldClearPin: true };
  }
  return {
    target: {
      title: ev.title, nextDate, startTime: ev.startTime, endTime: ev.endTime,
      isEvent: true, isGcal: ev._source === "gcal", id: ev.id, mode: "countdown",
    },
    shouldClearPin: false,
  };
}

export function resolveCustomTarget(pinned, custom) {
  const cd = custom.find((c) => c.id === pinned.id);
  if (!cd) return { target: null, shouldClearPin: false };
  const isSince = cd.mode === "since";
  const nextDate = isSince
    ? new Date(`${cd.targetDate}T${cd.targetTime || "00:00"}`)
    : getNextOccurrence(cd);
  return {
    target: {
      title: cd.title, nextDate, startTime: cd.targetTime,
      isEvent: false, isGcal: false, id: cd.id, repeat: cd.repeat,
      mode: cd.mode || "countdown",
    },
    shouldClearPin: false,
  };
}

export function resolveAutoTarget(upcomingEvents, today, custom) {
  const now = new Date();
  // Prefer next upcoming calendar event
  const nextEv = upcomingEvents.find(
    (e) => new Date(`${e.startDate || today}T${e.startTime || "00:00"}`) > now,
  );
  if (nextEv) {
    return {
      target: {
        title: nextEv.title,
        nextDate: new Date(`${nextEv.startDate}T${nextEv.startTime || "00:00"}`),
        startTime: nextEv.startTime, endTime: nextEv.endTime,
        isEvent: true, isGcal: nextEv._source === "gcal", id: nextEv.id,
        mode: "countdown",
      },
      shouldClearPin: false,
    };
  }
  // Fallback: nearest custom countdown (or "since" countdown)
  const sorted = custom
    .map((cd) => ({
      ...cd,
      _next: cd.mode === "since"
        ? new Date(`${cd.targetDate}T${cd.targetTime || "00:00"}`)
        : getNextOccurrence(cd),
    }))
    .filter((cd) => cd._next > now || cd.mode === "since")
    .sort((a, b) => a._next - b._next);
  if (sorted[0]) {
    const cd = sorted[0];
    return {
      target: {
        title: cd.title, nextDate: cd._next, startTime: cd.targetTime,
        isEvent: false, isGcal: false, id: cd.id, repeat: cd.repeat,
        mode: cd.mode || "countdown",
      },
      shouldClearPin: false,
    };
  }
  return { target: null, shouldClearPin: false };
}

export function resolveTarget(pinned, allEvents, upcomingEvents, today, custom) {
  if (pinned?.type === "event") return resolveEventTarget(pinned, allEvents);
  if (pinned?.type === "custom") return resolveCustomTarget(pinned, custom);
  return resolveAutoTarget(upcomingEvents, today, custom);
}
