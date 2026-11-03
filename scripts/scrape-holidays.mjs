/**
 * Scrape holidays into holidays.json (run by .github/workflows/holidays.yml).
 *
 * Combines:
 *   – Nepali public holidays + festivals, scraped from the "Public holidays in
 *     Nepal" Wikipedia page (Bikram Sambat dates converted to AD).
 *   – A curated list of international observances + major festivals (AD-fixed).
 *
 * Writes a single `holidays.json` at the repo root.  The GitHub Actions
 * workflow diffs that file and only commits when its contents changed.
 *
 * Runs under plain Node (`node scripts/scrape-holidays.mjs`); every import in
 * the module graph uses explicit `.js` extensions so Node's ESM resolver can
 * follow it without a bundler.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parseHolidaysFromWikitext } from '../api/_holidays.js';
import { buildInternationalHolidays } from './international-holidays.mjs';

const WIKI_URL =
  'https://en.wikipedia.org/w/index.php?title=Public_holidays_in_Nepal&action=raw';

const OUT_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'holidays.json');

/** Stable signature for a holiday list so we can detect *actual* data changes
 *  (ignoring the generatedAt timestamp, which would otherwise force a commit
 *  on every run). */
const signature = (list) =>
  JSON.stringify(
    [...list]
      .map((h) => [h.date, h.name, h.kind].join('|'))
      .sort(),
  );

async function main() {
  const now = new Date();
  const adYears = [now.getFullYear(), now.getFullYear() + 1];

  const upstream = await fetch(WIKI_URL, {
    headers: { 'User-Agent': 'undistracted-me-holidays/1.0 (personal project)' },
  });
  if (!upstream.ok) {
    throw new Error(`Wikipedia fetch failed: HTTP ${upstream.status}`);
  }
  const wikitext = await upstream.text();

  const nepali = parseHolidaysFromWikitext(wikitext, { adYears });

  // Some AD-fixed observances (Women's Day, Labour Day, Christmas) are already
  // listed on the Nepal page — drop the international duplicate so the calendar
  // doesn't surface the same name twice on one date.
  const seen = new Set(nepali.map((h) => `${h.date}|${h.name}`));
  const international = buildInternationalHolidays(adYears).filter(
    (h) => !seen.has(`${h.date}|${h.name}`),
  );

  const holidays = [...nepali, ...international].sort((a, b) => a.date.localeCompare(b.date));

  // Skip writing (and thus the workflow's commit) when the holiday data itself
  // is unchanged from what's already in the repo — a new timestamp alone is not
  // a real change.
  if (existsSync(OUT_PATH)) {
    let existing = [];
    try {
      existing = JSON.parse(readFileSync(OUT_PATH, 'utf8')).holidays ?? [];
    } catch {
      /* unreadable/corrupt — rewrite from scratch below */
    }
    if (signature(existing) === signature(holidays)) {
      console.log('holidays.json unchanged — nothing to write');
      return;
    }
  }

  const payload = { generatedAt: now.toISOString(), holidays };
  writeFileSync(OUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);

  console.log(
    `holidays.json: ${holidays.length} holidays ` +
      `(${nepali.length} Nepali, ${international.length} international)`,
  );
}

main().catch((err) => {
  console.error('Failed to scrape holidays:', err);
  process.exit(1);
});
