/**
 * Widget grid gravity + persistence — verifies that with `getCompactor("vertical")`
 * (gravity) the grid pulls widgets up to fill gaps (no floating widgets), that
 * dragging reorders the flow, and that the reordered layout is SAVED and survives
 * a reload.
 *
 * (Formerly the free-placement bounds regression tests; the grid now uses gravity
 * so the "flung below the fold" and "stack on top of each other" regressions are
 * impossible — gravity always packs widgets up and never overlaps.)
 */

import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 } });

const SETTINGS = {
  state: { quickTourSeenVersion: '4.0.0', whatsNewSeenVersion: '4.1.0' },
  version: 0,
};

/** Seed widget instances (and optional saved lg layout) and wait for the grid. */
async function seed(page, instances, savedLayout) {
  await page.addInitScript(({ insts, saved }) => {
    localStorage.setItem('showWidgets', 'true');
    localStorage.setItem('app_mode', 'dark');
    localStorage.setItem('language', 'en');
    localStorage.setItem('widget_instances', JSON.stringify({
      state: { instances: insts, widgetSettings: {} },
      version: 0,
    }));
    localStorage.setItem('undistracted_settings', JSON.stringify({
      state: { quickTourSeenVersion: '4.0.0', whatsNewSeenVersion: '4.1.0' },
      version: 0,
    }));
    // Seed the layout only ONCE per session so the reload in the persistence
    // assertion does not overwrite the drag-saved layout with the seed.
    if (saved && !sessionStorage.getItem('__seeded_layout')) {
      sessionStorage.setItem('__seeded_layout', '1');
      localStorage.setItem('widget_grid_layouts', JSON.stringify({ lg: saved }));
    }
  }, { insts: instances, saved: savedLayout });

  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.react-grid-item', { timeout: 15000 });
  await page.waitForTimeout(800);
}

/** Read the persisted lg layout. */
function readLayout(page) {
  return page.evaluate(() => {
    const layouts = JSON.parse(localStorage.getItem('widget_grid_layouts') || 'null');
    return layouts?.lg || [];
  });
}

/** Enter arrange mode and drag a widget's handle down by `dy` px. */
async function dragHandleDown(page, type, dy) {
  await page.click('[data-arrange-toggle]');
  const handle = page.locator(`[data-widget-type="${type}"] .widget-drag-handle`);
  await expect(handle).toBeVisible();

  const box = await handle.boundingBox();
  expect(box).not.toBeNull();
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX, startY + dy, { steps: 25 });
  await page.mouse.up();
  await page.waitForTimeout(300);
}

test('gravity pulls widgets up to fill gaps', async ({ page }) => {
  // Seed a clock with a saved lg y=28 (far below the top). Gravity must compact
  // it back to y=0 on mount instead of leaving the gap.
  await seed(page, [{ id: 'clock', type: 'clock' }], [
    { i: 'clock', x: 0, y: 28, w: 8, h: 8 },
  ]);

  const clock = (await readLayout(page)).find((l) => l.i === 'clock');
  expect(clock, 'clock layout item should exist').toBeTruthy();
  expect(clock.y).toBe(0);
});

test('dragging reorders the flow and the order persists across a reload', async ({ page }) => {
  // Stack clock (y=0) above countdown (y=8). Gravity keeps them packed.
  await seed(page, [
    { id: 'clock', type: 'clock' },
    { id: 'countdown', type: 'countdown' },
  ], [
    { i: 'clock', x: 0, y: 0, w: 8, h: 8 },
    { i: 'countdown', x: 0, y: 8, w: 8, h: 8 },
  ]);

  let layout = await readLayout(page);
  let clock = layout.find((l) => l.i === 'clock');
  let countdown = layout.find((l) => l.i === 'countdown');
  expect(clock, 'clock should be present').toBeTruthy();
  expect(countdown, 'countdown should be present').toBeTruthy();
  expect(clock.y).toBeLessThan(countdown.y); // clock above countdown

  // Drag the clock down past the countdown → gravity swaps their order.
  await dragHandleDown(page, 'clock', 300);

  layout = await readLayout(page);
  clock = layout.find((l) => l.i === 'clock');
  countdown = layout.find((l) => l.i === 'countdown');
  expect(countdown.y).toBeLessThan(clock.y); // countdown above clock now

  // The reordered order must be SAVED and survive a reload.
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.react-grid-item', { timeout: 15000 });
  await page.waitForTimeout(800);

  layout = await readLayout(page);
  clock = layout.find((l) => l.i === 'clock');
  countdown = layout.find((l) => l.i === 'countdown');
  expect(countdown.y).toBeLessThan(clock.y);
});
