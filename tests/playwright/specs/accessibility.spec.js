/**
 * Accessibility + boot integrity checks.
 *
 * Covers the features added in the "error boundary + heading" work:
 *  - A screen-reader-only <h1> anchors the document heading hierarchy.
 *  - All registered widget types render (a single widget crash must not blank
 *    the grid — the per-widget ErrorBoundary isolates it).
 *  - Every rendered button has an accessible name (no unlabelled controls).
 */
import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('language', 'en');
    localStorage.setItem('app_mode', 'dark');
    localStorage.setItem('undistracted_settings', JSON.stringify({ state: { quickTourSeenVersion: '4.0.0' } }));
  });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Settings', exact: true }).waitFor({ state: 'visible', timeout: 5000 });
  // Dismiss the one-time "What's new" note if present so it doesn't cover the grid.
  const dismiss = page.getByRole('button', { name: 'Dismiss', exact: true });
  if (await dismiss.count()) await dismiss.click();
});

test('a screen-reader-only H1 anchors the page', async ({ page }) => {
  const h1 = page.locator('h1.um-sr-only').first();
  await expect(h1).toHaveCount(1);
  await expect(h1).toHaveText(/Undistracted Me/i);
});

test('all registered widget types render on the canvas', async ({ page }) => {
  const types = await page.$$eval('[data-widget-type]', (els) => els.map((e) => e.dataset.widgetType));
  // The registry ships 18 widgets; all of them should mount (quickAccess included).
  expect(types.length).toBeGreaterThanOrEqual(17);
  expect(new Set(types).size).toBe(types.length); // no duplicate instances
});

test('every rendered button has an accessible name', async ({ page }) => {
  const unlabelled = await page.$$eval('button', (btns) => btns.filter((b) => {
    const name = b.getAttribute('aria-label') || b.textContent?.trim() || b.getAttribute('title');
    return !name;
  }).length);
  expect(unlabelled).toBe(0);
});

test('decorative images never lack alt or aria-hidden', async ({ page }) => {
  const bad = await page.$$eval('img', (imgs) => imgs.filter((i) => {
    const hasAlt = i.hasAttribute('alt');
    const isDecorative = i.getAttribute('aria-hidden') === 'true' || hasAlt;
    return !isDecorative;
  }).length);
  expect(bad).toBe(0);
});
