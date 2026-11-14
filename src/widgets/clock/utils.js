/**
 * Clock widget utilities
 */
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { getGreeting } from '../../data/greetings';
import { TZ_MAP } from '../../data/timezones';
export { GREETINGS, getGreeting } from '../../data/greetings';
export { TIMEZONES, TZ_MAP, TZ_REGIONS } from '../../data/timezones';

// dayjs plugins are already extended by utilities/index.js which is always
// imported first. We only extend here as a safety net in case this file is
// imported in isolation (e.g. unit tests that don't load the full app).
if (!dayjs.tz) {
  dayjs.extend(utc);
  dayjs.extend(timezone);
}



/**
 * Returns { time, period, greeting } using browser local time (no hardcoded TZ).
 * @param {'24h'|'12h'} format
/**
 * Core time formatter shared by getTimeParts and getTimeInZone.
 * @param {import('dayjs').Dayjs} dayjsInstance
 * @param {'24h'|'12h'} format
 * @returns {{ time: string, period: string|null }}
 */
const formatTime = (dayjsInstance, format) => {
  const h24 = dayjsInstance.hour();
  const minutes = String(dayjsInstance.minute()).padStart(2, '0');

  if (format === '24h') {
    return { time: String(h24).padStart(2, '0') + ':' + minutes, period: null };
  }

  const period = h24 < 12 ? 'AM' : 'PM';
  const h12 = String(h24 % 12 || 12).padStart(2, '0');
  return { time: h12 + ':' + minutes, period };
};

/**
 * Returns { time, period, greeting } using browser local time (no hardcoded TZ).
 * @param {'24h'|'12h'} format
 */
export const getTimeParts = (format) => {
  const now = dayjs();
  const { time, period } = formatTime(now, format);
  const greeting = getGreeting(now.hour());
  return { time, period, greeting };
};

/**
 * Returns { time, period, label } for an extra TZ clock.
 * @param {string} tz  — IANA timezone string
 * @param {'24h'|'12h'} format
 */
export const getTimeInZone = (tz, format) => {
  let now;
  try {
    now = dayjs().tz(tz);
  } catch {
    // Unknown/legacy IANA zone — degrade gracefully instead of throwing and
    // aborting the shared clock tick loop (see sharedClock.js).
    now = dayjs();
  }
  const { time, period } = formatTime(now, format);
  const option = TZ_MAP[tz];
  return { time, period, label: option ? option.name : tz };
};

/**
 * Returns the live UTC offset for an IANA timezone, e.g. "UTC-07:00" for
 * America/Los_Angeles during DST (PDT) and "UTC-08:00" otherwise (PST).
 *
 * dayjs' timezone plugin applies the zone's current DST rules, so this is the
 * DST-correct offset at "now" — unlike the static `offset` in TZ_MAP which only
 * records standard time.
 */
export const getUtcOffset = (tz) => {
  try {
    return 'UTC' + dayjs().tz(tz).format('Z');
  } catch {
    const meta = TZ_MAP[tz];
    return 'UTC' + (meta ? meta.offset : '+00:00');
  }
};
