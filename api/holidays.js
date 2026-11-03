/**
 * GET /api/holidays
 *
 * Server-side scraper for Nepali public holidays + festivals.  Fetches the
 * "Public holidays in Nepal" Wikipedia page (BS dates) once, converts BS→AD,
 * and returns an AD-dated list the calendar widget can look up directly.
 *
 * CDN-cached for 24h (`s-maxage=86400`) so the upstream Wikipedia scrape runs
 * at most once per day per edge — the "once a day" refresh the client relies on.
 *
 * CORS: allows GET from chrome-extension://, moz-extension://, and production.
 * Auth: optional X-Api-Key (mirrors photos/curated); skipped in dev when unset.
 */
import { assertOrigin, assertApiKey } from './_config.js';
import { parseHolidaysFromWikitext } from './_holidays.js';

const WIKI_URL =
  'https://en.wikipedia.org/w/index.php?title=Public_holidays_in_Nepal&action=raw';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    assertOrigin(req, res, 'GET, OPTIONS');
    return res.status(204).end();
  }
  if (!assertOrigin(req, res, 'GET, OPTIONS')) return;
  if (!assertApiKey(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const upstream = await fetch(WIKI_URL, {
      headers: { 'User-Agent': 'undistracted-me-holidays/1.0 (personal project)' },
    });
    if (!upstream.ok) return res.status(502).json({ error: 'Wikipedia unavailable' });

    const wikitext = await upstream.text();
    const now = new Date();
    const adYears = [now.getFullYear(), now.getFullYear() + 1];
    const holidays = parseHolidaysFromWikitext(wikitext, { adYears });

    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=86400');
    return res.status(200).json({ holidays, generatedAt: now.toISOString() });
  } catch {
    return res.status(502).json({ error: 'Failed to fetch holidays' });
  }
}
