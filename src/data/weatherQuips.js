/**
 * Weather widget copy — Nepali-flavoured quips
 *
 * Organisation:
 *   QUIPS[conditionGroup][forecastType] → string[]
 *
 *   conditionGroup : rain | snow | thunder | clear | cloudy | fog
 *   forecastType   : clearing | incoming | persist | possible
 *
 * WIND_QUIPS  — wind intensity overrides (breezy / strong / storm)
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
const getConditionGroup = (code) => {
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
      'sky apologised. conditionally.',
      'rain took the hint. finally.',
      'sun clocked back in. late.',
      'wet chapter: closed.',
      'rain resigned. dry era loading.',
      'sky had a moment. it passed.',
      'clearing up. the audacity.',
      'rain quit. suspicious.',
      'clouds retreated. damage done.',
      'sun returned. we clap.',
      'sky moved on. so can you.',
      'drying out. slowly, begrudgingly.',
    ],
    incoming: [
      'your laundry is outside. still.',
      'rain in 3… 2…',
      'umbrella at home. bold choice.',
      'sky is loading something wet.',
      'future you is soaked.',
      'clouds have opinions. act now.',
      'brace. sky means it.',
      'forecast said rain. forecast wins.',
      'rain incoming. plans optional now.',
      'regret ETA: ten minutes.',
      'go get the laundry. now.',
      'sky loaded. brace accordingly.',
    ],
    persist: [
      'all day. cancel ambitions.',
      'raining now. raining later. sorry.',
      'sky said no. take the couch.',
      'inside was always the answer.',
      "day off. sky's orders.",
      'couch confirmed. sky approved.',
      "rain doesn't care about your schedule.",
      'it will keep raining. adjust.',
      'nothing outside needs you today.',
      'productivity surrendered to precipitation.',
      'weather cancelled your plans. it\'s fine.',
      'sky said no. plans said maybe. sky wins.',
    ],
    possible: [
      'clouds look suspicious.',
      'maybe rain. umbrella anyway.',
      'sky being dramatic again.',
      'carry it just in case.',
      'low chance. high regret if wrong.',
      'could rain. could not. umbrella wins.',
      'fifty percent. enough to pack it.',
      'sky undecided. you shouldn\'t be.',
      'weather hedging. don\'t.',
      'that cloud is watching you.',
    ],
  },

  // ── Snow ──────────────────────────────────────────────────────────────────
  snow: {
    clearing: [
      "snow fading. cold isn't.",
      'roads still processing. be patient.',
      'clearing. sandals still very banned.',
      'white stuff gone. slush remains.',
      'snow out. everything wet. go slow.',
      "sky cleared. temperature didn't get the memo.",
      'visible roads. still risky roads.',
      'melting. not done being difficult.',
    ],
    incoming: [
      'layers. all of them.',
      'snow inbound. excuse already written.',
      'everything harder to drive on. soon.',
      'the boots were right.',
      'white chaos incoming.',
      "snow doesn't care about your plans.",
      'visibility about to become a vibe.',
      'warmth: act now.',
      'schedule being rerouted by snow.',
      'get home first. snow argues with plans.',
    ],
    persist: [
      'full snow day. stay put.',
      'roads rejected you. politely.',
      'buried. good intentions included.',
      'productivity: pardoned by nature.',
      'outside is optional today.',
      'snow decided for you. rest.',
      'not going anywhere. literally.',
      'couch has sovereign authority today.',
      'nature filed a stay-in order.',
      'ice has a message. listen to it.',
    ],
    possible: [
      'could snow. the boots know.',
      'maybe slush. maybe chaos. same.',
      'check the tires. twice.',
      'snow possible. dress like it is.',
      'fifty percent chance of white chaos.',
      'might snow. layer now or suffer.',
      'snow undecided. you should decide.',
    ],
  },

  // ── Thunder ───────────────────────────────────────────────────────────────
  thunder: {
    incoming: [
      'save the file. now.',
      'save the file. seriously.',
      'unplug something you actually like.',
      'sky loading something dramatic.',
      'storm ETA: soon.',
      'outside: not the move.',
      'back up everything. quickly.',
      'thunder clapping in from the left.',
      'weather warming up for the main act.',
      'brace. sky is writing an essay.',
    ],
    persist: [
      'sky is having a crisis.',
      'inside was right all along.',
      'nature is venting. respect it.',
      'charge now. power is a weather sport.',
      'sky in its villain arc.',
      'couch wins. uncontested.',
      'nothing outside is worth it.',
      'sky said stay in. obey.',
      'storm mode engaged. unplug things.',
      'weather doing the most today.',
    ],
    possible: [
      'god is loading something.',
      'save your work. sky is unpredictable.',
      'backup plans are underpromoted.',
      'could storm. adjust early.',
      'weather may have strong opinions.',
      'not the day for high ground.',
      'might thunder. act accordingly.',
      'sky is in its feelings.',
    ],
  },

  // ── Clear ─────────────────────────────────────────────────────────────────
  clear: {
    persist: [
      'beautiful outside. rude of it.',
      'no excuses. sky cleared them all.',
      'genuinely nice out. suspicious.',
      'perfect day. being wasted.',
      'even the weather is judging you.',
      'clear skies. guilt comes free.',
      'go outside. it\'s a command.',
      'sun doing its best. question is you.',
      'you have no excuse today.',
      'sky said go. what are you doing.',
      'best weather in a while. tab still open.',
      'this weather is an intervention.',
    ],
  },

  // ── Cloudy ────────────────────────────────────────────────────────────────
  cloudy: {
    persist: [
      'sky could go either way. mood: same.',
      'grey all day. blanket is valid.',
      'technically fine. somehow still off.',
      'not raining. not sunny. just grey.',
      'sky picked your exact mood.',
      'commitment: none from either party.',
      'at least it matches your energy.',
      'unbothered. the weather and you both.',
      'grey vibes only today.',
      'overcast and understated.',
      'sky shrugged. same.',
      'low drama. low sunshine. same thing.',
    ],
    clearing: [
      'grey was temporary. sun reconsidered.',
      'clouds moving on. briefly optimistic.',
      'overcast lifting. do not celebrate yet.',
      'clearing. do not get used to it.',
      'blue sky incoming. limited time offer.',
      'clouds broke. sun rushed in.',
      'sky changed its mind. rare.',
      'grey loosening its grip.',
    ],
    incoming: [
      'clear for now. grey clocking in soon.',
      'clouds arriving. brace.',
      'blue while it lasts.',
      'grey is on the way.',
      'enjoy the light. brief window.',
      'sunny with an expiration date.',
      'clouds inbound. mood incoming.',
      'overcast is on the schedule.',
    ],
    possible: [
      'might grey up. jacket nearby.',
      'sky undecided. aren\'t we all.',
      'could cloud over. blanket ready.',
      'overcast possible. low stakes.',
      'sky on the fence. probably grey.',
      'could go either way. it will be grey.',
    ],
  },

  // ── Fog ───────────────────────────────────────────────────────────────────
  fog: {
    persist: [
      'city is loading. please wait.',
      'visibility: optimistic.',
      'fog made commute optional.',
      'drive like you cannot see.',
      'excuse already written. dense fog.',
      'headlights on. hope also on.',
      'world still out there. probably.',
      'fog mode: engaged.',
      'everything soft-launched by fog today.',
      'city offline. ambient moisture win.',
    ],
    clearing: [
      'city booting back up.',
      'fog clocking out. slowly.',
      'visibility returning. finally.',
      'world was still there.',
      'fog lifted. drama continues.',
      'sun pushing through. barely.',
      'fog retreating. roads less cursed.',
    ],
    incoming: [
      'fog rolling in. blame it early.',
      'visibility dropping. stay put.',
      'headlights on. plans off.',
      'incoming fog. schedule has concerns.',
      'fog season. everything takes longer.',
      'visibility: about to become a vibe.',
      'city going soft focus. not by choice.',
      'fog inbound. buffer the commute.',
    ],
    possible: [
      'fog possible. slow down anyway.',
      'could get murky out there.',
      'maybe fog. maybe just moody sky.',
      'fog possible. headlights on regardless.',
      'murky potential. stay cautious.',
      'might fog up. drive like it will.',
      'drive like you cannot see anyway.',
    ],
  },
};

// ── Wind quips ────────────────────────────────────────────────────────────────
// Keyed by intensity: breezy (20–44 km/h), strong (45–64 km/h), storm (65+ km/h)

export const WIND_QUIPS = {
  /** 20–44 km/h — noticeably breezy */
  breezy: [
    'hair has given up.',
    'breezy. umbrella is now a liability.',
    'wind said hi. not gently.',
    'napkins: public property today.',
    'good kite day. bad everything else day.',
    'hold the hat. seriously.',
    'gusty enough to rethink it.',
    'breezy agenda: chaos.',
    'wind doing its thing out there.',
    'door is making its own decisions.',
  ],
  /** 45–64 km/h — genuinely strong gusts */
  strong: [
    'wind is making decisions for you.',
    'umbrella is already dead.',
    'gusts at feud with your schedule.',
    'walk sideways if needed.',
    'structural commitment: reconsidering.',
    'wind said no. take the hint.',
    'hold onto doors. and the dog.',
    'plans reconsidered by gusts.',
    'strong wind energy. stay inside.',
    'anything light is leaving now.',
  ],
  /** 65+ km/h — storm-grade, dangerous */
  storm: [
    "that's not wind. that's a vendetta.",
    'stay inside. non-negotiable.',
    'nothing outside is worth it.',
    'nature is actively hostile.',
    'everything untied is now gone.',
    'hard pass on going out.',
    'batten down. wind means it.',
    'storm wind does not negotiate.',
    'weather declared a personal emergency.',
    'destructive. stay in. full stop.',
  ],
};

