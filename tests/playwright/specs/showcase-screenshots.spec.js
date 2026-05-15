/**
 * Chrome Web Store Showcase Screenshots
 *
 * Generates production-quality screenshots at 1280×800 (Chrome Store format).
 * Saves to: public/showcase/
 *
 * ⚠️  MUST run in headed mode — the canvas/WebGL background doesn't render in
 *     chrome-headless-shell:
 *
 *   npx playwright test showcase-screenshots --reporter=list --headed
 *
 * Captured views:
 *  01_dashboard_light.png      — Dashboard, Blueberry accent, light
 *  02_dashboard_dark.png       — Dashboard, dark mode
 *  03_focus_mode.png           — Focus Mode, fullscreen clock
 *  04_quick_tour_step1.png     — Quick Tour overlay, Step 1
 *  05_quick_tour_step2.png     — Quick Tour overlay, Step 2
 *
 * Widget close-ups (element-level screenshots):
 *  06_widget_clock.png         — Clock widget, dark/Coral
 *  07_widget_notes.png         — Notes widget, light/Blueberry, seeded text
 *  08_widget_pomodoro.png      — Pomodoro timer, dark/Mint
 *  09_widget_progress.png      — Year progress, light/Blueberry
 *  10_widget_datetoday.png     — Date Today, dark/Rose
 */

import { test } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOWCASE_DIR = path.resolve(__dirname, '../../../public/showcase');

test.use({ viewport: { width: 1280, height: 800 } });

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** Inject localStorage settings BEFORE React mounts.
 *  Uses Playwright's arg parameter — closure variables don't serialize, so
 *  we pass settings as the second argument to addInitScript. */
function injectSettings(settings) {
  // initFn receives settings as its first argument (Playwright arg mechanism)
  const initFn = (s) => {
    const key = 'undistracted_settings';
    const existing = JSON.parse(localStorage.getItem(key) || '{"state":{},"version":0}');
    existing.state = { ...existing.state, ...s };
    localStorage.setItem(key, JSON.stringify(existing));

    // Mirror to legacy keys — existing tests use these reliably
    if (s.mode) localStorage.setItem('app_mode', s.mode);
    if (s.accent) localStorage.setItem('app_accent', s.accent);
    localStorage.setItem('language', s.language || 'en');
    if (s.defaultView) localStorage.setItem('defaultView', s.defaultView);
    localStorage.setItem('showWidgets', s.defaultView !== 'focus' ? 'true' : 'false');
  };
  return { initFn, settings };
}

test.beforeEach(async () => {
  ensureDir(SHOWCASE_DIR);
});

// ─── Dashboard light ──────────────────────────────────────────────────────────

test('01 · Dashboard light mode', async ({ page }) => {
  const { initFn, settings } = injectSettings({
    mode: 'light',
    accent: 'Blueberry',
    cardStyle: 'flat',
    defaultView: 'canvas',
    canvasBg: { type: 'solid' },
    quickTourSeenVersion: '3.0.0',
  });
  await page.addInitScript(initFn, settings);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SHOWCASE_DIR, '01_dashboard_light.png') });
});

// ─── Dashboard dark ───────────────────────────────────────────────────────────

test('02 · Dashboard dark mode', async ({ page }) => {
  const { initFn, settings } = injectSettings({
    mode: 'dark',
    accent: 'Blueberry',
    cardStyle: 'glass',
    defaultView: 'canvas',
    canvasBg: { type: 'solid' },
    quickTourSeenVersion: '3.0.0',
  });
  await page.addInitScript(initFn, settings);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(SHOWCASE_DIR, '02_dashboard_dark.png') });
});

// ─── Focus Mode ───────────────────────────────────────────────────────────────

test('03 · Focus Mode', async ({ page }) => {
  const { initFn, settings } = injectSettings({
    mode: 'dark',
    accent: 'Mint',
    cardStyle: 'glass',
    defaultView: 'focus',
    quickTourSeenVersion: '3.0.0',
  });
  await page.addInitScript(initFn, settings);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(SHOWCASE_DIR, '03_focus_mode.png') });
});

// ─── Quick Tour Step 1 ────────────────────────────────────────────────────────

test('04 · Quick Tour step 1', async ({ page }) => {
  const { initFn, settings } = injectSettings({
    mode: 'light',
    accent: 'Blueberry',
    cardStyle: 'flat',
    defaultView: 'canvas',
    canvasBg: { type: 'solid' },
    quickTourSeenVersion: null,   // reset → tour will show
  });
  await page.addInitScript(initFn, settings);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000); // tour appears after 600ms delay
  await page.screenshot({ path: path.join(SHOWCASE_DIR, '04_quick_tour_step1.png') });
});

