/**
 * Pocket quick menu — verifies the "More actions" menu renders "Change Type" and
 * "Change Folder" as hover flyout submenus (not the old flat inline list), and
 * that text/code rows with a source reveal an "Open at quote" quick icon beside
 * Copy.
 *
 * Regression for: "Change Type and Change Folder should open in folders like
 * [Change Folder] > [New Folder 1] ... another nested menu opening when hovered"
 * and "add 'Open at Quote' icon in the quick menu side by side to copy icon".
 */

import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 } });

/** Mount ONE pocket widget seeded with mixed kinds + two folders. */
async function mountPocket(page) {
  await page.addInitScript(() => {
    const t = Date.now();
    const m = 60000;
    const h = 60 * m;
    localStorage.setItem('showWidgets', 'true');
    localStorage.setItem('app_mode', 'dark');
    localStorage.setItem('language', 'en');
    localStorage.setItem(
      'widget_instances',
      JSON.stringify({
        state: { instances: [{ id: 'pocket', type: 'pocket' }], widgetSettings: {} },
        version: 0,
      }),
    );
    localStorage.setItem(
      'undistracted_settings',
      JSON.stringify({
        state: { quickTourSeenVersion: '4.0.0', whatsNewSeenVersion: '4.1.0', defaultView: 'canvas' },
        version: 0,
      }),
    );
    localStorage.setItem(
      'pocket:items',
      JSON.stringify([
        { id: 'pk1', kind: 'link', text: 'https://react.dev', title: 'React', host: 'react.dev', sourceUrl: 'https://react.dev', folderIds: [], createdAt: t - m, updatedAt: t - m, deletedAt: null },
        { id: 'pk2', kind: 'sentence', text: 'Make it work, make it right, make it fast.', title: '', host: 'paulgraham.com', sourceUrl: 'https://paulgraham.com/worked.html', folderIds: ['fq'], createdAt: t - h, updatedAt: t - h, deletedAt: null },
        { id: 'pk3', kind: 'code', text: 'const sum = (a, b) => a + b;', title: '', host: 'github.com', sourceUrl: 'https://github.com/x/y', folderIds: [], createdAt: t - 2 * h, updatedAt: t - 2 * h, deletedAt: null },
      ]),
    );
    localStorage.setItem(
      'pocket:folders',
      JSON.stringify([
        { id: 'fr', name: 'Read later', color: 'blue', order: 0, createdAt: t, updatedAt: t, deletedAt: null },
        { id: 'fq', name: 'Quotes', color: 'amber', order: 1, createdAt: t, updatedAt: t, deletedAt: null },
      ]),
    );
    localStorage.setItem('pocket:meta', JSON.stringify({ schema: 1 }));
  });

  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-widget-type="pocket"]', { timeout: 15000 });
  await page.waitForTimeout(800);
}

/** Open the expanded Pocket library and return its container locator. */
async function openExpanded(page) {
  await page.getByRole('button', { name: 'Open Pocket' }).click();
  await page.waitForSelector('.pocket-expanded', { timeout: 15000 });
  return page.locator('.pocket-expanded');
}

test('Change Type and Change Folder open as hover flyout submenus', async ({ page }) => {
  await mountPocket(page);
  const expanded = await openExpanded(page);

  const row = expanded.locator('.pocket-item', { hasText: 'Make it work' }).first();
  await row.hover();
  await row.getByRole('button', { name: 'More actions' }).click();

  const menu = page.locator('.um-menu').first();
  await expect(menu.getByRole('menuitem', { name: 'Change Type' })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Change Folder' })).toBeVisible();

  // Change Folder → flyout lists the folders + New folder.
  await menu.getByRole('menuitem', { name: 'Change Folder' }).hover();
  const flyout = page.locator('.um-submenu');
  await expect(flyout).toBeVisible();
  await expect(flyout.getByRole('menuitem', { name: 'Read later' })).toBeVisible();
  await expect(flyout.getByRole('menuitem', { name: 'Quotes' })).toBeVisible();
  await expect(flyout.getByRole('menuitem', { name: 'New folder' })).toBeVisible();

  // Change Type → flyout lists the four kinds.
  await menu.getByRole('menuitem', { name: 'Change Type' }).hover();
  await expect(flyout.getByRole('menuitem', { name: 'Links' })).toBeVisible();
  await expect(flyout.getByRole('menuitem', { name: 'Sentences' })).toBeVisible();
  await expect(flyout.getByRole('menuitem', { name: 'Paragraphs' })).toBeVisible();
  await expect(flyout.getByRole('menuitem', { name: 'Code' })).toBeVisible();
});

test('Open at quote quick icon sits beside Copy for text rows with a source', async ({ page }) => {
  await mountPocket(page);
  const expanded = await openExpanded(page);

  // Sentence row (has a sourceUrl, not code) → Open at quote + Copy.
  const sentence = expanded.locator('.pocket-item', { hasText: 'Make it work' }).first();
  await sentence.hover();
  const quoteBtn = sentence.getByRole('button', { name: 'Open at quote' });
  const copyBtn = sentence.getByRole('button', { name: 'Copy' });
  await expect(quoteBtn).toBeVisible();
  await expect(copyBtn).toBeVisible();

  // Side by side: Open at quote sits immediately left of Copy.
  const quoteBox = await quoteBtn.boundingBox();
  const copyBox = await copyBtn.boundingBox();
  expect(quoteBox).not.toBeNull();
  expect(copyBox).not.toBeNull();
  expect(quoteBox.x + quoteBox.width).toBeLessThanOrEqual(copyBox.x + 1);

  // Code row (has a sourceUrl but is code) → no Open at quote quick icon.
  const codeRow = expanded.locator('.pocket-item', { hasText: 'const sum' }).first();
  await codeRow.hover();
  await expect(codeRow.getByRole('button', { name: 'Copy' })).toBeVisible();
  await expect(codeRow.getByRole('button', { name: 'Open at quote' })).toHaveCount(0);
});
