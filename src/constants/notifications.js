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
      const suffix = data.endTime ? ` · ends ${data.endTime}` : '';
      return {
        type: 'basic',
        iconUrl: ICON,
        title: `📅 ${data.title}`,
        message: `${timing}${suffix}`,
        priority: 1,
      };
    }

    case 'occasion': {
      const name = data.name ?? 'Someone';
      if (data.occType === 'anniversary') {
        return {
          type: 'basic',
          iconUrl: ICON,
          title: `🎊 ${name}'s Anniversary`,
          message: 'Today is the day, celebrate together!',
          priority: 1,
        };
      }
      if (data.occType === 'special') {
        return {
          type: 'basic',
          iconUrl: ICON,
          title: `🌟 ${name}`,
          message: 'A special day to celebrate!',
          priority: 1,
        };
      }
      // birthday (default)
      return {
        type: 'basic',
        iconUrl: ICON,
        title: `🎂 ${name}'s Birthday`,
        message: 'Today is the day, don\'t forget to wish them well!',
        priority: 1,
      };
    }

    case 'countdown': {
      const label = data.title?.trim();
      return {
        type: 'basic',
        iconUrl: ICON,
        title: label ? `⏱ ${label}` : '⏱ Countdown Completed',
        message: label ? 'Your countdown has ended. Time to act.' : 'Your countdown is up.',
        priority: 2,
      };
    }

    case 'pomodoro': {
      const session = data.preset ? `${data.preset} session` : 'Focus session';
      return {
        type: 'basic',
        iconUrl: ICON,
        title: '⏱ Focus Session Completed',
        message: `${session} done — take a well-earned break.`,
        priority: 2,
      };
    }

    case 'lookaway':
      return {
        type: 'basic',
        iconUrl: ICON,
        title: '👁 Time for a 20-second break',
        message: 'Look 20 feet away for 20 s — the 20-20-20 rule keeps eye strain away.',
        priority: 1,
      };

    default:
      return { type: 'basic', iconUrl: ICON, title: 'Undistracted Me', message: '', priority: 0 };
  }
}
