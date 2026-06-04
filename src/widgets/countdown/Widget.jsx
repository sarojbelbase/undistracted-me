import React, { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from "react";
import {
  PlusLg,
  HourglassSplit,
  CalendarEvent,
  XLg,
} from "react-bootstrap-icons";
import { ListPanel, ListPanelRow } from "../../components/ui/ListPanel";
import { AddCountdown } from "./AddCountdown";
import { BaseWidget } from "../BaseWidget";
import { useEvents, useGoogleCalendar } from "../../hooks/useEvents";
import { todayStr } from "../../utilities";
import { notifyUser } from "../../utilities/chrome";
import {
  getNextOccurrence,
  formatCountdown,
  formatSince,
  formatCountdownPhrase,
  formatSincePhrase,
  formatTargetDate,
  humanizeDuration,
} from "./utils";
import config from "./config";
import { fmt12, calcDuration } from "../events/utils";
import { STORAGE_KEYS } from "../../constants/storageKeys";
import { onClockTick } from "../../utilities/sharedClock";

// ─── localStorage helpers ────────────────────────────────────────────────────

const loadCustom = () => {
  try {
    return JSON.parse(
      localStorage.getItem(STORAGE_KEYS.COUNTDOWN_EVENTS) || "[]",
    );
  } catch {
    return [];
  }
};
const saveCustom = (list) =>
  localStorage.setItem(STORAGE_KEYS.COUNTDOWN_EVENTS, JSON.stringify(list));
const loadPinned = (id) => {
  try {
    return JSON.parse(
      localStorage.getItem(STORAGE_KEYS.countdownPinned(id)) || "null",
    );
  } catch {
    return null;
  }
};
const savePinned = (id, p) =>
  localStorage.setItem(STORAGE_KEYS.countdownPinned(id), JSON.stringify(p));

// ─── Notification helpers ────────────────────────────────────────────────────

const wasNotified = (id) => {
  try {
    const map = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.COUNTDOWN_NOTIFIED) || "{}",
    );
    return map[id] === todayStr();
  } catch {
    return false;
  }
};
const markNotified = (id) => {
  try {
    const map = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.COUNTDOWN_NOTIFIED) || "{}",
    );
    Object.keys(map).forEach((k) => {
      if (map[k] !== todayStr()) delete map[k];
    });
    map[id] = todayStr();
    localStorage.setItem(STORAGE_KEYS.COUNTDOWN_NOTIFIED, JSON.stringify(map));
  } catch { }
};
const sendNotification = (title, body) =>
  notifyUser(title, body, "COUNTDOWN_DONE");

// ─── Resolve which target to show ────────────────────────────────────────────

function resolveEventTarget(pinned, allEvents) {
  const ev = allEvents.find((e) => e.id === pinned.eventId);
  if (!ev) return { target: null, shouldClearPin: false };
  const nextDate = new Date(`${ev.startDate}T${ev.startTime || "00:00"}`);
  if (nextDate < new Date(Date.now() - 2 * 60 * 1000)) {
    return { target: null, shouldClearPin: true };
  }
  return {
    target: {
      title: ev.title, nextDate, startTime: ev.startTime, endTime: ev.endTime,
      isEvent: true, isGcal: ev._source === "gcal", id: ev.id, mode: "countdown",
    },
    shouldClearPin: false,
  };
}

function resolveCustomTarget(pinned, custom) {
  const cd = custom.find((c) => c.id === pinned.id);
  if (!cd) return { target: null, shouldClearPin: false };
  const isSince = cd.mode === "since";
  const nextDate = isSince
    ? new Date(`${cd.targetDate}T${cd.targetTime || "00:00"}`)
    : getNextOccurrence(cd);
  return {
    target: {
      title: cd.title, nextDate, startTime: cd.targetTime,
      isEvent: false, isGcal: false, id: cd.id, repeat: cd.repeat,
      mode: cd.mode || "countdown",
    },
    shouldClearPin: false,
  };
}

