/**
 * packs.js — first-run setup actions.
 *
 * Pure-ish orchestration for the actionable onboarding:
 *   - PACKS        — the four starter packs (Minimal / Student / Developer / Nepal)
 *   - applyPack()  — swap the dashboard to a pack's curated widgets + accent + feeds
 *   - blockSocialDefaults() — one-click block of the usual distraction sites
 *   - addTaskToday()        — write the user's "one thing" as a today event
 *
 * Kept free of React so it is trivially unit-testable and importable from the
 * service worker if needed. Widget seeding goes through the existing Zustand
 * stores (never raw localStorage) so the dashboard re-renders immediately.
 */

import { useWidgetInstancesStore } from '../store/useWidgetInstancesStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { blockSite } from './siteBlocker';

/** Common distraction sites for the one-click social block preset. */
export const SOCIAL_BLOCK_DEFAULTS = [
  'facebook.com',
  'instagram.com',
  'x.com',
  'youtube.com',
  'tiktok.com',
  'reddit.com',
];

/** Default duration (minutes) for the first-run social block. */
export const SOCIAL_BLOCK_MINUTES = 30;

export const PACKS = Object.freeze({
  minimal: {
    id: 'minimal',
    label: 'Minimal',
    tagline: 'Clock, date, progress',
    widgets: ['clock', 'dateToday', 'progress'],
    accent: 'Blueberry',
    rss: [],
  },
  student: {
    id: 'student',
    label: 'Student',
    tagline: 'Calendar, Pomodoro, countdown',
    widgets: ['clock', 'calendar', 'pomodoro', 'countdown', 'events', 'rss'],
    accent: 'Grape',
    rss: ['bbc', 'guardian', 'aljazeera'],
  },
  developer: {
    id: 'developer',
    label: 'Developer',
    tagline: 'Quick access, notes, stocks',
    widgets: ['clock', 'quickAccess', 'notes', 'pomodoro', 'rss', 'stock'],
    accent: 'Mint',
    rss: ['hn', 'verge', 'techcrunch'],
  },
  nepal: {
    id: 'nepal',
    label: 'Nepal',
    tagline: 'Miti, NEPSE, Nepali news',
    widgets: ['clock', 'dateToday', 'calendar', 'stock', 'weather', 'rss'],
    accent: 'Latte',
    rss: ['onlinekhabar', 'ktmpost', 'nagarik'],
  },
});

/** PACKS as an ordered array for the picker grid. */
export const PACK_LIST = Object.values(PACKS);

/**
 * Apply a pack: replace the widget instances with the pack's curated list,
 * set its accent, and (if the pack includes RSS) set its feeds.
 * Returns the applied pack (or null if unknown).
 */
export function applyPack(packId) {
  const pack = PACKS[packId];
  if (!pack) return null;

  try {
    useWidgetInstancesStore.setState({
      instances: pack.widgets.map((type) => ({ id: type, type })),
    });
  } catch {
    /* store unavailable (tests / SSR) */
  }

  try {
    useSettingsStore.getState().setAccent(pack.accent);
  } catch {
    /* ignore */
  }

  if (pack.rss?.length) {
    try {
      useWidgetInstancesStore
        .getState()
        .updateWidgetSetting('rss', 'activeFeedIds', pack.rss);
    } catch {
      /* ignore */
    }
  }

  return pack;
}

/**
 * Block the usual distraction sites for a short timer, so a first-time user
 * immediately feels the calm interstitial (the "aha" moment). Sequential —
 * blockSite() re-reads the list on each call, and order must be preserved.
 */
export async function blockSocialDefaults(durationMinutes = SOCIAL_BLOCK_MINUTES) {
  for (const domain of SOCIAL_BLOCK_DEFAULTS) {
    try {
      await blockSite(domain, durationMinutes);
    } catch {
      /* a single failed block must not abort the rest */
    }
  }
  return SOCIAL_BLOCK_DEFAULTS;
}

/** Today's date as YYYY-MM-DD (local). */
export function todayIso() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Add the user's "one thing" as a today event so it appears on the dashboard
 * immediately. Uses the same localStorage shape + change event as useEvents.
 */
export function addTaskToday(text) {
  const title = (text || '').trim();
  if (!title) return null;

  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS) || '[]');
    const event = {
      id: `onboard_${Date.now()}`,
      title,
      startDate: todayIso(),
      startTime: '',
      endDate: '',
      endTime: '',
    };
    localStorage.setItem(
      STORAGE_KEYS.EVENTS,
      JSON.stringify([...existing, event]),
    );
    try {
      globalThis.dispatchEvent(new Event('widget_events_changed'));
    } catch {
      /* ignore */
    }
    return event;
  } catch {
    return null;
  }
}
