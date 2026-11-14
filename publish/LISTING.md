# Store Listing — Undistracted Me

Copy-paste reference for the Chrome Web Store and Firefox AMO dashboards.
The package is uploaded via CLI (`bun run publish:chrome` / `publish:firefox`);
**these text fields are entered manually in each store's developer dashboard** —
the store APIs do not set name / description / category / screenshots.

---

## Chrome Web Store (developer dashboard)

| Field | Value |
|---|---|
| Name | `Undistracted Me — New Tab` |
| Category | **Productivity** |
| Developer website | `https://undistracted.me` |
| Privacy policy URL | `https://undistracted.me/pp-and-tos` |
| Short description | `Undistracted Me is a distraction-free new tab: Nepali calendar, Focus Mode, and 30+ quiet widgets. No account, works offline.` (125 chars) |

### Detailed description

```
Undistracted Me replaces your new tab with a calm, distraction-free dashboard — so the first thing you see is quiet, not noise.

✦ What's inside
• Nepali calendar (Bikram Sambat) alongside the Gregorian date, with Nepal's festivals and tithis woven in
• Focus Mode — a full-screen cinematic clock with optional rain sounds for deep work
• 30+ quiet widgets, all optional and drag-and-drop: notes, expenses, countdowns, NEPSE stocks, weather, Pomodoro, world clock, media controls, RSS news, daily quote/joke/fact, and more
• Quick access to your top sites and bookmarks

✦ Why Undistracted Me
• No account, no ads, no tracking — your data stays on your device
• Works offline
• Free and open source (MIT), made in Nepal

Install in seconds. Keep your focus for hours.
```

### Screenshots + promo tiles

| Field | File (in `chrome/`) |
|---|---|
| Screenshot 1 | `screenshots/01_dashboard_light.png` |
| Screenshot 2 | `screenshots/02_dashboard_dark.png` |
| Screenshot 3 | `screenshots/03_focus_mode.png` |
| Screenshot 4 | `screenshots/04_quick_tour_step1.png` |
| Screenshot 5 | `screenshots/05_quick_tour_step2.png` |
| Small promo tile (440×280) | `promo/small_promo_440x280.png` |
| Marquee (1400×560, optional) | `promo/marquee_1400x560.png` |

All screenshots are exactly **1280×800, 24-bit PNG, no alpha** (meets CWS
requirement). Promo tiles are **440×280** and **1400×560**.

---

## Firefox AMO (addons.mozilla.org)

Same **name**, **summary** (short description), and **detailed description** as
above. Category → **Productivity**.

| Field | File (in `firefox/`) |
|---|---|
| Screenshot 1–5 | `screenshots/01…05_*.png` (1280×800, 24-bit PNG) |

- Extension ID (gecko): `{1071d037-0f17-4c92-b06c-704050d2e2c3}` — pinned in
  `public/manifest.json` `browser_specific_settings.gecko.id`, so uploads land
  as version updates to this same listing.
- AMO does not use the Chrome promo tiles; screenshots only.
