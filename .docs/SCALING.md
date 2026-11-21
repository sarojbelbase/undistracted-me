# Undistracted Me: Growth & Scaling Implementation Map

Source: `Undistracted Me Growth & Scaling Plan.md` (Nov 18, 2026).
This document maps every item in that plan onto the **actual current state of this
repo**, separates "already done" from "still to do" and records how each
remaining item will be implemented. It is the working plan for the growth push.

---

## 0. Headline finding

The codebase is **ahead of the growth plan** on the product side. Site blocking
(declarativeNetRequest) and the web clipper (currently called **Pocket**) are
already built, tested and registered. The biggest gap is **not the product -
it is that these two features are invisible everywhere that matters**:

- The store listings (`publish/LISTING.md`) and the manifest `description`
  still pitch "Focus Mode, Pomodoro, ambient sounds, Google Tasks & quiet
  widgets": **no mention of site blocking or the clipper**.
- The landing site (`landing/`) headline, meta title/description and feature
  grid do **not** mention site blocking or the clipper.
- There is no `vs BlockSite` or `vs StayFocusd` page (only Momentum, Tabliss,
  Bonjourr).

This is plan §3.1 ("Make Site Blocking and the clipper headline features on both
sites") and it is the highest-leverage, lowest-risk work: **fix copy + screenshots
before spending a single rupee on a launch.**

---

## 1. What already exists (evidence, no work needed)

| Plan item | Where it lives |
|---|---|
| Site blocking on `declarativeNetRequest` (no `<all_urls>`) | `app/utilities/siteBlocker.js`, `app/bg.js` (dynamic rules, ids 1000+), `app/blocked/BlockedPage.jsx` (orb interstitial + countdown), Settings → General → "Blocked Sites", popup `app/components/Popup/BlockedSitesSection.jsx`, `declarativeNetRequest` in `public/manifest.json` |
| Web clipper (context-menu "Save to Pocket", classify, dedupe, folders, toast/undo) | `app/widgets/pocket/*` (`config.js`, `Widget.jsx`, `pocketStore.js`, `contextMenu.js`, `save.js`, `utils.js`, `selectors.js`), SW wiring in `app/bg.js`, tests `tests/unit/pocket/*` |
| First-run welcome overlay (Quick Tour) | `app/components/QuickTour/index.jsx`: **informational only** (2 steps), no setup actions yet |
| Review prompt (post-habit nudge) | `app/components/ReviewPrompt/*`: fires after 10 focus sessions, local only, permanently dismissible |
| Command palette (Ctrl/Cmd+K) | `app/components/CommandPalette/*`: 6 commands today (settings, add-widget, arrange, focus-mode, theme, replay-tour) |
| Cross-device sync (Google Drive `appDataFolder`) | `app/utilities/syncEngine*.js`, `syncTransport.js`, `syncEngineFacade.js` |
| Break nudges (20-20-20) | `app/components/LookAway/*` (chrome.alarm scheduled overlay) |
| Ambient mixer | `app/utilities` rain stream + `RainNoiseIcon` in Focus Mode TopZone |
| Nepali calendar / BS–AD / holidays / tithi | `app/data/bikramSambatCalendar.js`, `app/utilities/nepaliDate.js`, `app/hooks/useHolidays.js`, `public/holidays.json`, `dateToday` en/ne toggle |
| NEPSE stocks | `app/widgets/stock/*` (merolagani + nepalipaisa) |
| RSS with Nepali news pack | `app/widgets/rss/*`: sample OPML includes BBC Nepali etc. |
| Compare pages (Momentum, Tabliss, Bonjourr) | `landing/src/pages/{momentum,tabliss,bonjourr}-alternative.astro`, `landing/src/data/alternatives.js` |

**Net:** the plan's "fix first" §3.3 (blocker on DNR, minimal permissions) is
largely done. The remaining fix-first items are **visibility** (§3.1), the
**Pocket rename** (§3.2), and the **first-run setup flow** (§3.5).

---

## 2. Gap analysis (plan → status → action)

Legend: ✅ done · 🟡 partially done · ⬜ not done · 🧭 needs a product decision first

| # | Plan item | Status | Action |
|---|---|---|---|
| 3.1 | Blocking + clipper headline on both sites | ⬜ | Update manifest `description`, `publish/LISTING.md` (CWS + AMO + captions + screenshots), `landing/src/data/site.js` title/description, `Hero.astro`, `Features.astro`. Add new screenshots (blocked page, Pocket widget). |
| 3.2 | Rename "Pocket" (trademark) | 🧭 | See decisions below. Mechanical once a name is chosen: `config.js` title, context-menu title "Save to Pocket", all user-facing copy; internal storage keys + context-menu id can stay. |
| 3.3 | Blocker on DNR + optional permissions | 🟡 | DNR blocking is done. Residual: `tabs` is a **required** permission (used by media relay, popup, bookmarks) and triggers the "read your browsing history" warning. Move `tabs` → `optional_permissions` + request on first media-relay use. |
| 3.4 | Publish Edge/Opera, FF "Recommended", Chrome "Featured" | ⬜ | Non-code (store dashboards) + a small Edge/Opera build script mirroring `patch-manifest-firefox.mjs`. |
| 3.5 | First-run flow (pack, location, block preset, add task) | 🟡 | Extend `QuickTour` with an actionable onboarding: pack picker → location → one-click social-block preset → "add one task". See §4.1. |
| 4 | Widget roadmap (intention, dodged counter, stash, dual clock, forex, templates…) | ⬜/🟡 | See §4. Dual clock exists (clock widget timezones). BS–AD exists. Missing: intention, dodged counter/recap, stash, forex, countdown templates. |
| 5 | Nepal playbook (Nepali UI, /np page, diaspora) | ⬜/🟡 | Nepali date/calendar exists. Missing: full Nepali UI language, `/np` page + Nepali guides + BS–AD converter page. See §4.7. |
| 6 | International playbook (Reddit, HN, PH) | ⬜ | Marketing. No code. Calendar already set in the plan (§7). |
| 9 | Money / Plus (sync, backup, packs, strict-mode) | 🟡 | Sync + backup/restore already free. Missing: strict-mode blocking (schedules + password), weekly recap, theme/widget packs, payment rails. See §4.8. |
| 10 | Retention (dodged counter, Sunday recap, review at day 7) | 🟡 | Review prompt exists (10 sessions). Missing: dodged counter + Sunday recap. See §4.3. |
| 11 | Metrics without analytics | ✅ | By design; store dashboards + GitHub stars only. No change. |

---

## 3. Priorities (what to build first, and why)

Ranked by **leverage ÷ risk**. Each is scoped to ship independently (the plan's
"ship 2–3 at a time, each batch is its own launch angle").

### P0: Copy & visibility (hours, not days)
The plan's explicit "before any launch". No behavior change, no risk.

1. **Store listing**: rewrite `publish/LISTING.md` (name, short desc, detailed
   desc, captions) to lead with "block distracting sites" + "clip and save
   anything", add a "vs BlockSite / vs StayFocusd" angle, add a blocked-page
   screenshot + Pocket screenshot.
2. **Manifest description** (`public/manifest.json`): same new pitch.
3. **Landing**: `site.js` title/description, `Hero.astro`, `Features.astro`
   (add a "Block" card and a "Clip/Save" card), plus two new compare pages.

> **Status: done (Nov 18).** Manifest description, `publish/LISTING.md`
> (short + detailed, CWS + AMO, captions), `site.js` title/description,
> `Hero.astro` lead, `Features.astro` heading, `Privacy.astro` blocklist bullet,
> `faq.js` (2 new Q&As), `schema.js` keywords/featureList, `Footer.astro` +
> `llms.js` compare links, and two new pages (`blocksite-alternative`,
> `stayfocusd-alternative`) + `sitemap.xml.ts` are all updated.
> **Screenshots captured:** `01_site_blocking.png` + `02_web_clipper.png`
> (1280×800, 24-bit RGB) generated by `tests/playwright/specs/store-screenshots.spec.js`
> and placed in `publish/chrome/screenshots/` + `publish/firefox/screenshots/`,
> leading the 5-slot set (site blocking → web clipper → focus mode → dashboard
> light → dashboard dark).
> The CWS/AMO **name** was intentionally left unchanged for brand stability and
> to avoid a store re-review: revisit if the blocker angle should lead the name too.

### P1: First-run setup flow (the activation lever)
See §4.1. This is the single biggest product win: turning an install into a
configured, habit-forming first tab.

### P2: Retention loop
"Distractions dodged" counter + Sunday recap + daily "one thing" intention
(§4.2–4.4). These close the plan's stated loop: *daily intention → focus session
→ blocked-attempt counter → Sunday recap*.

### P3: Nepal & diaspora widgets
NPR forex/remittance, countdown templates, Nepali UI language (§4.5–4.7).

### P4: Plus tier (monetization)
Strict-mode blocking (schedules + password), weekly recap as a Plus add-on,
theme/widget packs, payment rails (§4.8).

---

## 4. How each remaining item will be implemented

### 4.1 First-run setup flow (§3.5)
**Extend `app/components/QuickTour/index.jsx`** (or add a sibling
`Onboarding.jsx` that QuickTour hands off to) with actionable steps after the
current welcome. New sequence:

1. **Welcome** (existing) → 2. **Features** (existing) → 3. **Pick a pack** →
   4. **Set location** → 5. **Block socials** → 6. **Add one task**.

Implementation details:

- **Pack picker**: new module `app/utilities/packs.js` exporting:
  ```js
  PACKS = {
    minimal:  { widgets: [clock, dateToday, progress],            accent: 'Blueberry' },
    student:  { widgets: [clock, calendar, pomodoro, countdown, events, rss], ... },
    developer:{ widgets: [clock, quickAccess, notes, pomodoro, rss, stock], ... },
    nepal:    { widgets: [clock, dateToday, calendar, stock, weather, rss], ... },
  }
  ```
  Selecting a pack seeds `useWidgetInstancesStore` the same way
  `app/store/seedWidgetInstances.js` already does,
  and sets the countdown templates / RSS OPML for the Developer + Nepal packs
  (reusing the existing Nepali sample OPML in `rss/opmlParser.js`).
- **Location**: call `useLocationStore.getState().refresh()` (or, if the user
  skips, leave the existing browser→IP→Kathmandu fallback untouched).
- **Social block preset**: one button per platform (Facebook, Instagram, X,
  TikTok, YouTube). Writing to `siteBlocker` (`blockSite()` →
  `blocked_sites` + DNR rules) gives the user a working block the instant the
  tour ends. This is also the "aha" moment the plan calls out (§10).
- **Add one task**: a single input that writes a Google Task via
  `app/utilities/googleTasks.js` if connected, else falls back to the events
  widget or notes (a local "today" entry). No new storage shape needed.

Gating: mark a `quickTourSeenVersion` variant (or a separate `onboardingSeen`
flag) so existing users don't get re-prompted, matching the current
`markQuickTourSeen` pattern.

### 4.2 "Distractions dodged" counter (§4, §10)
- **Source of truth**: count block triggers. DNR itself doesn't emit per-request
  events, but the blocked interstitial (`blocked/BlockedPage.jsx`) is shown for
  every blocked attempt. Increment a local counter when it mounts
  (`localStorage['um_blocked_count']`, per-day + total, local only).
- **Widget**: a small `recap`/`streak` widget showing "N distractions dodged
  this week" with zero badges/feeds (passes the glance test). Reuses the
  Pomodoro CSS-bar pattern already in the repo.

### 4.3 Sunday recap card (§4, §10)
- A `recap` widget (or a Sunday-only card) that summarises the week from data we
  already have: Pomodoro sessions (`pomodoro_history`), blocked attempts (new
  counter above), tasks completed. Local only, shown Sunday, dismissible.
- Reuses `getStreak`, `getWeeklyStats` from `app/widgets/pomodoro/utils.js`.

### 4.4 Daily "one thing" intention (§4)
- A lightweight widget (or Focus Mode panel) storing one daily intention:
  `localStorage['um_intention']` = `{ date: 'YYYY-MM-DD', text }`, cleared each
  day. Shown in Focus Mode (BottomZone or LeftZone card) and as an optional
  dashboard widget. Ties the loop to the existing tasks system.

### 4.5 NPR forex / remittance widget (§4)
- **Needs a data-source decision** (see decisions below). Options: a free
  no-key FX API (open.er-api.com, frankfurter.app) or Nepal Rastra Bank published
  rates. Respects the no-key/no-analytics rule either way; host behind
  `api.undistracted.me` like other external data (merolagani/nepalipaisa are
  already proxied via `vite.config.ts`).
- Widget surface: NPR ↔ (USD, AUD, JPY, GBP, EUR, INR, QAR, SAR, MYR): the
  diaspora + remittance currencies from the plan.

### 4.6 Countdown templates (§4)
- Add preset templates to `app/widgets/countdown/*` (IELTS/PTE, SEE, IOE/engineering
  entrance). A one-click "Add from template" in the countdown Settings/CreateModal.
  Static future dates, no new data source.

### 4.7 Nepal & diaspora: Nepali UI + /np page (§5)
- **Nepali UI language**: a lightweight i18n layer, not a full translation
  engine. The `language` field already exists in `useSettingsStore`; add a
  `app/i18n.js` with an `en`/`ne` dictionary for the highest-visibility strings
  (Quick Tour, settings headers, widget titles, common labels) and a
  `t(key)` helper. Scope incrementally; the Nepali date/calendar is already
  fully localised, so the trust signal can ship without translating every widget.
- **`/np` page + guides**: new Astro pages: a `/np` landing (Nepali-language,
  made-in-Nepal angle) and a BS–AD converter page (SEO capture for "BS to AD" /
  "AD to BS" queries). Reuse the `alternatives.js` / `BaseLayout.astro` pattern.
  Keep "Nepali calendar" out of the main site's visible copy per the plan.

### 4.8 Plus tier / money (§9)
- **Strict-mode blocking**: scheduled block windows (block during 9–5) + an
  optional password gate on the blocked interstitial. DNR already supports the
  rule side; add schedule + password enforcement in `siteBlocker`/`bg.js`.
- **Weekly recap** (a richer version of §4.3) and **theme/widget packs** as the
  "things that cost money" the plan describes.
- **Payments**: Merchant-of-record (Paddle/Lemon Squeezy/Polar) for global;
  eSewa/Khalti/ConnectIPS for Nepal. **This is a separate, account-level decision
  and needs an accountant/legal check per the plan: not a code-first task.**

### 4.9 Command palette → jump to saves (§4)
- Extend `app/components/CommandPalette/commands.jsx` with dynamic commands that
  search Pocket saves, notes and events and jump/focus them. Low effort, high
  daily-use value.

### 4.10 Minimal-permission hardening (§3.3)
- Move `tabs` to `optional_permissions` and request it lazily when the media
  relay / "reload tab" features first need it. This directly serves the
  "installs never ask to read all sites" promise. Medium effort (touches
  `bg.js`, media relay, popup, bookmarks); worth doing before any store
  relaunch because it changes the permission warning shown at install.

---

## 5. Recommended sequencing (aligned to the plan's 90 days)

| When | Work | Type |
|---|---|---|
| Now (Nov 18–20) | P0 copy: store listing + manifest + landing + 2 compare pages + screenshots | Copy/SEO |
| Nov 20–Dec 7 | P1 first-run setup flow + P2 retention loop (dodged counter + Sunday recap + intention) | Code |
| Dec 8–Jan 11 | P3 Nepal/diaspora widgets (forex, templates, Nepali UI, `/np`) + compare pages live + Show HN prep | Code + marketing |
| Jan 12 | Product Hunt launch | Marketing |
| Feb | P4 Plus beta (strict-mode, recap, packs, payments) | Code + payments |

This mirrors plan §12 exactly.

---

## 6. Decisions needed before building (blocking)

1. **Pocket rename**: confirm the new name (e.g. "Stash", "Saves", "Keeps",
   "Clip", "Glom"). Everything else is mechanical.
2. **Forex data source**: confirm the NPR rate source (NRB vs a no-key FX API)
   and whether to proxy it through `api.undistracted.me`.
3. **First-run flow scope**: confirm the six-step onboarding (pack → location →
   social-block preset → task) is wanted as a replacement for the current
   informational two-step tour, or as an added step after it.
4. **Plus scope**: confirm strict-mode blocking (schedules + password) + weekly
   recap + packs are the right Plus feature set, and that payments are deferred
   until after an accountant/legal check.

---

## 7. Non-code items (owner: Saroj, not this repo)

- Edge Add-ons + Opera listings, Firefox "Recommended", Chrome "Featured" badge.
- AlternativeTo check (Nov 16), Reddit/Show HN/Product Hunt posts (calendar in
  plan §7), Nepal Facebook/LinkedIn push.
- Trademark check on the clipper name.
- Payments: merchant-of-record + Nepal rails + accountant check.
