/**
 * Clock widget utilities
 */
import { getTimeZoneAwareDayJsInstance } from '../../utilities';

export const GREETINGS = [
  { from: 0, prefix: 'burning the', label: 'midnight oil' }, // 0–4
  { from: 5, prefix: 'time to', label: 'rise & shine' }, // 5–8
  { from: 9, prefix: 'deep in the', label: 'morning grind' }, // 9–11
  { from: 12, prefix: 'soaking up the', label: 'midday sun' }, // 12–13
  { from: 14, prefix: 'riding the', label: 'afternoon wave' }, // 14–16
  { from: 17, prefix: 'catching the', label: 'golden hour' }, // 17–18
  { from: 19, prefix: 'easing into', label: 'the evening' }, // 19–21
  { from: 22, prefix: 'burning the', label: 'midnight oil' }, // 22–23
];

export const getGreeting = (h24) =>
  [...GREETINGS].reverse().find(g => h24 >= g.from) || GREETINGS[0];

/**
 * Returns { time, period, greeting } for the current Nepal timezone time.
 * @param {'24h'|'12h'} format
 */
export const getTimeParts = (format) => {
  const now = getTimeZoneAwareDayJsInstance();
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
