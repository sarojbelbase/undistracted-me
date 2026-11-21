/**
 * canvas-bg-photo.spec.js
 *
 * Verifies the canvas Background section (Settings → Appearance). The canvas
 * scope exposes four modes: Solid (accent tint), Motion (animated orb),
 * Photos (curated gallery), and Custom URL: as segment buttons. Photos and
 * Custom URL share the curated photo library / URL input that Focus Mode uses,
 * but write to the canvas `canvasBg` store (independent selection).
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

  test('shows all four background options', async ({ page }) => {
    const dialog = await openAppearance(page);
    await expect(dialog.getByText('Background', { exact: true })).toBeVisible();
    await expect(dialog.getByRole('radio', { name: 'Solid' })).toBeVisible();
    await expect(dialog.getByRole('radio', { name: 'Motion' })).toBeVisible();
    await expect(dialog.getByRole('radio', { name: 'Photos' })).toBeVisible();
    await expect(dialog.getByRole('radio', { name: 'Custom URL' })).toBeVisible();
  });

  test('defaults to Solid selection', async ({ page }) => {
    const dialog = await openAppearance(page);
    const bg = await readCanvasBg(page);
    expect(bg?.type).toBe('solid');
  });

  test('selecting Motion persists to the store', async ({ page }) => {
    const dialog = await openAppearance(page);
    await dialog.getByRole('radio', { name: 'Motion' }).click();
    const bg = await readCanvasBg(page);
    expect(bg?.type).toBe('orb');
  });

  test('selecting Solid persists to the store (switch back from Motion)', async ({ page }) => {
    const dialog = await openAppearance(page);
    await dialog.getByRole('radio', { name: 'Motion' }).click();
    await dialog.getByRole('radio', { name: 'Solid' }).click();
    const bg = await readCanvasBg(page);
    expect(bg?.type).toBe('solid');
  });

  test('selecting Photos switches the store to photo mode and shows the gallery', async ({ page }) => {
    const dialog = await openAppearance(page);
    await dialog.getByRole('radio', { name: 'Photos' }).click();
    const bg = await readCanvasBg(page);
    expect(bg?.type).toBe('photo');
    // The curated gallery sub-panel renders (shimmer placeholders while the
    // photo list loads; the grid container is present regardless).
    await expect(dialog.getByLabel('Set as background').first()).toBeVisible();
  });

  test('selecting Custom URL shows the URL input and applies a valid url', async ({ page }) => {
    const dialog = await openAppearance(page);
    await dialog.getByRole('radio', { name: 'Custom URL' }).click();
    const input = dialog.getByLabel('Image URL');
    await expect(input).toBeVisible();
    await input.fill('https://example.com/photo.jpg');
    await dialog.getByRole('button', { name: 'Use This URL' }).click();
    const bg = await readCanvasBg(page);
    expect(bg?.type).toBe('custom');
    expect(bg?.url).toBe('https://example.com/photo.jpg');
  });
});
