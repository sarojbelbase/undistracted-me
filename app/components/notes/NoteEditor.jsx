import { useRef, useEffect, lazy, Suspense } from "react";
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

// Only fetched the first time the full-screen editor mounts.
const LexicalEditor = lazy(() => import("../../widgets/notes/LexicalEditor"));

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
export const NoteEditor = ({ notes, onExit, exitLabel = "Notes", exitAriaLabel }) => {
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
      <div className="notes-fullscreen-topbar">
        <button
          onClick={onExit}
          aria-label={exitAriaLabel || `Back to ${exitLabel}`}
          className="notes-fullscreen-back-btn"
        >
          <ArrowLeft size={13} />
          <span>{exitLabel}</span>
        </button>
        {navControls}
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
