/**
 * Quick Playwright screenshot test to capture current widget state.
 * Run with: node playwright-test.cjs
 */
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3001';
const OUT_DIR = path.join(__dirname, 'playwright-screenshots');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
  });
  const page = await context.newPage();

  // Set dark mode before page load so theme is applied from first render
  await context.addInitScript(() => {
    localStorage.setItem('app_mode', 'dark');
    localStorage.setItem('app_accent', 'Default');
    localStorage.setItem('showWidgets', 'true');
  });

  // ── 1. Load the page and dump current localStorage ────────────────────────
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  const localStorageData = await page.evaluate(() => {
    const result = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      result[key] = localStorage.getItem(key);
    }
    return result;
  });
  console.log('📦 localStorage keys:', Object.keys(localStorageData));
  fs.writeFileSync(`${OUT_DIR}/localStorage.json`, JSON.stringify(localStorageData, null, 2));

  // ── 2. Full page screenshot ───────────────────────────────────────────────
  await page.screenshot({ path: `${OUT_DIR}/01_full_page.png`, fullPage: false });
  console.log('✅ 01_full_page.png');

  // ── 3. Screenshot each react-grid-item individually ───────────────────────
  const gridItems = page.locator('.react-grid-item');
  const gridCount = await gridItems.count();
  console.log(`Found ${gridCount} grid items`);

  for (let i = 0; i < gridCount; i++) {
    try {
      const box = await gridItems.nth(i).boundingBox();
      if (box && box.width > 40 && box.height > 40) {
        await gridItems.nth(i).screenshot({ path: `${OUT_DIR}/widget_${i}.png` });
        const text = await gridItems.nth(i).innerText().catch(() => '');
        console.log(`✅ widget_${i}.png  (${Math.round(box.width)}×${Math.round(box.height)}) — ${text.slice(0, 50).replace(/\n/g, ' ')}`);
      }
    } catch (e) {
      console.log(`⚠️  widget_${i}: ${e.message}`);
    }
  }

  // ── 4. Configure widgets with proper settings ─────────────────────────────
  // The app uses:
  //   localStorage key "widget_grid_layouts" for the react-grid-layout positions
  //   localStorage key "widget-settings-{widget_id}" for each widget's settings
  // Widget IDs from the dump: "clock", "stock", "dateToday", etc.

  const layoutRaw = localStorageData['widget_grid_layouts'];
  const gridLayouts = layoutRaw ? JSON.parse(layoutRaw) : {};
  const lgItems = gridLayouts.lg || [];
  const widgetIds = lgItems.map(i => i.i);
  console.log('Widget IDs in layout:', widgetIds);

  // Configure clock: 12h format with 2 extra timezones
  await page.evaluate(() => {
    localStorage.setItem('widgetSettings_clock', JSON.stringify({
      format: '12h',
      timezones: ['America/Los_Angeles', 'Europe/London'],
    }));
  });
  console.log('Set clock settings');

  // Configure stock: 3 symbols and make it wider
  // First update the grid layout to make stock widget wider/taller
  const updatedLayout = lgItems.map(item =>
    item.i === 'stock' ? { ...item, w: 3, h: 3 } : item
  );
  await page.evaluate((layouts) => {
    localStorage.setItem('widget_grid_layouts', JSON.stringify({ lg: layouts }));
    localStorage.setItem('widgetSettings_stock', JSON.stringify({
      symbols: ['GBIME', 'API', 'NABIL'],
    }));
  }, updatedLayout);
  console.log('Set stock settings with 3 symbols and wider layout');

  // ── 5. Reload and capture with updated settings ───────────────────────────
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(3500); // let stock data fetch and clock render
  await page.screenshot({ path: `${OUT_DIR}/02_after_settings.png`, fullPage: false });
  console.log('✅ 02_after_settings.png');

  // Re-capture each grid item with updated settings
  const gridItems2 = page.locator('.react-grid-item');
  const gridCount2 = await gridItems2.count();
  console.log(`Found ${gridCount2} grid items after reload`);

  for (let i = 0; i < gridCount2; i++) {
    try {
      const box = await gridItems2.nth(i).boundingBox();
      if (box && box.width > 40 && box.height > 40) {
        await gridItems2.nth(i).screenshot({ path: `${OUT_DIR}/widget_v2_${i}.png` });
        const text = await gridItems2.nth(i).innerText().catch(() => '');
        console.log(`✅ widget_v2_${i}.png  (${Math.round(box.width)}×${Math.round(box.height)}) — ${text.slice(0, 80).replace(/\n/g, ' ')}`);
      }
    } catch (e) {
      console.log(`⚠️  widget_v2_${i}: ${e.message}`);
    }
  }

  // ── 6. Dump HTML ──────────────────────────────────────────────────────────
  const html = await page.content();
  fs.writeFileSync(`${OUT_DIR}/page.html`, html);
  console.log('✅ page.html');

  await browser.close();
  console.log(`\nAll screenshots saved to: ${OUT_DIR}`);
})();
