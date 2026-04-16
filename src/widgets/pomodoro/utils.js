export const PRESETS = [
  { label: '25 min', secs: 25 * 60 },
  { label: '30 min', secs: 30 * 60 },
  { label: '1 hr', secs: 60 * 60 },
  { label: 'Custom', secs: null },
];

export const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

/**
 * Reads the current pomodoro state from localStorage.
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
