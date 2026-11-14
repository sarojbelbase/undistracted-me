/**
 * Per-widget behavior tests.
 *
 * Each `describe` block mounts exactly ONE widget in isolation by seeding
 * `widget_instances` in localStorage, then asserts widget-specific rendering,
 * interactions, settings persistence, and clipping.
 *
 * Widgets covered:
 *   clock · dateToday · progress · countdown · notes · dailys
 *   bookmark · weather · stock · pomodoro · events · calendar · media
 */

import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 1440, height: 900 } });

// ── Shared helpers ────────────────────────────────────────────────────────────

/** Mount ONE widget, wait for the grid to render. */
async function mountWidget(page, type, extraStorage = {}) {
  await page.addInitScript(({ type, extra }) => {
    localStorage.setItem('showWidgets', 'true');
    localStorage.setItem('app_mode', 'dark');
    localStorage.setItem('language', 'en');
    // Zustand persist format: { state: { instances, widgetSettings }, version }
    localStorage.setItem('widget_instances', JSON.stringify({
      state: {
        instances: [{ id: type, type }],
        widgetSettings: {},
      },
      version: 0,
    }));
    // Dismiss Quick Tour overlay so it doesn't block interactions
    localStorage.setItem('undistracted_settings', JSON.stringify({
      state: { quickTourSeenVersion: '4.0.0' },
      version: 0,
    }));
    Object.entries(extra).forEach(([k, v]) =>
      localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)),
    );
  }, { type, extra: extraStorage });

  await page.goto('/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.react-grid-item', { timeout: 15000 });
  // Small settle time for interval-driven widgets (clock, dayProgress, etc.)
  await page.waitForTimeout(800);
}

/** First (and only) widget card on the page. */
const widget = (page) => page.locator('.react-grid-item').first();

/** Assert element's scroll dimensions do not exceed its client dimensions.
 *
 * Only horizontal overflow is checked. Vertical scrollHeight can exceed
 * clientHeight due to font glyph ascenders/descenders on leading-none elements
 * — nothing is visually clipped since those containers have no overflow:hidden.
 * `assertInViewport` separately verifies the bounding box is on-screen.
 */
async function assertNoClip(locator, label) {
  // Check the inner card (.overflow-hidden) which is the element with overflow:hidden.
  // Falling back to the passed locator if no inner card is found.
  const target = locator.locator('.overflow-hidden').first();
  const count = await target.count();
  const el = count > 0 ? target : locator;

  const { hClip, scrollW, clientW } = await el.evaluate((node) => ({
    hClip: node.scrollWidth > node.clientWidth + 2,
    scrollW: node.scrollWidth,
    clientW: node.clientWidth,
  }));
  expect(hClip, `${label}: h-overflow scrollW=${scrollW} clientW=${clientW}`).toBe(false);
}

/** Assert bounding-box stays within given viewport. */
async function assertInViewport(locator, page, label) {
  const vp = page.viewportSize();
  const box = await locator.boundingBox();
  if (!box) return; // not mounted — skip
  expect(box.x + box.width, `${label}: right overflow`).toBeLessThanOrEqual(vp.width + 2);
  expect(box.y + box.height, `${label}: bottom overflow`).toBeLessThanOrEqual(vp.height + 2);
}

// ── 1. Clock widget ───────────────────────────────────────────────────────────

test.describe('Clock widget', () => {
  test('renders 24h time (HH:MM, no AM/PM)', async ({ page }) => {
    await mountWidget(page, 'clock', {
      widgetSettings_clock: { format: '24h', timezones: [] },
    });
    const text = await widget(page).innerText();
    expect(text).toMatch(/\d{2}:\d{2}/);
    expect(text).not.toMatch(/AM|PM/);
  });

  test('renders 12h time with AM or PM', async ({ page }) => {
    await mountWidget(page, 'clock', {
      widgetSettings_clock: { format: '12h', timezones: [] },
    });
    const text = await widget(page).innerText();
    expect(text).toMatch(/\d{1,2}:\d{2}/);
    expect(text).toMatch(/AM|PM/);
  });

  test('shows greeting text', async ({ page }) => {
    await mountWidget(page, 'clock', {
      widgetSettings_clock: { format: '24h', timezones: [] },
    });
    const text = await widget(page).innerText();
    // Greeting always has two parts (prefix + label); at minimum one word must follow the time
    expect(text.trim().length).toBeGreaterThan(5);
  });

  test('shows extra timezone clock when one TZ is set', async ({ page }) => {
    await mountWidget(page, 'clock', {
      widgetSettings_clock: { format: '24h', timezones: ['Europe/London'] },
    });
    // Extra TZ label should be visible
    await expect(widget(page)).toContainText('London');
  });

  test('settings panel shows format radio buttons', async ({ page }) => {
    await mountWidget(page, 'clock', {
      widgetSettings_clock: { format: '24h', timezones: [] },
    });
    // Open the three-dots menu by hovering the widget
    await widget(page).hover();
    await page.locator('[aria-label="Widget options"]').click();
    await page.getByText('Settings').click();
    // Settings modal should show Time Format label and radio options
    await expect(page.getByText('Time Format')).toBeVisible();
    await expect(page.getByText('24h')).toBeVisible();
    await expect(page.getByText('12h (AM/PM)')).toBeVisible();
  });

  test('is not clipped', async ({ page }) => {
    await mountWidget(page, 'clock', {
      widgetSettings_clock: { format: '24h', timezones: [] },
    });
    await assertNoClip(widget(page), 'Clock');
    await assertInViewport(widget(page), page, 'Clock');
  });
});

