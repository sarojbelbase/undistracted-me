import { useState, useEffect, useRef, useMemo, useLayoutEffect } from "react";
import { HourglassSplit, ListUl } from "react-bootstrap-icons";
import { EmptyState } from "../../components/ui/EmptyState";
import { EMPTY_STATES } from "../../constants/emptyStates";
import { BaseWidget } from "../BaseWidget";
import { useEvents, useGoogleCalendar } from "../../hooks/useEvents";
import { todayStr } from "../../utilities";
import {
  getNextOccurrence,
  formatCountdown,
  formatSince,
  formatCountdownPhrase,
  humanizeDuration,
  formatTargetDate,
  loadCustom,
  wasNotified,
  markNotified,
  sendNotification,
  resolveTarget,
} from "./utils";
import { useCountdownPin } from "./useCountdownPin";
import { fmt12 } from "../events/utils";
import { onClockTick } from "../../utilities/sharedClock";
import { CountdownExpandedView } from "./ExpandedView";
import { IconButton } from "../../components/ui/IconButton";

// ─── Auto-advance helper ─────────────────────────────────────────────────────

function resolveActiveTarget(
  target,
  totalSeconds,
  upcomingEvents,
  today,
  custom,
) {
  if (!target || totalSeconds >= 60) return target;
  if (target.mode === "since") return target; // since mode never auto-advances
  const now = new Date();
  const nextEv = upcomingEvents.find(
    (e) =>
      e.id !== target.id &&
      new Date(`${e.startDate || today}T${e.startTime || "00:00"}`) > now,
  );
  if (nextEv)
    return {
      title: nextEv.title,
      nextDate: new Date(
        `${nextEv.startDate}T${nextEv.startTime || "00:00"}`,
      ),
      startTime: nextEv.startTime,
      endTime: nextEv.endTime,
      isEvent: true,
      isGcal: nextEv._source === "gcal",
      id: nextEv.id,
      mode: "countdown",
    };
  const sorted = custom
    .map((cd) => ({ ...cd, _next: getNextOccurrence(cd) }))
    .filter(
      (cd) =>
        cd._next > now && cd.id !== target.id && cd.mode !== "since",
    )
    .sort((a, b) => a._next - b._next);
  if (sorted[0])
    return {
      title: sorted[0].title,
      nextDate: sorted[0]._next,
      startTime: sorted[0].targetTime,
      isEvent: false,
      isGcal: false,
      id: sorted[0].id,
      repeat: sorted[0].repeat,
      mode: "countdown",
    };
  // No next event/countdown to roll over to: keep showing the current target
  // through its final minute rather than flipping to the empty state.
  return target;
}

// ─── Main Widget ─────────────────────────────────────────────────────────────

function getNotifySeconds(target, nowTs) {
  if (!target) return {};
  if (target.mode === "since") return { totalSeconds: 1 };
  return formatCountdown(target.nextDate, nowTs);
}

function getDiffValues(activeTarget, nowTs) {
  if (!activeTarget) return {};
  if (activeTarget.mode === "since") return formatSince(activeTarget.nextDate, nowTs);
  return formatCountdown(activeTarget.nextDate, nowTs);
}

