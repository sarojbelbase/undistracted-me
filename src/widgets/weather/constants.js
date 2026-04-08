/**
 * Weather widget copy — Nepali-flavoured quips
 *
 * Organisation:
 *   QUIPS[conditionGroup][forecastType] → string[]
 *
 *   conditionGroup : rain | snow | thunder | clear | cloudy | fog
 *   forecastType   : clearing | incoming | persist | possible
 *
 * TEMP_QUIPS  — temperature-shift scenarios (cold_sunny / warming / cooling)
 * MOOD_QUIPS  — relatable daily-life lines used as fallbacks
 *
 * Entry point: getWeatherQuip(forecast, weather, ctx?)
 *
 * Rotation is hour-seeded so it changes every 60 min but
 * stays stable across re-renders within the same hour.
 */

// ── Condition group resolver ──────────────────────────────────────────────────

/** Maps any WMO weather code → broad QUIPS key */
export const getConditionGroup = (code) => {
  if (code >= 95) return 'thunder';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if (code === 45 || code === 48) return 'fog';
  if (code === 3) return 'cloudy';
  return 'clear';
};

// ── Main quip banks ───────────────────────────────────────────────────────────

export const QUIPS = {

  // ── Rain ──────────────────────────────────────────────────────────────────
  rain: {
    clearing: [
      'Sky fixing itself. Tea first.',
      'Clearing up. The sun apologises.',
      'Rain almost done. Umbrella had one job.',
      'Dal bhat ready? Rain is wrapping up.',
      "Clearing soon. Meeting still won't cancel.",
    ],
    incoming: [
      'Rain in 2h. Get the laundry in. Now.',
      'Momo plans might not survive this.',
      'Pack the umbrella — not negotiable.',
      'Rain coming. Your bike is nervous.',
      'Check before leaving. Rain incoming.',
      'Your friend took their umbrella. Did you?',
    ],
    persist: [
      'Rain all day. Dal bhat and YouTube.',
      'Wet day. Staying in counts.',
      'Canteen momo session confirmed.',
      'Plan for today: umbrella, dal bhat, rest.',
      'All day rain. Classic.',
    ],
    possible: [
      'Maybe rain. Maybe hot tea. Take both.',
      'Pack an umbrella just in case.',
      'Rain or not? Coin toss. Take the umbrella.',
      'Suspicious clouds. Umbrella is safer.',
    ],
  },

  // ── Snow ──────────────────────────────────────────────────────────────────
  snow: {
    clearing: [
      'Snow fading. Roads may still disagree.',
      'Clearing up. Still wear the jacket.',
      'Snow ending. Full jacket, not half.',
      'Fresh air incoming. Hot tea first.',
    ],
    incoming: [
      'Snow in a few hours. Get home early.',
      "Snow incoming. That old jacket won't cut it.",
      'Reach home before snow. Seriously.',
      'Snow coming. Dry clothes, warm socks.',
    ],
    persist: [
      'Snow all day. No valid reason to leave.',
      'Snow day. Parotha + tea energy.',
      'Roads closed. Cancel the plans.',
      'Snow until tonight. Even grandpa is just sitting.',
    ],
    possible: [
      'Snow possible. Jacket ready.',
      'Maybe snow tonight. Sleep early.',
      'Possible snow. Micro service unreliable anyway.',
    ],
  },

  // ── Thunder ───────────────────────────────────────────────────────────────
  thunder: {
    incoming: [
      'Storm rolling in. Save the spreadsheet.',
      'Thunder ahead. Unplug what you like.',
      'Lightning incoming. Stay on the call from inside.',
      'Thunderstorm coming. Close the skylights.',
    ],
    persist: [
      'Stormy all day. Tea, calm down.',
      'Storms all day. Reporting from the couch.',
      'Charge everything now. Stormy out there.',
      'Dark outside. Momo + movie: confirmed.',
    ],
    possible: [
      'Thunder possible. Save the spreadsheet, bro.',
      'Lightning maybe. Make a backup plan.',
      'Storm possible. Stay off open ground.',
    ],
  },

  // ── Clear ─────────────────────────────────────────────────────────────────
  clear: {
    persist: [
      'Clear skies. No excuses today.',
      "Sun's out. Vitamin D — free.",
      'Good day. Put the phone down and go.',
      'All clear. Grandpa would go outside.',
      'Open skies. Leave the laptop home.',
      'Perfect day. Suspicious.',
    ],
  },

  // ── Cloudy ────────────────────────────────────────────────────────────────
  cloudy: {
    persist: [
      'Overcast. Will it rain? Probably.',
      'Overcast. Dal bhat and an afternoon nap.',
      'Grey all day. Productivity: debatable.',
      'Cloudy. The sky is also confused.',
      'Grey skies. Tea is the answer.',
      'Cloudy. Grandpa says it will rain.',
    ],
  },

  // ── Fog ───────────────────────────────────────────────────────────────────
  fog: {
    persist: [
      'Foggy. Ring Road in slow motion today.',
      'Thick fog. Even GPS is unsure.',
      'Misty out. Helmet on, ride slow.',
      'Fog clears by morning. Just patience.',
      'Thick fog. Leave early or leave late.',
    ],
  },
};

// ── Temperature-shift quips ───────────────────────────────────────────────────
// Triggered by passing `tempTrend` to getWeatherQuip().
// For warming / cooling you need hourly temp data from Open-Meteo
// (add temperature_2m to the hourly fields in fetchOpenMeteo).

