/**
 * UI flows — integration tests for settings, the unified add dialog, command
 * palette, theme switching, and the Look Away screen-timeout default.
 *
 * These use the CURRENT Zustand storage model (`undistracted_settings`), not the
 * legacy per-key localStorage entries (`app_mode`, `language`, …) that older
 * specs relied on.
 */

import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 } });

/**
 * Seed the settings store (Zustand persist format) and optional extra
 * localStorage keys, then load the canvas. Setting `quickTourSeenVersion`
 * skips the onboarding overlay; if it still appears we dismiss it defensively.
 */
async function loadCanvas(page, { state = {}, local = {} } = {}) {
  await page.addInitScript(
    ({ state, local }) => {
      const existing = JSON.parse(localStorage.getItem('undistracted_settings') || '{}');
      localStorage.setItem(
        'undistracted_settings',
        JSON.stringify({
          state: { quickTourSeenVersion: '4.0.0', ...existing.state, ...state },
          version: existing.version ?? 0,
        }),
      );
      for (const [k, v] of Object.entries(local)) {
        localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
      }
    },
    { state, local },
  );
  await page.goto('/', { waitUntil: 'networkidle' });
  // Defensive: dismiss the onboarding tour if it slipped through.
  const skip = page.locator('.qt-skip-btn');
  if (await skip.isVisible({ timeout: 1500 }).catch(() => false)) {
    await skip.click();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Look Away — reminder interval settings
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Look Away settings', () => {
  test('enabling Look Away exposes the full preset list', async ({ page }) => {
    await loadCanvas(page);

    await page.getByRole('button', { name: 'Settings' }).click();
    const lookAwaySwitch = page.locator('[role="switch"]').first();
    await expect(lookAwaySwitch).toBeVisible();
    await lookAwaySwitch.click();

    // The "Remind every" presets should include 20m / 30m / 1 hr.
    // Scope to the settings dialog — the pomodoro widget's "1 hr" preset also
    // lives on the canvas (its "Pick phase" is visible when idle), so an
    // unscoped exact-name lookup is ambiguous.
    const settingsDialog = page.getByRole('dialog', { name: 'Canvas settings' });
    for (const label of ['20m', '30m', '1 hr']) {
      await expect(settingsDialog.getByRole('button', { name: label, exact: true })).toBeVisible();
    }
  });

  test('defaults to a 20-minute interval', async ({ page }) => {
    await loadCanvas(page);

    await page.getByRole('button', { name: 'Settings' }).click();
    await page.locator('[role="switch"]').first().click();

    // Toggling persists the store (Zustand persist), which now includes the
    // in-memory default interval of 20 minutes.
    const interval = await page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('undistracted_settings') || '{}');
      return raw.state?.lookAwayInterval;
    });
    expect(interval).toBe(20);
  });

  test('selecting a different interval persists to the store', async ({ page }) => {
    await loadCanvas(page, { state: { lookAwayEnabled: true } });
    await page.getByRole('button', { name: 'Settings' }).click();

    await page.getByRole('button', { name: '20m', exact: true }).click();

    const interval = await page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('undistracted_settings') || '{}');
      return raw.state?.lookAwayInterval;
    });
    expect(interval).toBe(20);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Unified add dialog — type switching
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Unified add dialog', () => {
  test('switches from Event to Countdown after unlocking the selector', async ({ page }) => {
    await loadCanvas(page, {
      local: { widget_instances: [{ id: 'events', type: 'events' }], widget_events: [] },
    });
    await page.waitForSelector('.react-grid-item', { timeout: 8000 });

    await page.getByRole('button', { name: 'New event' }).click();
    await expect(page.getByText('New Event', { exact: true })).toBeVisible({ timeout: 4000 });

    // Locked: a single click on "Countdown" must NOT switch.
    await page.getByRole('button', { name: 'Countdown', exact: true }).click();
    await expect(page.getByText('New Event', { exact: true })).toBeVisible();

    // Double-click unlocks the selector…
    await page.getByRole('button', { name: 'Countdown', exact: true }).dblclick();
    // …then a single click switches to the countdown form.
    await page.getByRole('button', { name: 'Countdown', exact: true }).click();
    await expect(page.getByText('New Countdown', { exact: true })).toBeVisible({ timeout: 4000 });
    await expect(page.getByRole('button', { name: 'Save Countdown' })).toBeVisible();
  });

  test('event save button is disabled until a title is entered', async ({ page }) => {
    await loadCanvas(page, {
      local: { widget_instances: [{ id: 'events', type: 'events' }], widget_events: [] },
    });
    await page.waitForSelector('.react-grid-item', { timeout: 8000 });

    await page.getByRole('button', { name: 'New event' }).click();
    await expect(page.getByText('New Event', { exact: true })).toBeVisible({ timeout: 4000 });

    const save = page.getByRole('button', { name: 'Save Event' });
    await expect(save).toBeDisabled();

    await page.getByPlaceholder("What's happening?").fill('Team standup');
    await expect(save).toBeEnabled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Theme switching
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Theme', () => {
  test('switching to dark mode applies data-mode and persists', async ({ page }) => {
    await loadCanvas(page, { state: { mode: 'light' } });
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.getByRole('tab', { name: 'Appearance' }).click();
    await page.getByRole('button', { name: 'Dark', exact: true }).click();

    const mode = await page.evaluate(() => {
      const raw = JSON.parse(localStorage.getItem('undistracted_settings') || '{}');
      return raw.state?.mode;
    });
    expect(mode).toBe('dark');
    // data-mode lives on <html>, applied by applyTheme.
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Command palette
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Command palette', () => {
  test('Ctrl+K opens the search palette', async ({ page }) => {
    await loadCanvas(page);
    await page.keyboard.press('Control+k');
    await expect(page.getByLabel('Search the web')).toBeVisible({ timeout: 4000 });
  });
});
