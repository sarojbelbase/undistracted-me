/**
 * Changelog — the release history of Undistracted Me.
 *
 * Newest first. Each entry maps a tagged GitHub release to plain-language
 * notes: what changed, why it mattered, and (where a screenshot survives)
 * how it looked at the time. The `origin` entry is the pre-2.0.0 story — the
 * initial build and the decisions that shaped everything after it.
 *
 * Keep this in sync with the GitHub releases page when cutting a new tag.
 */

import v1Hero from "../assets/changelog/v1-hero.png";
import v3Dashboard from "../assets/changelog/v3-dashboard.png";
import v3Focus from "../assets/changelog/v3-focus.png";
import focusMode from "../assets/screenshots/focus_mode.webp";
import canvasMode from "../assets/screenshots/canvas_mode.webp";
import stockNepse from "../assets/screenshots/stock_nepse.webp";

const GH = "https://github.com/sarojbelbase/undistracted-me";

/** The pre-2.0.0 genesis — everything before commit 524695e (v2.0.0). */
export const origin = {
  version: "v1.0.0",
  period: "May 2020 — November 2020",
  title: "The first new tab",
  image: { src: v1Hero, alt: "The original 2020 Undistracted Me new tab with the Nepali calendar.", caption: "The first build, May 2020." },
  paragraphs: [
    "Undistracted Me started as a personal itch. Every browser's default new tab was a grid of shortcuts I never asked for, and none of them showed the date I actually lived by — the Nepali Bikram Sambat calendar. So I built a new tab that opened on today's miti, nothing else.",
    "The first version was deliberately tiny: plain HTML, CSS and a little JavaScript, no framework, no build step. A Nepali date at the centre, some offline fonts so it never looked broken without a connection, and a couple of easing animations so the load felt considered rather than jarring.",
    "That restraint became the project's north star — every later decision (Vue, then React, then the Vite rewrite) was judged against the same question: does this help someone glance at their new tab and get on with their day, or does it pull them in?",
  ],
  milestones: [
    {
      label: "v1.0.0 · May 9, 2020",
      text: "First deployment. A Nepali-date new tab with a bounce-in animation, progressive background loading, offline fonts and the manifest wired up.",
    },
    {
      label: "v1.0.2 · May 10, 2020",
      text: "Font stability pass — offline font availability, a modern-font fallback stack, a 20% performance bump and 30% smaller images.",
    },
    {
      label: "v1.0.3 · May 16, 2020",
      text: "Fixed the miti not rolling over when the day changed, and filled out the README.",
    },
  ],
};

