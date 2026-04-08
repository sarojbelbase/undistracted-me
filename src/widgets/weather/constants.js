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
      'Sky had its moment. Moving on.',
      'Rain finally got the hint.',
      'Sun is clocking back in.',
      'The sky apologises. Conditionally.',
      'Rain resigned. Finally.',
      "Wet chapter's almost closed.",
    ],
    incoming: [
      'Future you will be soaked. Act now.',
      'Your laundry is thriving outside.',
      'Rain ETA: soon. Regret ETA: sooner.',
      "Umbrella at home? Bold.",
      'Sky loaded. Brace.',
      'Get inside before clouds get personal.',
      'Your plans have been weather-checked.',
    ],
    persist: [
      'All day. Cancel the ambitions.',
      'It is raining. It will keep raining.',
      'Sky said no. Plans said maybe. Sky wins.',
      'Raining until night. Couch is smug.',
      'Day off — courtesy of the sky.',
      'Everything outside can wait.',
    ],
    possible: [
      'Sky is undecided. You should not be.',
      'Umbrella has better odds than your gut.',
      'Clouds look suspicious. Carry the umbrella.',
      'Maybe rain. The sky is being dramatic.',
      'Low risk. High regret if wrong.',
    ],
  },

  // ── Snow ──────────────────────────────────────────────────────────────────
  snow: {
    clearing: [
      'Snow fading. Roads still not sold on the idea.',
      "White stuff gone. Cold didn't get the memo.",
      'Clearing. Sandals still very much off the table.',
      'Snow out. Everything wet in — stay careful.',
    ],
    incoming: [
      'Snow inbound. That excuse writes itself.',
      'Everything harder to drive on. Soon.',
      'Snow coming. Schedule being rerouted.',
      "Layers. All of them.",
      'Get home first. Snow argues with plans.',
    ],
    persist: [
      'Full snow day. Moral authority to stay put.',
      'Roads have filed a complaint against you.',
      'Buried. Good intentions included.',
      "Productivity pardoned. Nature's orders.",
      'Everything outside is optional today.',
    ],
    possible: [
      'Snow possible. Boots are always the right call.',
      'Maybe slush, maybe snow, definitely cold.',
      'Could snow. Adjust plans before the sky adjusts them for you.',
    ],
  },

  // ── Thunder ───────────────────────────────────────────────────────────────
  thunder: {
    incoming: [
      'Save the file. Save the file. Save the file.',
      'Unplug something you actually like.',
      'Best time to be outside: not.',
      'Sky is loading something dramatic.',
      'Storm ETA: soon. Backup plan: figuring it out.',
    ],
    persist: [
      'Sky is actively having issues today.',
      'Inside was the answer all along.',
      'Nature is venting. Respect it.',
      'Charge everything now. Power is a weather sport here.',
      'Couch has been right this whole time.',
      'Sky in its villain arc. Stay inside.',
    ],
    possible: [
      'God is loading something.',
      'Save your work. Sky may disagree.',
      'Consider not standing on high ground.',
      'Could storm. Backup plans are underpromoted.',
    ],
  },

  // ── Clear ─────────────────────────────────────────────────────────────────
  clear: {
    persist: [
      'Beautiful outside. Rude of it.',
      'Sun is doing its best. The question is you.',
      'No excuses. Sky cleared all of them.',
      'Clear skies. The guilt comes free.',
      'Best weather in days. Tab still open.',
      'Genuinely nice out. Suspicious.',
      'Perfect day. Being wasted on you.',
      'Even the weather wants you to go outside.',
    ],
  },

  // ── Cloudy ────────────────────────────────────────────────────────────────
  cloudy: {
    persist: [
      'Sky could go either way. Mood: same.',
      'The weather is also unbothered.',
      'Grey all day. Blanket is legally valid.',
      'Commitment to anything: none.',
      'At least it matches your energy.',
      'Not raining. Not sunny. Just grey.',
      'Sky picked the exact same mood.',
      'Technically fine. Somehow still off.',
    ],
  },

  // ── Fog ───────────────────────────────────────────────────────────────────
  fog: {
    persist: [
      'Visibility: optimistic. Speed: slower.',
      'The whole city is loading. Please wait.',
      'Fog so thick commute became optional.',
      'Headlights on. Hope: also on.',
      'Can see fine-ish. Drive like you cannot.',
      'Five-minute-late excuse: already written.',
      'City went offline. Dense fog, sparse luck.',
    ],
  },
};

// ── Temperature-shift quips ───────────────────────────────────────────────────
// Triggered by passing `tempTrend` to getWeatherQuip().
// For warming / cooling you need hourly temp data from Open-Meteo
// (add temperature_2m to the hourly fields in fetchOpenMeteo).

export const TEMP_QUIPS = {
  /** Sunny + actually cold (apparent_temperature ≤ 10 °C) */
  cold_sunny: [
    'Sunny and freezing. Window is gaslighting you.',
    'Looks warm. Feels like a personal attack.',
    'Clear sky, coat required. Nature lied.',
    'Beautiful outside. Also absolutely brutal.',
    "Sun out. Heat not invited.",
    'Step out. Regret in three seconds.',
  ],

  /** Temperature rising through the day */
  warming: [
    'Getting warmer. Morning was a trap.',
    'Heating up all day. Fan entered the chat.',
    'Morning lied about the afternoon.',
    'Mild now. Angry by 2pm.',
    'Temperature climbing. Cold shower: vindicated.',
    'Warm front incoming. You will feel it.',
  ],

  /** Temperature dropping */
  cooling: [
    'Dropping a few degrees. Jacket was right.',
    'Cooling off. No further explanation needed.',
    "Evening gets cold. Hard way incoming.",
    'Temperature down. Layer up, not regret.',
    'Cooling down. Fan finally stands down.',
    'Getting cooler by the hour.',
  ],
};

// ── Mood / relatable daily-life quips ────────────────────────────────────────
// Used as fallbacks when condition-based banks are exhausted.

export const MOOD_QUIPS = {
  monday: [
    "Clear skies. Still Monday, though.",
    'Perfect weather. Wasted on a Monday.',
    'Weather cooperated. Monday did not.',
    'Nice out. Shame about the day.',
  ],
  friday: [
    'Clear and Friday. Rarest combo.',
    'Sky cleared just for Friday. Fair.',
    'Sunny Friday. You earned this.',
    'Weather and Friday aligned. Twice a year.',
  ],
  weekend: [
    'Weekend weather. Screen can wait.',
    'Sunny and free. Rare double.',
    'Good day off. Use it.',
    'No alarm. No rain. System works.',
  ],
  /** Daytime fallback */
  desk: [
    'Nice out. Screen will still be here.',
    'Good weather. Cancelled meeting would help.',
    'Just five minutes outside. Go.',
    'Clear skies. To-do list is not going anywhere.',
    'Could be worse. It has been worse.',
    "Perfect day. Somebody is stuck at a desk.",
  ],
  /** Clear sky at night */
  clear_night: [
    'Clear night. Stars visible and free.',
    'Still and quiet out there.',
    'Good night for nothing in particular.',
    'Sky cleared after you stopped watching.',
  ],
  /** Nighttime fallback */
  desk_night: [
    'Still up? At least it is not raining.',
    'Clear at this hour. That is something.',
    'Weather has no complaints. You might.',
    'Night shift. Sky is cooperating.',
    'Late night. Clear out. Go to sleep.',
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