// ── Temperature-shift quips ───────────────────────────────────────────────────
// Triggered by passing `tempTrend` to getWeatherQuip().
// For warming / cooling you need hourly temp data from Open-Meteo
// (add temperature_2m to the hourly fields in fetchOpenMeteo).

export const TEMP_QUIPS = {
  /** Sunny + actually cold (apparent_temperature ≤ 10 °C) */
  cold_sunny: [
    'sunny and freezing. window is lying.',
    'looks warm. feels like a personal attack.',
    'nature lied. coat required.',
    'clear sky. brutal temperature. both true.',
    "sun's out. coat stays on.",
    'gaslighting courtesy of the sky.',
    'step out. regret in three seconds.',
    'thermometer and window disagree.',
    'sunshine without warmth. classic betrayal.',
  ],

  /** Temperature rising through the day */
  warming: [
    'morning was a trap.',
    'heating up all day.',
    'mild now. spicy by 2pm.',
    'warm front incoming. you will feel it.',
    'getting warmer. fan entered the chat.',
    'afternoon disagrees with the morning.',
    'temperature rising. layers becoming a liability.',
    'it gets worse. thermally.',
    'the afternoon will make a case for itself.',
  ],

  /** Temperature dropping */
  cooling: [
    'jacket was right all along.',
    'cooling down. no further explanation.',
    'evening gets cold. you were warned.',
    'layer up now. not later.',
    'fan stands down. jacket reports in.',
    'getting cooler by the hour.',
    'temperature dropping. act accordingly.',
    'cold front clocking in tonight.',
    'the day lied about the evening.',
  ],
};

