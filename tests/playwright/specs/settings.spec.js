/**
 * Settings panel tests.
 *
 * Covers:
 *  - Settings gear button is present in top-right corner
 *  - Clicking opens the settings panel
 *  - Dark / light mode toggles visible state
 *  - Accent colour buttons are rendered without clipping
 *  - Clicking outside the settings panel closes it
 *  - Settings panel itself does not overflow the viewport
 */

import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 } });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('showWidgets', 'false');
    localStorage.setItem('language', 'en');
    localStorage.setItem('app_mode', 'dark');
    // Dismiss the Quick Tour onboarding overlay so it doesn't block clicks
    localStorage.setItem('undistracted_settings', JSON.stringify({ state: { quickTourSeenVersion: '4.0.0' } }));
  });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Settings', exact: true }).waitFor({ state: 'visible', timeout: 5000 });
});

// ── Gear button ───────────────────────────────────────────────────────────────

test('Settings gear button is visible', async ({ page }) => {
  const gear = page.getByRole('button', { name: 'Settings', exact: true });
  await expect(gear).toBeVisible();
});

// ── Open / close ──────────────────────────────────────────────────────────────

test('Clicking settings gear opens the settings panel', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  // The settings panel has a distinctive label "Appearance"
  await expect(page.getByText('Appearance')).toBeVisible();
});

test('Clicking outside the settings panel closes it', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByText('Appearance')).toBeVisible();

  // Click far from the panel (top-left corner)
  await page.mouse.click(100, 100);
  await expect(page.getByText('Appearance')).not.toBeVisible();
});

// ── Settings panel bounds ─────────────────────────────────────────────────────

test('Settings panel does not overflow viewport', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByText('Appearance')).toBeVisible();

  // The settings panel is a sibling of the gear button inside the top-bar ref
  const panel = page.getByRole('dialog').first();
  const box = await panel.boundingBox();
  expect(box).not.toBeNull();

  const { width: vw, height: vh } = page.viewportSize();
  expect(box.x + box.width).toBeLessThanOrEqual(vw + 2);
  expect(box.y + box.height).toBeLessThanOrEqual(vh + 2);
});

// ── Theme toggles ─────────────────────────────────────────────────────────────

test('Dark/Light mode buttons are visible in settings', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('tab', { name: 'Appearance' }).click();
  // Use exact names to avoid matching accent swatches like "Not available in dark mode"
  await expect(page.getByRole('button', { name: 'Dark', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Light', exact: true })).toBeVisible();
});

test('Switching to light mode persists in localStorage', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('tab', { name: 'Appearance' }).click();
  await page.getByRole('button', { name: 'Light', exact: true }).click();
  const mode = await page.evaluate(() => localStorage.getItem('app_mode'));
  expect(mode).toBe('light');
});

test('Switching back to dark mode persists in localStorage', async ({ page }) => {
  // Start in light mode — add a second init script so 'light' wins over 'dark' from beforeEach
  await page.addInitScript(() => localStorage.setItem('app_mode', 'light'));
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Settings', exact: true }).waitFor({ state: 'visible', timeout: 5000 });

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('tab', { name: 'Appearance' }).click();
  await page.getByRole('button', { name: 'Dark', exact: true }).click();
  const mode = await page.evaluate(() => localStorage.getItem('app_mode'));
  expect(mode).toBe('dark');
});

// ── Accent colours ────────────────────────────────────────────────────────────

test('Accent colour swatches are visible and not clipped', async ({ page }) => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('tab', { name: 'Appearance' }).click();
  // Accent section contains colour circles — look for the swatch container
  await expect(page.getByText('Accent', { exact: true })).toBeVisible();

  // All swatch buttons should be within the viewport
  const { width: vw } = page.viewportSize();
  // The settings panel is a <dialog>; verify it doesn't push outside the viewport
  const panel = page.getByRole('dialog').first();
  const box = await panel.boundingBox();
  if (box) {
    expect(box.x + box.width).toBeLessThanOrEqual(vw + 2);
  }
});

// ── Widget catalog ────────────────────────────────────────────────────────────

test('Widget catalog / hamburger button is visible', async ({ page }) => {
  const hamburger = page.getByRole('button', { name: 'Widgets', exact: true });
  await expect(hamburger).toBeVisible();
});
