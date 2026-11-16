# Store Listing — Undistracted Me

Copy-paste reference for the Chrome Web Store and Firefox AMO dashboards.
The package is uploaded via CLI (`bun run publish:chrome` / `publish:firefox`);
**these text fields are entered manually in each store's developer dashboard** —
the store APIs do not set name / description / category / screenshots.

---

## Chrome Web Store (developer dashboard)

| Field | Value |
|---|---|
| Name | `Undistracted Me: Focus New Tab with Pomodoro & Widgets` |
| Category | **Productivity** |
| Developer website | `https://undistracted.me` |
| Privacy policy URL | `https://undistracted.me/pp-and-tos` |
| Short description | `Free, open-source new tab with Focus Mode, Pomodoro, ambient sounds, Google Tasks & quiet widgets. No account, no tracking.` (123 chars) |

### Detailed description

```
Undistracted Me replaces your new tab with a calm, distraction-free dashboard — so the first thing you see is quiet, not noise. Open a new tab to start a Pomodoro timer, play ambient sounds, or drop into Focus Mode, a full-screen cinematic clock built for deep work — and your Google Tasks are right there so you never lose your place.

✦ What's inside
• Focus Mode — a full-screen cinematic clock with optional rain and ambient sounds
• Pomodoro timer — focus and break sessions that keep you in a rhythm
• Google Tasks — see and check off your to-dos without leaving the new tab
• Quiet widgets — notes, weather, calendar, world clock, media controls, RSS news, daily quote, and more, all optional and drag-and-drop
• Themes — light, dark, and auto modes with accent colors
• Quick access — your top sites and bookmarks, one click away

✦ Private by design
• No account required — nothing to sign up for
• No analytics, no ads, no tracking
• Google and Spotify tokens are stored only on your device
• Minimal permissions — each is used only for a feature you turn on
• Free and open source (MIT)

✦ For Nepali users
• Bikram Sambat (Nepali) calendar with festivals and tithis alongside the Gregorian date
• NEPSE stock watchlist

Undistracted Me → https://undistracted.me
Web app → https://app.undistracted.me
Source code → https://github.com/sarojbelbase/undistracted-me
Feedback → https://forms.gle/7vf4VGrB9Loz8hB76
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

Category → **Productivity**.

### Summary (short description)

```
Free, open-source new tab with Focus Mode, Pomodoro, ambient sounds, Google Tasks & quiet widgets. No account, no tracking.
```

### Description

```
Undistracted Me replaces your new tab with a calm, distraction-free dashboard — the first thing you see is quiet, not noise. Open a new tab to start a Pomodoro timer, play ambient sounds, or drop into Focus Mode, a full-screen cinematic clock built for deep work — and your Google Tasks are right there.

✦ What's inside
• Focus Mode — a full-screen cinematic clock with optional ambient sounds
• Pomodoro timer — focus and break sessions that keep you in a rhythm
• Google Tasks — check off to-dos without leaving the new tab
• Quiet widgets — notes, weather, calendar, world clock, media controls, and more, all optional and drag-and-drop
• Themes — light, dark, and auto modes with accent colors
• Quick access — top sites and bookmarks

✦ Private by design
• No account, no analytics, no ads, no tracking
• Google and Spotify tokens stay on your device
• Minimal permissions, used only for the features you enable
• Free and open source (MIT)

✦ For Nepali users
• Bikram Sambat (Nepali) calendar with festivals and tithis
• NEPSE stock watchlist

Undistracted Me → https://undistracted.me
Web app → https://app.undistracted.me
Source code → https://github.com/sarojbelbase/undistracted-me
Feedback → https://forms.gle/7vf4VGrB9Loz8hB76
```

### Screenshots

| Field | File (in `firefox/`) |
|---|---|
| Screenshot 1–5 | `screenshots/01…05_*.png` (1280×800, 24-bit PNG) |

- Extension ID (gecko): `{1071d037-0f17-4c92-b06c-704050d2e2c3}` — pinned in
  `public/manifest.json` `browser_specific_settings.gecko.id`, so uploads land
  as version updates to this same listing.
- AMO does not use the Chrome promo tiles; screenshots only.

---

## Screenshot captions

Five themed captions (max 8 words each) for the store screenshot slots.

| Theme | Caption |
|---|---|
| Focus Mode | Full-screen cinematic clock for deep focus |
| Pomodoro + sounds | Pomodoro timer with rain and ambient sounds |
| Widgets | Quiet, drag-and-drop widgets for a calm dashboard |
| Themes | Light, dark, and auto themes with accent colors |
| Privacy | No account, no tracking, your data stays local |