// ── Mood / relatable daily-life quips ────────────────────────────────────────
// Used as fallbacks when condition-based banks are exhausted.

export const MOOD_QUIPS = {
  monday: [
    'clear skies. still monday though.',
    'perfect weather. wasted on a monday.',
    'nice out. shame about the day.',
    'weather cooperated. monday didn\'t.',
    'sky tried. monday undid it.',
    'beautiful day. monday tax applies.',
    'sun and monday. an illegal combination.',
  ],
  friday: [
    'clear and friday. rarest combo.',
    'sky cleared for friday. earned.',
    'sunny friday. you made it.',
    'friday and sunny. twice a year.',
    'weather and friday aligned. historic.',
    'sun and friday. both deserved.',
    "clear skies, clear conscience. it's friday.",
  ],
  weekend: [
    'weekend weather. screen can wait.',
    'sunny and free. rare double.',
    'good day off. use it.',
    'no alarm. no rain. rare.',
    'weekend + clear = non-negotiable outside.',
    "screen will still be there. outside won't.",
    "go outside. it's weekend orders.",
    'time off and good weather. respect both.',
  ],
  /** Daytime fallback */
  desk: [
    'nice out. screen will still be here.',
    'good weather. shame about the inbox.',
    'five minutes outside. go.',
    'clear skies. to-do list can wait.',
    'could be worse. it has been.',
    'perfect day. someone is at a desk.',
    "sun doesn't care about your backlog.",
    'step outside. you have the time.',
    'sky is wasted on this workday.',
  ],
  /** Clear sky at night */
  clear_night: [
    'clear night. stars and silence.',
    'still and quiet out there.',
    'good night for nothing in particular.',
    'sky cleared after you stopped watching.',
    'night sky doing its thing unbothered.',
    'clear and dark. rare combo.',
    'stars out. everything else can wait.',
  ],
  /** Nighttime fallback */
  desk_night: [
    "still up? at least it's clear.",
    'weather has no complaints. you might.',
    'late night. sky cooperating.',
    'clear at this hour. rest.',
    'night shift. sky unbothered.',
    'late. clear. go to sleep.',
    'sky did its part. you should rest.',
    'clear night. bad reason to still be awake.',
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
  const group = getConditionGroup(code);
  const fType = forecast?.type;
  const windGust = ctx.windGust ?? weather?.windGust ?? 0;

  // ── Wind override — storm/strong gusts take priority (except thunder, which
  //    already implies extreme conditions and has its own copy) ──────────────
  if (group !== 'thunder') {
    if (windGust >= 65) return pickQuip(WIND_QUIPS.storm);
    // Strong wind only overrides when the condition isn't already dramatic rain/snow
    if (windGust >= 45 && !['rain', 'snow'].includes(group)) return pickQuip(WIND_QUIPS.strong);
    // Breezy nudge — only on clear/cloudy days where wind is the main story
    if (windGust >= 20 && ['clear', 'cloudy'].includes(group)) return pickQuip(WIND_QUIPS.breezy);
  }

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