function resolveAutoTarget(upcomingEvents, today, custom) {
  const now = new Date();
  // Prefer next upcoming calendar event
  const nextEv = upcomingEvents.find(
    (e) => new Date(`${e.startDate || today}T${e.startTime || "00:00"}`) > now,
  );
  if (nextEv) {
    return {
      target: {
        title: nextEv.title,
        nextDate: new Date(`${nextEv.startDate}T${nextEv.startTime || "00:00"}`),
        startTime: nextEv.startTime, endTime: nextEv.endTime,
        isEvent: true, isGcal: nextEv._source === "gcal", id: nextEv.id,
        mode: "countdown",
      },
      shouldClearPin: false,
    };
  }
  // Fallback: nearest custom countdown (or "since" countdown)
  const sorted = custom
    .map((cd) => ({
      ...cd,
      _next: cd.mode === "since"
        ? new Date(`${cd.targetDate}T${cd.targetTime || "00:00"}`)
        : getNextOccurrence(cd),
    }))
    .filter((cd) => cd._next > now || cd.mode === "since")
    .sort((a, b) => a._next - b._next);
  if (sorted[0]) {
    const cd = sorted[0];
    return {
      target: {
        title: cd.title, nextDate: cd._next, startTime: cd.targetTime,
        isEvent: false, isGcal: false, id: cd.id, repeat: cd.repeat,
        mode: cd.mode || "countdown",
      },
      shouldClearPin: false,
    };
  }
  return { target: null, shouldClearPin: false };
}

function resolveTarget(pinned, allEvents, upcomingEvents, today, custom) {
  if (pinned?.type === "event") return resolveEventTarget(pinned, allEvents);
  if (pinned?.type === "custom") return resolveCustomTarget(pinned, custom);
  return resolveAutoTarget(upcomingEvents, today, custom);
}

// ─── Settings Panel ──────────────────────────────────────────────────────────