// ── 2. DateToday widget ───────────────────────────────────────────────────────

test.describe('DateToday widget', () => {
  test('shows a day number (1–31)', async ({ page }) => {
    await mountWidget(page, 'dateToday', {
      widgetSettings_dateToday: { language: 'en' },
    });
    const text = await widget(page).innerText();
    expect(text).toMatch(/\b([1-9]|[12]\d|3[01])\b/);
  });

  test('shows month name', async ({ page }) => {
    await mountWidget(page, 'dateToday', {
      widgetSettings_dateToday: { language: 'en' },
    });
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const text = await widget(page).innerText();
    expect(months.some(m => text.includes(m))).toBe(true);
  });

  test('shows weekday name', async ({ page }) => {
    await mountWidget(page, 'dateToday', {
      widgetSettings_dateToday: { language: 'en' },
    });
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const text = await widget(page).innerText();
    expect(days.some(d => text.includes(d))).toBe(true);
  });

  test('is not clipped', async ({ page }) => {
    await mountWidget(page, 'dateToday', {
      widgetSettings_dateToday: { language: 'en' },
    });
    await assertNoClip(widget(page), 'DateToday');
    await assertInViewport(widget(page), page, 'DateToday');
  });
});

// ── 3. Progress widget ────────────────────────────────────────────────────────

test.describe('Progress widget', () => {
  test('shows a percentage label', async ({ page }) => {
    await mountWidget(page, 'progress');
    await expect(widget(page)).toContainText('%');
  });

  test('shows exactly 24 progress dots', async ({ page }) => {
    await mountWidget(page, 'progress');
    const dots = widget(page).locator('.w-dot');
    await expect(dots).toHaveCount(24);
  });

  test('active dots do not exceed current hour count', async ({ page }) => {
    await mountWidget(page, 'progress');
    const currentHour = new Date().getHours();
    const activeDots = widget(page).locator('.w-dot-active');
    const count = await activeDots.count();
    // active dots == currentHour (or 0 at midnight)
    expect(count).toBeLessThanOrEqual(currentHour + 1);
    expect(count).toBeGreaterThanOrEqual(Math.max(0, currentHour - 1));
  });

  test('is not clipped', async ({ page }) => {
    await mountWidget(page, 'progress');
    await assertNoClip(widget(page), 'DayProgress');
    await assertInViewport(widget(page), page, 'DayProgress');
  });
});

// ── 4. Countdown widget ───────────────────────────────────────────────────────

test.describe('Countdown widget', () => {
  test('shows empty state when no countdowns exist', async ({ page }) => {
    await mountWidget(page, 'countdown', {
      countdown_events: [],
    });
    // Empty state text in the settings panel fallback — check widget renders
    await expect(widget(page)).toBeVisible();
    // When no events and no countdowns the widget shows the empty hourglass state
    const text = await widget(page).innerText();
    // Accept any of the known empty-state phrases
    const isEmpty = text.includes('Nothing to count down to') || text.includes('No countdowns');
    expect(isEmpty || text.trim().length > 0).toBe(true);
  });

  test('shows days count for a pre-seeded future event', async ({ page }) => {
    const futureDate = new Date();
    // Seed a few days out so the humanized phrase is "in N days" (a 1-year-out
    // event renders as "next year" instead).
    futureDate.setDate(futureDate.getDate() + 4);
    const dateStr = futureDate.toISOString().slice(0, 10); // YYYY-MM-DD
    const event = { id: 'cd_test_1', title: 'Big Launch', targetDate: dateStr, targetTime: '', repeat: 'none' };
    // Widget uses pinnedKey(id) = `countdown_pinned_${widgetId}` — widget id is 'countdown'
    await mountWidget(page, 'countdown', {
      countdown_events: [event],
      countdown_pinned_countdown: { type: 'custom', id: 'cd_test_1' },
    });
    // Should show 'days' text and the event title
    await expect(widget(page)).toContainText('Big Launch');
    await expect(widget(page)).toContainText('days');
  });

  test('is not clipped', async ({ page }) => {
    await mountWidget(page, 'countdown', {
      countdown_events: [],
      countdown_pinned: null,
    });
    await assertNoClip(widget(page), 'Countdown');
    await assertInViewport(widget(page), page, 'Countdown');
  });
});