export const Widget = ({ id, onRemove }) => {
  const [custom, setCustom] = useState(loadCustom);
  const { pinned, setPin } = useCountdownPin(id);
  const [now, setNow] = useState(() => Date.now());
  const [expanded, setExpanded] = useState(false);

  const [localEvents] = useEvents();
  const { gcalEvents } = useGoogleCalendar();
  const today = todayStr();

  // The widget re-renders every second (live countdown). Memoize the event-list
  // derivations so a 1s tick doesn't re-spread / re-parse / re-sort every event.
  const allEvents = useMemo(
    () => [...localEvents, ...(gcalEvents || [])],
    [localEvents, gcalEvents],
  );

  const upcomingEvents = useMemo(
    () =>
      allEvents
        .filter((e) => {
          const dt = new Date(`${e.startDate || today}T${e.startTime || "00:00"}`);
          return dt >= new Date(Date.now() - 2 * 60 * 1000);
        })
        .sort((a, b) => {
          const aKey = `${a.startDate || today}T${a.startTime || "99:99"}`;
          const bKey = `${b.startDate || today}T${b.startTime || "99:99"}`;
          return aKey.localeCompare(bKey);
        }),
    [allEvents, today],
  );

  // Clear the post-completion pin-clear timer on unmount so a pending
  // setTimeout can't fire setPin(null) after the widget is gone.
  const pinClearRef = useRef(null);
  useEffect(() => () => clearTimeout(pinClearRef.current), []);

  // Re-read countdowns when the unified dialog adds/edits one (it writes to
  // localStorage directly and broadcasts this event).
  useEffect(() => {
    const handler = () => setCustom(loadCustom());
    globalThis.addEventListener("countdown_events_changed", handler);
    return () => globalThis.removeEventListener("countdown_events_changed", handler);
  }, []);

  // ── Resolve target ──────────────────────────────────────────────────────────
  const { target, shouldClearPin } = useMemo(
    () => resolveTarget(pinned, allEvents, upcomingEvents, today, custom),
    [pinned, allEvents, upcomingEvents, today, custom],
  );

  // Gate the 1s tick to the granularity the phrase actually needs: the humanized
  // countdown ("in 3 years" / "in 5 min") only changes at minute boundaries, so
  // a per-second setNow would re-render 86,400×/day for a once-a-minute change.
  // Second-granularity only in the final 60s (where "in <1 min" flips to "now").
  const lastTickRef = useRef(0);
  useEffect(() => {
    return onClockTick(() => {
      const t = Date.now();
      const deadline = target?.nextDate?.getTime();
      const finalMinute =
        target && target.mode !== "since" && deadline != null &&
        deadline - t >= 0 && deadline - t < 60_000;
      const bucket = finalMinute ? t : Math.floor(t / 60_000);
      if (bucket === lastTickRef.current) return;
      lastTickRef.current = bucket;
      setNow(t);
    });
  }, [target?.nextDate, target?.mode]);

  useEffect(() => {
    if (!shouldClearPin) return;
    const tid = setTimeout(() => setPin(null), 0);
    return () => clearTimeout(tid);
  }, [shouldClearPin]);

  // ── Notifications ──────────────────────────────────────────────────────────
  const notifSeconds = getNotifySeconds(target, now);
  const { totalSeconds = 0 } = notifSeconds;
  const notifKey = target ? `${target.id ?? target.title}` : null;

  useEffect(() => {
    if (!notifKey || totalSeconds > 0 || target?.mode === "since") return;
    if (wasNotified(notifKey)) return;
    markNotified(notifKey);
    if (target.isEvent) {
      sendNotification(
        target.title,
        target.isGcal
          ? "Google Calendar event is starting"
          : "Event is starting",
      );
    } else {
      // Title in the title slot; "Countdown complete" is the body. Previously
      // these were swapped, so the notification read 'Your countdown for
      // "Countdown complete" just ended.'
      sendNotification(target.title, "Countdown complete");
    }

    if (pinned?.type === "custom") {
      const cd = custom.find((c) => c.id === pinned.id);
      if (cd?.repeat === "none") pinClearRef.current = setTimeout(() => setPin(null), 10_000);
    }
    if (pinned?.type === "event") {
      pinClearRef.current = setTimeout(() => setPin(null), 10_000);
    }
    // Clear the pending auto-clear if the effect re-runs (e.g. the user re-pins
    // within the 10s window) so a stale timer can't wipe a fresh pin.
    return () => clearTimeout(pinClearRef.current);
  }, [notifKey, totalSeconds, target, pinned, custom]);

  // ── Compute display values ──────────────────────────────────────────────────
  const activeTarget = resolveActiveTarget(
    target,
    totalSeconds,
    upcomingEvents,
    today,
    custom,
  );
  const isSince = activeTarget?.mode === "since";

  const diffValues = getDiffValues(activeTarget, now);
  const {
    days: aDays = 0,
    hours: aHours = 0,
    minutes: aMins = 0,
    totalSeconds: aTotalSecs = 0,
  } = diffValues;

  // ── Split text: title label + hero time phrase ─────────────────────────────
  const titlePart = activeTarget?.title || '';
  const timePart = useMemo(() => {
    if (!activeTarget) return '';
    if (isSince) return humanizeDuration(aDays, aHours, aMins, 'past');
    return formatCountdownPhrase(aDays, aHours, aMins, aTotalSecs);
  }, [isSince, aDays, aHours, aMins, aTotalSecs, activeTarget]);

  // Ghost numeral: the leading number of the phrase ("4" in "in 4 years").
  // Rendered as a faint oversized backdrop digit; hidden for non-numeric
  // phrases ("next week", "tomorrow", "now", "yesterday", "just now").
  const ghostNum = useMemo(() => {
    const m = timePart.match(/\d+/);
    return m ? m[0] : '';
  }, [timePart]);

  // Only the hero phrase needs measuring: the title label is a fixed size.
  const measureText = timePart;

  // ── Minimal metadata: time + smart day label (no recurrence on face) ──────
  const metaTime = useMemo(() => {
    if (!activeTarget?.startTime) return '';
    return fmt12(activeTarget.startTime);
  }, [activeTarget?.startTime]);

  const dayLabel = useMemo(() => {
    if (!activeTarget?.nextDate) return '';
    const d = activeTarget.nextDate;
    // Derive "today" from the ticking `now` state (not a render-time `new Date()`)
    // so the Today/Tomorrow/Yesterday label flips at midnight while mounted.
    const nowDate = new Date(now);
    const today = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
    const targetDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.round((targetDay - today) / 86400000);

    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';

    if (d.getFullYear() === nowDate.getFullYear()) {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    return formatTargetDate(d);
  }, [activeTarget?.nextDate, now]);

  const showMeta = metaTime || dayLabel;

  // ── Font sizing: DOM binary search ─────────────────────────────────────────
  const measureRef = useRef(null);
  const contentRef = useRef(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [computedFontSize, setComputedFontSize] = useState(17);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setDims({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Binary search: find largest hero font size that fits the reserved height.
  // The title label (up to 2 lines) + meta row occupy a fixed band, so the
  // hero phrase is sized against the remaining vertical space.
  //
  // `measureText` (the hero phrase) re-computes every second because the widget
  // ticks, but its *string value* only changes at phrase boundaries ("in 3
  // years" stays identical for a whole year). Skip the 20-iteration
  // getBoundingClientRect loop when neither the text nor the container size
  // changed since the last measure.
  const lastMeasureKeyRef = useRef('');
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el || !measureText || dims.w <= 0 || dims.h <= 0) return;

    const key = `${measureText}|${dims.w}x${dims.h}`;
    if (lastMeasureKeyRef.current === key) return;
    lastMeasureKeyRef.current = key;

    const RESERVED = 46; // 2-line title (~30px) + meta row (~14px) + gaps
    const availH = Math.max(16, dims.h - RESERVED);

    // Match the rendered hero font settings (.cdn-time-hero)
    el.style.fontFamily = "'Google Sans', sans-serif";
    el.style.fontWeight = '800';
    el.style.letterSpacing = '-0.02em';
    el.style.lineHeight = '1.05';

    const descentFactor = 0.08;

    let lo = 10, hi = Math.min(availH, dims.w * 0.45);
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      el.style.fontSize = mid + 'px';
      const h = el.getBoundingClientRect().height;
      if (h + Math.ceil(mid * descentFactor) <= availH) lo = mid;
      else hi = mid;
    }

    let fs = Math.floor(lo);
    el.style.fontSize = fs + 'px';
    // Width safety: shrink if the phrase overflows the container
    while (fs > 10 && el.scrollWidth > Math.ceil(dims.w)) {
      fs -= 1;
      el.style.fontSize = fs + 'px';
    }
    // Cap so the hero stays proportionate beside the oversized ghost numeral
    setComputedFontSize(Math.min(fs, 26));
  }, [measureText, dims]);

  // Ghost numeral size: scales with the widget height so it "peeks" from the
  // top-right corner regardless of card size (dims.h = content-wrap height).
  // Oversized + intentionally clipped at the card edge for a decorative bleed.
  const ghostSize = dims.h > 0
    ? Math.max(182, Math.min(360, Math.round(dims.h * 1.2)))
    : 182;

  return (
    <>
      <BaseWidget
        className="p-4"
        onRemove={onRemove}
      >
        <div className="flex items-center gap-2 shrink-0">
          {activeTarget && (
            <span className="cdn-mode-label">{isSince ? 'Since' : 'Countdown'}</span>
          )}
          <IconButton
            label="All countdowns"
            size="sm"
            className="ml-auto"
            onClick={() => setExpanded(true)}
          >
            <ListUl size={14} />
          </IconButton>
        </div>
        {activeTarget ? (
        <div className="cdn-widget-face">
          {ghostNum && (
            <span
              className="cdn-ghost-num"
              aria-hidden="true"
              style={{ fontSize: ghostSize }}
            >
              {ghostNum}
            </span>
          )}
          <div ref={contentRef} className="cdn-content-wrap">
            {/* ── Hidden measurement node ── */}
            <div
              ref={measureRef}
              aria-hidden="true"
              style={{
                position: 'fixed', top: -9999, left: -9999,
                width: dims.w, lineHeight: 1.2,
                whiteSpace: 'normal', pointerEvents: 'none', userSelect: 'none',
              }}
            >
              {measureText}
            </div>

            {/* ── Visible text block: title label + hero phrase ── */}
            <div className="cdn-text-block">
              {titlePart && <div className="cdn-title-text">{titlePart}</div>}
              {timePart && (
                <div className="cdn-time-hero" style={{ fontSize: computedFontSize }}>
                  {timePart}
                </div>
              )}
            </div>

            {/* ── Metadata row ── */}
            {showMeta && (
              <div className="cdn-meta-row">
                {metaTime && <span>{metaTime}</span>}
                {metaTime && dayLabel && <span className="cdn-meta-dot">·</span>}
                {dayLabel && <span>{dayLabel}</span>}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center min-h-0">
          <EmptyState
            size="sm"
            icon={<HourglassSplit size={18} />}
            title={EMPTY_STATES.countdown.empty.title}
            text={EMPTY_STATES.countdown.empty.text}
          />
        </div>
      )}
      </BaseWidget>

      {expanded && <CountdownExpandedView onClose={() => setExpanded(false)} widgetId={id} />}
    </>
  );
};