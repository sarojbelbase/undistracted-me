/**
 * Widget grid drag bounds + persistence + no-overlap — verifies that with
 * `compactType="none"` (free placement) + `preventCollision`, dragging a widget
 * is clamped to the visible screen (not flung below the fold), a widget cannot
 * be dropped on top of another (snaps back instead of stacking), and the dragged
 * position survives a reload.
 *
 * Regression for: "non gravity in widget grid ... sends it to bottom side way
 * bottom ... shouldnt let it send outside of the screen boundary" and
 * "they can freely stack on each other which shouldnt be allowed".
 */

import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 } });

/** Mount ONE clock widget and wait for the grid to render. */
async function mountClock(page) {
  await page.addInitScript(() => {
    localStorage.setItem('showWidgets', 'true');
    localStorage.setItem('app_mode', 'dark');
    localStorage.setItem('language', 'en');
    localStorage.setItem('widget_instances', JSON.stringify({
      state: {
        instances: [{ id: 'clock', type: 'clock' }],
        widgetSettings: {},
      },
      version: 0,
    }));
    localStorage.setItem('undistracted_settings', JSON.stringify({
      state: { quickTourSeenVersion: '4.0.0', whatsNewSeenVersion: '4.1.0' },
      version: 0,
    }));
  });

  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.react-grid-item', { timeout: 15000 });
  await page.waitForTimeout(800);
}

/** Enter arrange mode and drag the first widget's handle by (dy) pixels. */
async function dragFirstWidget(page, dy, steps = 25) {
  await page.click('[data-arrange-toggle]');
  const handle = page.locator('.widget-drag-handle').first();
  await expect(handle).toBeVisible();

  const box = await handle.boundingBox();
  expect(box).not.toBeNull();
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX, startY + dy, { steps });
  await page.mouse.up();
  await page.waitForTimeout(300);
}

function readClockLayout(page) {
  return page.evaluate(() => {
    const layouts = JSON.parse(localStorage.getItem('widget_grid_layouts') || 'null');
    return (layouts?.lg || []).find((l) => l.i === 'clock');
  });
}

test('dragging a widget down is clamped to the visible screen', async ({ page }) => {
  await mountClock(page);

  // Drag far below the viewport — well past any reasonable screen boundary.
  await dragFirstWidget(page, 3000);

  const clock = await readClockLayout(page);
  expect(clock, 'clock layout item should exist').toBeTruthy();

  // lg breakpoint (48 cols, margin 14, padding 14) at 1440x900, rowHeight 8.5,
  // 64px top-bar offset → maxRows = floor((900 - 64 - 14) / (8.5 + 14)) = 36.
  // The dragged widget's bottom row must stay within that visible bound.
  const maxRows = 36;
  expect(clock.y).toBeLessThanOrEqual(maxRows - clock.h);
});

test('dragged position persists across a reload', async ({ page }) => {
  await mountClock(page);

  await dragFirstWidget(page, 1500);

  const beforeReload = await readClockLayout(page);
  expect(beforeReload, 'clock layout item should exist').toBeTruthy();
  expect(beforeReload.y).toBeGreaterThan(0);

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.react-grid-item', { timeout: 15000 });
  await page.waitForTimeout(800);

  const afterReload = await readClockLayout(page);
  expect(afterReload, 'clock layout item should survive reload').toBeTruthy();
  expect(afterReload.y).toBe(beforeReload.y);
});

test('dragging a widget onto another does not stack/overlap', async ({ page }) => {
  // Seed TWO widgets stacked vertically: clock on top (y=0), countdown below
  // (y=8). Dragging the clock down onto the countdown must snap back rather
  // than overlap it (preventCollision).
  await page.addInitScript(() => {
    localStorage.setItem('showWidgets', 'true');
    localStorage.setItem('app_mode', 'dark');
    localStorage.setItem('language', 'en');
    localStorage.setItem('widget_instances', JSON.stringify({
      state: {
        instances: [
          { id: 'clock', type: 'clock' },
          { id: 'countdown', type: 'countdown' },
        ],
        widgetSettings: {},
      },
      version: 0,
    }));
    localStorage.setItem('undistracted_settings', JSON.stringify({
      state: { quickTourSeenVersion: '4.0.0', whatsNewSeenVersion: '4.1.0' },
      version: 0,
    }));
    localStorage.setItem('widget_grid_layouts', JSON.stringify({
      lg: [
        { i: 'clock', x: 0, y: 0, w: 8, h: 8 },
        { i: 'countdown', x: 0, y: 8, w: 8, h: 8 },
      ],
    }));
  });

  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.react-grid-item', { timeout: 15000 });
  await page.waitForTimeout(800);

  // Enter arrange mode and drag the clock's handle down onto the countdown.
  await page.click('[data-arrange-toggle]');
  const handle = page.locator('[data-widget-type="clock"] .widget-drag-handle');
  await expect(handle).toBeVisible();
  const box = await handle.boundingBox();
  expect(box).not.toBeNull();
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  // ~200px ≈ 9 rows at lg (rowHeight 8.5 + margin 14 = 22.5px) — lands inside
  // the countdown's rows (y 8..16) but short of the row where the clock would
  // clear it, so preventCollision must snap the clock back.
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX, startY + 200, { steps: 25 });
  await page.mouse.up();
  await page.waitForTimeout(300);

  const items = await page.evaluate(() => {
    const layouts = JSON.parse(localStorage.getItem('widget_grid_layouts') || 'null');
    return (layouts?.lg || []).filter((l) => l.i === 'clock' || l.i === 'countdown');
  });
  const clock = items.find((l) => l.i === 'clock');
  const countdown = items.find((l) => l.i === 'countdown');
  expect(clock, 'clock layout item should exist').toBeTruthy();
  expect(countdown, 'countdown layout item should exist').toBeTruthy();

  // No vertical overlap between the two widgets.
  const overlap =
    clock.x < countdown.x + countdown.w &&
    clock.x + clock.w > countdown.x &&
    clock.y < countdown.y + countdown.h &&
    clock.y + clock.h > countdown.y;
  expect(overlap, 'clock must not stack on top of countdown').toBe(false);
});
