/**
 * RSS OPML Import — E2E Playwright tests.
 *
 * Covers:
 *  - Opening RSS widget settings
 *  - Switching to Custom source mode
 *  - Opening OPML import panel (collapsed → expanded)
 *  - File / Paste mode toggle
 *  - Pasting valid OPML XML
 *  - Parse button enabled/disabled
 *  - Preview: feed list with checkboxes
 *  - Select all / deselect all toggle
 *  - Individual feed toggle
 *  - Already-existing feeds marked as disabled
 *  - Import action: feeds merged into custom list
 *  - Cancel collapses the panel
 *  - Error state display
 */

import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 } });

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Mount only the RSS widget in isolation. */
async function mountRSS(page, extraStorage = {}) {
  await page.addInitScript(({ extra }) => {
    localStorage.setItem('showWidgets', 'true');
    localStorage.setItem('app_mode', 'dark');
    localStorage.setItem('language', 'en');
    localStorage.setItem(
      'widget_instances',
      JSON.stringify([{ id: 'rss', type: 'rss' }])
    );
    Object.entries(extra).forEach(([k, v]) =>
      localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))
    );
  }, { extra: extraStorage });

  await page.goto('/', { waitUntil: 'networkidle' });
  // Wait for the RSS widget to render (skeleton or content)
  await page.waitForSelector('.react-grid-item', { timeout: 10000 });
  await page.waitForTimeout(800);
}

/** Hover the RSS widget to reveal the 3-dot menu, then click Settings. */
async function openRSSSettings(page) {
  const widgetEl = page.locator('.react-grid-item').first();
  await widgetEl.hover();
  await page.waitForTimeout(300);

  // The 3-dot button appears on hover (opacity 0 → 1 via group-hover)
  const dotsBtn = widgetEl.locator('button[aria-label="Widget options"]');
  await dotsBtn.waitFor({ state: 'visible', timeout: 3000 });
  await dotsBtn.click();
  await page.waitForTimeout(200);

  // Click "Settings" in the dropdown menu
  const settingsOption = page.getByText('Settings', { exact: true });
  await settingsOption.click();
  await page.waitForTimeout(300);

  // Wait for the settings modal to be visible
  await expect(page.getByText('Layout')).toBeVisible({ timeout: 5000 });
}

/** Select the Custom source mode in RSS settings. */
async function selectCustomMode(page) {
  // Click the "Custom" segment in the Sources SegmentedControl
  const customBtn = page.locator('button', { hasText: 'Custom' }).first();
  await customBtn.click();
  await page.waitForTimeout(200);
}

// ─── Test fixtures ────────────────────────────────────────────────────────────

const SAMPLE_OPML = `<opml version="2.0">
  <head><title>Test Feeds</title></head>
  <body>
    <outline type="rss" xmlUrl="https://example.com/feed.xml" title="Example Blog"/>
    <outline type="rss" xmlUrl="https://news.site/rss" title="News Site"/>
    <outline text="Tech">
      <outline type="rss" xmlUrl="https://tech.blog/feed" title="Tech Blog"/>
    </outline>
  </body>
</opml>`;

