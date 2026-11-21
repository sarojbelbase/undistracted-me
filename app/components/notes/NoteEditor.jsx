import { useRef, useEffect, useState, useCallback, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  DashLg,
  ArrowLeft,
} from "react-bootstrap-icons";
import { ConfirmButton } from "../ui/ConfirmButton";
import { TooltipBtn } from "../ui/TooltipBtn";
import { useFocusWeather } from "../../hooks/useFocusWeather";
import { usePomodoroPresence } from "../../hooks/usePomodoroPresence";
import { getWeatherIcon } from "../../widgets/weather/utils.jsx";
import { useSettingsStore } from "../../store";
import { onClockTick } from "../../utilities/sharedClock";
import { getTimeParts } from "../../widgets/clock/utils";
import { formatTime } from "../../widgets/pomodoro/utils";
import { SESSION_TYPE } from "../../widgets/pomodoro/constants";
import {
  getGregorianDateParts,
  getBikramSambatDateParts,
} from "../../utilities";

// Only fetched the first time the full-screen editor mounts.
const LexicalEditor = lazy(() => import("../../widgets/notes/LexicalEditor"));

// ─── Note Mode ambient strip (weather + clock + date, centered top bar) ──────
// A single quiet line: weather leads, then the time, then the date, each
// separated by a faint interpunct. Uniform muted ink so it recedes behind the
// note instead of competing with it.

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

// ─── Running pomodoro presence chip (quiet, non-distracting) ────────────────
// A single muted dot (accent for focus, neutral for break) and a tabular
// countdown. No glow, no label: the dot alone carries the state, so the chip
// reads as part of the ambient line instead of drawing the eye.
const PomodoroChip = ({ pomodoro }) => {
  const isFocus = pomodoro.sessionType === SESSION_TYPE.FOCUS;
  return (
    <span
      role="timer"
      aria-label={`${isFocus ? "Focus" : "Break"} timer, ${formatTime(pomodoro.remaining)} remaining`}
      className="notes-ambient-pomo"
    >
      <span
        aria-hidden="true"
        className="notes-ambient-pomo-dot"
        style={{ backgroundColor: isFocus ? "var(--w-accent)" : "var(--w-ink-4)" }}
      />
      <span>{formatTime(pomodoro.remaining)}</span>
    </span>
  );
};

const NoteAmbientStrip = ({ showClock, showWeather, dateFormat }) => {
  const clockFormat = useSettingsStore((s) => s.clockFormat);
  const weather = useFocusWeather();
  const pomodoro = usePomodoroPresence();
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
  const showP = !!pomodoro;

  if (!showW && !showCD && !showP) return null;

  return (
    <span className="notes-ambient">
      {showW && (
        <span className="notes-ambient-group">
          <span className="notes-ambient-icon">
            {getWeatherIcon(weather.code, weather.isDay, 12)}
          </span>
          <span>
            {weather.temperature}°{weather.unit === "imperial" ? "F" : "C"}
          </span>
        </span>
      )}
      {showW && showCD && (
        <span className="notes-ambient-sep" aria-hidden="true">·</span>
      )}
      {showCD && (
        <span className="notes-ambient-group">
          <span>{state.time}</span>
          {state.period && (
            <span className="notes-ambient-period">{state.period}</span>
          )}
        </span>
      )}
      {showCD && (
        <span className="notes-ambient-sep" aria-hidden="true">·</span>
      )}
      {showCD && (
        <span>
          {dateParts.dow}, {dateParts.month} {dateParts.day}
        </span>
      )}
      {showP && <PomodoroChip pomodoro={pomodoro} />}
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
 * Full-screen note editor surface: shared by the Notes widget (page mode) and
 * Note Mode. Presentational: all note state + handlers arrive via `notes`
 * (the return value of useNotesState).
 *
 *   notes    : the useNotesState() bundle
 *   onExit   : called on back-button click or Escape
 *   exitLabel: text shown next to the back arrow (e.g. "Notes" / "Canvas")
 *   exitAriaLabel: accessible name for the back button (defaults to "Back to {exitLabel}")
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
    showClock,
    showWeather,
    dateFormat,
  } = notes;

  const titleRef = useRef(null);
  const bodyRef = useRef(null);
  const hasAutoFocusedRef = useRef(false);

  // Auto-focus on first mount: title when empty, else the body editor.
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

  return createPortal(
    <div className="fixed inset-0 flex flex-col notes-fullscreen">
      <div className="notes-fullscreen-topbar">
        <button
          onClick={onExit}
          aria-label={exitAriaLabel || `Back to ${exitLabel}`}
          className="notes-fullscreen-back-btn"
        >
          <ArrowLeft size={13} />
          <span>{exitLabel}</span>
        </button>
        <div className="notes-fullscreen-ambient">
          {isNoteMode && (
            <NoteAmbientStrip showClock={showClock} showWeather={showWeather} dateFormat={dateFormat} />
          )}
        </div>
        {navControls}
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
          {/* Lexical WYSIWYG editor: lazy loaded */}
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
