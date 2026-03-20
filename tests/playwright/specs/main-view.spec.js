/**
 * Main-view tests — the "classic" distraction-free mode
 * (showWidgets=false, widgets hidden, Nepali date centred on screen).
 *
 * Covers:
 *  - Nepali date (#nepalimiti) renders non-empty text
 *  - English date (#datetoday) renders non-empty text
 *  - Live clock (#liveclock) renders non-empty text
 *  - None of the three elements are clipped horizontally or vertically
 *  - All three elements are fully within the viewport bounds
 */

import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 } });

test.beforeEach(async ({ page }) => {
  // Force non-widget mode so the classic Nepali date view is shown
  await page.addInitScript(() => {
    localStorage.setItem('showWidgets', 'false');
    localStorage.setItem('language', 'en');
    localStorage.setItem('app_mode', 'dark');
  });
  await page.goto('/', { waitUntil: 'networkidle' });
  // Wait for the date strings to hydrate (they're set via 1-second intervals)
  await page.waitForSelector('#nepalimiti:not(:empty)', { timeout: 5000 });
});

// ── Visibility ────────────────────────────────────────────────────────────────

test('Nepali date is visible and non-empty', async ({ page }) => {
  const el = page.locator('#nepalimiti');
  await expect(el).toBeVisible();
  const text = await el.textContent();
  expect(text?.trim().length).toBeGreaterThan(0);
});

test('English date is visible and non-empty', async ({ page }) => {
  const el = page.locator('#datetoday');
  await expect(el).toBeVisible();
  const text = await el.textContent();
  expect(text?.trim().length).toBeGreaterThan(0);
});

test('Live clock is visible and non-empty', async ({ page }) => {
  const el = page.locator('#liveclock');
  await expect(el).toBeVisible();
  const text = await el.textContent();
  expect(text?.trim().length).toBeGreaterThan(0);
});

// ── Clipping checks ───────────────────────────────────────────────────────────

/**
 * scrollWidth > clientWidth  →  text is overflowing its box (clipped)
 * scrollHeight > clientHeight →  text is overflowing vertically
 */
async function assertNotClipped(page, locator, label) {
  const { scrollW, clientW, scrollH, clientH } = await locator.evaluate((el) => ({
    scrollW: el.scrollWidth,
    clientW: el.clientWidth,
    scrollH: el.scrollHeight,
    clientH: el.clientHeight,
  }));

  expect(scrollW, `${label}: horizontal overflow (scrollWidth=${scrollW}, clientWidth=${clientW})`).toBeLessThanOrEqual(clientW + 2);
  expect(scrollH, `${label}: vertical overflow (scrollHeight=${scrollH}, clientHeight=${clientH})`).toBeLessThanOrEqual(clientH + 2);
}

async function assertWithinViewport(page, locator, label) {
  const { width: vw, height: vh } = page.viewportSize();
  const box = await locator.boundingBox();
  expect(box, `${label}: element not found`).not.toBeNull();

  expect(box.x, `${label}: starts before left edge`).toBeGreaterThanOrEqual(0);
  expect(box.y, `${label}: starts above top edge`).toBeGreaterThanOrEqual(0);
  expect(
    box.x + box.width,
    `${label}: right edge (${box.x + box.width}px) exceeds viewport (${vw}px)`,
  ).toBeLessThanOrEqual(vw + 2);
  expect(
    box.y + box.height,
    `${label}: bottom edge (${box.y + box.height}px) exceeds viewport (${vh}px)`,
  ).toBeLessThanOrEqual(vh + 2);
}

test('Nepali date is not clipped and fits in viewport', async ({ page }) => {
  const el = page.locator('#nepalimiti');
  await assertNotClipped(page, el, 'NepaliMiti');
  await assertWithinViewport(page, el, 'NepaliMiti');
});

test('English date is not clipped and fits in viewport', async ({ page }) => {
  const el = page.locator('#datetoday');
  await assertNotClipped(page, el, 'DateToday');
  await assertWithinViewport(page, el, 'DateToday');
});

test('Live clock is not clipped and fits in viewport', async ({ page }) => {
  const el = page.locator('#liveclock');
  await assertNotClipped(page, el, 'LiveClock');
  await assertWithinViewport(page, el, 'LiveClock');
});

// ── Language switch ───────────────────────────────────────────────────────────

test('Nepali date text changes when language switches to Nepali', async ({ page }) => {
  const el = page.locator('#nepalimiti');
  const englishText = await el.textContent();

  // Switch language via localStorage and reload
  await page.evaluate(() => localStorage.setItem('language', 'ne'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('#nepalimiti:not(:empty)', { timeout: 5000 });

  const nepaliText = await el.textContent();
  expect(nepaliText?.trim()).not.toEqual(englishText?.trim());
  // Verify element still not clipped after language switch
  await assertNotClipped(page, el, 'NepaliMiti (Nepali language)');
  await assertWithinViewport(page, el, 'NepaliMiti (Nepali language)');
});

// ── Responsive viewports ──────────────────────────────────────────────────────

const viewports = [
  { width: 1920, height: 1080, name: 'FHD' },
  { width: 1280, height: 800, name: 'Laptop' },
  { width: 768, height: 1024, name: 'Tablet' },
];

for (const vp of viewports) {
  test(`Main view —  no clipping at ${vp.name} (${vp.width}×${vp.height})`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('#nepalimiti:not(:empty)', { timeout: 5000 });

    for (const [id, label] of [['#nepalimiti', 'NepaliMiti'], ['#datetoday', 'DateToday'], ['#liveclock', 'LiveClock']]) {
      await assertWithinViewport(page, page.locator(id), `${label} @${vp.name}`);
    }
  });
}
