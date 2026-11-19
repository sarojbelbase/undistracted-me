import {
  useState,
  useRef,
  useCallback,
} from "react";
import { BaseWidget } from "../BaseWidget";
import { useNotesState } from "../../hooks/useNotesState";
import { NoteEditor } from "../../components/notes/NoteEditor";
import { Popup } from "../../components/ui/Popup";
import { TooltipBtn } from "../../components/ui/TooltipBtn";

// ─── Per-note hue palette (cycles by note index) ─────────────────────────────
const NOTE_HUES = [
  "#F5C842", // warm yellow
  "#F4845F", // coral
  "#5EB88A", // sage
  "#5BA4CF", // sky
  "#B49FCC", // lavender
];

// ─── Nav dot (pagination dot with Popup tooltip) ──────────────────────────────
const NavDot = ({ active, label, onClick, hue }) => {
  const btnRef = useRef(null);
  const [anchor, setAnchor] = useState(null);
  return (
    <>
      <button
        ref={btnRef}
        onClick={onClick}
        aria-label={label}
        className={`notes-nav-dot${active ? " notes-nav-dot--active" : ""}`}
        style={active ? { background: hue } : undefined}
        onMouseEnter={() =>
          setAnchor(btnRef.current?.getBoundingClientRect() ?? null)
        }
        onMouseLeave={() => setAnchor(null)}
      />
      {anchor && (
        <Popup anchor={anchor} preferAbove className="px-2.5 py-1">
          <span className="notes-nav-counter" style={{ color: "var(--w-ink-2)", whiteSpace: "nowrap" }}>
            {label}
          </span>
        </Popup>
      )}
    </>
  );
};

// ─── Widget ───────────────────────────────────────────────────────────────────
export const Widget = ({ id, onRemove }) => {
  const notes = useNotesState(id);
  const {
    localNotes,
    localIdx,
    localText,
    total,
    titleLine,
    bodyText,
    wordCount,
    jumpTo,
    handleWidgetTextChange,
  } = notes;

  // ── Mode (widget card vs. full-screen editor) ──────────────────────────────
  const [mode, setMode] = useState("widget");

  const openPage = useCallback(() => setMode("page"), []);
  const close = useCallback(() => setMode("widget"), []);

  // ── Widget card ───────────────────────────────────────────────────────────────
  const widgetCard = (
    <BaseWidget
      className="flex flex-col overflow-hidden"
      cardStyle={{ borderRadius: "14px" }}
      onRemove={onRemove}
    >
      <div className="notes-writing-surface">
        <textarea
          id="notes-body"
          name="notes-body"
          className="notes-textarea"
          value={bodyText}
          onChange={handleWidgetTextChange}
          placeholder="New Note..."
          style={{ flex: 1 }}
        />
      </div>

      <div className="notes-status-bar">
        <div className="notes-status-dots">
          {localNotes.map((note, i) => (
            <NavDot
              key={note.id || `dot-${i}`}
              active={i === localIdx}
              label={`Note ${i + 1} of ${total}`}
              onClick={() => jumpTo(i)}
              hue={NOTE_HUES[i % NOTE_HUES.length]}
            />
          ))}
        </div>
        <TooltipBtn
          onClick={openPage}
          aria-label="Open in full screen"
          tooltip="Write in fullscreen"
          className={`notes-title-btn${titleLine.trim() ? "" : " notes-title-btn--empty"}`}
        >
          {titleLine.trim() || `Note ${localIdx + 1}`}
        </TooltipBtn>
        {localText.trim() && (
          <span className="notes-word-count">
            {wordCount}w
          </span>
        )}
      </div>
    </BaseWidget>
  );

  return (
    <>
      {widgetCard}
      {mode === "page" && (
        <NoteEditor notes={notes} onExit={close} exitLabel="Notes" exitAriaLabel="Back to widget" />
      )}
    </>
  );
};
