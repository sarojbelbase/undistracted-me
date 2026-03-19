/**
 * Clock widget utilities
 */
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

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

export const GREETINGS = [
  { from: 0, prefix: 'nothing good', label: 'happens after midnight' },
  { from: 5, prefix: 'early bird', label: 'gets the worm' },
  { from: 7, prefix: 'time to', label: 'get to work' },
  { from: 9, prefix: 'deep in the', label: 'morning grind' },
  { from: 12, prefix: 'fuel up for the', label: 'afternoon push' },
  { from: 14, prefix: 'stay in', label: 'the zone' },
  { from: 17, prefix: 'great job,', label: 'wrap it up' },
  { from: 19, prefix: 'rest up,', label: "tomorrow's coming" },
  { from: 22, prefix: 'get some', label: 'sleep' },
];

export const getGreeting = (h24) =>
  [...GREETINGS].reverse().find(g => h24 >= g.from) || GREETINGS[0];

/**
 * Returns { time, period, greeting } using browser local time (no hardcoded TZ).
 * @param {'24h'|'12h'} format
 */
export const getTimeParts = (format) => {
  const now = dayjs();
  const h24 = now.hour();
  const minutes = String(now.minute()).padStart(2, '0');
  const greeting = getGreeting(h24);

  if (format === '24h') {
    return { time: String(h24).padStart(2, '0') + ':' + minutes, period: null, greeting };
  }

  const period = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 || 12;
  return { time: String(h12).padStart(2, '0') + ':' + minutes, period, greeting };
};

/**
 * Returns { time, period, label } for an extra TZ clock.
 * @param {string} tz  — IANA timezone string
 * @param {'24h'|'12h'} format
 */
export const getTimeInZone = (tz, format) => {
  const now = dayjs().tz(tz);
  const h24 = now.hour();
  const minutes = String(now.minute()).padStart(2, '0');
  const option = TZ_OPTIONS.find(o => o.tz === tz);
  const label = option ? option.label : tz;

  if (format === '24h') {
    return { time: String(h24).padStart(2, '0') + ':' + minutes, period: null, label };
  }

  const period = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 || 12;
  return { time: String(h12) + ':' + minutes, period, label };
};
