/**
 * canvas-bg-photo.spec.js
 *
 * Verifies the canvas BackgroundPicker: the dialog opens with "Canvas Background"
 * title and shows Solid and Motion (orb) tabs — the only two modes supported for
 * the canvas scope. (Curated/Photos is a focus-mode-only feature.)
 */

import { test, expect } from '@playwright/test';

/**
 * Opens the canvas BackgroundPicker via Settings → "Change ›" button.
 * Returns the dialog locator.
 */
async function openCanvasBgPicker(page) {
  await page.locator('button[title="Settings"]').click();

  const changeBtn = page.locator('button', { hasText: 'Change ›' });
  await expect(changeBtn).toBeVisible({ timeout: 5000 });
  await changeBtn.click();

  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible({ timeout: 5000 });
  await expect(dialog.locator('h2', { hasText: /canvas background/i })).toBeVisible();
  return dialog;
}

test.describe('Canvas BackgroundPicker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Reset canvasBg to a known state (solid) before each test
    await page.evaluate(() => {
      const stored = JSON.parse(localStorage.getItem('undistracted_settings') || '{}');
      if (stored.state) {
        stored.state.canvasBg = { type: 'solid', orbId: null, url: null };
        localStorage.setItem('undistracted_settings', JSON.stringify(stored));
      }
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('opens with "Canvas Background" title', async ({ page }) => {
    const dialog = await openCanvasBgPicker(page);
    await expect(dialog.locator('h2')).toContainText(/canvas background/i);
  });

  test('shows Solid and Motion tabs (no Photos tab for canvas scope)', async ({ page }) => {
    const dialog = await openCanvasBgPicker(page);
    // Solid tab from CANVAS_TABS
    await expect(dialog.locator('button', { hasText: /^solid$/i })).toBeVisible();
    // Motion tab from CANVAS_TABS
    await expect(dialog.locator('button', { hasText: /^motion$/i })).toBeVisible();
    // Photos tab must NOT appear in canvas scope
    await expect(dialog.locator('button', { hasText: /^photos$/i })).not.toBeVisible();
  });

  test('clicking Motion tab shows orb preview panel', async ({ page }) => {
    const dialog = await openCanvasBgPicker(page);
    await dialog.locator('button', { hasText: /^motion$/i }).click();
    // OrbPanel renders a preview with aria-label "Use Color Motion"
    await expect(dialog.locator('[aria-label="Use Color Motion"]')).toBeVisible({ timeout: 3000 });
  });

  test('applying the Motion background persists to Zustand store', async ({ page }) => {
    const dialog = await openCanvasBgPicker(page);
    await dialog.locator('button', { hasText: /^motion$/i }).click();
    // Click the orb preview to apply
    await dialog.locator('[aria-label="Use Color Motion"]').click();
    // Close the dialog
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible({ timeout: 3000 });

    const storedBg = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('undistracted_settings') || '{}');
      return s?.state?.canvasBg;
    });
    expect(storedBg?.type).toBe('orb');
  });

  test('close button dismisses the dialog', async ({ page }) => {
    const dialog = await openCanvasBgPicker(page);
    // Click the × close button
    await dialog.locator('button[aria-label="Close"]').click();
    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });

  test('Escape key dismisses the dialog', async ({ page }) => {
    const dialog = await openCanvasBgPicker(page);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });
});