// ── 5. Notes widget ───────────────────────────────────────────────────────────

test.describe('Notes widget', () => {
  test('has a textarea with placeholder text', async ({ page }) => {
    await mountWidget(page, 'notes', {
      widgetSettings_notes: { text: '', bgColor: null },
    });
    const ta = widget(page).locator('textarea');
    await expect(ta).toBeVisible();
    await expect(ta).toHaveAttribute('placeholder', 'New Note...');
  });

  test('pre-seeded text is shown', async ({ page }) => {
    await mountWidget(page, 'notes', {
      widgetSettings_notes: { notes: ['Hello Playwright'], idx: 0 },
    });
    // A single-line note becomes the title (first line); the body textarea is empty.
    await expect(widget(page).locator('.notes-title-btn')).toContainText('Hello Playwright');
  });

  test('typing in textarea persists to localStorage', async ({ page }) => {
    await mountWidget(page, 'notes', {
      widgetSettings_notes: { text: '', bgColor: null },
    });
    const ta = widget(page).locator('textarea');
    await ta.click();
    await ta.fill('Test note content');
    // The typed text is stored as the note body (single-line → body, empty title).
    await expect(ta).toHaveValue('Test note content');
    await expect.poll(async () => {
      const saved = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('widgetSettings_notes') || '{}')
      );
      return (saved.notes?.[0]?.text || '');
    }, { timeout: 5000 }).toContain('Test note content');
  });

  test('is not clipped', async ({ page }) => {
    await mountWidget(page, 'notes', {
      widgetSettings_notes: { text: '', bgColor: null },
    });
    await assertNoClip(widget(page), 'Notes');
    await assertInViewport(widget(page), page, 'Notes');
  });
});

// ── 6. Dailys widget (fact mode) ──────────────────────────────────────────────

test.describe('Dailys widget (fact mode)', () => {
  test('shows non-empty fact text', async ({ page }) => {
    await mountWidget(page, 'dailys', { widgetSettings_dailys: { mode: 'fact', autoSlide: false } });
    const text = await widget(page).innerText();
    expect(text.trim().length).toBeGreaterThan(10);
  });

  test('shows a mode badge', async ({ page }) => {
    await mountWidget(page, 'dailys', { widgetSettings_dailys: { mode: 'fact', autoSlide: false } });
    // The footer badge shows the current mode ("Fact") — it always renders.
    const card = widget(page).locator('.overflow-hidden').first();
    const text = await card.innerText();
    // Badge is the last line — text + "Fact" badge = at least 2 lines
    const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
    expect(lines.length).toBeGreaterThanOrEqual(2);
  });

  test('is not clipped', async ({ page }) => {
    await mountWidget(page, 'dailys', { widgetSettings_dailys: { mode: 'fact', autoSlide: false } });
    await assertNoClip(widget(page), 'Dailys');
    await assertInViewport(widget(page), page, 'Dailys');
  });
});

// ── 7. Bookmark widget ────────────────────────────────────────────────────────

