/**
 * Data integrity tests for src/data/bikramSambatCalendar.js
 *
 * These tests are your early-warning system against the class of bugs that
 * previously required an extension update:
 *
 *  - A single wrong month-day value (e.g. Jestha 2083: 30 instead of 31)
 *    causes every date AFTER that month to be off by one.
 *  - A 364-day year is astronomically impossible in a tropical solar calendar
 *    and is always a transcription error.
 *  - Two consecutive years with identical monthly distributions has no
 *    historical precedent in the BS calendar.
 *
 * If any of these tests fail after updating the table, treat it as a
 * blocking bug — the date display will be wrong for real users.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  NEPALI_YEARS_AND_DAYS_IN_MONTHS,
  BS_TABLE_START_YEAR,
  BS_TABLE_END_YEAR,
} from '../../../src/data/bikramSambatCalendar';

// ── Structural invariants ────────────────────────────────────────────────────

describe('NEPALI_YEARS_AND_DAYS_IN_MONTHS structure', () => {
  it('table is non-empty', () => {
    expect(Object.keys(NEPALI_YEARS_AND_DAYS_IN_MONTHS).length).toBeGreaterThan(0);
  });

  it('each year entry has exactly 12 month values', () => {
    for (const [yearStr, months] of Object.entries(NEPALI_YEARS_AND_DAYS_IN_MONTHS)) {
      expect(months, `Entry for BS ${yearStr}`).toHaveLength(12);
    }
  });

  it('years are consecutive with no gaps or duplicates', () => {
    const years = Object.keys(NEPALI_YEARS_AND_DAYS_IN_MONTHS).map(Number);
    for (let i = 1; i < years.length; i++) {
      expect(years[i], `Gap or jump between BS ${years[i - 1]} and ${years[i]}`).toBe(years[i - 1] + 1);
    }
  });

  it('BS_TABLE_START_YEAR matches first row', () => {
    expect(BS_TABLE_START_YEAR).toBe(+Object.keys(NEPALI_YEARS_AND_DAYS_IN_MONTHS)[0]);
  });

  it('BS_TABLE_END_YEAR matches last row (now 2190)', () => {
    expect(BS_TABLE_END_YEAR).toBe(+Object.keys(NEPALI_YEARS_AND_DAYS_IN_MONTHS).at(-1));
  });
});

// ── Day-count invariants ─────────────────────────────────────────────────────

describe('Month day counts', () => {
  it('every month has 29–32 days (no out-of-range values)', () => {
    for (const [yearStr, months] of Object.entries(NEPALI_YEARS_AND_DAYS_IN_MONTHS)) {
      for (let m = 0; m < 12; m++) {
        expect(months[m], `BS ${yearStr} month ${m + 1}`).toBeGreaterThanOrEqual(29);
        expect(months[m], `BS ${yearStr} month ${m + 1}`).toBeLessThanOrEqual(32);
      }
    }
  });

  it('every year total is 364–367 days', () => {
    const anomalous = [];
    for (const [yearStr, months] of Object.entries(NEPALI_YEARS_AND_DAYS_IN_MONTHS)) {
      const total = months.reduce((s, d) => s + d, 0);
      if (total < 364 || total > 367) {
        anomalous.push({ year: +yearStr, total });
      }
    }
    expect(anomalous, `Years outside 364-367 day range: ${JSON.stringify(anomalous)}`).toHaveLength(0);
  });
});

// ── Specific known-anchor cross-checks ───────────────────────────────────────

describe('Known anchor rows', () => {
  const getMonths = (bsYear) => NEPALI_YEARS_AND_DAYS_IN_MONTHS[bsYear];

  it('BS 2000 Baisakh = 30 (widely verified anchor year)', () => {
    expect(getMonths(2000)?.[0]).toBe(30);
  });

  it('BS 2000 Chaitra = 31 (last month of anchor year)', () => {
    expect(getMonths(2000)?.[11]).toBe(31);
  });

  // The regression that caused the previous extension update:
  //   Jestha 2083 was 30 → produced a 364-day year → every date after
  //   Jestha 1, 2083 displayed one day too early.
  it('BS 2083 Jestha = 31 — REGRESSION GUARD (was 30, caused prior update bug)', () => {
    expect(getMonths(2083)?.[1]).toBe(31);
  });

  it('BS 2083 total = 365 (not 364 as it was before the fix)', () => {
    const months = getMonths(2083);
    const total = months.reduce((s, d) => s + d, 0);
    expect(total).toBe(365);
  });

  it('BS 2082 Baisakh = 31 (last confirmed official year at time of writing)', () => {
    expect(getMonths(2082)?.[0]).toBe(31);
  });

  it('BS 2082 total = 365', () => {
    const months = getMonths(2082);
    const total = months.reduce((s, d) => s + d, 0);
    expect(total).toBe(365);
  });

  it('BS 2089 is no longer identical to 2090 (placeholder bug fixed)', () => {
    const r89 = getMonths(2089);
    const r90 = getMonths(2090);
    expect(r89).not.toEqual(r90);
  });

  it('table covers through BS 2190', () => {
    expect(getMonths(2190)).toBeDefined();
  });
});

// ── Library cross-reference spot checks ──────────────────────────────────────
// Values verified against: bikram-sambat (phalgunlolchha), nepali-date
// (armaansahni), and @sbmdkl/nepali-date-converter.

describe('Library cross-reference spot checks', () => {
  const months = (bsYear) => NEPALI_YEARS_AND_DAYS_IN_MONTHS[bsYear];

  it('BS 2072 = [31,32,31,32,31,30,30,29,30,29,30,30]', () => {
    expect(months(2072)).toEqual([31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30]);
  });

  it('BS 2077 = [31,32,31,32,31,30,30,30,29,30,29,31]', () => {
    expect(months(2077)).toEqual([31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31]);
  });

  it('BS 2080 = [31,32,31,32,31,30,30,30,29,29,30,30]', () => {
    expect(months(2080)).toEqual([31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30]);
  });

  it('BS 2081 = [31,32,31,32,31,30,30,30,29,30,29,31]', () => {
    expect(months(2081)).toEqual([31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31]);
  });

  it('BS 2083 = [31,31,32,31,31,31,30,29,30,29,30,30] (fixed, 365 days)', () => {
    expect(months(2083)).toEqual([31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30]);
  });

  it('BS 2089 = [31,31,32,31,31,30,30,30,29,29,30,31] (corrected from placeholder)', () => {
    expect(months(2089)).toEqual([31, 31, 32, 31, 31, 30, 30, 30, 29, 29, 30, 31]);
  });

  it('BS 2090 = [30,32,31,32,31,30,30,30,29,30,29,31] (corrected from placeholder)', () => {
    expect(months(2090)).toEqual([30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31]);
  });

  it('BS 2100 = [31,32,31,32,31,30,30,29,30,29,30,30] (GON data boundary)', () => {
    expect(months(2100)).toEqual([31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30]);
  });

  it('BS 2190 total = 365 or 366 (end of computed range)', () => {
    const months = NEPALI_YEARS_AND_DAYS_IN_MONTHS[2190];
    const total = months.reduce((s, d) => s + d, 0);
    expect(total).toBeGreaterThanOrEqual(365);
    expect(total).toBeLessThanOrEqual(366);
  });
});

// ── Algorithm integration: convertEnglishToNepali spot checks ────────────────

describe('convertEnglishToNepali integration', () => {
  // Import here so the test exercises the full chain:
  // utilities/index.js → ../data/bikramSambatCalendar (table) → algorithm
  let convertEnglishToNepali;

  beforeAll(async () => {
    const mod = await import('../../../src/utilities/index.js');
    convertEnglishToNepali = mod.convertEnglishToNepali;
  });

  it('Apr 13, 2026 = Chaitra 30, 2082 BS (last day of 2082, the day before 2083 new year)', () => {
    expect(convertEnglishToNepali(2026, 4, 13)).toBe('2082 12 30');
  });

  it('Apr 14, 2026 = Baisakh 1, 2083 BS (Nepali New Year 2083)', () => {
    expect(convertEnglishToNepali(2026, 4, 14)).toBe('2083 1 1');
  });

  it('May 15, 2026 ≈ Jestha 1, 2083 BS (first day of Jestha — month that was wrong)', () => {
    // Jestha starts 31 days after Baisakh 1, 2083 (Baisakh has 31 days)
    // Apr 14 + 31 = May 15
    expect(convertEnglishToNepali(2026, 5, 15)).toBe('2083 2 1');
  });

  it('Jan 1, 1944 = Poush 17, 2000 BS (base anchor verification)', () => {
    expect(convertEnglishToNepali(1944, 1, 1)).toBe('2000 9 17');
  });
});