const CountdownSettings = ({
  custom,
  pinned,
  upcomingEvents,
  onAddCustom,
  onRemoveCustom,
  onPin,
  onClose,
}) => {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <>
      {/* ── Custom Countdowns ── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="cdn-section-label">My Countdowns</p>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 font-semibold rounded-lg whitespace-nowrap cursor-pointer transition-opacity hover:opacity-85 text-[11px] px-3 py-1.5"
            style={{ background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}
          >
            <PlusLg size={9} />
            Add Countdown
          </button>
        </div>

        <ListPanel
          items={custom}
          className="mb-4"
          emptyState={
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: 'var(--panel-bg)', border: '1px solid var(--card-border)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, var(--w-accent) 12%, transparent)' }}>
                <HourglassSplit size={14} style={{ color: 'var(--w-accent)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold" style={{ color: 'var(--w-ink-2)' }}>Nothing to track yet</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--w-ink-4)' }}>
                  Tap <strong style={{ color: 'var(--w-ink-2)' }}>+ Add Countdown</strong> to count down to events or track time since milestones.
                </p>
              </div>
            </div>
          }
          renderItem={(cd) => {
            const isSince = cd.mode === "since";
            const next = isSince
              ? new Date(`${cd.targetDate}T${cd.targetTime || "00:00"}`)
              : getNextOccurrence(cd);
            const { days, hours, minutes: mins } = isSince
              ? formatSince(next)
              : formatCountdown(next);
            const isPinned = pinned?.type === "custom" && pinned?.id === cd.id;
            const isPast = !isSince && next < new Date() && cd.repeat === "none";

            const cdLabel = (() => {
              if (isPast) return "Past";
              return humanizeDuration(days, hours, mins, isSince ? 'past' : 'future');
            })();

            const metaParts = [];
            if (isPinned) metaParts.push({ text: 'Pinned', accent: true });
            metaParts.push({ text: formatTargetDate(next) });
            if (isSince) metaParts.push({ text: 'Since' });
            if (!isSince && cd.repeat !== "none") metaParts.push({ text: cd.repeat });

            return (
              <ListPanelRow
                key={cd.id}
                title={cd.title}
                meta={metaParts}
                label={cdLabel}
                onDelete={() => onRemoveCustom(cd.id)}
                deleteLabel={`Remove ${cd.title}`}
                onClick={() => { onPin({ type: "custom", id: cd.id }); onClose?.(); }}
                style={{ opacity: isPast ? 0.4 : 1 }}
              />
            );
          }}
        />
      </div>

      {/* Divider */}
      <div className="cdn-divider" />

      {/* ── From Calendar Events ── */}
      <div>
        <p className="cdn-section-label mb-3">
          From Calendar
        </p>

        <ListPanel
          items={upcomingEvents}
          maxItems={8}
          emptyState={
            <div className="cdn-empty-state">
              <div className="cdn-empty-state__icon-circle cdn-empty-state__icon-circle--small">
                <CalendarEvent size={18} style={{ color: "var(--w-accent)", opacity: 0.75 }} />
              </div>
              <p className="w-body font-semibold mb-1">No upcoming events</p>
              <p className="w-muted leading-relaxed" style={{ maxWidth: "180px" }}>
                Add events in the Events widget and pin them here as countdowns.
              </p>
            </div>
          }
          renderItem={(ev) => {
            const isPinned = pinned?.type === "event" && pinned?.eventId === ev.id;
            const evDate = new Date(`${ev.startDate}T${ev.startTime || "00:00"}`);
            const { days: evDays, hours: evHours, minutes: evMins } = formatCountdown(evDate);
            const evLabel = humanizeDuration(evDays, evHours, evMins, 'future');
            const evStartLabel = fmt12(ev.startTime);
            const evDuration = calcDuration(ev.startTime, ev.endTime, ev.startDate, ev.endDate);

            const metaParts = [];
            if (isPinned) metaParts.push({ text: 'Pinned', accent: true });
            if (evStartLabel) metaParts.push({ text: evStartLabel });
            if (evDuration) metaParts.push({ text: evDuration });

            return (
              <ListPanelRow
                key={ev.id}
                title={ev.title}
                meta={metaParts}
                label={evLabel}
                onClick={() => { onPin({ type: "event", eventId: ev.id }); onClose?.(); }}
              />
            );
          }}
        />
      </div>

      {showAdd && (
        <AddCountdown
          onSave={(cd) => {
            onAddCustom(cd);
            onPin({ type: "custom", id: cd.id });
            onClose?.();
          }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </>
  );
};

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

  const [localEvents, addEventToStore, removeEventFromStore] = useEvents();
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

  const addCustom = useCallback(
    (cd) => {
      setCustom((prev) => {
        const next = [...prev, cd];
        saveCustom(next);
        return next;
      });
      addEventToStore({
        id: cd.id,
        title: cd.title,
        startDate: cd.targetDate,
        startTime: cd.targetTime || "",
        endDate: cd.targetDate,
        endTime: "",
        _fromCountdown: true,
      });
    },
    [addEventToStore],
  );

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

  // ── Split text into three styled parts ────────────────────────────────────
  const titlePart = activeTarget?.title || '';
  const connectorPart = isSince ? '' : 'is';
  const timePart = useMemo(() => {
    if (!activeTarget) return '';
    if (isSince) return `${formatSincePhrase(aDays)} ago`;
    return `in ${formatCountdownPhrase(aDays, aHours, aMins, aTotalSecs)}`;
  }, [isSince, aDays, aHours, aMins, aTotalSecs, activeTarget]);

  // Full text for measurement (space-joined)
  const measureText = useMemo(() => {
    return [titlePart, connectorPart, timePart].filter(Boolean).join(' ');
  }, [titlePart, connectorPart, timePart]);

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

  // Binary search: find largest font size that fits in the available height
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el || !measureText || dims.w <= 0 || dims.h <= 0) return;

    // Match the rendered font settings
    el.style.fontFamily = "'Google Sans', sans-serif";
    el.style.fontWeight = '500';
    el.style.letterSpacing = '-0.003em';
    el.style.lineHeight = '1.2';

    const descentFactor = 0.10; // Google Sans at lh 1.2

    let lo = 10, hi = Math.min(dims.h * 0.55, dims.w * 0.35);
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      el.style.fontSize = mid + 'px';
      const h = el.getBoundingClientRect().height;
      if (h + Math.ceil(mid * descentFactor) <= dims.h) lo = mid;
      else hi = mid;
    }

    let fs = Math.floor(lo);
    el.style.fontSize = fs + 'px';
    // Width safety: shrink if any word overflows the container
    while (fs > 10 && el.scrollWidth > Math.ceil(dims.w)) {
      fs -= 1;
      el.style.fontSize = fs + 'px';
    }
    // Cap at 18px for compact, refined look
    setComputedFontSize(Math.min(fs, 18));
  }, [measureText, dims]);

  const settingsContent = (onClose) => (
    <>
      {/* Custom header — matching AllEventsModal style */}
      <div
        className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0"
        style={{ borderBottom: '1.5px solid rgba(0,0,0,0.1)' }}
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
          onAddCustom={addCustom}
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

            {/* ── Visible text block ── */}
            <div className="cdn-text-block" style={{ fontSize: computedFontSize }}>
              <span className="cdn-title-text">{titlePart}</span>
              {timePart && (
                <span className="cdn-connector">
                  {' '}{connectorPart}{connectorPart ? ' ' : ''}{timePart}
                </span>
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