export const TEMP_QUIPS = {
  /** Sunny but actually cold (code 0–2, apparent_temperature ≤ 10 °C) */
  cold_sunny: [
    "Sun's out. Warmth is not. Take the coat.",
    'Bright and freezing. The window lied.',
    'Sunny outside. Cold is still very much there.',
    'Clear sky, bitter cold. Classic combo.',
    "Sun appeared. Cold didn't get the memo.",
  ],

  /** Temperature rising steadily through the day */
  warming: [
    'Heating up through the day. Fan is plotting.',
    'Getting warmer by noon. Momo window: now.',
    'Temp climbing all day. Cold water > tea today.',
    'Morning mild, afternoon hot. Pace yourself.',
    'Temp rising. Cold shower vindicated by 2pm.',
  ],

  /** Temperature dropping a few degrees (e.g., 24 → 21 °C) */
  cooling: [
    'Dropping a few degrees. Light jacket time.',
    'Cooling off this afternoon. Dal bhat fits.',
    'Evening gets cooler. Tea makes sense now.',
    'Temp dropping. Good time for hot dal bhat.',
    'Getting cooler. Fan finally gets a rest.',
  ],
};

// ── Mood / relatable daily-life quips ────────────────────────────────────────
// Used as fallbacks when condition-based banks are exhausted
// or on clear persist days with no special event.

export const MOOD_QUIPS = {
  monday: [
    "Clear sky. It's still Monday though.",
    'Perfect weather. Wasted on a Monday.',
    'Clear sky. Motivation: barely there.',
  ],
  friday: [
    'Clear and Friday. Rare combo.',
    'Weather cleared just for Friday. Fair.',
    'Sunny Friday. Rare. Take it.',
  ],
  weekend: [
    'Perfect weekend weather. Leave the laptop.',
    'Sunny weekend. Make an outing plan.',
    'Good day. Even grandpa goes outside on days like this.',
  ],
  /** Daytime desk-worker fallback */
  desk: [
    'Clear skies. Tea, terrace, five minutes.',
    'Good weather. A cancelled meeting would help.',
    'Weather fine. Finish the work, then go outside.',
    'Nice out. The screen will still be here.',
    'Could be worse. Could be raining.',
  ],
  /** Clear sky at night */
  clear_night: [
    'Clear night. Stars are free.',
    'Quiet and clear out there.',
    'Still and clear. Good night for nothing.',
    'Clear skies. Sleep is also an option.',
  ],
  /** Nighttime fallback */
  desk_night: [
    'Still up? At least it is not raining.',
    'Late night tab. Weather is fine, at least.',
    'Clear at this hour. Go to sleep.',
    'Working late. Tea hot, sky clear.',
    'Night shift. Weather holds no complaints.',
  ],
};

// ── Quip picker ───────────────────────────────────────────────────────────────

/**
 * Deterministic seed — changes once per hour so the quip feels fresh
 * but doesn't flicker on every re-render.
 */
const hourSeed = () => {
  const d = new Date();
  return (
    d.getFullYear() * 1_000_000 +
    d.getMonth() * 10_000 +
    d.getDate() * 100 +
    d.getHours()
  );
};

export const pickQuip = (arr) => {
  if (!arr?.length) return '';
  return arr[hourSeed() % arr.length];
};

// ── Main entry ────────────────────────────────────────────────────────────────

/**
 * Returns a single ready-to-render quip string.
 *
 * @param {object|null} forecast   - result of parseForecast()
 *   { type: 'clearing'|'incoming'|'persist'|'possible', code: number, hours: number }
 * @param {object|null} weather    - result of parseWeather()
 *   { code: number, temperature: number, feelsLike: number }
 * @param {object}      [ctx]      - optional context
 *   { weekday?: 0–6, tempTrend?: 'warming'|'cooling'|null }
 * @returns {string}
 */
export const getWeatherQuip = (forecast, weather, ctx = {}) => {
  if (!forecast && !weather) return '';

  const code = weather?.code ?? 0;
  const feels = weather?.feelsLike ?? weather?.temperature ?? 20;
  const isDay = weather?.isDay ?? true;
  const group = getConditionGroup(forecast?.code ?? code);
  const fType = forecast?.type;

  // ── Temperature overrides ──────────────────────────────────────────────
  // 1. Sunny + cold (apparent temp ≤ 10 °C)
  if (code <= 2 && feels <= 10) {
    return pickQuip(TEMP_QUIPS.cold_sunny);
  }

  // 2. Explicit temp trend passed in from parent (needs hourly temp data)
  if (ctx.tempTrend === 'warming') return pickQuip(TEMP_QUIPS.warming);
  if (ctx.tempTrend === 'cooling') return pickQuip(TEMP_QUIPS.cooling);

  // ── Condition-based bank ───────────────────────────────────────────────
  const bank = QUIPS[group]?.[fType];
  if (bank?.length) return pickQuip(bank);

  // ── Mood fallback (clear persist day/night, or nothing matched) ────────
  if (group === 'clear') {
    if (!isDay) return pickQuip(MOOD_QUIPS.clear_night);
    const day = ctx.weekday ?? new Date().getDay();
    if (day === 1) return pickQuip(MOOD_QUIPS.monday);
    if (day === 5) return pickQuip(MOOD_QUIPS.friday);
    if (day === 0 || day === 6) return pickQuip(MOOD_QUIPS.weekend);
  }

  return isDay ? pickQuip(MOOD_QUIPS.desk) : pickQuip(MOOD_QUIPS.desk_night);
};
