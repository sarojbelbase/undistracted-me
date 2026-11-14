/**
 * Pure note-text helpers shared by the Notes widget and the notes sync engine.
 *
 * A note is stored locally as a single string `"title\nbody"` and split into
 * `title` (first line) and `body` (everything after the first newline) for the
 * gist payload. These functions are the single source of truth for that split
 * so the widget and the sync layer can never disagree on the shape.
 *
 * Keep this module PURE — no React / DOM / bootstrap-icons imports.
 */

/** Split a note string into title (first line) and body (rest). */
export function splitNote(text = "") {
  const t = text ?? "";
  const nl = t.indexOf("\n");
  if (nl === -1) return { titleLine: t, bodyText: "" };
  return { titleLine: t.slice(0, nl), bodyText: t.slice(nl + 1) };
}

/** Merge title + body back into a single string (no trailing \n when body is empty). */
export function mergeNote(title, body) {
  if (!body) return title;
  return `${title}\n${body}`;
}

/**
 * Human-readable label for a note — used as the gist description and as the
 * `note_key` stored in the config index. Rules (at least one of title/body):
 *   - title present        → the title
 *   - no title, body only  → first ~80 chars of the body, flattened to one line
 *   - neither              → "Untitled note"
 */
export function noteLabel(text = "") {
  const { titleLine, bodyText } = splitNote(text ?? "");
  const title = titleLine.trim();
  if (title) return title;
  const body = bodyText.trim();
  if (body) return body.replace(/\s+/g, " ").slice(0, 80);
  return "Untitled note";
}

/**
 * Generate a stable, collision-resistant note id.
 * Prefers crypto.randomUUID() (MV3 Chrome 92+ / Firefox 95+); falls back to a
 * crypto-random timestamped id for older runtimes.
 */
export function makeNoteId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return `note_${Date.now().toString(36)}_${buf[0].toString(36)}`;
}

/**
 * Migrate a raw notes array into stable `{ id, text, updatedAt }` objects.
 *
 * Handles three historical shapes transparently:
 *   - `string[]`                    → assigns a fresh id + edit time to each string
 *   - `{ id, text }[]` (new shape)  → keeps existing ids, fills in missing ones
 *   - anything else / malformed     → coerces to an empty note
 *
 * `updatedAt` is the note's last-modified time (epoch ms), used for
 * last-write-wins when syncing. Notes migrated from strings are stamped with
 * the migration time so they sync on the next window.
 *
 * Idempotent: running it twice over already-migrated notes is a no-op.
 */
export function migrateNotes(notes) {
  if (!Array.isArray(notes)) return [];
  return notes.map((n) => {
    if (typeof n === "string") {
      return { id: makeNoteId(), text: n, updatedAt: Date.now() };
    }
    if (n && typeof n === "object" && typeof n.text === "string") {
      return {
        id: n.id || makeNoteId(),
        text: n.text,
        updatedAt: typeof n.updatedAt === "number" ? n.updatedAt : Date.now(),
      };
    }
    return { id: makeNoteId(), text: "", updatedAt: Date.now() };
  });
}
