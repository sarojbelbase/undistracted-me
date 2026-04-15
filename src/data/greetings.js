/**
 * Time-based greetings — displayed in the clock widget greeting line.
 *
 * Each entry: { from: number, prefix: string, label: string }
 * 'from' is the inclusive 24-hour start of the greeting window.
 * Entries are checked in reverse order so the highest matching 'from' wins.
 */
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

/** Returns the greeting entry whose 'from' threshold the current hour meets. */
export const getGreeting = (h24) => {
  // Walk backwards through the sorted array — no array allocation needed.
  for (let i = GREETINGS.length - 1; i >= 0; i--) {
    if (h24 >= GREETINGS[i].from) return GREETINGS[i];
  }
  return GREETINGS[0];
};
