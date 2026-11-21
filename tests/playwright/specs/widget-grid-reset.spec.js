/**
 * widget-grid-reset.spec.js
 *
 * Verifies the Settings → General "Reset Layout" action: it returns the grid to
 * its default widget flow (derived from each widget's config.js x/y order),
 * dropping any saved custom layout. The button is a two-step confirm (first
 * click arms, second click executes) so a stray click can't wipe a reordered
 * grid.
 */

import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 } });

const SETTINGS = {
  state: { quickTourSeenVersion: '4.0.0', whatsNewSeenVersion: '4.1.0' },
  version: 0,
};

/** Seed clock + countdown with a REORDERED saved layout (countdown first). */
async function seedReordered(page) {
  await page.addInitScript(() => {
    localStorage.setItem('showWidgets', 'true');
    localStorage.setItem('app_mode', 'dark');
    localStorage.setItem('language', 'en');
    localStorage.setItem('widget_instances', JSON.stringify({
      state: {
        instances: [
          { id: 'clock', type: 'clock' },
          { id: 'countdown', type: 'countdown' },
        ],
        widgetSettings: {},
      },
      version: 0,
    }));
    localStorage.setItem('undistracted_settings', JSON.stringify({
      state: { quickTourSeenVersion: '4.0.0', whatsNewSeenVersion: '4.1.0' },
      version: 0,
    }));
    // Reordered: countdown (x=0) flows before clock (x=8), despite clock's
    // config x=0 < countdown's config x=41.
    localStorage.setItem('widget_grid_layouts', JSON.stringify({
      lg: [
        { i: 'countdown', x: 0, y: 0, w: 7, h: 8 },
        { i: 'clock', x: 8, y: 0, w: 8, h: 8 },
      ],
    }));
  });
}

/** Read the persisted lg layout order. */
function readOrder(page) {
  return page.evaluate(() => {
    const layouts = JSON.parse(localStorage.getItem('widget_grid_layouts') || 'null');
    return (layouts?.lg || []).map((l) => ({ i: l.i, x: l.x, y: l.y }));
  });
}

test('reset restores the default widget flow', async ({ page }) => {
  await seedReordered(page);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.react-grid-item', { timeout: 15000 });
  await page.waitForTimeout(800);

  // Reordered layout applied: countdown is left of clock.
  let order = await readOrder(page);
  let countdown = order.find((l) => l.i === 'countdown');
  let clock = order.find((l) => l.i === 'clock');
  expect(countdown, 'countdown should be present').toBeTruthy();
  expect(clock, 'clock should be present').toBeTruthy();
  expect(countdown.x).toBeLessThan(clock.x);

  // Settings → General (default tab) → Reset → Confirm reset.
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Canvas settings' });
  await dialog.getByRole('button', { name: 'Reset', exact: true }).click();
  await dialog.getByRole('button', { name: 'Confirm reset' }).click();

  // Position reverts to the default flow: clock (config x=0) before countdown.
  await page.waitForTimeout(600);
  order = await readOrder(page);
  countdown = order.find((l) => l.i === 'countdown');
  clock = order.find((l) => l.i === 'clock');
  expect(clock.x).toBeLessThan(countdown.x);
});

test('reset requires a confirming second click', async ({ page }) => {
  await seedReordered(page);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.react-grid-item', { timeout: 15000 });
  await page.waitForTimeout(800);

  const before = await readOrder(page);

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Canvas settings' });
  const resetBtn = dialog.getByRole('button', { name: 'Reset', exact: true });
  await resetBtn.click();

  // First click only arms the confirm — the layout must NOT change yet.
  await expect(dialog.getByRole('button', { name: 'Confirm reset' })).toBeVisible();
  expect(await readOrder(page)).toEqual(before);
});
