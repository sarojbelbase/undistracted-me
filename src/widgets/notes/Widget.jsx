import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  lazy,
  Suspense,
} from "react";
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
import { BaseWidget } from "../BaseWidget";
import { useWidgetSettings } from "../useWidgetSettings";
import { WIDGET_SETTINGS_DEFAULTS } from "../../constants/defaults.js";
import { ConfirmButton } from "../../components/ui/ConfirmButton";
import { Popup } from "../../components/ui/Popup";
import { TooltipBtn } from "../../components/ui/TooltipBtn";
import { splitNote, mergeNote, migrateNotes, makeNoteId } from "../../utilities/noteText";
import notesSync, { NOTES_SYNC_EVENT } from "../../utilities/notesSync";
import syncEngine from "../../utilities/syncEngine";
import { isConnected } from "../../utilities/githubAuth";

// Only fetched the first time a user expands a note to full-screen mode.
const LexicalEditor = lazy(() => import("./LexicalEditor"));

// ─── Per-note hue palette (cycles by note index) ─────────────────────────────
const NOTE_HUES = [
  "#F5C842", // warm yellow
  "#F4845F", // coral
  "#5EB88A", // sage
  "#5BA4CF", // sky
  "#B49FCC", // lavender
];

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

// ─── Migrate old string[] notes → { id, text, updatedAt }[] ─────────────────
// (splitNote / mergeNote / migrateNotes / makeNoteId come from noteText.js)
function resolveSettings(raw) {
  if (Array.isArray(raw.notes)) return { notes: migrateNotes(raw.notes), idx: raw.idx ?? 0 };
  return { notes: migrateNotes([raw.text ?? ""]), idx: 0 };
}