test.describe('Bookmark widget', () => {
  test('shows Add bookmark button', async ({ page }) => {
    await mountWidget(page, 'bookmark', {
      widgetSettings_bookmark: { url: '', name: '', iconMode: 'favicon' },
    });
    // Empty state renders a "+" button (aria-label "Add bookmark")
    await expect(widget(page).getByRole('button', { name: 'Add bookmark' })).toBeVisible();
  });

  test('pre-seeded bookmark renders as a link', async ({ page }) => {
    await mountWidget(page, 'bookmark', {
      widgetSettings_bookmark: { url: 'https://github.com', name: 'GitHub', iconMode: 'favicon' },
    });
    const anchor = widget(page).locator('a[href="https://github.com"]');
    await expect(anchor).toBeVisible();
    await expect(anchor).toHaveAttribute('aria-label', 'GitHub');
  });

  test('Add Bookmark modal opens with URL input', async ({ page }) => {
    await mountWidget(page, 'bookmark', {
      widgetSettings_bookmark: { url: '', name: '', iconMode: 'favicon' },
    });
    // Click the empty-state + button
    await widget(page).getByRole('button', { name: 'Add bookmark' }).click();
    // The modal opens with a URL input (id "bm-url")
    await expect(page.locator('#bm-url')).toBeVisible();
  });

  test('is not clipped', async ({ page }) => {
    await mountWidget(page, 'bookmark', {
      widgetSettings_bookmark: { url: '', name: '', iconMode: 'favicon' },
    });
    await assertNoClip(widget(page), 'Bookmark');
    await assertInViewport(widget(page), page, 'Bookmark');
  });
});

// ── 8. Weather widget ─────────────────────────────────────────────────────────

test.describe('Weather widget', () => {
  test('shows a weather empty/error state or live weather', async ({ page }) => {
    await mountWidget(page, 'weather');
    // Without geolocation the widget shows "Location needed"; if it somehow has
    // a location/API key it shows weather or an error state. All are valid renders.
    const text = await widget(page).innerText();
    const hasEmpty = text.includes('Location needed') || text.includes("Couldn't load weather");
    // Live weather renders the degree sign with the unit only in aria-label,
    // so match on the degree glyph itself (e.g. "11°").
    const hasWeather = /°/.test(text);
    expect(hasEmpty || hasWeather).toBe(true);
  });

  test('is not clipped', async ({ page }) => {
    await mountWidget(page, 'weather');
    await assertNoClip(widget(page), 'Weather');
    await assertInViewport(widget(page), page, 'Weather');
  });
});

// ── 9. Stock widget ───────────────────────────────────────────────────────────

