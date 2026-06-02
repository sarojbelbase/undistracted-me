import React, { useState, useEffect, useCallback, useReducer } from "react";
import {
  PlusLg,
  Trash3,
  HourglassSplit,
  ArrowRepeat,
  CalendarEvent,
} from "react-bootstrap-icons";
import { TintedChip } from "../../components/ui/TintedChip";
import { ConfirmButton } from "../../components/ui/ConfirmButton";
import { AddCountdown } from "./AddCountdown";
import { BaseWidget } from "../BaseWidget";
import { useEvents, useGoogleCalendar } from "../../hooks/useEvents";
import { todayStr } from "../../utilities";
import { notifyUser } from "../../utilities/chrome";
import {
  getNextOccurrence,
  formatCountdown,
  formatSince,
  formatTargetDate,
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

const todayKey = () => new Date().toISOString().slice(0, 10);
const wasNotified = (id) => {
  try {
    const map = JSON.parse(
      localStorage.getItem(STORAGE_KEYS.COUNTDOWN_NOTIFIED) || "{}",
    );
    return map[id] === todayKey();
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
      if (map[k] !== todayKey()) delete map[k];
    });
    map[id] = todayKey();
    localStorage.setItem(STORAGE_KEYS.COUNTDOWN_NOTIFIED, JSON.stringify(map));
  } catch { }
};
const sendNotification = (title, body) =>
  notifyUser(title, body, "COUNTDOWN_DONE");

// ─── Countdown value tiers (countdown mode) ──────────────────────────────────

function monthsTier(days) {
  const months = Math.floor(days / 30);
  const rounded = days % 30 >= 15 ? months + 1 : months;
  return { main: String(rounded), unit: rounded === 1 ? "mo" : "mos" };
}

function daysTier(days, hours) {
  const rounded = hours >= 12 ? days + 1 : days;
  if (rounded >= 30) return { main: "1", unit: "mo" };
  return { main: String(rounded), unit: rounded === 1 ? "day" : "days" };
}

function hoursTier(hours, mins) {
  const rounded = mins >= 30 ? hours + 1 : hours;
  if (rounded >= 24) return { main: "1", unit: "day" };
  return { main: String(rounded), unit: rounded === 1 ? "hr" : "hrs" };
}

function minsTier(mins, secs) {
  const rounded = secs >= 30 ? mins + 1 : mins;
  if (rounded >= 60) return { main: "1", unit: "hr" };
  return { main: String(rounded), unit: "min" };
}

function countdownValue(aDays, aHours, aMins, aTotalSecs) {
  const aSecs = aTotalSecs % 60;
  if (aDays >= 30) return monthsTier(aDays);
  if (aDays > 0) return daysTier(aDays, aHours);
  if (aHours > 0) return hoursTier(aHours, aMins);
  if (aMins > 0 || aSecs >= 30) return minsTier(aMins, aSecs);
  return { main: null, unit: null };
}

// ─── "Since" value tiers — count UP from a past date ────────────────────────

