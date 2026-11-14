/**
 * Wikipedia holiday parsing (Nepal public holidays + festivals).
 *
 * Pure functions — no route handler — so the parsing/date-conversion logic can
 * be unit-tested in isolation.  Underscore-prefixed so Pages does not expose
 * this file as an HTTP endpoint.
 *
 * Note: this module is consumed by scripts/scrape-holidays.mjs (and unit
 * tests), not by any live Pages Function — it is ported here for completeness
 * and parity with the Vercel `api/_holidays.js`.
 */
import { bsToAd } from '../app/utilities/nepaliDate.js';

// ── Month-name → index maps (1-based) ────────────────────────────────────────
// Wikipedia spells BS months inconsistently, so accept common variants.

const BS_MONTHS = {
  baishak: 1, baishakh: 1, baisakh: 1,
  jestha: 2, jesth: 2, jeshtha: 2,
  ashar: 3, ashadh: 3, asad: 3, asar: 3,
  shrawan: 4, shawan: 4, saun: 4, srawan: 4,
  bhadra: 5, bhadau: 5,
  ashwin: 6, ashoj: 6, ashwoj: 6, asoj: 6, aswin: 6, aashwin: 6,
  kartik: 7, kattik: 7,
  mangsir: 8, mangshir: 8, mansir: 8,
  poush: 9, push: 9, paush: 9, posh: 9,
  magh: 10,
  falgun: 11, fagun: 11, phalgun: 11, phagun: 11,
  chaitra: 12, chait: 12,
};

const EN_MONTHS = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

const pad = (n) => String(n).padStart(2, '0');

/** Strip leading rowspan/colspan attributes and trim a table cell. */
const cleanCell = (cell) =>
  (cell || '').replace(/^(?:rowspan|colspan)="\d+"\s*\|\s*/, '').trim();

/** Convert a wikitext name cell into plain display text. */
const cleanName = (raw) => {
  let s = cleanCell(raw);
  s = s.replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2'); // [[target|label]] → label
  s = s.replace(/\[\[([^\]]*)\]\]/g, '$1'); // [[target]] → target
  s = s.replace(/''/g, ''); // italics
  return s.trim();
};

/**
 * Parse a date token ("Jestha 15", "May 1", …).
 * Returns { kind: 'bs'|'ad', month, day } or null (lunar months, empty, etc.).
 */
const parseDateToken = (token) => {
  const s = (token || '').trim();
  const m = s.match(/^([A-Za-z]+)\s+(\d{1,2})$/);
  if (!m) return null;
  const word = m[1].toLowerCase();
  const day = Number(m[2]);
  if (EN_MONTHS[word] != null) return { kind: 'ad', month: EN_MONTHS[word], day };
  if (BS_MONTHS[word] != null) return { kind: 'bs', month: BS_MONTHS[word], day };
  return null;
};

/**
 * Parse the "General holidays" section of the Wikipedia wikitext into a flat,
 * deduped, AD-dated list: [{ date: 'YYYY-MM-DD', name }].
 *
 * @param {string} wikitext  raw wikitext from `action=raw`
 * @param {{ adYears?: number[] }} opts  Gregorian years to expand fixed dates into
 */
export function parseHolidaysFromWikitext(wikitext, opts = {}) {
  const now = new Date();
  const adYears = (opts.adYears && opts.adYears.length)
    ? opts.adYears
    : [now.getFullYear(), now.getFullYear() + 1];

  // Restrict to the "General holidays" section (national holidays + festivals),
  // excluding "Optional holidays" (region/community-specific) and observances.
  const start = wikitext.indexOf('==General holidays==');
  const end = wikitext.indexOf('==Optional holidays==');
  const section = start >= 0 ? wikitext.slice(start, end >= 0 ? end : undefined) : wikitext;

  // Build rows of cells from the wikitext table syntax.
  const rows = [];
  let current = null;
  for (const rawLine of section.split('\n')) {
    const line = rawLine.trim();
    if (line.startsWith('|-') || line.startsWith('|}')) {
      if (current) {
        rows.push(current);
        current = null;
      }
      continue;
    }
    if (!line.startsWith('|') || line.startsWith('{|') || line.startsWith('|+')) continue;
    if (line.startsWith('!')) continue; // header cell
    const cells = line.slice(1).split('||').map((c) => c.trim());
    if (!current) current = [];
    current.push(...cells);
  }
  if (current) rows.push(current);

  // BS years to expand BS-dated holidays into — a generous window around now.
  const minAd = Math.min(...adYears);
  const maxAd = Math.max(...adYears);
  const bsYears = [];
  for (let y = minAd + 55; y <= maxAd + 59; y += 1) bsYears.push(y);

  const holidays = [];
  const seen = new Set();

  const push = (date, name) => {
    const key = `${date}|${name}`;
    if (seen.has(key)) return;
    seen.add(key);
    holidays.push({ date, name, kind: 'nepali' });
  };

  for (const cells of rows) {
    if (!cells.length) continue;
    const parsed = parseDateToken(cells[0]);
    if (!parsed) continue;
    const name = cleanName(cells[1]);
    if (!name) continue;

    if (parsed.kind === 'ad') {
      for (const y of adYears) push(`${y}-${pad(parsed.month)}-${pad(parsed.day)}`, name);
    } else {
      for (const bsYear of bsYears) {
        const date = bsToAd(bsYear, parsed.month, parsed.day);
        if (date) push(date, name);
      }
    }
  }

  holidays.sort((a, b) => a.date.localeCompare(b.date));
  return holidays;
}
