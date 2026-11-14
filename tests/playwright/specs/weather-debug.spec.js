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
    // Dismiss the Quick Tour onboarding overlay so it doesn't block clicks
    localStorage.setItem('undistracted_settings', JSON.stringify({ state: { quickTourSeenVersion: '4.0.0' } }));

    // Inject a weather widget instance (the store reads this on boot)
    localStorage.setItem('widget_instances', JSON.stringify({
      state: { instances: [{ id: 'weather', type: 'weather' }], widgetSettings: {} },
      version: 0,
    }));

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

    // Wait for the widget to finish loading (temperature hero always renders)
    await page.waitForSelector('text=28°C', { timeout: 12000 });
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

  test('shows feels-like when no city name is set', async ({ page }) => {
    // The expressive second line shows the city when a name is present, and
    // falls back to feels-like only when there is no city name. Override the
    // seeded Chicago name (keep coords so no geolocation is attempted).
    // MUST be an addInitScript (registered AFTER injectWeatherWidget's own init
    // script) so it runs later on reload and wins over the Chicago seed —
    // page.evaluate would be clobbered by injectWeatherWidget on navigation.
    await page.addInitScript(() => {
      const ws = JSON.parse(localStorage.getItem('widgetSettings_weather') || '{}');
      ws.location = { lat: 41.85, lon: -87.65 };
      localStorage.setItem('widgetSettings_weather', JSON.stringify(ws));
      // Clear the per-coordinate weather cache so the reload re-fetches with an
      // empty cityName (otherwise the cached "Chicago" payload — same locKey —
      // is returned within its TTL and the city branch keeps rendering).
      localStorage.removeItem('weather_cache_v1');
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=28°C', { timeout: 12000 });

    // temp=28, feelsLike=38 → second line shows "feels like 38°C"
    await expect(page.locator('text=feels').first()).toBeVisible();
    await expect(page.locator('text=38°C').first()).toBeVisible();
  });

  test('shows condition row with dominant forecast condition', async ({ page }) => {
    const conditionRow = page.locator('[data-testid="weather-condition-row"]');
    await expect(conditionRow).toBeVisible();
    const text = await conditionRow.innerText();
    // All 12 slots are WMO 0 (clear sky) → dominant = clear sky, label "for next 6hrs"
    expect(text.toLowerCase()).toContain('clear sky');
    expect(text.toLowerCase()).toContain('for next');
    console.log('[debug] condition row text:', text);
  });

  test('shows forecast hours as a numeral — dominant condition hours', async ({ page }) => {
    const conditionRow = page.locator('[data-testid="weather-condition-row"]');
    await expect(conditionRow).toBeVisible();
    const text = await conditionRow.innerText();
    // All 12 hourly slots are clear sky → dominant has 6 slots → "for next 6hrs"
    expect(text).toMatch(/for next \d+hrs/);
    expect(text).toContain('6hrs');
    console.log('[debug] forecast hours text:', text);
  });

  test('no text is clipped inside the widget card', async ({ page }) => {
    const card = page.locator('.react-grid-item .overflow-hidden').first();
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

  test('consumes the raw mock payload (city + temperature from Open-Meteo mock)', async ({ page }) => {
    // The widget no longer emits "[Weather]" console logs; instead verify the
    // mocked Open-Meteo payload is actually consumed by asserting the rendered
    // city and temperature match the mock (28°C, Chicago).
    await page.waitForSelector('[data-testid="weather-city"]', { timeout: 12000 });
    await expect(page.locator('text=28°C').first()).toBeVisible();
    await expect(page.locator('[data-testid="weather-city"]')).toContainText('Chicago');
  });
});
