import React, { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from "react";
import { HourglassSplit, XLg } from "react-bootstrap-icons";
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
  saveCustom,
  loadPinned,
  savePinned,
  wasNotified,
  markNotified,
  sendNotification,
  resolveTarget,
} from "./utils";
import config from "./config";
import { fmt12 } from "../events/utils";
import { onClockTick } from "../../utilities/sharedClock";
import { CountdownSettings } from "./Settings";

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
  return null;
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
  const [pinned, setPinned] = useState(() => loadPinned(id));
  const [now, setNow] = useState(() => Date.now());

  const [localEvents, , removeEventFromStore] = useEvents();
  const { gcalEvents } = useGoogleCalendar();
  const today = todayStr();
  const allEvents = [...localEvents, ...(gcalEvents || [])];

  const upcomingEvents = allEvents
    .filter((e) => {
      const dt = new Date(
        `${e.startDate || today}T${e.startTime || "00:00"}`,
      );
      return dt >= new Date(Date.now() - 2 * 60 * 1000);
    })
    .sort((a, b) => {
      const aKey = `${a.startDate || today}T${a.startTime || "99:99"}`;
      const bKey = `${b.startDate || today}T${b.startTime || "99:99"}`;
      return aKey.localeCompare(bKey);
    });

  const setPin = useCallback(
    (p) => {
      setPinned(p);
    },
    [],
  );

  // Sync pinned state to localStorage on every change
  useEffect(() => { savePinned(id, pinned); }, [pinned, id]);

  const removeCustom = useCallback(
    (cdId) => {
      setCustom((prev) => {
        const next = prev.filter((c) => c.id !== cdId);
        saveCustom(next);
        return next;
      });
      setPinned((p) => {
        if (p?.type === "custom" && p?.id === cdId) {
          savePinned(id, null);
          return null;
        }
        return p;
      });
      removeEventFromStore(cdId);
    },
    [removeEventFromStore, id],
  );

  useEffect(() => onClockTick(() => setNow(Date.now())), []);

  // Re-read countdowns when the unified dialog adds/edits one (it writes to
  // localStorage directly and broadcasts this event).
  useEffect(() => {
    const handler = () => setCustom(loadCustom());
    globalThis.addEventListener("countdown_events_changed", handler);
    return () => globalThis.removeEventListener("countdown_events_changed", handler);
  }, []);

  // ── Resolve target ──────────────────────────────────────────────────────────
  const { target, shouldClearPin } = resolveTarget(
    pinned,
    allEvents,
    upcomingEvents,
    today,
    custom,
  );

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
      sendNotification("Countdown complete", target.title);
    }

    if (pinned?.type === "custom") {
      const cd = custom.find((c) => c.id === pinned.id);
      if (cd?.repeat === "none") setTimeout(() => setPin(null), 10_000);
    }
    if (pinned?.type === "event") {
      setTimeout(() => setPin(null), 10_000);
    }
  }, [notifKey, totalSeconds === 0]);

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
    if (isSince) return humanizeDuration(aDays, aHours, aMins, 'past').replace(/ ago$/, '');
    return formatCountdownPhrase(aDays, aHours, aMins, aTotalSecs);
  }, [isSince, aDays, aHours, aMins, aTotalSecs, activeTarget]);

  // Ghost numeral — the leading number of the phrase ("4" in "in 4 years").
  // Rendered as a faint oversized backdrop digit; hidden for non-numeric
  // phrases ("next week", "tomorrow", "now", "yesterday", "just now").
  const ghostNum = useMemo(() => {
    const m = timePart.match(/\d+/);
    return m ? m[0] : '';
  }, [timePart]);

  // Only the hero phrase needs measuring — the title label is a fixed size.
  const measureText = timePart;

  // ── Minimal metadata — time + smart day label (no recurrence on face) ──────
  const todayDate = new Date();

  const metaTime = useMemo(() => {
    if (!activeTarget?.startTime) return '';
    return fmt12(activeTarget.startTime);
  }, [activeTarget?.startTime]);

  const dayLabel = useMemo(() => {
    if (!activeTarget?.nextDate) return '';
    const d = activeTarget.nextDate;
    const today = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
    const targetDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.round((targetDay - today) / 86400000);

    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';

    if (d.getFullYear() === todayDate.getFullYear()) {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    return formatTargetDate(d);
  }, [activeTarget?.nextDate]);

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
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el || !measureText || dims.w <= 0 || dims.h <= 0) return;

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

  // Ghost numeral size — scales with the widget height so it "peeks" from the
  // top-right corner regardless of card size (dims.h = content-wrap height).
  // Oversized + intentionally clipped at the card edge for a decorative bleed.
  const ghostSize = dims.h > 0
    ? Math.max(128, Math.min(360, Math.round(dims.h * 1.2)))
    : 160;

  const settingsContent = (onClose) => (
    <>
      {/* Custom header — matching AllEventsModal style */}
      <div
        className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0"
        style={{ borderBottom: '1.5px solid var(--w-divider)' }}
      >
        <div>
          <p className="text-[15px] font-semibold" style={{ color: 'var(--w-ink-1)' }}>{config.title}</p>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-full transition-colors cursor-pointer"
          style={{ color: 'var(--w-ink-3)' }}
          aria-label={`Close ${config.title}`}
        >
          <XLg size={12} />
        </button>
      </div>
      {/* Scrollable body */}
      <div className="overflow-y-auto flex-1 px-4 py-4">
        <CountdownSettings
          custom={custom}
          pinned={pinned}
          upcomingEvents={upcomingEvents}
          onRemoveCustom={removeCustom}
          onPin={setPin}
          onClose={onClose}
        />
      </div>
    </>
  );

  return (
    <BaseWidget
      className="p-4"
      settingsContent={settingsContent}
      settingsTitle={config.title}
      settingsNoHeader
      modalWidth="w-[26rem]"
      onRemove={onRemove}
    >
      {activeTarget ? (
        <div className="cdn-widget-face">
          <span className="cdn-mode-label">{isSince ? 'Since' : 'Countdown'}</span>
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
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
          <HourglassSplit
            size={28}
            style={{ color: "var(--w-ink-4)" }}
          />
          <p className="w-muted text-sm">No countdowns yet.</p>
          <p className="text-xs" style={{ color: "var(--w-ink-4)" }}>
            Add events or open settings to create one.
          </p>
        </div>
      )}
    </BaseWidget>
  );
};