/**
 * Note Mode end-to-end tests.
 *
 * Covers:
 *  1. Note button visible on canvas + entering/exiting Note Mode
 *  2. defaultView=note launches directly into Note Mode
 *  3. The note editor reads/writes the same data as the Notes widget
 */

import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 } });

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Base localStorage seeds for a clean dark-mode canvas with a Notes widget. */
function baseStorage(extra = {}) {
  return {
    showWidgets: 'true',
    app_mode: 'dark',
    language: 'en',
    undistracted_settings: { state: { quickTourSeenVersion: '4.0.0' }, version: 0 },
    // A single Notes widget instance + seeded note content.
    widget_instances: { state: { instances: [{ id: 'notes', type: 'notes' }], widgetSettings: {} }, version: 0 },
    ...extra,
  };
}

async function loadWith(page, storage = {}) {
  await page.addInitScript((entries) => {
    for (const [k, v] of Object.entries(entries)) {
      localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
  }, storage);
  await page.goto('/', { waitUntil: 'networkidle' });
}

/** Enter Note Mode by clicking the sticky-note button on the canvas. */
async function enterNoteMode(page) {
  await page.getByRole('button', { name: /^Note$/ }).click();
  // The "Back to Canvas" button is the canonical sign NoteMode mounted.
  await page.getByRole('button', { name: 'Back to Canvas' }).waitFor({ state: 'visible', timeout: 6000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// Note Mode: entry & exit
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Note Mode — entry and exit', () => {
  test.beforeEach(async ({ page }) => {
    await loadWith(page, baseStorage());
  });

  test('note button is visible on canvas', async ({ page }) => {
    const btn = page.getByRole('button', { name: /^Note$/ });
    await expect(btn).toBeVisible();
  });

  test('clicking note button enters Note Mode', async ({ page }) => {
    await enterNoteMode(page);
    await expect(page.getByRole('button', { name: 'Back to Canvas' })).toBeVisible();
  });

  test('pressing Escape exits Note Mode', async ({ page }) => {
    await enterNoteMode(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Back to Canvas' })).toHaveCount(0, { timeout: 4000 });
    await expect(page.getByRole('button', { name: /^Note$/ })).toBeVisible();
  });

  test('Back to Canvas button exits Note Mode', async ({ page }) => {
    await enterNoteMode(page);
    await page.getByRole('button', { name: 'Back to Canvas' }).click();
    await expect(page.getByRole('button', { name: 'Back to Canvas' })).toHaveCount(0, { timeout: 4000 });
  });

  test('canvas widgets are not mounted while Note Mode is active', async ({ page }) => {
    await enterNoteMode(page);
    // The widget grid should be absent — Note Mode mounts only the editor.
    await expect(page.locator('.react-grid-item')).toHaveCount(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Note Mode: defaultView launch
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Note Mode — defaultView launch', () => {
  test('defaultView=note launches directly into Note Mode', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('showWidgets', 'true');
      localStorage.setItem('app_mode', 'dark');
      localStorage.setItem('language', 'en');
      const existing = JSON.parse(localStorage.getItem('undistracted_settings') || '{}');
      const merged = {
        state: { mode: 'dark', accent: 'Default', language: 'en', quickTourSeenVersion: '4.0.0', ...((existing?.state) || {}), defaultView: 'note' },
        version: existing?.version ?? 0,
      };
      localStorage.setItem('undistracted_settings', JSON.stringify(merged));
    });
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.getByRole('button', { name: 'Back to Canvas' })).toBeVisible({ timeout: 6000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Note Mode: shared note data
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Note Mode — shares note data', () => {
  test('pre-seeded note content appears in Note Mode editor', async ({ page }) => {
    await loadWith(page, baseStorage({
      widgetSettings_notes: { notes: [{ id: 'n1', text: 'Meeting notes\nDiscussed roadmap', updatedAt: Date.now() }], idx: 0 },
    }));
    await enterNoteMode(page);

    // Title input reflects the first line.
    const title = page.locator('#notes-title');
    await expect(title).toHaveValue('Meeting notes', { timeout: 5000 });
  });

  test('typing a title persists to the shared notes key', async ({ page }) => {
    await loadWith(page, baseStorage({
      widgetSettings_notes: { notes: [{ id: 'n1', text: '', updatedAt: Date.now() }], idx: 0 },
    }));
    await enterNoteMode(page);

    const title = page.locator('#notes-title');
    await title.fill('Note Mode Title');
    // Debounced persist is 600ms — wait past it then assert the store key.
    await page.waitForTimeout(900);

    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('widgetSettings_notes') || '{}'),
    );
    expect(stored.notes?.[0]?.text).toBe('Note Mode Title');
  });
});
