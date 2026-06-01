/**
 * Notification type registry.
 *
 * Each entry describes a category of extension notification the user can
 * enable or disable independently. The `id` field is the key used in
 * `notificationTypes` in the settings store and in `chrome.storage.local`.
 *
 * bg.js reads `notif_enabled` (master) and `notif_types` (per-type object)
 * from chrome.storage.local before firing any notification.
 *
 * buildNotification(type, data) — single function to construct the full
 * chrome.notifications payload from structured data. Centralises all copy,
 * formatting rules and priorities in one place so bg.js stays clean.
 */

export const NOTIFICATION_TYPES = [
  {
    id: 'events',
    label: 'Events',
    description: 'Reminder 5 min before a calendar event starts',
  },
  {
    id: 'occasion',
    label: 'Occasions',
    description: 'Birthday & anniversary reminder at 9 AM on the day',
  },
  {
    id: 'countdown',
    label: 'Countdown',
    description: 'Alert when a countdown timer reaches zero',
  },
  {
    id: 'pomodoro',
    label: 'Pomodoro',
    description: 'When a focus session ends',
  },
  {
    id: 'lookaway',
    label: 'Look Away',
    description: 'Eye-break reminders',
  },
];

/** Default enabled state for each notification type on first install. */
export const DEFAULT_NOTIFICATION_TYPES = {
  events: true,
  occasion: true,
  countdown: true,
  pomodoro: true,
  lookaway: true,
};

// ─── Notification content builder ────────────────────────────────────────────

const ICON = 'favicon/lotus128.png';

/**
 * Builds a chrome.notifications payload for a given type.
 *
 * Every notification follows three principles:
 *   • No emoji — let the words carry the weight
 *   • Contextual — the user knows immediately what this is about
 *   • Human — sounds like a thoughtful assistant, not a robot reading a spec
 *
 * @param {'events'|'occasion'|'countdown'|'pomodoro'|'lookaway'} type
 * @param {object} data — type-specific fields (see below)
 *
 * events:    { title, diffMs, endTime? }
 * occasion:  { name, occType }   occType: 'birthday' | 'anniversary' | 'special'
 * countdown: { title? }
 * pomodoro:  { preset? }         preset: e.g. '25 min'
 * lookaway:  {}
 *
 * @returns {{ type, iconUrl, title, message, priority }}
 */
export function buildNotification(type, data = {}) {
  switch (type) {

    case 'events': {
      const mins = Math.ceil((data.diffMs ?? 0) / 60_000);
      const timing = mins <= 1 ? 'Starting now' : `In ${mins} min`;
      const detail = data.endTime ? ` until ${data.endTime}` : '';
      return {
        type: 'basic',
        iconUrl: ICON,
        title: data.title,
        message: `${timing}${detail}`,
        priority: 1,
      };
    }

    case 'occasion': {
      const name = data.name ?? 'Someone';
      if (data.occType === 'anniversary') {
        return {
          type: 'basic',
          iconUrl: ICON,
          title: `${name}'s anniversary`,
          message: `They said yes, they showed up, they stayed. Today marks another year of that.`,
          priority: 1,
        };
      }
      if (data.occType === 'special') {
        return {
          type: 'basic',
          iconUrl: ICON,
          title: `A day for ${name}`,
          message: `Whatever makes today special, it matters. Do not let it slip by unnoticed.`,
          priority: 1,
        };
      }
      // birthday
      return {
        type: 'basic',
        iconUrl: ICON,
        title: `${name} turns a year older today`,
        message: `A warm wish costs nothing and lands deeper than you think. Reach out while the day is still here.`,
        priority: 1,
      };
    }

    case 'countdown': {
      const label = data.title?.trim();
      return {
        type: 'basic',
        iconUrl: ICON,
        title: label || 'Countdown finished',
        message: label
          ? `Your countdown for "${label}" just ended.`
          : 'The timer you set has reached zero. Time to move.',
        priority: 2,
      };
    }

    case 'pomodoro': {
      const duration = data.preset || 'Focus';
      return {
        type: 'basic',
        iconUrl: ICON,
        title: `${duration} session complete`,
        message: `Step away for a few minutes. Stretch your legs, refill your water, let your eyes rest on something distant. You earned the pause.`,
        priority: 2,
      };
    }

    case 'lookaway':
      return {
        type: 'basic',
        iconUrl: ICON,
        title: 'Time for a break',
        message: 'Complete the challenge on your screen, if you can.',
        priority: 1,
      };

    default:
      return { type: 'basic', iconUrl: ICON, title: 'Undistracted Me', message: '', priority: 0 };
  }
}
