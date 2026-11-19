/**
 * canvas-widget-dim.spec.js
 *
 * Verifies the canvas Appearance → Widget Focus setting: a "Dim widgets"
 * switch that fades widget cards into the background until hovered (mirroring
 * Focus Mode's top-bar control clusters). When enabled, grid items carry the
 * `.widget-dim` class.
 */

import { test, expect } from '@playwright/test';

/** Open Settings → Appearance and return the settings dialog locator. */
async function openAppearance(page) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('tab', { name: 'Appearance' }).click();
  return page.getByRole('dialog', { name: 'Canvas settings' });
}

/** Read the persisted widgetDim flag from the settings store. */
async function readWidgetDim(page) {
  return page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('undistracted_settings') || '{}');
    return s?.state?.widgetDim;
  });
}

test.describe('Canvas Widget Focus', () => {
  test.beforeEach(async ({ page }) => {
    // Dismiss the Quick Tour (overlays z-9999 and intercepts clicks) and reset
    // widgetDim to a known state (false) in the init script so it survives
    // every navigation/reload.
    await page.addInitScript(() => {
      const prev = JSON.parse(localStorage.getItem('undistracted_settings') || '{}');
      localStorage.setItem('undistracted_settings', JSON.stringify({
        ...prev,
        state: {
          ...(prev.state || {}),
          quickTourSeenVersion: '4.0.0',
          widgetDim: false,
        },
      }));
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('shows the Dim widgets switch in the Appearance tab', async ({ page }) => {
    const dialog = await openAppearance(page);
    await expect(dialog.getByText('Widget Focus', { exact: true })).toBeVisible();
    const toggle = dialog.getByRole('switch', { name: 'Dim widgets' });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  test('toggling Dim widgets persists to the store and dims the grid', async ({ page }) => {
    const dialog = await openAppearance(page);
    await dialog.getByRole('switch', { name: 'Dim widgets' }).click();

    expect(await readWidgetDim(page)).toBe(true);

    // Grid items (rendered behind the modal) pick up the dim class.
    const item = page.locator('[data-widget-type]').first();
    await expect(item).toHaveClass(/widget-dim/);
  });

  test('toggling Dim widgets off removes the dim class', async ({ page }) => {
    const dialog = await openAppearance(page);
    const toggle = dialog.getByRole('switch', { name: 'Dim widgets' });
    await toggle.click();
    await toggle.click();

    expect(await readWidgetDim(page)).toBe(false);
    const item = page.locator('[data-widget-type]').first();
    await expect(item).not.toHaveClass(/widget-dim/);
  });
});
