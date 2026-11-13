import canvasMode from "../assets/screenshots/canvas_mode.webp";
import calendarBs from "../assets/screenshots/calendar_bs.webp";
import calendarNextMonth from "../assets/screenshots/calendar_next_month.webp";
import progressDay from "../assets/screenshots/progress_day.webp";
import progressMonth from "../assets/screenshots/progress_month.webp";
import topSites from "../assets/screenshots/top_sites.webp";
import countdown1 from "../assets/screenshots/countdown_1.webp";
import countdownLocal from "../assets/screenshots/countdown_local.webp";
import events from "../assets/screenshots/events.webp";
import stockNepse from "../assets/screenshots/stock_nepse.webp";
import stockStacked from "../assets/screenshots/stock_stacked.webp";
import expenses from "../assets/screenshots/expenses.webp";

import noteWidgetMode from "../assets/screenshots/note_widget_mode.webp";
import clock24h from "../assets/screenshots/clock_24h.webp";
import dateTodayBs from "../assets/screenshots/date_today_bs.webp";
import dateTodayAd from "../assets/screenshots/date_today_ad.webp";
import pomodoro from "../assets/screenshots/pomodoro.webp";
import weatherSimple from "../assets/screenshots/weather_simple.webp";
import weatherExpressive from "../assets/screenshots/weather_expressive.webp";
import mediaYoutube from "../assets/screenshots/media_youtube.webp";
import occasion from "../assets/screenshots/occasion.webp";
import dailyQuote from "../assets/screenshots/daily_quote.webp";
import dailyJoke from "../assets/screenshots/daily_joke.webp";
import dailyFact from "../assets/screenshots/daily_fact.webp";
import rssSpotlightLocal from "../assets/screenshots/rss_spotlight_local.webp";
import rssSpotlightIntl from "../assets/screenshots/rss_spotlight_intl.webp";

/**
 * The masonry cell catalog.
 *
 * `slot` is the single switch that controls placement:
 *   - "lead"    → the full-width canvas hero at the top.
 *   - "visible" → the 7 widgets shown up top (the "top part").
 *   - "hidden"  → everything else, revealed by the "Also inside" fold.
 *
 * `images` is an array so a widget can show more than one screenshot; the
 * front-end renders a dot slider when there is more than one entry.
 *
 * Top-part order (visible): calendar, progress, quick access, countdown,
 * upcoming events, stocks, expenses.
 */
export const widgets = [
  // ── Lead ────────────────────────────────────────────────────────────────
  {
    kind: "lead",
    slot: "lead",
    title: "Every widget, one glance.",
    text: "Clock, notes, events, weather, stocks, news and more. All optional, all rearrangeable — none of them pulling you in.",
    tooltip: "Canvas Mode",
    alt: "The Undistracted Me dashboard canvas: an editable grid of widgets on one calm page.",
    images: [canvasMode],
  },

  // ── Top part (visible) ──────────────────────────────────────────────────
  {
    kind: "shot",
    slot: "visible",
    title: "Expense tracker",
    text: "Track daily expenses with summaries.",
    tooltip: "Expense tracker",
    alt: "The expense-tracker widget.",
    images: [expenses],
  },
  {
    kind: "shot",
    slot: "visible",
    title: "Two calendars, one glance.",
    text: "The Bikram Sambat and Gregorian dates side by side, with Nepal's festivals woven in and a month view that scrolls ahead.",
    tooltip: "Calendar",
    alt: "The calendar widget showing a Bikram Sambat month view.",
    images: [calendarBs, calendarNextMonth],
  },
  {
    kind: "shot",
    slot: "visible",
    title: "Small, glanceable, quiet.",
    text: "Day progress, countdowns, stocks and weather. Each a quick look, never a rabbit hole.",
    tooltip: "Progress",
    alt: "Day progress, a countdown and a stock index card.",
    images: [progressMonth, progressDay],
  },
  {
    kind: "shot",
    slot: "visible",
    title: "Your day's dock.",
    text: "Top sites and bookmarks, one tap from your new tab.",
    tooltip: "Quick access",
    alt: "The top-sites dock: your most-visited sites in one row.",
    images: [topSites],
  },
  {
    kind: "shot",
    slot: "visible",
    title: "Countdown",
    text: "Count down to events or track time since milestones.",
    tooltip: "Countdown",
    alt: "A countdown widget.",
    images: [countdownLocal, countdown1],
  },
  {
    kind: "shot",
    slot: "visible",
    title: "Upcoming events",
    text: "Today's events from your calendar, at a glance.",
    tooltip: "Upcoming events",
    alt: "The upcoming-events widget.",
    images: [events],
  },
  {
    kind: "shot",
    slot: "visible",
    title: "Stocks",
    text: "A live NEPSE watchlist.",
    tooltip: "Stocks",
    alt: "The NEPSE stock watchlist widget.",
    images: [stockNepse, stockStacked],
  },

  // ── "Also inside" (hidden) ──────────────────────────────────────────────
  {
    kind: "shot",
    slot: "hidden",
    title: "A thought, captured.",
    text: "A sticky note on your new tab — quick to jot, quick to dismiss.",
    tooltip: "Notes",
    alt: "The notes widget in its compact mode.",
    images: [noteWidgetMode],
  },
  {
    kind: "shot",
    slot: "hidden",
    title: "World clock",
    text: "Up to two extra timezones alongside your local time.",
    tooltip: "World clock",
    alt: "The clock widget showing 24-hour time.",
    images: [clock24h],
  },
  {
    kind: "shot",
    slot: "hidden",
    title: "Date today",
    text: "English and Nepali dates in one line.",
    tooltip: "Date today",
    alt: "The date-today widget showing Bikram Sambat and Gregorian dates.",
    images: [dateTodayBs, dateTodayAd],
  },
  {
    kind: "shot",
    slot: "hidden",
    title: "Pomodoro",
    text: "Focus timer with breaks and rain sounds built in.",
    tooltip: "Pomodoro",
    alt: "The Pomodoro focus timer widget.",
    images: [pomodoro],
  },
  {
    kind: "shot",
    slot: "hidden",
    title: "Weather",
    text: "Local weather and forecast in one small card.",
    tooltip: "Weather",
    alt: "The weather widget, compact view.",
    images: [weatherSimple, weatherExpressive],
  },
  {
    kind: "shot",
    slot: "hidden",
    title: "Media",
    text: "Spotify and browser media controls.",
    tooltip: "Media",
    alt: "The media widget with YouTube controls.",
    images: [mediaYoutube],
  },
  {
    kind: "shot",
    slot: "hidden",
    title: "Occasions",
    text: "Birthdays, anniversaries and special occasions.",
    tooltip: "Occasions",
    alt: "The occasions widget.",
    images: [occasion],
  },
  {
    kind: "shot",
    slot: "hidden",
    title: "Daily dose",
    text: "A daily quote, joke or fact to start your tab.",
    tooltip: "Daily dose",
    alt: "The daily-quote widget.",
    images: [dailyQuote, dailyJoke, dailyFact],
  },
  {
    kind: "shot",
    slot: "hidden",
    title: "News feed",
    text: "RSS headlines, local and international.",
    tooltip: "News feed",
    alt: "The RSS news spotlight widget.",
    images: [rssSpotlightLocal, rssSpotlightIntl],
  },
];

export const visibleWidgets = widgets.filter((w) => w.slot === "visible");
export const hiddenWidgets = widgets.filter((w) => w.slot === "hidden");
export const leadWidget = widgets.find((w) => w.slot === "lead");
