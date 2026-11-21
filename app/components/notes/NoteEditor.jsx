import { useRef, useEffect, useState, useCallback, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  DashLg,
  ArrowLeft,
  StopwatchFill,
} from "react-bootstrap-icons";
import { ConfirmButton } from "../ui/ConfirmButton";
import { TooltipBtn } from "../ui/TooltipBtn";
import { Popup } from "../ui/Popup";
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
// A small stopwatch icon (accent for focus, neutral for break) beside a
// tabular countdown. Hover or keyboard focus reveals a Popup with the session
// details (label + preset, and time remaining). No glow and no label on the chip
// itself: the icon alone carries the state, so it recedes behind the note.
const PomodoroChip = ({ pomodoro }) => {
  const isFocus = pomodoro.sessionType === SESSION_TYPE.FOCUS;
  const ref = useRef(null);
  const [anchor, setAnchor] = useState(null);
  const label = isFocus ? "Focus" : "Break";
  const tint = isFocus ? "var(--w-accent)" : "var(--w-ink-4)";

  const show = () => setAnchor(ref.current?.getBoundingClientRect() ?? null);
  const hide = () => setAnchor(null);

  return (
    <>
      <span
        ref={ref}
        role="timer"
        tabIndex={0}
        aria-label={`${label} timer, ${formatTime(pomodoro.remaining)} remaining`}
        className="notes-ambient-pomo"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        <StopwatchFill size={12} aria-hidden="true" style={{ color: tint, flexShrink: 0 }} />
        <span>{formatTime(pomodoro.remaining)}</span>
      </span>
      {anchor && (
        <Popup anchor={anchor} preferAbove className="px-3 py-2">
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span
              style={{
                fontSize: "0.6875rem",
                fontWeight: 600,
                color: "var(--w-ink-2)",
                letterSpacing: "0.02em",
                whiteSpace: "nowrap",
              }}
            >
              {label}
              {pomodoro.preset ? ` · ${pomodoro.preset}` : ""}
            </span>
            <span
              style={{
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "var(--w-ink-1)",
                fontVariantNumeric: "tabular-nums",
                whiteSpace: "nowrap",
              }}
            >
              {formatTime(pomodoro.remaining)}
              <span style={{ color: "var(--w-ink-4)", fontWeight: 500 }}> remaining</span>
            </span>
          </div>
        </Popup>
      )}
    </>
  );
};

const NoteAmbientStrip = ({ showClock, showWeather, dateFormat, weather }) => {
  const clockFormat = useSettingsStore((s) => s.clockFormat);
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
    </span>
  );
};

// ─── Focus session (running pomodoro) ────────────────────────────────────────
// Sits dead center of the top bar: clock/date on the left, action buttons on the
// right. When the clock (and weather/date) is hidden it is still the only
// centered element.
const NoteFocusSession = () => {
  const pomodoro = usePomodoroPresence();
  if (!pomodoro) return null;
  return <PomodoroChip pomodoro={pomodoro} />;
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

  // Weather is lifted here (single subscription) so we can know whether the
  // clock/date strip will render and position the focus session accordingly.
  const weather = useFocusWeather();
  const hasClockDate = showClock || (showWeather && weather);

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
            <NoteAmbientStrip
              showClock={showClock}
              showWeather={showWeather}
              dateFormat={dateFormat}
              weather={weather}
            />
          )}
        </div>
        {navControls}
        {isNoteMode && (
          <div className={`notes-focus-session${hasClockDate ? "" : " notes-focus-session--centered"}`}>
            <NoteFocusSession />
          </div>
        )}
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