function sinceValue(days) {
  if (days < 30) {
    return { main: String(days), unit: days === 1 ? "day" : "days" };
  }
  if (days < 365) {
    const months = Math.round(days / 30.44);
    return { main: String(months), unit: months === 1 ? "month" : "months" };
  }
  const years = Math.round((days / 365.25) * 10) / 10;
  const whole = years % 1 === 0;
  return {
    main: whole ? String(Math.round(years)) : years.toFixed(1),
    unit: years === 1 ? "year" : "years",
  };
}

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
            className="cdn-add-btn"
          >
            <PlusLg size={9} />
            New
          </button>
        </div>

        {custom.length === 0 ? (
          <div className="cdn-empty-state">
            <div className="cdn-empty-state__icon-circle">
              <HourglassSplit
                size={22}
                style={{ color: "var(--w-accent)", opacity: 0.75 }}
              />
            </div>
            <p className="w-body font-semibold mb-1">
              Nothing to track yet
            </p>
            <p className="w-muted leading-relaxed mb-4 cdn-empty-state__hint">
              Count down to events or track time since milestones.
            </p>
            <TintedChip
              size="sm"
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5"
            >
              <PlusLg size={9} />
              Add your first countdown
            </TintedChip>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {custom.map((cd) => {
              const isSince = cd.mode === "since";
              const next = isSince
                ? new Date(`${cd.targetDate}T${cd.targetTime || "00:00"}`)
                : getNextOccurrence(cd);
              const { days, hours, minutes: mins } = isSince
                ? formatSince(next)
                : formatCountdown(next);
              const isPinned =
                pinned?.type === "custom" && pinned?.id === cd.id;
              const isPast =
                !isSince && next < new Date() && cd.repeat === "none";

              const cdLabel = (() => {
                if (isPast) return "Past";
                if (days > 0) return `${days}d`;
                if (hours > 0) return `${hours}h`;
                return `${mins}m`;
              })();
              const cdDate = formatTargetDate(next);

              return (
                <div
                  key={cd.id}
                  className={`cdn-list-item${isPast ? " cdn-list-item--past" : ""}`}
                >
                  <div className="cdn-list-item__bar" />
                  <button
                    className="cdn-list-item__btn"
                    onClick={() => {
                      onPin({ type: "custom", id: cd.id });
                      onClose?.();
                    }}
                  >
                    <div className="cdn-list-item__info">
                      <p className="cdn-list-item__title">
                        {cd.title}
                      </p>
                      <div className="cdn-list-item__meta">
                        {isPinned && (
                          <>
                            <span className="cdn-list-item__meta-text">
                              Pinned
                            </span>
                            <span className="cdn-list-item__meta-dot">
                              ·
                            </span>
                          </>
                        )}
                        <span className="cdn-list-item__meta-text">
                          {cdDate}
                        </span>
                        {isSince && (
                          <>
                            <span className="cdn-list-item__meta-dot">
                              ·
                            </span>
                            <span className="cdn-list-item__meta-text">
                              Since
                            </span>
                          </>
                        )}
                        {!isSince &&
                          cd.repeat !== "none" && (
                            <>
                              <span className="cdn-list-item__meta-dot">
                                ·
                              </span>
                              <ArrowRepeat
                                size={9}
                                style={{ color: "var(--w-ink-5)" }}
                              />
                              <span className="cdn-list-item__meta-text">
                                {cd.repeat}
                              </span>
                            </>
                          )}
                      </div>
                    </div>
                    <span
                      className={`cdn-label${isPast ? " cdn-label--past" : " cdn-label--active"}`}
                    >
                      {cdLabel}
                    </span>
                  </button>
                  <ConfirmButton
                    onConfirm={() => onRemoveCustom(cd.id)}
                    label={`Remove ${cd.title}`}
                    className="cdn-delete-btn"
                  >
                    <Trash3 size={13} />
                  </ConfirmButton>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="cdn-divider" />

      {/* ── From Calendar Events ── */}
      <div>
        <p className="cdn-section-label mb-3">
          From Calendar
        </p>

        {upcomingEvents.length === 0 ? (
          <div className="cdn-empty-state">
            <div className="cdn-empty-state__icon-circle cdn-empty-state__icon-circle--small">
              <CalendarEvent
                size={18}
                style={{ color: "var(--w-accent)", opacity: 0.75 }}
              />
            </div>
            <p className="w-body font-semibold mb-1">
              No upcoming events
            </p>
            <p
              className="w-muted leading-relaxed"
              style={{ maxWidth: "180px" }}
            >
              Add events in the Events widget and pin them here as countdowns.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {upcomingEvents.slice(0, 8).map((ev) => {
              const isPinned =
                pinned?.type === "event" &&
                pinned?.eventId === ev.id;
              const evDate = new Date(
                `${ev.startDate}T${ev.startTime || "00:00"}`,
              );
              const {
                days: evDays,
                hours: evHours,
                minutes: evMins,
              } = formatCountdown(evDate);
              const evLabel = (() => {
                if (evDays > 0) return `${evDays}d`;
                if (evHours > 0) return `${evHours}h`;
                return `${evMins}m`;
              })();

              const evStartLabel = fmt12(ev.startTime);
              const evDuration = calcDuration(
                ev.startTime,
                ev.endTime,
                ev.startDate,
                ev.endDate,
              );

              return (
                <div
                  key={ev.id}
                  className="relative flex items-stretch gap-3 group"
                >
                  <div
                    className="w-1.5 rounded-xs shrink-0 self-stretch"
                    style={{
                      backgroundColor: "var(--w-accent)",
                      minHeight: "38px",
                    }}
                  />
                  <button
                    className="flex-1 min-w-0 text-left flex items-center justify-between gap-2 py-2"
                    onClick={() => {
                      onPin({ type: "event", eventId: ev.id });
                      onClose?.();
                    }}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <p
                        className="text-[13px] font-semibold leading-snug truncate"
                        style={{ color: "var(--w-ink-1)" }}
                      >
                        {ev.title}
                      </p>
                      <div className="flex items-center gap-1">
                        {isPinned && (
                          <>
                            <span
                              className="text-[11px] font-semibold"
                              style={{ color: "var(--w-ink-4)" }}
                            >
                              Pinned
                            </span>
                            <span
                              className="text-[11px] font-semibold select-none"
                              style={{ color: "var(--w-ink-6)" }}
                            >
                              ·
                            </span>
                          </>
                        )}
                        {evStartLabel && (
                          <span
                            className="text-[11px] font-semibold"
                            style={{ color: "var(--w-ink-5)" }}
                          >
                            {evStartLabel}
                          </span>
                        )}
                        {evStartLabel && evDuration && (
                          <span
                            className="text-[11px] font-semibold select-none"
                            style={{ color: "var(--w-ink-6)" }}
                          >
                            ·
                          </span>
                        )}
                        {evDuration && (
                          <span
                            className="text-[11px] font-semibold"
                            style={{ color: "var(--w-ink-5)" }}
                          >
                            {evDuration}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className="text-[13px] font-bold shrink-0 tabular-nums"
                      style={{ color: "var(--w-accent)" }}
                    >
                      {evLabel}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
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

function getNotifySeconds(target) {
  if (!target) return {};
  if (target.mode === "since") return { totalSeconds: 1 };
  return formatCountdown(target.nextDate);
}

function getDiffValues(activeTarget) {
  if (!activeTarget) return {};
  if (activeTarget.mode === "since") return formatSince(activeTarget.nextDate);
  return formatCountdown(activeTarget.nextDate);
}

export const Widget = ({ id, onRemove }) => {
  const [custom, setCustom] = useState(loadCustom);
  const [pinned, setPinned] = useState(() => loadPinned(id));
  const [, forceUpdate] = useReducer((n) => n + 1, 0);

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
      savePinned(id, p);
    },
    [id],
  );

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

  useEffect(() => onClockTick(forceUpdate), []);

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
  const notifSeconds = getNotifySeconds(target);
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

  const diffValues = getDiffValues(activeTarget);
  const {
    days: aDays = 0,
    hours: aHours = 0,
    minutes: aMins = 0,
    totalSeconds: aTotalSecs = 0,
  } = diffValues;

  const cv = isSince
    ? sinceValue(aDays)
    : countdownValue(aDays, aHours, aMins, aTotalSecs);

  const fmtTime = (t) => {
    if (!t) return null;
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  const startTimeStr = activeTarget?.startTime
    ? fmtTime(activeTarget.startTime)
    : null;

  const settingsContent = (onClose) => (
    <CountdownSettings
      custom={custom}
      pinned={pinned}
      upcomingEvents={upcomingEvents}
      onAddCustom={addCustom}
      onRemoveCustom={removeCustom}
      onPin={setPin}
      onClose={onClose}
    />
  );

  return (
    <BaseWidget
      className="p-4 flex flex-col"
      settingsContent={settingsContent}
      settingsTitle={config.title}
      modalWidth="w-[26rem]"
      onRemove={onRemove}
    >
      {activeTarget ? (
        <div className="cdn-widget-face">
          {/* ── Title — event name, always visible, multi-line clamp ── */}
          <p className="cdn-widget-title__text">
            {activeTarget.title}
          </p>

          {/* ── Hero Number — large, centered ── */}
          <div className="cdn-widget-number">
            {cv.main ? (
              <>
                <span className="cdn-widget-number__value">
                  {cv.main}
                </span>
                <span className="cdn-widget-number__unit">
                  {cv.unit}
                  {isSince ? " passed" : ""}
                </span>
              </>
            ) : (
              <span
                className="cdn-widget-number__value"
                style={{
                  fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)",
                }}
              >
                &lt;1m
              </span>
            )}
          </div>

          {/* ── Meta row: date, time, badges ── */}
          <div className="cdn-widget-meta">
            <span className="cdn-widget-meta__date">
              {formatTargetDate(activeTarget.nextDate)}
            </span>
            {startTimeStr && (
              <>
                <span className="cdn-widget-meta__dot">·</span>
                <span className="cdn-widget-meta__text">
                  {startTimeStr}
                </span>
              </>
            )}
            {isSince && (
              <span className="cdn-widget-meta__badge">Since</span>
            )}
            {!isSince &&
              activeTarget.repeat &&
              activeTarget.repeat !== "none" &&
              !activeTarget.isEvent && (
                <span className="cdn-widget-meta__badge">
                  <ArrowRepeat size={9} />
                  {activeTarget.repeat}
                </span>
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