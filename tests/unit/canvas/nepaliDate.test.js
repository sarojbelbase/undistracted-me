/**
 * Tests for bsToAd (Bikram Sambat → Gregorian conversion).
 *
 * What can go wrong:
 *  – The day-count anchor is off by one, shifting every converted date.
 *  – The conversion disagrees with the existing AD→BS converter
 *    (convertEnglishToNepali) — they must be exact inverses.
 *  – Out-of-range / invalid BS dates throw instead of returning null.
 */
import { describe, it, expect } from 'vitest';
import { bsToAd } from '../../../src/utilities/nepaliDate';
import { convertEnglishToNepali } from '../../../src/utilities/index';
import { parseHolidaysFromWikitext } from '../../../api/_holidays';

describe('bsToAd', () => {
  it('matches the anchor (BS 2000 Poush 17 = 1944-01-01)', () => {
    expect(bsToAd(2000, 9, 17)).toBe('1944-01-01');
  });

  it('matches a known real-world date (BS 2080 Baisakh 1 = 2023-04-14)', () => {
    expect(bsToAd(2080, 1, 1)).toBe('2023-04-14');
  });

  it('round-trips against convertEnglishToNepali across several years', () => {
    const samples = [
      [2023, 4, 14],
      [2023, 12, 25],
      [2024, 1, 1],
      [2024, 6, 15],
      [2025, 10, 30],
      [2026, 1, 1],
      [2026, 7, 4],
      [2027, 3, 8],
    ];
    for (const [y, m, d] of samples) {
      const bs = convertEnglishToNepali(y, m, d).split(' ').map(Number);
      expect(bsToAd(bs[0], bs[1], bs[2])).toBe(
        `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      );
    }
  });

  it('returns null for out-of-range or invalid inputs', () => {
    expect(bsToAd(1999, 1, 1)).toBeNull(); // before table
    expect(bsToAd(3000, 1, 1)).toBeNull(); // after table
    expect(bsToAd(2080, 13, 1)).toBeNull(); // bad month
    expect(bsToAd(2080, 1, 40)).toBeNull(); // bad day
  });
});

describe('parseHolidaysFromWikitext', () => {
  const wikitext = `
==General holidays==
===Day holiday===
{| class="wikitable"
|-
! Date
! Name
|-
|Jestha 15 || [[Republic Day (Nepal)|Republic Day]] || गणतन्त्र दिवस || Republic Day in Nepal.
|-
|May 1 || [[International Workers' Day]] || मजदुर दिवस || International Workers' Day
|}
===Festival holiday===
{| class="wikitable"
|-
|Baishak 1 || [[Nepali New Year]] || नयाँ बर्ष || First day of Bikram Sambat.
|-
|Kartik 4 ||[[Dashain#Day 10: Bijaya Dashami|Vijayadashami]] || विजया दशमी || Tika day.
|-
|Shawwal 1
| [[Eid al-Fitr]]
| इद उल फित्र
| End of Ramadan.
|-
| || [[Rama Navami|Ram Nawami]] || राम नवमी || Birth date of Lord Ram
|}
==Optional holidays==
{| class="wikitable"
|-
|Bhadra 13 || [[Gai Jatra]] || गाइ जात्रा || Newar community only
|}
`.trim();

  it('extracts BS and Gregorian holidays and skips lunar/optional/empty rows', () => {
    const holidays = parseHolidaysFromWikitext(wikitext, { adYears: [2026, 2027] });
    const byName = new Map(holidays.map((h) => [h.name, h.date]));

    // BS-date holiday present (Jestha 15 → AD in 2026/2027)
    expect(byName.has('Republic Day')).toBe(true);
    // Gregorian fixed-date holiday present for both years
    expect(byName.has('International Workers\' Day')).toBe(true);
    // Festival present
    expect(byName.has('Nepali New Year')).toBe(true);
    expect(byName.has('Vijayadashami')).toBe(true);

    // Lunar (Shawwal), empty-date (Ram Nawami), and Optional-section (Gai Jatra) excluded
    expect(byName.has('Eid al-Fitr')).toBe(false);
    expect(byName.has('Ram Nawami')).toBe(false);
    expect(byName.has('Gai Jatra')).toBe(false);

    // Gregorian dates expanded into both requested years
    const mayDays = holidays.filter((h) => h.name === 'International Workers\' Day').map((h) => h.date);
    expect(mayDays).toContain('2026-05-01');
    expect(mayDays).toContain('2027-05-01');
  });

  it('produces sorted, deduplicated dates', () => {
    const holidays = parseHolidaysFromWikitext(wikitext, { adYears: [2026] });
    const dates = holidays.map((h) => h.date);
    expect([...dates].sort()).toEqual(dates);
    expect(new Set(holidays.map((h) => `${h.date}|${h.name}`)).size).toBe(holidays.length);
  });
});