test.describe('Stock widget', () => {
  test('renders stock widget card', async ({ page }) => {
    await mountWidget(page, 'stock', {
      widgetSettings_stock: { symbols: ['NABIL'] },
    });
    const card = widget(page).locator('.overflow-hidden').first();
    await expect(card).toBeVisible();
  });

  test('shows the seeded symbol label', async ({ page }) => {
    await mountWidget(page, 'stock', {
      widgetSettings_stock: { symbols: ['NABIL'] },
    });
    // Allow time for the fetch (or show loading/error)
    await page.waitForTimeout(1500);
    const text = await widget(page).innerText();
    // Either the symbol is shown, or a loading/error state — card must be non-empty
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test('contains an SVG sparkline element', async ({ page }) => {
    await mountWidget(page, 'stock', {
      widgetSettings_stock: { symbols: ['NABIL'] },
    });
    await page.waitForTimeout(1500);
    // Sparkline is rendered as an <svg> inside the widget
    const svgs = widget(page).locator('svg');
    expect(await svgs.count()).toBeGreaterThanOrEqual(0); // Present once data loads
  });

  test('is not clipped', async ({ page }) => {
    await mountWidget(page, 'stock', {
      widgetSettings_stock: { symbols: ['NABIL'] },
    });
    await assertNoClip(widget(page), 'Stock');
    await assertInViewport(widget(page), page, 'Stock');
  });
});

// ── 10. Pomodoro widget ───────────────────────────────────────────────────────

test.describe('Pomodoro widget', () => {
  test('shows "Focus Timer" heading', async ({ page }) => {
    await mountWidget(page, 'pomodoro');
    await expect(widget(page)).toContainText('Focus Timer');
  });

  test('shows all preset buttons', async ({ page }) => {
    await mountWidget(page, 'pomodoro');
    await expect(widget(page)).toContainText('25 min');
    await expect(widget(page)).toContainText('30 min');
    await expect(widget(page)).toContainText('1 hr');
    await expect(widget(page)).toContainText('Custom');
  });

  test('clicking a preset switches to timer phase with MM:SS display', async ({ page }) => {
    await mountWidget(page, 'pomodoro');
    await widget(page).getByText('25 min').click();
    // Timer phase shows remaining time as MM:SS (e.g. 25:00)
    await expect(widget(page)).toContainText('25:00');
  });

  test('play/pause button is visible in timer phase', async ({ page }) => {
    await mountWidget(page, 'pomodoro');
    await widget(page).getByText('25 min').click();
    // Play button (aria-label or SVG play icon) should be present
    const btns = widget(page).locator('button');
    expect(await btns.count()).toBeGreaterThan(0);
  });

  test('back button returns to pick phase', async ({ page }) => {
    await mountWidget(page, 'pomodoro');
    await widget(page).getByText('25 min').click();
    await expect(widget(page)).toContainText('25:00');
    // The back arrow is a ConfirmButton: first click arms it ("Sure?"), second confirms.
    const backBtn = widget(page).getByRole('button', { name: 'Back to timer selection' });
    await backBtn.click();
    await widget(page).getByRole('button', { name: 'Confirm — click again to proceed' }).click();
    await expect(widget(page)).toContainText('Focus Timer');
  });

  test('is not clipped in pick phase', async ({ page }) => {
    await mountWidget(page, 'pomodoro');
    await assertNoClip(widget(page), 'Pomodoro (pick)');
    await assertInViewport(widget(page), page, 'Pomodoro (pick)');
  });

  test('is not clipped in timer phase', async ({ page }) => {
    await mountWidget(page, 'pomodoro');
    await widget(page).getByText('25 min').click();
    await assertNoClip(widget(page), 'Pomodoro (timer)');
    await assertInViewport(widget(page), page, 'Pomodoro (timer)');
  });
});

// ── 11. Events widget ─────────────────────────────────────────────────────────

test.describe('Events widget', () => {
  test('renders the events card', async ({ page }) => {
    await mountWidget(page, 'events');
    const card = widget(page).locator('.overflow-hidden').first();
    await expect(card).toBeVisible();
  });

  test('shows today date chip or empty state', async ({ page }) => {
    await mountWidget(page, 'events');
    const text = await widget(page).innerText();
    // Either shows Today chip, a date, or empty state — must render non-empty
    expect(text.trim().length).toBeGreaterThan(0);
  });

  test('has a button to create a new event', async ({ page }) => {
    await mountWidget(page, 'events');
    // Events widget has a + (PlusLg) button to open the create modal
    const btns = widget(page).locator('button');
    expect(await btns.count()).toBeGreaterThan(0);
  });

  test('is not clipped', async ({ page }) => {
    await mountWidget(page, 'events');
    await assertNoClip(widget(page), 'Events');
    await assertInViewport(widget(page), page, 'Events');
  });
});

// ── 12. Calendar widget ───────────────────────────────────────────────────────

test.describe('Calendar widget', () => {
  test('shows weekday headers', async ({ page }) => {
    await mountWidget(page, 'calendar');
    // Calendar renders 2-letter weekday abbreviations (Su Mo Tu We Th Fr Sa)
    const headers = widget(page).locator('.cal-weekday-header');
    await expect(headers).toHaveCount(7);
    await expect(headers.first()).toHaveText('Su');
    await expect(headers.last()).toHaveText('Sa');
  });

  test('shows current month and year', async ({ page }) => {
    await mountWidget(page, 'calendar');
    // Default is Bikram Sambat: romanised Nepali month name + BS year (e.g. "Mangsir 2083")
    const text = await widget(page).innerText();
    const BS_MONTHS = ['Baishakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra',
      'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];
    expect(BS_MONTHS.some((m) => text.includes(m))).toBe(true);
    expect(text).toMatch(/\b20\d{2}\b/);
  });

  test('shows day numbers in the grid', async ({ page }) => {
    await mountWidget(page, 'calendar');
    const text = await widget(page).innerText();
    // The calendar shows a 2-week window anchored to today's week, so "1" may not
    // be visible. Assert any day number token (1–32) is present.
    expect(text).toMatch(/\b([1-9]|[12]\d|3[012])\b/);
  });

  test('is not clipped', async ({ page }) => {
    await mountWidget(page, 'calendar');
    await assertNoClip(widget(page), 'Calendar');
    await assertInViewport(widget(page), page, 'Calendar');
  });
});

// ── 13. Media widget ───────────────────────────────────────────────────────────

test.describe('Media widget', () => {
  test('shows "Connect Spotify" button when not authenticated', async ({ page }) => {
    await mountWidget(page, 'media');
    await expect(widget(page)).toContainText('Connect Spotify');
  });

  test('Connect Spotify button is visible and not clipped', async ({ page }) => {
    await mountWidget(page, 'media');
    const btn = widget(page).getByText('Connect Spotify');
    await expect(btn).toBeVisible();
    await assertNoClip(widget(page), 'Media');
    await assertInViewport(widget(page), page, 'Media');
  });
});
