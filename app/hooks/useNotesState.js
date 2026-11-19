import { useState, useRef, useEffect, useCallback } from "react";
import { useWidgetSettings } from "../widgets/useWidgetSettings";
import { WIDGET_SETTINGS_DEFAULTS } from "../constants/defaults.js";
import { splitNote, mergeNote, migrateNotes, makeNoteId } from "../utilities/noteText";
import notesSync, { NOTES_SYNC_EVENT } from "../utilities/notesSync";
import syncEngine from "../utilities/syncEngineFacade";
import syncTransport from "../utilities/syncTransport";

// ─── Migrate old string[] notes → { id, text, updatedAt }[] ─────────────────
// (splitNote / mergeNote / migrateNotes / makeNoteId come from noteText.js)
function resolveSettings(raw) {
  // `useWidgetSettings` merges the default `{ notes: [""], idx: 0 }` over the
  // stored value, so a legacy `{ text: "…" }` note arrives here as
  // `{ notes: [""], text: "…" }`. Prefer the legacy `text` string when the
  // notes array is empty/default, otherwise the user's note silently vanishes.
  const hasContent =
    Array.isArray(raw.notes) &&
    raw.notes.some((n) => (typeof n === "string" ? n : n?.text ?? "").trim() !== "");
  if (Array.isArray(raw.notes) && hasContent) {
    return { notes: migrateNotes(raw.notes), idx: raw.idx ?? 0 };
  }
  if (typeof raw.text === "string" && raw.text.trim() !== "") {
    return { notes: migrateNotes([raw.text]), idx: 0 };
  }
  return {
    notes: migrateNotes(Array.isArray(raw.notes) ? raw.notes : [""]),
    idx: raw.idx ?? 0,
  };
}

/**
 * Shared notes state + handlers — single source of truth for both the Notes
 * widget and Note Mode. Both read/write the same per-widget settings slot
 * (`widgetId`), so a note edited in one surface appears in the other and syncs
 * identically.
 *
 * Note Mode passes the canonical `"notes"` id (the seeded default widget), so
 * it shares data with the default Notes widget and the notes sync engine.
 */
export function useNotesState(widgetId) {
  const [settings, updateSetting] = useWidgetSettings(widgetId, WIDGET_SETTINGS_DEFAULTS.notes);

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

  // Bumped on "Clear note" so the LexicalEditor (keyed by note id) remounts and
  // re-syncs to empty — its ValueSyncPlugin only imports markdown on first mount.
  const [clearNonce, setClearNonce] = useState(0);

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

  // Latest-list mirror so the change handlers can read the current notes without
  // depending on `localNotes` — avoids recreating the LexicalEditor onChange
  // callbacks (and re-rendering the editor) on every keystroke.
  const localNotesRef = useRef(localNotes);
  useEffect(() => {
    localNotesRef.current = localNotes;
  }, [localNotes]);

  const handleTitleChange = useCallback(
    (e) => {
      const val = e.target.value.replaceAll("\n", "");
      const notes = localNotesRef.current;
      const cur = notes[localIdx] ?? { id: "", text: "", updatedAt: 0 };
      const { bodyText: prevBody } = splitNote(cur.text);
      const newText = mergeNote(val, prevBody);
      const next = [...notes];
      next[localIdx] = { ...cur, text: newText, updatedAt: Date.now() };
      setLocalNotes(next);
      persist(next);
      notesSync.onNoteChanged(cur.id, newText);
    },
    [localIdx, persist],
  );

  // Called by LexicalEditor whenever the body markdown changes
  const handleBodyChange = useCallback(
    (md) => {
      const notes = localNotesRef.current;
      const cur = notes[localIdx] ?? { id: "", text: "", updatedAt: 0 };
      const { titleLine: prevTitle } = splitNote(cur.text);
      const newText = mergeNote(prevTitle, md);
      const next = [...notes];
      next[localIdx] = { ...cur, text: newText, updatedAt: Date.now() };
      setLocalNotes(next);
      persist(next);
      notesSync.onNoteChanged(cur.id, newText);
    },
    [localIdx, persist],
  );

  // Widget card textarea — preserves the title (first line), updates body only
  const handleWidgetTextChange = useCallback(
    (e) => {
      const val = e.target.value;
      const notes = localNotesRef.current;
      const cur = notes[localIdx] ?? { id: "", text: "", updatedAt: 0 };
      const { titleLine: prevTitle } = splitNote(cur.text);
      const newText = mergeNote(prevTitle, val);
      const next = [...notes];
      next[localIdx] = { ...cur, text: newText, updatedAt: Date.now() };
      setLocalNotes(next);
      persist(next);
      notesSync.onNoteChanged(cur.id, newText);
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
      setClearNonce((n) => n + 1); // force editor remount so it re-syncs to empty
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

  // ── Sync indicator (full-screen) ──────────────────────────────────────────
  const [syncConnected, setSyncConnected] = useState(() => syncTransport.isConnected());
  const [syncing, setSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState(null); // 'synced' | 'already' | null
  const syncTimerRef = useRef(null);

  useEffect(() => {
    const refresh = () => setSyncConnected(syncTransport.isConnected());
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

  return {
    localNotes,
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
    handleWidgetTextChange,
    jumpTo,
    goPrev,
    goNext,
    addNote,
    deleteNote,
    syncConnected,
    syncing,
    syncFeedback,
    handleSyncNow,
    // Note Mode display settings (weather + clock + date) — read from the same
    // per-widget settings slot so the Notes widget settings drive Note Mode.
    showClock: settings.showClock,
    showWeather: settings.showWeather,
    dateFormat: settings.dateFormat,
    updateSetting,
  };
}
