import { useRef, useEffect, useState, useCallback, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  DashLg,
  ArrowLeft,
  ArrowClockwise,
  ArrowRepeat,
  CheckCircleFill,
} from "react-bootstrap-icons";
import { ConfirmButton } from "../ui/ConfirmButton";
import { TooltipBtn } from "../ui/TooltipBtn";
import { useFocusWeather } from "../../hooks/useFocusWeather";
import { getWeatherIcon } from "../../widgets/weather/utils.jsx";
import { useSettingsStore } from "../../store";
import { onClockTick } from "../../utilities/sharedClock";
import { getTimeParts } from "../../widgets/clock/utils";
import {
  getGregorianDateParts,
  getBikramSambatDateParts,
} from "../../utilities";

// Only fetched the first time the full-screen editor mounts.
const LexicalEditor = lazy(() => import("../../widgets/notes/LexicalEditor"));

// ─── Note Mode ambient strip (weather + clock + date, centered top bar) ──────
// Weather always leads, then clock, then date — separated by spacing (no dots),
// matching Focus Mode's weather-first arrangement.

const computeNoteClock = (clockFormat, dateFormat) => {
  const { time, period } = getTimeParts(clockFormat || "24h");
  const dp =
    dateFormat === "gregorian"
      ? getGregorianDateParts()
      : getBikramSambatDateParts();
  return {
    time,
    period,
    dow: dp.dow,
    month: dp.month,
    day: dp.day,
    year: dp.year,
    dayKey: `${dp.year}|${dp.month}|${dp.day}`,
  };
};

const NoteAmbientStrip = ({ showClock, showWeather, dateFormat }) => {
  const clockFormat = useSettingsStore((s) => s.clockFormat);
  const weather = useFocusWeather();
  const [state, setState] = useState(() => computeNoteClock(clockFormat, dateFormat));

  // onClockTick fires every second; only re-render when the minute or the day
  // actually rolls over.
  const update = useCallback(() => {
    setState((prev) => {
      const next = computeNoteClock(clockFormat, dateFormat);
      if (prev && prev.time === next.time && prev.dayKey === next.dayKey) return prev;
      return next;
    });
  }, [clockFormat, dateFormat]);

  useEffect(() => onClockTick(update), [update]);

  const dateParts = { dow: state.dow, month: state.month, day: state.day, year: state.year };
  const showW = showWeather && weather;
  const showCD = showClock;

  if (!showW && !showCD) return null;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        whiteSpace: "nowrap",
        fontVariantNumeric: "tabular-nums",
        userSelect: "none",
        gap: 10,
      }}
    >
      {showW && (
        <span style={{ display: "inline-flex", alignItems: "center" }}>
          <span style={{ opacity: 0.65, display: "flex", alignItems: "center", marginRight: 5 }}>
            {getWeatherIcon(weather.code, weather.isDay, 12)}
          </span>
          <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--w-ink-1)", letterSpacing: "-0.01em" }}>
            {weather.temperature}°{weather.unit === "imperial" ? "F" : "C"}
          </span>
        </span>
      )}
      {showCD && (
        <span style={{ display: "inline-flex", alignItems: "baseline" }}>
          <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--w-ink-1)", letterSpacing: "-0.02em" }}>
            {state.time}
          </span>
          {state.period && (
            <span style={{ fontSize: "0.625rem", fontWeight: 600, color: "var(--w-ink-3)", marginLeft: 3 }}>
              {state.period}
            </span>
          )}
        </span>
      )}
      {showCD && (
        <span style={{ fontSize: "0.8125rem", fontWeight: 700, letterSpacing: "0.01em", color: "var(--w-ink-1)" }}>
          {dateParts.dow}, {dateParts.month} {dateParts.day}
        </span>
      )}
    </span>
  );
};

// ─── Segmented-control button (with Popup tooltip) ────────────────────────────
const SegBtn = ({ onClick, disabled, label, children }) => (
  <TooltipBtn
    type="button"
    aria-label={label}
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    tooltip={disabled ? undefined : label}
    className="notes-seg-btn"
  >
    {children}
  </TooltipBtn>
);

/**
 * Full-screen note editor surface — shared by the Notes widget (page mode) and
 * Note Mode. Presentational: all note state + handlers arrive via `notes`
 * (the return value of useNotesState).
 *
 *   notes     — the useNotesState() bundle
 *   onExit    — called on back-button click or Escape
 *   exitLabel — text shown next to the back arrow (e.g. "Notes" / "Canvas")
 *   exitAriaLabel — accessible name for the back button (defaults to "Back to {exitLabel}")
 */
