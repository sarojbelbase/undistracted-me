/**
 * Weather widget — expressive layout debug spec.
 *
 * Mocks Open-Meteo /forecast so the widget always renders a sunny Chicago
 * scenario (matching the inspiration screenshot) regardless of real API data.
 * Also asserts every text element is present and the layout flows correctly.
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SCREENSHOT_DIR = path.join(process.cwd(), 'tests/playwright/screenshots');

// ── Mock Open-Meteo payload ───────────────────────────────────────────────────

const NOW_ISO = new Date().toISOString().slice(0, 16);

/**
 * Open-Meteo response: 28°C, clear sky (WMO 0), daytime, Chicago.
 * All 12 hourly slots are code=0 (clear sky), pop=0.
 * parseForecast → dominant=0, count=6, type='persist' → "Clear sky next · 6 hours"
 */
const MOCK_OM_RESPONSE = {
  latitude: 41.85,
  longitude: -87.65,
  timezone: 'America/Chicago',
  current: {
    time: NOW_ISO,
    interval: 900,
    temperature_2m: 28.4,
    apparent_temperature: 38.1,
    weather_code: 0,
    wind_gusts_10m: 15.2,
    precipitation: 0,
    is_day: 1,
  },
  hourly: {
    time: Array.from({ length: 12 }, (_, i) => `${NOW_ISO.slice(0, 11)}${String(i).padStart(2, '0')}:00`),
    precipitation_probability: Array(12).fill(0),
    weather_code: Array(12).fill(0),
    wind_gusts_10m: Array(12).fill(15),
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function setupMocks(page) {
  // Intercept Open-Meteo forecast endpoint (single call replaces the old dual OWM calls)
  await page.route('**/api.open-meteo.com/v1/forecast**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_OM_RESPONSE),
    });
  });

  // Geocoding autocomplete — return empty so it doesn't interfere
  await page.route('**/geocoding-api.open-meteo.com/**', (route) => {
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [] }) });
  });
}

async function injectWeatherWidget(page) {
  await page.addInitScript(() => {
    // Core app flags
    localStorage.setItem('showWidgets', 'true');
    localStorage.setItem('app_mode', 'dark');
    localStorage.setItem('app_accent', 'Default');
    localStorage.setItem('language', 'en');

    // Inject a weather widget instance (the store reads this on boot)
    localStorage.setItem('widget_instances', JSON.stringify([{ id: 'weather', type: 'weather' }]));

    // Widget settings: expressive style + pre-set Chicago coords so the widget
    // never calls geolocation (which is blocked in headless mode). The fetch
    // to OWM will be intercepted by our route mocks above.
    localStorage.setItem('widgetSettings_weather', JSON.stringify({
      style: 'expressive',
      unit: 'metric',
      location: { name: 'Chicago', lat: 41.85, lon: -87.65 },
    }));
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Weather widget — expressive layout', () => {

  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await injectWeatherWidget(page);

    // Navigate — mocks are registered before navigation so the first fetch is caught
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Wait for the widget to finish loading (city name appears)
    await page.waitForSelector('[data-testid="weather-city"]', { timeout: 12000 });
  });

  // ── Layout assertions ───────────────────────────────────────────────────────

  test('shows temperature as hero element', async ({ page }) => {
    // Temperature hero: "28°" + "C" in two spans; combined parent text contains "28°C"
    await expect(page.locator('text=28°C').first()).toBeVisible();
  });

  test('shows city name (no "in" prefix)', async ({ page }) => {
    const cityEl = page.locator('[data-testid="weather-city"]');
    await expect(cityEl).toBeVisible();
    await expect(cityEl).toContainText('Chicago');
  });

  test('shows feels-like when different from temp', async ({ page }) => {
    // Mock: temp=28, feelsLike=38 → diff=10 ≥ 2 → shows "feels warmer at 38°C"
    await expect(page.locator('text=feels').first()).toBeVisible();
    await expect(page.locator('text=38°C').first()).toBeVisible();
  });

  test('shows condition row with dominant forecast condition', async ({ page }) => {
    const conditionRow = page.locator('[data-testid="weather-condition-row"]');
    await expect(conditionRow).toBeVisible();
    const text = await conditionRow.innerText();
    // All 12 slots are WMO 0 (clear sky) → dominant = clear sky
    expect(text.toLowerCase()).toContain('clear sky');
    // The qualifier phrase "for the next" is in the hours sibling element
    await expect(page.locator('text=for the next').first()).toBeVisible();
    console.log('[debug] condition row text:', text);
  });

  test('shows forecast hours as a numeral — dominant condition hours', async ({ page }) => {
    const hoursEl = page.locator('[data-testid="weather-forecast-hours"]');
    await expect(hoursEl).toBeVisible();
    const text = await hoursEl.innerText();
    // All 12 hourly slots are clear sky → dominant has 6 slots → hours span = "6 hours"
    expect(text).toMatch(/^\d+ hours?$/);
    expect(text).toBe('6 hours');
    console.log('[debug] forecast hours text:', text);
  });

  test('no text is clipped inside the widget card', async ({ page }) => {
    const card = page.locator('.react-grid-item .rounded-2xl').first();
    const clip = await card.evaluate((el) => ({
      hClip: el.scrollWidth > el.clientWidth + 2,
      vClip: el.scrollHeight > el.clientHeight + 2,
    }));
    expect(clip.hClip, 'horizontal clip').toBe(false);
    expect(clip.vClip, 'vertical clip').toBe(false);
  });

  // ── Screenshot ─────────────────────────────────────────────────────────────

  test('screenshot: expressive widget matches inspiration flow', async ({ page }) => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    const card = page.locator('.react-grid-item').first();
    await card.screenshot({
      path: path.join(SCREENSHOT_DIR, 'weather-expressive.png'),
    });

    // Full page snapshot for context
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'weather-expressive-full.png'),
      fullPage: false,
    });

    console.log('[debug] screenshots saved to', SCREENSHOT_DIR);
  });

  // ── Data shape debug ───────────────────────────────────────────────────────

  test('logs raw mock payload consumed by the widget', async ({ page }) => {
    const logs = [];
    page.on('console', msg => {
      if (msg.text().startsWith('[Weather]')) logs.push(msg.text());
    });

    // Re-navigate so fresh load logs appear
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-testid="weather-city"]', { timeout: 12000 });
    await page.waitForTimeout(1000);

    console.log('\n=== [Weather] console output ===');
    logs.forEach(l => console.log(l));
    console.log('================================\n');

    // Sanity: at least one [Weather] log should appear
    expect(logs.some(l => l.includes('parsed') || l.includes('Open-Meteo'))).toBe(true);
  });
});
