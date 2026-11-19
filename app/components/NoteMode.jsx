import { useNotesState } from "../hooks/useNotesState";
import { NoteEditor } from "./notes/NoteEditor";

/**
 * Note Mode — a third launch view alongside Canvas and Focus.
 *
 * Mounts only the shared note editor, nothing else (no widgets, no clock, no
 * search). Reads/writes the canonical note data (`widgetId` "notes") so it is
 * the same note as the Notes widget and the notes sync engine.
 */
export const NoteMode = ({ onExit }) => {
  const notes = useNotesState("notes");
  return <NoteEditor notes={notes} onExit={onExit} exitLabel="Canvas" />;
};
