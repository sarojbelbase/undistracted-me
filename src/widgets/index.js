import clockConfig from "./clock/config";
import dateTodayConfig from "./dateToday/config";
import progressConfig from "./progress/config";
import eventsConfig from "./events/config";
import weatherConfig from "./weather/config";
import calendarConfig from "./calendar/config";
import countdownConfig from "./countdown/config";
import notesConfig from "./notes/config";
import bookmarksConfig from "./bookmark/config";
import quickAccessConfig from "./quickAccess/config";
import pomodoroConfig from "./pomodoro/config";
import mediaConfig from "./media/config";
import stockConfig from "./stock/config";
import occasionsConfig from "./occasions/config";
import dailysConfig from "./dailys/config";
import rssConfig from "./rss/config";
import expenseConfig from "./expense/config";

/**
 * WIDGET_REGISTRY — assembled from each widget's config.js.
 *
 * ✅ To enable/disable a widget: set `enabled` in the widget's config.js.
 * 📐 To change grid position or size: edit `x, y, w, h` in the widget's config.js.
 * 🏷️  To change title, category, icon, description: edit the widget's config.js.
 * ➕ To add a new widget: create its config.js and add it here.
 */
export const WIDGET_REGISTRY = [
  clockConfig,
  dateTodayConfig,
  progressConfig,
  countdownConfig,
  eventsConfig,
  calendarConfig,
  pomodoroConfig,
  notesConfig,
  weatherConfig,
  bookmarksConfig,
  quickAccessConfig,
  mediaConfig,
  stockConfig,
  occasionsConfig,
  dailysConfig,
  rssConfig,
  expenseConfig,
];

export const WIDGET_TYPES = Object.freeze(
  Object.fromEntries(
    WIDGET_REGISTRY.map((c) => [c.type.replace(/([a-z])([A-Z])/g, '$1_$2').toUpperCase(), c.type])
  )
);
