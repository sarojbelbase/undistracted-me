import { Widget as ClockWidget } from "./clock/Widget";
import { Widget as DateTodayWidget } from "./dateToday/Widget";
import { Widget as ProgressWidget } from "./progress/Widget";
import { Widget as CountdownWidget } from "./countdown/Widget";
import { Widget as EventsWidget } from "./events/Widget";
import { Widget as CalendarWidget } from "./calendar/Widget";
import { Widget as PomodoroWidget } from "./pomodoro/Widget";
import { Widget as NotesWidget } from "./notes/Widget";
import { Widget as WeatherWidget } from "./weather/Widget";
import { Widget as BookmarkWidget } from "./bookmark/Widget";
import { Widget as QuickAccessWidget } from "./quickAccess/Widget";
import { Widget as MediaWidget } from "./media/Widget";
import { Widget as StockWidget } from "./stock/Widget";
import { Widget as OccasionsWidget } from "./occasions/Widget";
import { Widget as DailysWidget } from "./dailys/Widget";
import { Widget as RssWidget } from "./rss/Widget";
import { Widget as ExpenseWidget } from "./expense/Widget";

/**
 * Eager component registry: widget type → React component.
 *
 * Widgets render immediately on the canvas, so they are imported eagerly here
 * (NOT via React.lazy). Lazy-loading 16 widgets that all render at once adds
 * ~16 extra HTTP chunks + staggered Suspense resolution with no code-splitting
 * benefit, which visibly degraded load performance.
 *
 * This file lives OUTSIDE config.js so each widget's config.js can remain
 * metadata-only — breaking the `config.js → Widget.jsx → config.js` import
 * cycle without resorting to lazy loading. WidgetGrid consumes this map
 * instead of `config.Component`.
 */
export const WIDGET_COMPONENTS = {
  clock: ClockWidget,
  dateToday: DateTodayWidget,
  progress: ProgressWidget,
  countdown: CountdownWidget,
  events: EventsWidget,
  calendar: CalendarWidget,
  pomodoro: PomodoroWidget,
  notes: NotesWidget,
  weather: WeatherWidget,
  bookmark: BookmarkWidget,
  quickAccess: QuickAccessWidget,
  media: MediaWidget,
  stock: StockWidget,
  occasions: OccasionsWidget,
  dailys: DailysWidget,
  rss: RssWidget,
  expense: ExpenseWidget,
};
