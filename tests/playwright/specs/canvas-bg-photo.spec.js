/**
 * canvas-bg-photo.spec.js
 *
 * Verifies the canvas Background section (Settings → Appearance). The canvas
 * scope supports two modes — Solid (accent tint) and Motion (animated orb) —
 * exposed inline as segment buttons. Curated/Photos is a focus-mode-only
 * feature and must NOT appear in the canvas scope.
 */

import { test, expect } from '@playwright/test';

/** Open Settings → Appearance and return the settings dialog locator. */
async function openAppearance(page) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('tab', { name: 'Appearance' }).click();
  return page.getByRole('dialog', { name: 'Canvas settings' });
}

/** Read the persisted canvasBg from the settings store. */
async function readCanvasBg(page) {
  return page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('undistracted_settings') || '{}');
    return s?.state?.canvasBg;
  });
}

test.describe('Canvas Background', () => {
  test.beforeEach(async ({ page }) => {
    // Dismiss the Quick Tour (it overlays z-9999 and intercepts clicks) AND reset
    // canvasBg to a known state (solid). Both must live in the init script so
    // they survive every navigation/reload without clobbering each other.
    await page.addInitScript(() => {
      const prev = JSON.parse(localStorage.getItem('undistracted_settings') || '{}');
      localStorage.setItem('undistracted_settings', JSON.stringify({
        ...prev,
        state: {
          ...(prev.state || {}),
          quickTourSeenVersion: '4.0.0',
          canvasBg: { type: 'solid', orbId: null, url: null },
        },
      }));
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('shows Solid and Motion options (no Photos for canvas scope)', async ({ page }) => {
    const dialog = await openAppearance(page);
    await expect(dialog.getByText('Background', { exact: true })).toBeVisible();
    // The two canvas background modes
    await expect(dialog.getByRole('button', { name: 'Solid' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Motion' })).toBeVisible();
    // Photos / Curated must NOT appear in the canvas Background section
    await expect(dialog.getByText('Photos', { exact: true })).not.toBeVisible();
    await expect(dialog.getByText('Curated', { exact: true })).not.toBeVisible();
  });

  test('defaults to Solid selection', async ({ page }) => {
    const dialog = await openAppearance(page);
    const bg = await readCanvasBg(page);
    expect(bg?.type).toBe('solid');
  });

  test('selecting Motion persists to the store', async ({ page }) => {
    const dialog = await openAppearance(page);
    await dialog.getByRole('button', { name: 'Motion' }).click();
    const bg = await readCanvasBg(page);
    expect(bg?.type).toBe('orb');
  });

  test('selecting Solid persists to the store (switch back from Motion)', async ({ page }) => {
    const dialog = await openAppearance(page);
    await dialog.getByRole('button', { name: 'Motion' }).click();
    await dialog.getByRole('button', { name: 'Solid' }).click();
    const bg = await readCanvasBg(page);
    expect(bg?.type).toBe('solid');
  });
});
