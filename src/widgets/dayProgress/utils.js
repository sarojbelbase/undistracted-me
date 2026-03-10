/**
 * Day Progress widget utilities
 */

/**
 * Returns current day progress as a percentage (0–100) and current hour (0–23).
 */
export const getDayProgress = () => {
  const now = new Date();
  const hour = now.getHours();
  const minutes = now.getMinutes();
  return {
    percentage: Math.floor(((hour * 60 + minutes) / (24 * 60)) * 100),
    currentHour: hour,
  };
};

/** Total number of progress dots representing the day. */
export const TOTAL_DOTS = 24;