export const NoteEditor = ({ notes, onExit, exitLabel = "Notes", exitAriaLabel, isNoteMode = false }) => {
  const {
    localIdx,
    localNote,
    localText,
    total,
    titleLine,
    bodyText,
    wordCount,
    clearNonce,
    handleTitleChange,
    handleBodyChange,
    goPrev,
    goNext,
    addNote,
    deleteNote,
    syncConnected,
    syncing,
    syncFeedback,
    handleSyncNow,
    showClock,
    showWeather,
    dateFormat,
  } = notes;

  const titleRef = useRef(null);
  const bodyRef = useRef(null);
  const hasAutoFocusedRef = useRef(false);

  // Auto-focus on first mount — title when empty, else the body editor.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (hasAutoFocusedRef.current) return;
      hasAutoFocusedRef.current = true;
      if (!titleLine.trim()) titleRef.current?.focus();
      else bodyRef.current?.focus();
    }, 60);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escape exits the full-screen surface.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onExit();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onExit]);

  const navControls = (
    <div className="notes-seg-track notes-fullscreen-nav">
      <SegBtn onClick={goPrev} disabled={localIdx === 0} label="Previous note">
        <ChevronLeft size={12} />
      </SegBtn>
      <span className="notes-nav-counter">
        {localIdx + 1}/{total}
      </span>
      <SegBtn onClick={goNext} disabled={localIdx >= total - 1} label="Next note">
        <ChevronRight size={12} />
      </SegBtn>

      <div className="notes-nav-divider" />

      <SegBtn onClick={addNote} label="New note">
        <Plus size={13} />
      </SegBtn>

      <div className="notes-nav-divider" />

      <ConfirmButton
        onConfirm={deleteNote}
        label={total <= 1 ? "Clear note" : "Delete note"}
        className="notes-seg-btn"
        style={{
          borderRadius: 6,
          padding: "2px 7px",
          minHeight: 22,
          fontSize: "0.6875rem",
          fontWeight: 600,
          lineHeight: 1,
        }}
      >
        <DashLg size={12} />
      </ConfirmButton>
    </div>
  );

  // Sync button — shown at the far right of the top bar when sync is connected.
  const syncControl = syncConnected && (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <div className="notes-nav-divider" />
      <TooltipBtn
        type="button"
        aria-label={syncing ? 'Syncing' : syncFeedback ? 'Sync status' : 'Sync now'}
        onClick={handleSyncNow}
        disabled={syncing}
        tooltip={
          syncing
            ? 'Syncing…'
            : syncFeedback === 'synced'
              ? 'Synced'
              : syncFeedback === 'already'
                ? 'Already synced — no changes'
                : 'Sync notes now'
        }
        className="notes-seg-btn"
      >
        {syncing
          ? <ArrowRepeat size={12} className="animate-spin" />
          : syncFeedback === 'synced'
            ? <CheckCircleFill size={12} />
            : syncFeedback === 'already'
              ? <CheckCircleFill size={12} style={{ opacity: 0.55 }} />
              : <ArrowClockwise size={12} />}
        {syncing
          ? 'Syncing…'
          : syncFeedback === 'synced'
            ? 'Synced'
            : syncFeedback === 'already'
              ? 'Already synced'
              : 'Sync'}
      </TooltipBtn>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 flex flex-col notes-fullscreen">
      <div className="notes-fullscreen-topbar" style={{ position: 'relative' }}>
        <button
          onClick={onExit}
          aria-label={exitAriaLabel || `Back to ${exitLabel}`}
          className="notes-fullscreen-back-btn"
        >
          <ArrowLeft size={13} />
          <span>{exitLabel}</span>
        </button>
        {navControls}
        {isNoteMode && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              top: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            <NoteAmbientStrip showClock={showClock} showWeather={showWeather} dateFormat={dateFormat} />
          </div>
        )}
        {syncControl}
      </div>

      <div className="notes-fullscreen-editor-wrap">
        <div className="notes-fullscreen-writing-col">
          {/* Title */}
          <input
            ref={titleRef}
            id="notes-title"
            name="notes-title"
            type="text"
            value={titleLine}
            onChange={handleTitleChange}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                bodyRef.current?.focus();
              }
            }}
            placeholder="Title"
            className="notes-title"
          />
          {/* Lexical WYSIWYG editor — lazy loaded */}
          <Suspense
            fallback={
              <div style={{ flex: 1, paddingTop: 18, color: "var(--w-ink-5)" }}>
                …
              </div>
            }
          >
            <LexicalEditor
              key={`${localNote.id}:${clearNonce}`}
              ref={bodyRef}
              value={bodyText}
              onChange={handleBodyChange}
              placeholder="Start typing…"
              autoFocus={Boolean(titleLine.trim())}
              className="lex-content lex-content--page"
              style={{
                flex: 1,
                color: "var(--w-ink-1)",
                overflowY: "auto",
                paddingTop: 12,
                minHeight: 0,
                outline: "none",
              }}
            />
          </Suspense>
          {localText.trim() && (
            <div className="notes-word-count-footer">
              {wordCount}&thinsp;{wordCount === 1 ? "word" : "words"}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
