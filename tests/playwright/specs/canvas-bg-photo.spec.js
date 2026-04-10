/**
 * canvas-bg-photo.spec.js
 *
 * Verifies that selecting a curated photo in the canvas BackgroundPicker
 * actually applies as the canvas background (not focus mode).
 */

import { test, expect } from '@playwright/test';

const PHOTO_URL = 'https://picsum.photos/seed/test123/1600/900';
const PHOTO_SMALL = 'https://picsum.photos/seed/test123/400/300';

const SEEDED_LIBRARY = JSON.stringify([
  { id: 'test-photo-1', url: PHOTO_URL, regular: PHOTO_URL, small: PHOTO_SMALL, color: '#1a1a2e' },
  { id: 'test-photo-2', url: 'https://picsum.photos/seed/abc/1600/900', regular: 'https://picsum.photos/seed/abc/1600/900', small: 'https://picsum.photos/seed/abc/400/300', color: '#2d1b33' },
]);

/**
 * Opens the canvas BackgroundPicker by clicking the gear icon → the bg row button.
 */
async function openCanvasBgPicker(page) {
  // Click the gear/settings button in the top-right cluster
  await page.locator('button[title="Settings"]').click();

  // The settings panel shows "Change ›" next to the background type label.
  // The button contains the text "Change ›".
  const changeBtn = page.locator('button', { hasText: 'Change ›' });
  await expect(changeBtn).toBeVisible({ timeout: 5000 });
  await changeBtn.click();

  // BackgroundPicker renders with a role="dialog" and h2 "Canvas Background"
  await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('[role="dialog"] h2', { hasText: /canvas background/i })).toBeVisible();
}

test.describe('Canvas background — curated photo selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Seed photo library and reset canvasBg to 'orb' so we start from known state
    await page.evaluate(({ library }) => {
      localStorage.setItem('fm_unsplash_cache', library);
      const stored = JSON.parse(localStorage.getItem('undistracted_settings') || '{}');
      if (stored.state) {
        stored.state.canvasBg = { type: 'orb', orbId: 'blueberry', url: null };
        localStorage.setItem('undistracted_settings', JSON.stringify(stored));
      }
    }, { library: SEEDED_LIBRARY });
    await page.reload();
    await page.waitForLoadState('networkidle');
  });

  test('selecting a curated photo applies it to the canvas background', async ({ page }) => {
    await openCanvasBgPicker(page);

    // Click the "Photos" tab in the picker
    await page.locator('[role="dialog"] button', { hasText: 'Photos' }).click();

    // Wait for the photo grid
    const photoGrid = page.locator('[role="dialog"] .grid.grid-cols-3');
    await expect(photoGrid).toBeVisible({ timeout: 5000 });

    // First cell = Built-in. Second cell = first curated photo.
    const photoBtn = photoGrid.locator('button[aria-label="Apply this background"]').first();
    await expect(photoBtn).toBeVisible({ timeout: 5000 });
    await photoBtn.click();

    // Close the picker
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 3000 });

    // Verify canvasBg in Zustand store has type=curated and a url
    const storedBg = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('undistracted_settings') || '{}');
      return s?.state?.canvasBg;
    });
    expect(storedBg?.type).toBe('curated');
    expect(storedBg?.url).toBeTruthy();
    expect(storedBg?.url).toContain('picsum.photos');

    // Verify the canvas bg layer renders with that URL
    const bgLayer = page.locator('#fullscreen div[aria-hidden]').first();
    await expect(bgLayer).toBeVisible({ timeout: 5000 });
    const bgImage = await bgLayer.evaluate(el => el.style.backgroundImage);
    expect(bgImage).toContain('picsum.photos');
  });

  test('Built-in button applies default type to canvas', async ({ page }) => {
    // First select curated so the default type change is meaningful
    await openCanvasBgPicker(page);
    await page.locator('[role="dialog"] button', { hasText: 'Photos' }).click();
    await page.locator('[role="dialog"]').waitFor({ state: 'visible' });

    // Click the built-in background button
    await page.locator('button[aria-label="Use built-in background"]').click();
    await page.keyboard.press('Escape');

    const storedBg = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('undistracted_settings') || '{}');
      return s?.state?.canvasBg;
    });
    expect(storedBg?.type).toBe('default');
  });
});
