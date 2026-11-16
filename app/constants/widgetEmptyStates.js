/**
 * Friendly empty-state / getting-started copy for every widget.
 *
 * Used by the first-run widget picker and available to individual widget
 * empty states. Keyed by widget `type` (see `app/widgets/index.js`).
 */
export const WIDGET_EMPTY_STATES = Object.freeze({
  clock: "Shows the current time and any extra time zones you add.",
  dateToday: "Shows today's date in English and Nepali calendars.",
  progress: "A live progress bar for how far you are through the day.",
  countdown: "Add a countdown and watch the days tick down to your next milestone.",
  events: "Connect a calendar or add events to see what's coming up today.",
  calendar: "A clean monthly calendar, always at a glance.",
  pomodoro: "Start a focus timer and build a streak of deep-work sessions.",
  notes: "Jot down a quick thought — it saves as you type.",
  weather: "Set your location to see the local forecast and air quality.",
  bookmark: "Add your favourite links for one-click access.",
  quickAccess: "Your top-visited sites, right on the new tab.",
  media: "Connect Spotify to control what's playing without leaving the tab.",
  stock: "Add NEPSE or global tickers to watch your portfolio.",
  occasions: "Add birthdays and anniversaries so you never miss one.",
  dailys: "A daily quote or fact to start your day.",
  rss: "Pick your favourite feeds and read headlines at a glance.",
  expense: "Log your daily spending and see weekly summaries.",
});