const SAMPLE_OPML_DUPLICATE = `<opml version="2.0">
  <head><title>Dupes</title></head>
  <body>
    <outline type="rss" xmlUrl="https://example.com/feed.xml" title="Example Blog"/>
    <outline type="rss" xmlUrl="https://new-feed.com/rss" title="New Feed"/>
  </body>
</opml>`;

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('RSS OPML Import', () => {
  // ── Setup ───────────────────────────────────────────────────────────────

  test('OPML import panel opens and closes', async ({ page }) => {
    await mountRSS(page, {
      widgetSettings_rss: { sourceMode: 'custom', customFeeds: [], viewMode: 'brief' },
    });
    await openRSSSettings(page);
    await selectCustomMode(page);

    // The "Import from OPML" button should be visible in Custom mode
    const opmlBtn = page.getByText('Import from OPML');
    await expect(opmlBtn).toBeVisible({ timeout: 3000 });

    // Click to expand
    await opmlBtn.click();
    await page.waitForTimeout(200);

    // Panel should now show Cancel and the SegmentedControl
    await expect(page.getByText('Cancel')).toBeVisible();
    await expect(page.getByText('File')).toBeVisible();
    await expect(page.getByText('Paste')).toBeVisible();

    // Click Cancel to collapse
    await page.getByText('Cancel').click();
    await page.waitForTimeout(200);
    await expect(page.getByText('Cancel')).not.toBeVisible();
  });

  test('File and Paste modes toggle correctly', async ({ page }) => {
    await mountRSS(page, {
      widgetSettings_rss: { sourceMode: 'custom', customFeeds: [], viewMode: 'brief' },
    });
    await openRSSSettings(page);
    await selectCustomMode(page);
    await page.getByText('Import from OPML').click();
    await page.waitForTimeout(200);

    // Default is File mode — file picker button should be visible
    await expect(page.getByText(/Choose.*opml.*xml.*file/)).toBeVisible();

    // Switch to Paste mode
    await page.getByText('Paste').click();
    await page.waitForTimeout(200);

    // Textarea should appear
    const textarea = page.locator('textarea[placeholder*="OPML"]');
    await expect(textarea).toBeVisible();

    // Parse button should be disabled when empty
    const parseBtn = page.getByText('Parse OPML');
    await expect(parseBtn).toBeDisabled();

    // Switch back to File
    await page.getByText('File').click();
    await page.waitForTimeout(200);
    await expect(textarea).not.toBeVisible();
  });

  // ── Parse OPML ──────────────────────────────────────────────────────────

  test('pastes OPML and shows parsed feed preview', async ({ page }) => {
    await mountRSS(page, {
      widgetSettings_rss: { sourceMode: 'custom', customFeeds: [], viewMode: 'brief' },
    });
    await openRSSSettings(page);
    await selectCustomMode(page);
    await page.getByText('Import from OPML').click();
    await page.waitForTimeout(200);
    await page.getByText('Paste').click();
    await page.waitForTimeout(200);

    // Type OPML content
    const textarea = page.locator('textarea[placeholder*="OPML"]');
    await textarea.fill(SAMPLE_OPML);
    await page.waitForTimeout(100);

    // Parse button should be enabled
    const parseBtn = page.getByText('Parse OPML');
    await expect(parseBtn).toBeEnabled();

    // Click parse
    await parseBtn.click();
    await page.waitForTimeout(300);

    // Should show "3 feeds found" (2 top-level + 1 nested)
    await expect(page.getByText(/feeds found/)).toBeVisible({ timeout: 3000 });

    // Feed labels should appear
    await expect(page.getByText('Example Blog')).toBeVisible();
    await expect(page.getByText('News Site')).toBeVisible();
    await expect(page.getByText('Tech Blog')).toBeVisible();
  });

  test('shows error for invalid OPML content', async ({ page }) => {
    await mountRSS(page, {
      widgetSettings_rss: { sourceMode: 'custom', customFeeds: [], viewMode: 'brief' },
    });
    await openRSSSettings(page);
    await selectCustomMode(page);
    await page.getByText('Import from OPML').click();
    await page.waitForTimeout(200);
    await page.getByText('Paste').click();
    await page.waitForTimeout(200);

    // Type invalid content
    const textarea = page.locator('textarea[placeholder*="OPML"]');
    await textarea.fill('This is not OPML content');
    await page.getByText('Parse OPML').click();
    await page.waitForTimeout(300);

    // Should show error
    await expect(page.getByText('Import failed')).toBeVisible({ timeout: 3000 });
  });

  // ── Feed selection ──────────────────────────────────────────────────────

  test('select all / deselect all toggles correctly', async ({ page }) => {
    await mountRSS(page, {
      widgetSettings_rss: { sourceMode: 'custom', customFeeds: [], viewMode: 'brief' },
    });
    await openRSSSettings(page);
    await selectCustomMode(page);
    await page.getByText('Import from OPML').click();
    await page.waitForTimeout(200);
    await page.getByText('Paste').click();
    await page.waitForTimeout(200);

    const textarea = page.locator('textarea[placeholder*="OPML"]');
    await textarea.fill(SAMPLE_OPML);
    await page.getByText('Parse OPML').click();
    await page.waitForTimeout(300);

    // All feeds should be pre-selected
    await expect(page.getByText('Deselect all')).toBeVisible();

    // Click "Deselect all"
    await page.getByText('Deselect all').click();
    await page.waitForTimeout(100);

    // Should now show "Select all" and "Import 0 feeds"
    await expect(page.getByText('Select all')).toBeVisible();
    await expect(page.getByText('Import 0 feeds')).toBeVisible();
    const importBtn = page.getByText('Import 0 feeds');
    await expect(importBtn).toBeDisabled();

    // Click "Select all" to re-select
    await page.getByText('Select all').click();
    await page.waitForTimeout(100);
    await expect(page.getByText('Deselect all')).toBeVisible();
    await expect(page.getByText('Import 3 feeds')).toBeVisible();
  });

  test('individual feed toggle updates import count', async ({ page }) => {
    await mountRSS(page, {
      widgetSettings_rss: { sourceMode: 'custom', customFeeds: [], viewMode: 'brief' },
    });
    await openRSSSettings(page);
    await selectCustomMode(page);
    await page.getByText('Import from OPML').click();
    await page.waitForTimeout(200);
    await page.getByText('Paste').click();
    await page.waitForTimeout(200);

    const textarea = page.locator('textarea[placeholder*="OPML"]');
    await textarea.fill(SAMPLE_OPML);
    await page.getByText('Parse OPML').click();
    await page.waitForTimeout(300);

    // Initially "Import 3 feeds"
    await expect(page.getByText('Import 3 feeds')).toBeVisible();

    // Uncheck the first checkbox
    const checkboxes = page.locator('input[type="checkbox"]:not([disabled])');
    await checkboxes.first().click();
    await page.waitForTimeout(100);

    // Should show "Import 2 feeds"
    await expect(page.getByText('Import 2 feeds')).toBeVisible();
  });

  // ── Import with existing feeds ──────────────────────────────────────────

  test('marks already-existing feeds as disabled', async ({ page }) => {
    await mountRSS(page, {
      widgetSettings_rss: {
        sourceMode: 'custom',
        customFeeds: [{ label: 'Example Blog', url: 'https://example.com/feed.xml', active: true }],
        viewMode: 'brief',
      },
    });
    await openRSSSettings(page);
    await selectCustomMode(page);
    await page.getByText('Import from OPML').click();
    await page.waitForTimeout(200);
    await page.getByText('Paste').click();
    await page.waitForTimeout(200);

    const textarea = page.locator('textarea[placeholder*="OPML"]');
    await textarea.fill(SAMPLE_OPML);
    await page.getByText('Parse OPML').click();
    await page.waitForTimeout(300);

    // The existing feed should show "already added"
    await expect(page.getByText('already added')).toBeVisible({ timeout: 3000 });

    // The existing feed's checkbox should be disabled
    const disabledCheckboxes = page.locator('input[type="checkbox"]:disabled');
    const count = await disabledCheckboxes.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  // ── Import action ────────────────────────────────────────────────────────

  test('imports feeds into custom feeds list', async ({ page }) => {
    await mountRSS(page, {
      widgetSettings_rss: { sourceMode: 'custom', customFeeds: [], viewMode: 'brief' },
    });
    await openRSSSettings(page);
    await selectCustomMode(page);
    await page.getByText('Import from OPML').click();
    await page.waitForTimeout(200);
    await page.getByText('Paste').click();
    await page.waitForTimeout(200);

    const textarea = page.locator('textarea[placeholder*="OPML"]');
    await textarea.fill(SAMPLE_OPML);
    await page.getByText('Parse OPML').click();
    await page.waitForTimeout(300);

    // Click import
    await page.getByText('Import 3 feeds').click();
    await page.waitForTimeout(300);

    // The OPML panel should collapse after import
    await expect(page.getByText('Import from OPML')).toBeVisible({ timeout: 3000 });

    // The imported feeds should now appear as custom feed chips
    await expect(page.getByText('Example Blog')).toBeVisible();
    await expect(page.getByText('News Site')).toBeVisible();
    await expect(page.getByText('Tech Blog')).toBeVisible();
  });

  test('import skips duplicates when merging', async ({ page }) => {
    await mountRSS(page, {
      widgetSettings_rss: {
        sourceMode: 'custom',
        customFeeds: [{ label: 'Example Blog', url: 'https://example.com/feed.xml', active: true }],
        viewMode: 'brief',
      },
    });
    await openRSSSettings(page);
    await selectCustomMode(page);
    await page.getByText('Import from OPML').click();
    await page.waitForTimeout(200);
    await page.getByText('Paste').click();
    await page.waitForTimeout(200);

    const textarea = page.locator('textarea[placeholder*="OPML"]');
    await textarea.fill(SAMPLE_OPML_DUPLICATE);
    await page.getByText('Parse OPML').click();
    await page.waitForTimeout(300);

    // Import (only 1 new feed should actually be added)
    await page.getByText(/Import .* feeds/).click();
    await page.waitForTimeout(300);

    // The new feed should appear
    await expect(page.getByText('New Feed')).toBeVisible({ timeout: 3000 });
  });

  // ── Persistence after import ─────────────────────────────────────────────

  test('imported feeds persist across settings close/reopen', async ({ page }) => {
    await mountRSS(page, {
      widgetSettings_rss: { sourceMode: 'custom', customFeeds: [], viewMode: 'brief' },
    });
    await openRSSSettings(page);
    await selectCustomMode(page);
    await page.getByText('Import from OPML').click();
    await page.waitForTimeout(200);
    await page.getByText('Paste').click();
    await page.waitForTimeout(200);

    const textarea = page.locator('textarea[placeholder*="OPML"]');
    await textarea.fill(SAMPLE_OPML);
    await page.getByText('Parse OPML').click();
    await page.waitForTimeout(300);
    await page.getByText(/Import .* feeds/).click();
    await page.waitForTimeout(300);

    // Close the settings modal
    const closeBtn = page.locator('[aria-label="Close modal"]');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      // Fallback: click outside the modal
      await page.mouse.click(10, 10);
    }
    await page.waitForTimeout(500);

    // Reopen settings
    await openRSSSettings(page);
    await selectCustomMode(page);

    // The imported feeds should still be there
    await expect(page.getByText('Example Blog')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('News Site')).toBeVisible();
    await expect(page.getByText('Tech Blog')).toBeVisible();
  });

  // ── Widget clipping / layout ─────────────────────────────────────────────

  test('OPML import panel does not overflow the settings modal', async ({ page }) => {
    await mountRSS(page, {
      widgetSettings_rss: { sourceMode: 'custom', customFeeds: [], viewMode: 'brief' },
    });
    await openRSSSettings(page);
    await selectCustomMode(page);
    await page.getByText('Import from OPML').click();
    await page.waitForTimeout(200);
    await page.getByText('Paste').click();
    await page.waitForTimeout(200);

    const textarea = page.locator('textarea[placeholder*="OPML"]');
    await textarea.fill(SAMPLE_OPML);
    await page.getByText('Parse OPML').click();
    await page.waitForTimeout(300);

    // The feed list container should not cause horizontal overflow
    // Find the settings modal
    const dialog = page.getByRole('dialog');
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();

    if (box) {
      const vp = page.viewportSize();
      expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 2);
      expect(box.y + box.height).toBeLessThanOrEqual(vp.height + 2);
    }
  });
});