export const changelog = [
  {
    version: "v4.0.2",
    released: "2026-11-15",
    title: "International stocks and a quieter tab title",
    kind: "feature",
    blurb:
      "The Stock widget grew beyond NEPSE to search the whole world's exchanges, and the tab stopped announcing itself.",
    highlights: [
      {
        group: "International stocks",
        items: [
          "Search and add tickers from NYSE, NASDAQ, LSE, HKEX, XETRA and more, served through api.undistracted.me.",
          "A new International tab sits beside the NEPSE list — search by name or ticker with live results, same price, change and 3-month sparkline.",
        ],
      },
      {
        group: "New-tab title",
        items: [
          "The page now reads \"New Tab\" in the browser tab, matching Chrome and Firefox's native page instead of \"Undistracted Me\".",
        ],
      },
      {
        group: "Under the hood",
        items: [
          "Two new Cloudflare Pages Functions proxy Yahoo Finance, with retry-on-rate-limit and 5-minute edge caching.",
        ],
      },
    ],
    image: { src: stockNepse, alt: "The Stock widget showing a NEPSE watchlist.", caption: "Stocks, now with an International tab." },
    diff: `${GH}/compare/v4.0.1...v4.0.2`,
  },
  {
    version: "v4.0.1",
    released: "2026-11-14",
    title: "Store packaging",
    kind: "fix",
    blurb:
      "A plumbing release — no user-facing changes, just the fixes that unblocked the store listings.",
    highlights: [
      {
        group: "Chrome Web Store",
        items: [
          "Corrected the manifest key so the built package derives the same extension ID as the live Chrome item — the previous key blocked the upload with a mismatched-ID error.",
        ],
      },
      {
        group: "Firefox Add-ons",
        items: [
          "Submitted v4.0.1 to AMO (listed). v4.0.0 was already live, so a version bump was required to resubmit.",
        ],
      },
    ],
    diff: `${GH}/compare/v4.0.0...v4.0.1`,
  },
  {
    version: "v4.0.0",
    released: "2026-11-14",
    title: "The ground-up rewrite",
    kind: "rewrite",
    blurb:
      "Sixteen months of work, shipped at once. The extension pairs a cinematic Focus Mode with a fully customisable drag-and-drop Dashboard, rebuilt on a modern stack with a new backend and landing site.",
    highlights: [
      {
        group: "Focus Mode",
        items: [
          "A cinematic full-screen clock with a curated-photos or custom-URL background, a configurable clock face and greeting, and glass-card styling.",
          "Pomodoro timer, ambient rain and white noise, and Google Tasks kept front and centre.",
          "Cross-device background sync.",
        ],
      },
      {
        group: "Dashboard",
        items: [
          "A drag-and-drop, resizeable widget grid with per-breakpoint layouts that persist.",
          "17 widgets: Clock, Date Today, Progress, Countdown, Upcoming Events, Calendar, Pomodoro, Notes, Weather, Bookmark, Quick Access, Media, Stock, Occasions, Dailys, News Feed and Expense Tracker.",
          "Nepali (Bikram Sambat) dates throughout.",
        ],
      },
      {
        group: "Stack & architecture",
        items: [
          "Migrated from webpack + Preact to Vite 8 + React 19, with a Tailwind CSS v4 design system and Zustand state.",
          "Backend moved from Vercel to Cloudflare Pages Functions at api.undistracted.me.",
          "Cross-device sync of settings, widgets, focus-mode background and notes via GitHub Gist.",
          "Landing site rebuilt in Astro with SEO, Nepali typography and live stats.",
        ],
      },
      {
        group: "Security & fixes",
        items: [
          "Removed the shipped client-side API key in favour of a strict Origin allow-list, plus KV-backed rate limiting and RSS SSRF hardening.",
          "Tokens and PII moved to chrome.storage.local — never localStorage.",
          "Fixed relative-time across day boundaries and 403s caused by over-strict Origin gating; removed the Motion (orb) background.",
        ],
      },
    ],
    images: [
      { src: v3Dashboard, alt: "An early build of the dashboard during the rewrite.", caption: "Dashboard, mid-rewrite" },
      { src: v3Focus, alt: "An early build of Focus Mode during the rewrite.", caption: "Focus Mode, mid-rewrite" },
      { src: focusMode, alt: "Focus Mode: a full-screen cinematic clock.", caption: "Focus Mode, shipped" },
      { src: canvasMode, alt: "The dashboard canvas with widgets.", caption: "Dashboard, shipped" },
    ],
    diff: `${GH}/compare/v.2.3.3...v4.0.0`,
  },
  {
    version: "v2.3.3",
    released: "2026-07-01",
    title: "Bikram Sambat calendar fix",
    kind: "fix",
    blurb: "Corrected the month counts for 2083 BS.",
    highlights: [
      { group: "Calendar", items: ["Fixed the number of days in the months of 2083 BS."] },
    ],
    diff: `${GH}/compare/v2.3.2...v.2.3.3`,
  },
  {
    version: "v2.3.2",
    released: "2025-05-15",
    title: "Bikram Sambat calendar fix",
    kind: "fix",
    blurb:
      "Corrected the days-per-month table for the 2082 BS and 2083 BS years.",
    highlights: [
      {
        group: "Calendar",
        items: [
          "Fixed the number of days in each month for 2082 BS and 2083 BS. Marked as a temporary fix — the rewrite landed the proper solution later.",
        ],
      },
    ],
    diff: `${GH}/compare/v2.3.1...v2.3.2`,
  },
  {
    version: "v2.3.1",
    released: "2024-06-15",
    title: "English & Nepali",
    kind: "feature",
    blurb:
      "The extension learned to speak both languages, and picked up a proper Nepali typeface.",
    highlights: [
      {
        group: "Language",
        items: [
          "Added English and Nepali language switching across the whole extension.",
          "Shipped the Akshar Nepali font (weights 500–700), with thanks to anepali.com.",
          "Modularised every format string so both languages render correctly.",
        ],
      },
      {
        group: "Polish",
        items: [
          "Settings now persist via localStorage.",
          "The Nepali miti shows directly in the extension icon.",
          "Made the settings popup glassmorphic and split the components into modules.",
          "Fixed the months array for 2081 BS.",
        ],
      },
    ],
    diff: `${GH}/compare/v2.2.0...v2.3.1`,
  },
  {
    version: "v2.2.0",
    released: "2024-06-09",
    title: "React rewrite",
    kind: "rewrite",
    blurb: "A second framework migration — Vue gave way to React.",
    highlights: [
      {
        group: "Migration",
        items: [
          "Migrated the codebase from Vue to React.",
          "Removed unused styling libraries and utility classes.",
          "Performance improvements, including lighter linear-gradient rendering.",
        ],
      },
    ],
    diff: `${GH}/compare/v2.1.2...v2.2.0`,
  },
  {
    version: "v2.1.2",
    released: "2024-05-13",
    title: "Manifest V3",
    kind: "breaking",
    blurb:
      "Moved the extension onto Chrome's Manifest V3 ahead of the MV2 deprecation.",
    highlights: [
      {
        group: "Migration",
        items: [
          "Upgraded from Chrome Manifest V2 to V3.",
          "Bumped several dependencies and libraries to their latest versions.",
        ],
      },
    ],
    diff: `${GH}/compare/v2.1.0...v2.1.2`,
  },
  {
    version: "v2.1.0",
    released: "2022-10-30",
    title: "Polish",
    kind: "feature",
    blurb: "A refreshed icon and a cleaner release process.",
    highlights: [
      {
        group: "Changes",
        items: [
          "Refreshed the default icon (artwork via freepik.com).",
          "Added a script to bundle the extension as a zip for distribution.",
          "Bumped dependencies to their latest versions.",
        ],
      },
    ],
    diff: `${GH}/compare/2.0.0...v2.1.0`,
  },
  {
    version: "v2.0.0",
    released: "2020-11-12",
    title: "The Vue rewrite",
    kind: "rewrite",
    blurb:
      "The first big migration: from vanilla JavaScript to Vue, and a 30% smaller package.",
    highlights: [
      {
        group: "Migration",
        items: [
          "Migrated the codebase to Vue.js.",
          "Fixed the date not updating after the day rolled over.",
          "Added new loading animations.",
          "Reduced the extension size by 30%.",
        ],
      },
    ],
    diff: `${GH}/compare/v1.0.3...2.0.0`,
  },
];

export const latestVersion = changelog[0].version;
