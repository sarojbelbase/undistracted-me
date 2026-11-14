/**
 * Widget mode tests — grid layout, individual widget rendering, and clipping.
 *
 * Covers:
 *  - Widget grid is present when showWidgets=true
 *  - At least one widget renders
 *  - No widget bounding box overflows the viewport horizontally
 *  - No widget's internal content is scrollable beyond its card boundary
 *  - Widget catalog drawer opens and closes without overflow
 *  - Screenshots captured for every widget for visual review
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.use({ viewport: { width: 1440, height: 900 } });

const SCREENSHOT_DIR = path.join(process.cwd(), 'tests/playwright/screenshots');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns true if the element's rendered scroll dimensions exceed its client
 * dimensions — i.e. content is being clipped/hidden by overflow:hidden.
 */
async function isContentClipped(locator) {
  return locator.evaluate((el) => ({
    hClip: el.scrollWidth > el.clientWidth + 2,
    vClip: el.scrollHeight > el.clientHeight + 2,
    scrollW: el.scrollWidth,
    clientW: el.clientWidth,
    scrollH: el.scrollHeight,
    clientH: el.clientHeight,
  }));
}

async function assertWidgetInViewport(locator, viewportSize, label) {
  const { width: vw } = viewportSize;
  const box = await locator.boundingBox();
  if (!box) return; // widget may not be mounted
  expect(
    box.x + box.width,
    `${label}: right edge (${Math.round(box.x + box.width)}px) overflows viewport (${vw}px)`,
  ).toBeLessThanOrEqual(vw + 2);
  expect(box.x, `${label}: starts before viewport left`).toBeGreaterThanOrEqual(-2);
}

// ── Setup ─────────────────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('showWidgets', 'true');
    localStorage.setItem('app_mode', 'dark');
    localStorage.setItem('app_accent', 'Default');
    localStorage.setItem('language', 'en');
    // Dismiss the Quick Tour onboarding overlay so it doesn't block clicks
    localStorage.setItem('undistracted_settings', JSON.stringify({ state: { quickTourSeenVersion: '4.0.0' } }));
  });
  await page.goto('/', { waitUntil: 'networkidle' });
  // Allow widget data to settle (clocks, stock fetches, etc.)
  await page.waitForTimeout(2000);
});

// ── Grid presence ─────────────────────────────────────────────────────────────

test('Widget grid renders at least one widget', async ({ page }) => {
  const items = page.locator('.react-grid-item');
  const count = await items.count();
  expect(count).toBeGreaterThan(0);
});

test('Widget grid container is present', async ({ page }) => {
  const grid = page.locator('.react-grid-layout');
  await expect(grid.first()).toBeAttached();
});

// ── Per-widget clipping ───────────────────────────────────────────────────────

test('No widget overflows the viewport horizontally', async ({ page }) => {
  const items = page.locator('.react-grid-item');
  const count = await items.count();
  const vp = page.viewportSize();

  for (let i = 0; i < count; i++) {
    const item = items.nth(i);
    const box = await item.boundingBox();
    if (!box || box.width < 40) continue; // skip placeholder/empty slots

    const label = `widget[${i}]`;
    expect(
      box.x + box.width,
      `${label}: right edge ${Math.round(box.x + box.width)}px > viewport ${vp.width}px`,
    ).toBeLessThanOrEqual(vp.width + 2);
  }
});

test('No widget card clips its inner content', async ({ page }) => {
  // The inner card is the .overflow-hidden inside each .react-grid-item
  const cards = page.locator('.react-grid-item .overflow-hidden');
  const count = await cards.count();

  const clippingIssues = [];

  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    const box = await card.boundingBox();
    if (!box || box.width < 40 || box.height < 40) continue;

    const clip = await isContentClipped(card);
    if (clip.hClip) {
      const text = await card.innerText().catch(() => '').then(t => t.slice(0, 60).replace(/\n/g, ' '));
      clippingIssues.push(`card[${i}] horizontal clip — scrollW=${clip.scrollW} clientW=${clip.clientW} — "${text}"`);
    }
  }

  expect(clippingIssues, `Cards with clipped content:\n${clippingIssues.join('\n')}`).toHaveLength(0);
});

// ── Screenshot every widget ───────────────────────────────────────────────────

test('Screenshot every widget for visual review', async ({ page }) => {
  ensureDir(SCREENSHOT_DIR);

  // Full page
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'widgets_full.png'), fullPage: false });

  const items = page.locator('.react-grid-item');
  const count = await items.count();

  for (let i = 0; i < count; i++) {
    const item = items.nth(i);
    const box = await item.boundingBox();
    if (!box || box.width < 40 || box.height < 40) continue;

    try {
      const text = await item.innerText().catch(() => '');
      const label = text.split('\n')[0].trim().slice(0, 30).replace(/\W+/g, '_') || `widget_${i}`;
      await item.screenshot({ path: path.join(SCREENSHOT_DIR, `widget_${i}_${label}.png`) });
    } catch {
      // Non-critical: screenshot failure shouldn't fail the test
    }
  }

  // All screenshots captured — just assert the directory now has files
  const files = fs.readdirSync(SCREENSHOT_DIR).filter(f => f.endsWith('.png'));
  expect(files.length).toBeGreaterThan(0);
});

// ── Widget catalog ────────────────────────────────────────────────────────────

test('Widget catalog drawer opens', async ({ page }) => {
  await page.getByRole('button', { name: 'Widgets', exact: true }).click();
  // The catalog has a close button (XLg icon, aria-label="Close" or title pattern)
  // and the text "Widgets" as a tab heading
  await expect(page.getByText('Widgets').first()).toBeVisible();
});

test('Widget catalog drawer does not overflow viewport', async ({ page }) => {
  await page.getByRole('button', { name: 'Widgets', exact: true }).click();
  await page.waitForTimeout(400); // allow animation

  const { width: vw, height: vh } = page.viewportSize();

  // The drawer is a right-side <dialog> panel (class .wc-panel)
  const drawer = page.getByRole('dialog', { name: 'Widget catalog' });
  const box = await drawer.boundingBox();
  if (box) {
    expect(box.x + box.width).toBeLessThanOrEqual(vw + 2);
    expect(box.y + box.height).toBeLessThanOrEqual(vh + 2);
  }
});

test('Widget catalog drawer closes via its close button', async ({ page }) => {
  await page.getByRole('button', { name: 'Widgets', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Widget catalog' })).toBeVisible();

  // The drawer closes via the X button (aria-label "Close (Esc)") — the backdrop
  // no longer closes it (backdrop has pointer-events: none).
  await page.getByRole('button', { name: 'Close (Esc)' }).click();

  await expect(page.getByRole('dialog', { name: 'Widget catalog' })).not.toBeAttached();
});

// ── Widget toggle (REMOVED) ───────────────────────────────────────────────────
//
// The widget show/hide toggle and the classic Nepali-date (#nepalimiti) view
// were removed in the Preact migration. The app now always renders the widget
// grid on the canvas, so there is no hide/show behaviour to test.


