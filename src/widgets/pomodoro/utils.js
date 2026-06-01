import { MAX_HISTORY, HISTORY_STORAGE_KEY, SESSION_TYPE } from './constants';

// Re-export PRESETS so Focus Mode (panels/Pomodoro.jsx) doesn't break.
// New code should import from './constants' directly.
export { PRESETS } from './constants';

// ─── Time formatting ──────────────────────────────────────────────────────────

export const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

/**
 * Reads the current pomodoro state from localStorage (Focus Mode sync key).
 * Returns the state object if a session is running with time remaining,
 * or null otherwise.
 */
export const readPomodoro = () => {
  try {
    const raw = localStorage.getItem('fm_pomodoro');
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s.running || s.remaining <= 0) return null;
    return s;
  } catch {
    return null;
  }
};

// ─── Session history ─────────────────────────────────────────────────────────

/**
 * Load the full session history array from localStorage.
 * Returns an array (always — empty array on any error).
 */
export const loadHistory = () => {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Save a completed session to history.
 * Auto-trims to MAX_HISTORY entries (oldest first).
 *
 * @param {object} session
 * @param {string} session.id
 * @param {string} session.preset - e.g. "25 min"
 * @param {number} session.duration - seconds
 * @param {number} session.completedAt - Date.now()
 * @param {string} session.note - user's session note
 * @param {'focus'|'break'} session.type
 */
export const saveSession = (session) => {
  try {
    const history = loadHistory();
    history.push(session);
    // Trim oldest if over max
    while (history.length > MAX_HISTORY) history.shift();
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Storage full or unavailable — degrade silently
  }
};

// ─── Stats helpers ───────────────────────────────────────────────────────────

/** Count consecutive days (going backward from today) with at least one focus session. */
export const getStreak = (history) => {
  if (!history.length) return 0;
  const focusSessions = history.filter((s) => s.type === SESSION_TYPE.FOCUS);
  if (!focusSessions.length) return 0;

  // Build a Set of YYYY-MM-DD strings that have at least one focus session
  const days = new Set(
    focusSessions.map((s) => {
      const d = new Date(s.completedAt);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })
  );

  let streak = 0;
  const now = new Date();
  // Check today, then go backward
  for (let i = 0; i < 365; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (days.has(key)) {
      streak++;
    } else if (i === 0) {
      // Today doesn't have a session yet — that's fine, check from yesterday
      continue;
    } else {
      break;
    }
  }
  return streak;
};

/** Total focus minutes completed today. */
export const getTodayMinutes = (history) => {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return history
    .filter((s) => {
      if (s.type !== SESSION_TYPE.FOCUS) return false;
      const d = new Date(s.completedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return key === todayKey;
    })
    .reduce((sum, s) => sum + s.duration, 0) / 60;
};

/**
 * Weekly focus minutes — last 7 days (including today).
 * Returns array of { day: 'Mon'|'Tue'|..., minutes: number } for CSS bar chart.
 */
export const getWeeklyStats = (history) => {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const result = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const minutes = history
      .filter((s) => {
        if (s.type !== SESSION_TYPE.FOCUS) return false;
        const sd = new Date(s.completedAt);
        const sk = `${sd.getFullYear()}-${String(sd.getMonth() + 1).padStart(2, '0')}-${String(sd.getDate()).padStart(2, '0')}`;
        return sk === key;
      })
      .reduce((sum, s) => sum + s.duration, 0) / 60;

    result.push({ day: dayNames[d.getDay()], minutes: Math.round(minutes) });
  }

  return result;
};
