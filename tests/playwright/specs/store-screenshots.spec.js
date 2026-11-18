/**
 * Store screenshots — blocked-site interstitial + web clipper (Pocket).
 *
 * Two full-page 1280×800 PNGs for the Chrome Web Store + Firefox AMO listings,
 * covering the two headline features from the growth plan:
 *
 *   site_blocking.png   — the blocked-site interstitial (dark, timed block)
 *   web_clipper.png     — the Pocket widget as the dashboard's hero
 *
 * Outputs to: store-assets/showcase/ (gitignored), then copied into
 * publish/chrome/screenshots/ + publish/firefox/screenshots/.
 *
 * Run:
 *   npx playwright test store-screenshots --reporter=list
 *
 * No canvas/WebGL is used (canvasBg is solid), so headless renders fine.
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../../../store-assets/showcase');

test.use({ viewport: { width: 1280, height: 800 } });

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

test.beforeEach(() => ensureDir(OUT_DIR));

// ─── 01 · Site blocking interstitial ───────────────────────────────────────────

test('site_blocking · blocked-site interstitial', async ({ page }) => {
  await page.addInitScript(() => {
    // Dark theme so the orb interstitial renders in its strongest form.
    localStorage.setItem(
      'undistracted_settings',
      JSON.stringify({ state: { mode: 'dark', accent: 'Blueberry' }, version: 0 }),
    );
    // A timed block for instagram.com: ~20:00 remaining, 50% through a 40-min block.
    const now = Date.now();
    localStorage.setItem(
      'blocked_sites',
      JSON.stringify([
        {
          domain: 'instagram.com',
          blockedUntil: now + 20 * 60 * 1000,
          totalDurationMs: 40 * 60 * 1000,
          infinite: false,
        },
      ]),
    );
  });

  await page.goto('/entries/blocked.html?d=instagram.com');
  await page.waitForTimeout(1500);

  // Self-check: the interstitial actually rendered (domain label + hero + timer).
  await expect(page.locator('.blocked-domain-label')).toBeVisible();
  await expect(page.locator('.blocked-domain-label')).toContainText('blocked for now');
  await expect(page.locator('.blocked-hero')).toBeVisible();
  await expect(page.locator('.blocked-timer')).toBeVisible();

  await page.screenshot({ path: path.join(OUT_DIR, 'site_blocking.png') });
});

// ─── 02 · Web clipper (Pocket) ────────────────────────────────────────────────

test('web_clipper · Pocket widget', async ({ page }) => {
  await page.addInitScript((settings) => {
    // App settings (light dashboard, no overlays).
    const existing = JSON.parse(
      localStorage.getItem('undistracted_settings') || '{"state":{},"version":0}',
    );
    existing.state = { ...existing.state, ...settings };
    localStorage.setItem('undistracted_settings', JSON.stringify(existing));

    // A focused dashboard: Pocket as the hero, plus clock + date.
    localStorage.setItem(
      'widget_instances',
      JSON.stringify({
        state: {
          instances: [
            { id: 'pocket', type: 'pocket' },
            { id: 'clock', type: 'clock' },
            { id: 'dateToday', type: 'dateToday' },
          ],
        },
        version: 0,
      }),
    );
    localStorage.setItem(
      'widget_grid_layouts',
      JSON.stringify({
        lg: [
          { i: 'pocket', x: 0, y: 0, w: 30, h: 24 },
          { i: 'clock', x: 30, y: 0, w: 18, h: 8 },
          { i: 'dateToday', x: 30, y: 8, w: 18, h: 8 },
        ],
      }),
    );

    // Seed a believable Pocket library: mixed kinds, a few folders.
    const t = Date.now();
    const m = 60000;
    const h = 60 * m;
    const d = 24 * h;
    localStorage.setItem(
      'pocket:items',
      JSON.stringify([
        { id: 'pk1', kind: 'link', text: 'https://react.dev/reference/react/useState', title: 'useState — React', host: 'react.dev', sourceUrl: 'https://react.dev/reference/react/useState', folderIds: [], createdAt: t - 3 * m, updatedAt: t - 3 * m, deletedAt: null },
        { id: 'pk2', kind: 'sentence', text: 'Make it work, make it right, make it fast.', title: '', host: 'paulgraham.com', sourceUrl: 'https://paulgraham.com/worked.html', folderIds: ['fq'], createdAt: t - 2 * h, updatedAt: t - 2 * h, deletedAt: null },
        { id: 'pk3', kind: 'code', text: 'const sum = (a, b) => a + b;', title: '', host: 'github.com', sourceUrl: 'https://github.com/sarojbelbase/undistracted-me', folderIds: [], createdAt: t - 5 * h, updatedAt: t - 5 * h, deletedAt: null },
        { id: 'pk4', kind: 'paragraph', text: 'The best way to predict the future is to invent it. Most people build their lives around the assumption that tomorrow will look like today, but the future is not something that happens to you — it is something you make.', title: '', host: 'alan.cx', sourceUrl: 'https://alan.cx/notes', folderIds: ['fr'], createdAt: t - 1 * d, updatedAt: t - 1 * d, deletedAt: null },
        { id: 'pk5', kind: 'link', text: 'https://news.ycombinator.com/item?id=41234567', title: 'Ask HN: What are you building this month?', host: 'news.ycombinator.com', sourceUrl: 'https://news.ycombinator.com/item?id=41234567', folderIds: ['fr'], createdAt: t - 2 * d, updatedAt: t - 2 * d, deletedAt: null },
        { id: 'pk6', kind: 'sentence', text: 'The quieter you become, the more you are able to hear.', title: '', host: 'goodreads.com', sourceUrl: 'https://www.goodreads.com/quotes', folderIds: ['fq'], createdAt: t - 3 * d, updatedAt: t - 3 * d, deletedAt: null },
      ]),
    );
    localStorage.setItem(
      'pocket:folders',
      JSON.stringify([
        { id: 'fr', name: 'Read later', color: 'blue', order: 0, createdAt: t, updatedAt: t, deletedAt: null },
        { id: 'fq', name: 'Quotes', color: 'amber', order: 1, createdAt: t, updatedAt: t, deletedAt: null },
        { id: 'fi', name: 'Ideas', color: 'violet', order: 2, createdAt: t, updatedAt: t, deletedAt: null },
      ]),
    );
    localStorage.setItem('pocket:meta', JSON.stringify({ schema: 1, seededFolders: true }));
  }, {
    mode: 'light',
    accent: 'Blueberry',
    cardStyle: 'flat',
    defaultView: 'canvas',
    canvasBg: { type: 'solid' },
    quickTourSeenVersion: '4.1.0',
    whatsNewSeenVersion: '4.1.0',
  });

  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // Self-check: the Pocket widget rendered with its seeded saves.
  const pocket = page.locator('[data-widget-type="pocket"]');
  await expect(pocket).toBeVisible();
  await expect(pocket.getByText('Pocket', { exact: true }).first()).toBeVisible();
  await expect(pocket.locator('.pocket-item')).toHaveCount(6);
  await expect(page.locator('[data-widget-type="clock"]')).toBeVisible();

  await page.screenshot({ path: path.join(OUT_DIR, 'web_clipper.png') });
});
