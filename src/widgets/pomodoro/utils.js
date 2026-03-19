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