// ─── Widget ───────────────────────────────────────────────────────────────────
export const Widget = ({ id, onRemove }) => {
  const [settings, updateSetting] = useWidgetSettings(id, WIDGET_SETTINGS_DEFAULTS.notes);

  // Resolve + migrate exactly once (assigning stable ids to legacy string notes).
  const initialRef = useRef(null);
  if (initialRef.current === null) {
    initialRef.current = resolveSettings(settings);
  }
  const initNotes = initialRef.current.notes;
  const initIdx = initialRef.current.idx;
  const [localNotes, setLocalNotes] = useState(initNotes);
  const [localIdx, setLocalIdx] = useState(initIdx);
  const saveTimerRef = useRef(null);

  // Persist the string→object migration once so localStorage holds stable ids,
  // and seed the notes index with each note's label.
  useEffect(() => {
    updateSetting("notes", initNotes);
    initNotes.forEach((n) => notesSync.onNoteChanged(n.id, n.text));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh from a cross-device pull (notesSync wrote localStorage + fired event).
  useEffect(() => {
    const onNotesSync = () => {
      const { notes, idx } = notesSync.readLocalNotes();
      if (notes.length) {
        setLocalNotes(notes);
        setLocalIdx(idx < notes.length ? idx : 0);
        updateSetting("notes", notes);
      }
    };
    globalThis.addEventListener(NOTES_SYNC_EVENT, onNotesSync);
    return () => globalThis.removeEventListener(NOTES_SYNC_EVENT, onNotesSync);
  }, [updateSetting]);

  // Clear debounce timer on unmount to prevent stale writes after widget removal.
  useEffect(() => () => clearTimeout(saveTimerRef.current), []);

  const localNote = localNotes[localIdx] ?? { id: "", text: "", updatedAt: 0 };
  const localText = localNote.text;
  const total = localNotes.length;
  const { titleLine, bodyText } = splitNote(localText);
  const wordCount = bodyText.trim() ? bodyText.trim().split(/\s+/).length : 0;

  // ── Change handlers ──────────────────────────────────────────────────────────
  const persist = useCallback(
    (next) => {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(
        () => updateSetting("notes", next),
        600,
      );
    },
    [updateSetting],
  );

  const handleTitleChange = useCallback(
    (e) => {
      const val = e.target.value.replaceAll("\n", "");
      setLocalNotes((prev) => {
        const cur = prev[localIdx] ?? { id: "", text: "", updatedAt: 0 };
        const { bodyText: prevBody } = splitNote(cur.text);
        const newText = mergeNote(val, prevBody);
        const next = [...prev];
        next[localIdx] = { ...cur, text: newText, updatedAt: Date.now() };
        persist(next);
        notesSync.onNoteChanged(cur.id, newText);
        return next;
      });
    },
    [localIdx, persist],
  );

  // Called by LexicalEditor whenever the body markdown changes
  const handleBodyChange = useCallback(
    (md) => {
      setLocalNotes((prev) => {
        const cur = prev[localIdx] ?? { id: "", text: "", updatedAt: 0 };
        const { titleLine: prevTitle } = splitNote(cur.text);
        const newText = mergeNote(prevTitle, md);
        const next = [...prev];
        next[localIdx] = { ...cur, text: newText, updatedAt: Date.now() };
        persist(next);
        notesSync.onNoteChanged(cur.id, newText);
        return next;
      });
    },
    [localIdx, persist],
  );

  // Widget card textarea — preserves the title (first line), updates body only
  const handleWidgetTextChange = useCallback(
    (e) => {
      const val = e.target.value;
      setLocalNotes((prev) => {
        const cur = prev[localIdx] ?? { id: "", text: "", updatedAt: 0 };
        const { titleLine: prevTitle } = splitNote(cur.text);
        const newText = mergeNote(prevTitle, val);
        const next = [...prev];
        next[localIdx] = { ...cur, text: newText, updatedAt: Date.now() };
        persist(next);
        notesSync.onNoteChanged(cur.id, newText);
        return next;
      });
    },
    [localIdx, persist],
  );

  // ── Navigation ────────────────────────────────────────────────────────────────
  const jumpTo = useCallback(
    (n) => {
      setLocalIdx(n);
      updateSetting("idx", n);
    },
    [updateSetting],
  );

  const goPrev = useCallback(() => {
    if (localIdx > 0) jumpTo(localIdx - 1);
  }, [localIdx, jumpTo]);
  const goNext = useCallback(() => {
    if (localIdx < total - 1) jumpTo(localIdx + 1);
  }, [localIdx, total, jumpTo]);

  const addNote = useCallback(() => {
    const note = { id: makeNoteId(), text: "", updatedAt: Date.now() };
    const newNotes = [...localNotes, note];
    const newIdx = newNotes.length - 1;
    setLocalNotes(newNotes);
    setLocalIdx(newIdx);
    updateSetting("notes", newNotes);
    updateSetting("idx", newIdx);
    notesSync.onNoteChanged(note.id, "");
  }, [localNotes, updateSetting]);

  const deleteNote = useCallback(() => {
    const removed = localNotes[localIdx];
    if (total <= 1) {
      // "Clear note" — empty the current note but keep its identity.
      const cleared = removed
        ? { ...removed, text: "", updatedAt: Date.now() }
        : { id: makeNoteId(), text: "", updatedAt: Date.now() };
      const next = [cleared];
      setLocalNotes(next);
      setLocalIdx(0);
      updateSetting("notes", next);
      updateSetting("idx", 0);
      notesSync.onNoteChanged(cleared.id, "");
      return;
    }
    const newNotes = localNotes.filter((_, i) => i !== localIdx);
    const newIdx = Math.min(localIdx, newNotes.length - 1);
    setLocalNotes(newNotes);
    setLocalIdx(newIdx);
    updateSetting("notes", newNotes);
    updateSetting("idx", newIdx);
    if (removed) notesSync.onNoteDeleted(removed.id);
  }, [localNotes, localIdx, total, updateSetting]);

  // ── Mode ──────────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState("widget");
  const titleRef = useRef(null);
  const bodyRef = useRef(null);
  const hasAutoFocusedRef = useRef(false);

  const openPage = useCallback(() => {
    hasAutoFocusedRef.current = false;
    setMode("page");
  }, []);
  const close = useCallback(() => setMode("widget"), []);

  // Auto-focus on first entry to page mode
  useEffect(() => {
    if (mode !== "page") return;
    const timer = setTimeout(() => {
      if (hasAutoFocusedRef.current) return;
      hasAutoFocusedRef.current = true;
      if (!titleLine.trim()) titleRef.current?.focus();
      else bodyRef.current?.focus();
    }, 60);
    return () => clearTimeout(timer);
  }, [mode, titleLine]);

  useEffect(() => {
    if (mode === "widget") return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mode, close]);

  // ── Sync indicator (full-screen) ──────────────────────────────────────────
  const [syncConnected, setSyncConnected] = useState(() => isConnected());
  const [syncing, setSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState(null); // 'synced' | 'already' | null
  const syncTimerRef = useRef(null);

  useEffect(() => {
    const refresh = () => setSyncConnected(isConnected());
    return syncEngine.onSyncChange(refresh);
  }, []);

  useEffect(() => () => clearTimeout(syncTimerRef.current), []);

  const handleSyncNow = async () => {
    if (syncing || !syncConnected) return;
    setSyncing(true);
    setSyncFeedback(null);
    clearTimeout(syncTimerRef.current);
    try {
      const result = await syncEngine.forceSync();
      setSyncFeedback(result?.changed ? 'synced' : 'already');
    } catch {
      setSyncFeedback('already');
    } finally {
      setSyncing(false);
      syncTimerRef.current = setTimeout(() => setSyncFeedback(null), 2500);
    }
  };

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

  // Sync button — separated from the note-nav controls, shown at the far right
  // of the top bar when GitHub sync is connected.
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

  // ── Full-screen ──────────────────────────────────────────────────────────────
  const pageOverlay =
    mode === "page" &&
    createPortal(
      <div className="fixed inset-0 flex flex-col notes-fullscreen">
        <div className="notes-fullscreen-topbar">
          <button
            onClick={close}
            aria-label="Back to widget"
            className="notes-fullscreen-back-btn"
          >
            <ArrowLeft size={13} />
            <span>Notes</span>
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
                key={localNote.id}
                ref={bodyRef}
                value={bodyText}
                onChange={handleBodyChange}
                placeholder="Start typing…"
                autoFocus={
                  mode === "page" && !titleLine.trim() ? false : mode === "page"
                }
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

  return (
    <>
      {widgetCard}
      {pageOverlay}
    </>
  );
};
