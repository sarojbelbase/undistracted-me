/**
 * Clock widget utilities
 */
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { getGreeting } from '../../data/greetings';
export { GREETINGS, getGreeting } from '../../data/greetings';

// dayjs plugins are already extended by utilities/index.js which is always
// imported first. We only extend here as a safety net in case this file is
// imported in isolation (e.g. unit tests that don't load the full app).
if (!dayjs.tz) {
  dayjs.extend(utc);
  dayjs.extend(timezone);
}

/** Curated list of major IANA timezones with friendly display labels. */
export const TZ_OPTIONS = [
  { tz: 'America/New_York', label: 'New York (ET)' },
  { tz: 'America/Chicago', label: 'Chicago (CT)' },
  { tz: 'America/Denver', label: 'Denver (MT)' },
  { tz: 'America/Los_Angeles', label: 'Los Angeles (PT)' },
  { tz: 'America/Sao_Paulo', label: 'São Paulo' },
  { tz: 'America/Toronto', label: 'Toronto' },
  { tz: 'America/Vancouver', label: 'Vancouver' },
  { tz: 'Europe/London', label: 'London' },
  { tz: 'Europe/Paris', label: 'Paris (CET)' },
  { tz: 'Europe/Berlin', label: 'Berlin' },
  { tz: 'Europe/Amsterdam', label: 'Amsterdam' },
  { tz: 'Europe/Moscow', label: 'Moscow' },
  { tz: 'Africa/Cairo', label: 'Cairo (EET)' },
  { tz: 'Asia/Dubai', label: 'Dubai' },
  { tz: 'Asia/Kolkata', label: 'India (IST)' },
  { tz: 'Asia/Kathmandu', label: 'Kathmandu (NPT)' },
  { tz: 'Asia/Dhaka', label: 'Dhaka' },
  { tz: 'Asia/Bangkok', label: 'Bangkok' },
  { tz: 'Asia/Singapore', label: 'Singapore' },
  { tz: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { tz: 'Asia/Tokyo', label: 'Tokyo' },
  { tz: 'Australia/Sydney', label: 'Sydney' },
  { tz: 'Pacific/Auckland', label: 'Auckland' },
];



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
  const now = dayjs().tz(tz);
  const { time, period } = formatTime(now, format);
  const option = TZ_OPTIONS.find(o => o.tz === tz);
  return { time, period, label: option ? option.label : tz };
};
