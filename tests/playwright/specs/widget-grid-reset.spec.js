/**
 * widget-grid-reset.spec.js
 *
 * Verifies the Settings → General "Reset Layout" action: it restores widgets to
 * their config.js default positions/sizes, dropping any saved custom layout.
 * The button is a two-step confirm (first click arms, second click executes) so
 * a stray click can't wipe a hand-arranged grid.
 */

import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 } });

/** Seed one clock widget with a SAVED custom layout (lg y=28 → far below top). */
async function seedClockAtSavedY(page, y) {
  await page.addInitScript((savedY) => {
    localStorage.setItem('showWidgets', 'true');
    localStorage.setItem('app_mode', 'dark');
    localStorage.setItem('language', 'en');
    localStorage.setItem('widget_instances', JSON.stringify({
      state: { instances: [{ id: 'clock', type: 'clock' }], widgetSettings: {} },
      version: 0,
    }));
    localStorage.setItem('undistracted_settings', JSON.stringify({
      state: { quickTourSeenVersion: '4.0.0', whatsNewSeenVersion: '4.1.0' },
      version: 0,
    }));
    // Seed the custom layout ONCE per tab session. sessionStorage survives the
    // reload in the persistence assertion, so the reset's cleared layout is not
    // re-seeded by this init script on the second load.
    if (!sessionStorage.getItem('__seeded_layout')) {
      sessionStorage.setItem('__seeded_layout', '1');
      localStorage.setItem('widget_grid_layouts', JSON.stringify({
        lg: [{ i: 'clock', x: 0, y: savedY, w: 8, h: 8 }],
      }));
    }
  }, y);
}

/** The clock's rendered `top` in px (items use position:absolute, so style.top). */
async function clockTop(page) {
  return page.evaluate(() => {
    const item = document.querySelector('.react-grid-item');
    return item ? parseFloat(item.style.top) || 0 : -1;
  });
}

test('reset restores widgets to default positions and persists', async ({ page }) => {
  await seedClockAtSavedY(page, 28);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.react-grid-item', { timeout: 15000 });
  await page.waitForTimeout(800);

  // Saved custom layout is applied (y=28 → ~644px, well below the top).
  expect(await clockTop(page)).toBeGreaterThan(500);

  // Settings → General (default tab) → Reset → Confirm reset.
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Canvas settings' });
  await dialog.getByRole('button', { name: 'Reset', exact: true }).click();
  await dialog.getByRole('button', { name: 'Confirm reset' }).click();

  // Position reverts to the config default (y=0 → top edge, ~14px).
  await page.waitForTimeout(600);
  expect(await clockTop(page)).toBeLessThan(50);

  // The reset persists: after a reload the default is kept, not the saved y=28.
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.react-grid-item', { timeout: 15000 });
  await page.waitForTimeout(800);
  expect(await clockTop(page)).toBeLessThan(50);
});

test('reset requires a confirming second click', async ({ page }) => {
  await seedClockAtSavedY(page, 28);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.react-grid-item', { timeout: 15000 });
  await page.waitForTimeout(800);

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Canvas settings' });
  const resetBtn = dialog.getByRole('button', { name: 'Reset', exact: true });
  await resetBtn.click();

  // First click only arms the confirm — the layout must NOT change yet.
  await expect(dialog.getByRole('button', { name: 'Confirm reset' })).toBeVisible();
  expect(await clockTop(page)).toBeGreaterThan(500);
});