// ─── Quick Tour Step 2 ────────────────────────────────────────────────────────

test('05 · Quick Tour step 2', async ({ page }) => {
  const { initFn, settings } = injectSettings({
    mode: 'light',
    accent: 'Blueberry',
    cardStyle: 'flat',
    defaultView: 'canvas',
    canvasBg: { type: 'solid' },
    quickTourSeenVersion: null,
  });
  await page.addInitScript(initFn, settings);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Advance to step 2
  const nextBtn = page.getByRole('button', { name: "What's inside" });
  if (await nextBtn.isVisible({ timeout: 3000 })) {
    await nextBtn.click();
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: path.join(SHOWCASE_DIR, '05_quick_tour_step2.png') });
});

// ─── Widget close-up helper ───────────────────────────────────────────────────
// Clips a screenshot of a specific widget element with padding for context.
async function widgetClip(page, type, outputPath, pad = 20) {
  const el = page.locator(`[data-widget-type="${type}"]`);
  await el.waitFor({ state: 'visible', timeout: 5000 });
  const bbox = await el.boundingBox();
  if (!bbox) throw new Error(`Widget "${type}" not found in DOM`);
  await page.screenshot({
    path: outputPath,
    clip: {
      x: Math.max(0, bbox.x - pad),
      y: Math.max(0, bbox.y - pad),
      width: bbox.width + pad * 2,
      height: bbox.height + pad * 2,
    },
  });
}

// ─── Clock widget ─────────────────────────────────────────────────────────────

test('06 · Clock widget', async ({ page }) => {
  const { initFn, settings } = injectSettings({
    mode: 'dark',
    accent: 'Coral',
    cardStyle: 'glass',
    defaultView: 'canvas',
    canvasBg: { type: 'solid' },
    quickTourSeenVersion: '3.0.0',
  });
  await page.addInitScript(initFn, settings);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await widgetClip(page, 'clock', path.join(SHOWCASE_DIR, '06_widget_clock.png'));
});

// ─── Notes widget ─────────────────────────────────────────────────────────────

test('07 · Notes widget', async ({ page }) => {
  const { initFn, settings } = injectSettings({
    mode: 'light',
    accent: 'Blueberry',
    cardStyle: 'flat',
    defaultView: 'canvas',
    canvasBg: { type: 'solid' },
    quickTourSeenVersion: '3.0.0',
  });
  await page.addInitScript(initFn, settings);
  // Seed the notes widget with sample content via legacy localStorage key
  await page.addInitScript(() => {
    const noteText = [
      '🎯 Today\'s focus',
      '',
      'Ship the widget screenshots feature',
      'Review open PRs by 3pm',
      'Coffee with team @ 4:30',
      '',
      'Remember: small steps → big wins',
    ].join('\n');
    localStorage.setItem('widgetSettings_notes', JSON.stringify({ notes: [noteText], idx: 0 }));
  });
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await widgetClip(page, 'notes', path.join(SHOWCASE_DIR, '07_widget_notes.png'));
});

// ─── Pomodoro widget ──────────────────────────────────────────────────────────

test('08 · Pomodoro widget', async ({ page }) => {
  const { initFn, settings } = injectSettings({
    mode: 'dark',
    accent: 'Mint',
    cardStyle: 'glass',
    defaultView: 'canvas',
    canvasBg: { type: 'solid' },
    quickTourSeenVersion: '3.0.0',
  });
  await page.addInitScript(initFn, settings);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await widgetClip(page, 'pomodoro', path.join(SHOWCASE_DIR, '08_widget_pomodoro.png'));
});

// ─── Progress widget ──────────────────────────────────────────────────────────

test('09 · Progress widget', async ({ page }) => {
  const { initFn, settings } = injectSettings({
    mode: 'light',
    accent: 'Blueberry',
    cardStyle: 'flat',
    defaultView: 'canvas',
    canvasBg: { type: 'solid' },
    quickTourSeenVersion: '3.0.0',
  });
  await page.addInitScript(initFn, settings);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await widgetClip(page, 'progress', path.join(SHOWCASE_DIR, '09_widget_progress.png'));
});

// ─── Date Today widget ────────────────────────────────────────────────────────

test('10 · Date Today widget', async ({ page }) => {
  const { initFn, settings } = injectSettings({
    mode: 'dark',
    accent: 'Rose',
    cardStyle: 'glass',
    defaultView: 'canvas',
    canvasBg: { type: 'solid' },
    quickTourSeenVersion: '3.0.0',
  });
  await page.addInitScript(initFn, settings);
  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await widgetClip(page, 'dateToday', path.join(SHOWCASE_DIR, '10_widget_datetoday.png'));
});
