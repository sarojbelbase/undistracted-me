/**
 * Notes sync engine — per-note private GitHub gists.
 *
 * Each note is synced as its own private gist, discoverable separately from the
 * config/settings gist. The config gist only holds a lightweight index
 * (`notes_index`) mapping note_id → { gistId, label, updatedAt }.
 *
 * Note gist shape (`undistracted-me-note.json`):
 *   { v: 1, id, title, body, updatedAt }
 *
 * Index shape (`notes_index`, synced via syncEngine):
 *   { "<note_id>": { gistId, label, updatedAt } }
 *
 * Last-write-wins:
 *   - A note object carries `updatedAt` (its last local edit time).
 *   - The index entry carries `updatedAt` (the last known modified time).
 *   - Pull when `index.updatedAt > note.updatedAt`; push when the opposite.
 *
 * Sync is NOT continuous — note gists are written during the daily auto-sync or
 * a manual "Sync now" (via the post-sync hook registered below), never on every
 * keystroke. Editing a note only updates the local index label.
 */

import { STORAGE_KEYS } from '../constants/storageKeys';
import { GITHUB_GISTS_API } from '../constants/urls';
import { getToken, GITHUB_USER_AGENT } from './githubAuth';
import syncEngine from './syncEngine';
import { splitNote, mergeNote, noteLabel } from './noteText';

export const NOTE_GIST_FILENAME = 'undistracted-me-note.json';
export const NOTE_GIST_DESC_PREFIX = 'Undistracted Me — ';
export const NOTES_SYNC_EVENT = 'notes_sync_changed';

// ── Storage helpers ──────────────────────────────────────────────────────────

function readLocal(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Read the note content array + current idx from the notes widget storage. */
function readLocalNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.widgetSettings('notes'));
    if (!raw) return { notes: [], idx: 0 };
    const parsed = JSON.parse(raw);
    const notes = (Array.isArray(parsed.notes) ? parsed.notes : []).filter(
      (n) => n && typeof n === 'object' && typeof n.text === 'string' && n.id,
    );
    return { notes, idx: typeof parsed.idx === 'number' ? parsed.idx : 0 };
  } catch {
    return { notes: [], idx: 0 };
  }
}

/** Persist note content and notify the widget to re-read. */
function writeLocalNotes(notes, idx) {
  try {
    localStorage.setItem(
      STORAGE_KEYS.widgetSettings('notes'),
      JSON.stringify({ notes, idx }),
    );
  } catch {
    /* ignore */
  }
  try {
    globalThis.dispatchEvent(new Event(NOTES_SYNC_EVENT));
  } catch {
    /* ignore */
  }
}

/** Read the synced notes index (note_id → { gistId, label, updatedAt }). */
function readIndex() {
  const v = readLocal(STORAGE_KEYS.NOTES_INDEX);
  return v && typeof v === 'object' ? v : {};
}

/** Write the notes index to localStorage (pushed to the config gist by syncEngine). */
function writeIndex(index) {
  writeLocal(STORAGE_KEYS.NOTES_INDEX, index);
}

/** Read the deletion tombstone map (note_id → deletedAt). */
function readTombstones() {
  const v = readLocal(STORAGE_KEYS.NOTES_DELETED);
  return v && typeof v === 'object' ? v : {};
}

function addTombstone(noteId) {
  const tombstones = readTombstones();
  tombstones[noteId] = Date.now();
  writeLocal(STORAGE_KEYS.NOTES_DELETED, tombstones);
}

// ── Gist transport ──────────────────────────────────────────────────────────

const noteGistHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': GITHUB_USER_AGENT,
});

/**
 * Read a note gist and return { id, title, body, updatedAt } — or null when the
 * gist is missing or malformed.
 */
async function readNoteGist(gistId, token) {
  if (!gistId) return null;
  const res = await fetch(`${GITHUB_GISTS_API}/${gistId}`, {
    headers: noteGistHeaders(token),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Failed to read note gist (${res.status})`);
  }
  const data = await res.json();
  const file = data.files?.[NOTE_GIST_FILENAME];
  if (!file?.content) return null;
  try {
    const parsed = JSON.parse(file.content);
    return {
      id: parsed.id,
      title: parsed.title ?? '',
      body: parsed.body ?? '',
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
    };
  } catch {
    return null;
  }
}

/**
 * Create-or-update a note gist. Returns the gist id.
 * @param {{ id: string, text: string, updatedAt: number }} note
 */
async function writeNoteGist(note, existingGistId, token) {
  const { titleLine, bodyText } = splitNote(note.text);
  const updatedAt = note.updatedAt ?? Date.now();
  const payload = JSON.stringify({ v: 1, id: note.id, title: titleLine, body: bodyText, updatedAt });
  const headers = { ...noteGistHeaders(token), 'Content-Type': 'application/json' };

  if (existingGistId) {
    const res = await fetch(`${GITHUB_GISTS_API}/${existingGistId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ files: { [NOTE_GIST_FILENAME]: { content: payload } } }),
    });
    if (!res.ok) {
      throw new Error(`Failed to update note gist (${res.status})`);
    }
    return existingGistId;
  }

  const res = await fetch(GITHUB_GISTS_API, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      description: `${NOTE_GIST_DESC_PREFIX}${noteLabel(note.text)}`,
      public: false,
      files: { [NOTE_GIST_FILENAME]: { content: payload } },
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Failed to create note gist (${res.status}): ${body.message || res.statusText}`);
  }
  const created = await res.json();
  return created.id;
}

/** Best-effort delete of a note gist. */
async function deleteNoteGist(gistId, token) {
  if (!gistId) return;
  await fetch(`${GITHUB_GISTS_API}/${gistId}`, {
    method: 'DELETE',
    headers: noteGistHeaders(token),
  });
}

// ── Local edit hooks (no network — sync happens on the sync window) ──────────

/**
 * Called by the Notes widget after a note's text changes. Updates the index
 * label (and creates the entry if missing) without touching the network.
 * `updatedAt` is left as the last-synced time; the note object's own
 * `updatedAt` (set by the widget) drives last-write-wins.
 */
function onNoteChanged(noteId, text) {
  if (!noteId) return;
  const index = readIndex();
  const entry = index[noteId];
  const trimmed = (text ?? "").trim();
  // Empty and never synced — nothing to index (avoids polluting the config
  // index with "Untitled note" placeholders).
  if (!trimmed && !entry?.gistId) return;
  index[noteId] = {
    gistId: entry?.gistId ?? null,
    label: noteLabel(text),
    updatedAt: entry && typeof entry.updatedAt === 'number' ? entry.updatedAt : 0,
  };
  writeIndex(index);
}

/**
 * Called by the Notes widget after a note is deleted. Removes the index entry,
 * records a tombstone, and best-effort deletes the gist immediately (a delete
 * is a discrete user action, not continuous sync).
 */
function onNoteDeleted(noteId) {
  if (!noteId) return;
  const index = readIndex();
  const gistId = index[noteId]?.gistId;
  delete index[noteId];
  writeIndex(index);
  addTombstone(noteId);
  syncEngine.pushKey(STORAGE_KEYS.NOTES_INDEX);
  if (gistId) {
    getToken()
      .then((token) => (token ? deleteNoteGist(gistId, token) : null))
      .catch(() => {});
  }
}

// ── Full reconcile (runs on the daily / manual sync window) ─────────────────

/** Pull one remote note and merge into the local list. */
async function pullRemoteNote(entry, token, nextNotes) {
  const remote = await readNoteGist(entry.gistId, token);
  if (!remote) return false; // 404 or malformed — treat as absent
  const idx = nextNotes.findIndex((n) => n.id === (remote.id || entry.gistId));
  const note = {
    id: remote.id,
    text: remote.title ? mergeNote(remote.title, remote.body) : remote.body || '',
    updatedAt: remote.updatedAt,
  };
  if (idx === -1) nextNotes.push(note);
  else nextNotes[idx] = note;
  return true;
}

/**
 * Reconcile local notes with the per-note gists and the synced index.
 * Pulls newer remote notes, pushes newer local notes, and prunes stale entries.
 */
async function syncNotes() {
  if (!syncEngine.isSyncEnabled()) return;
  const token = await getToken();
  if (!token) return;

  const { notes, idx } = readLocalNotes();
  const index = readIndex();
  const tombstones = readTombstones();

  const nextNotes = notes.map((n) => ({ ...n }));
  let changed = false;

  // 1. Push / pull each local note.
  for (const note of nextNotes) {
    const entry = index[note.id];
    const noteTs = note.updatedAt ?? 0;

    // Empty note → never synced; drop any stale gist.
    if (!note.text || !note.text.trim()) {
      if (entry?.gistId) {
        deleteNoteGist(entry.gistId, token).catch(() => {});
        delete index[note.id];
        changed = true;
      }
      continue;
    }

    if (entry && typeof entry.updatedAt === 'number' && entry.updatedAt > noteTs) {
      // Remote is newer → pull.
      try {
        const remote = await readNoteGist(entry.gistId, token);
        if (remote) {
          note.text = remote.title ? mergeNote(remote.title, remote.body) : remote.body || '';
          note.updatedAt = remote.updatedAt;
          changed = true;
        }
      } catch (err) {
        console.error('[notes-sync] pull failed:', err.message);
      }
    } else if (!entry?.gistId || noteTs > (entry?.updatedAt ?? 0)) {
      // Local is newer (or never synced) → push.
      try {
        const gistId = await writeNoteGist(note, entry?.gistId, token);
        index[note.id] = { gistId, label: noteLabel(note.text), updatedAt: noteTs };
        changed = true;
      } catch (err) {
        console.error('[notes-sync] push failed:', err.message);
      }
    }
  }

  // 2. Remote-only notes (in the index but not local) → pull, unless tombstoned.
  const localIds = new Set(nextNotes.map((n) => n.id));
  for (const [id, entry] of Object.entries(index)) {
    if (localIds.has(id) || !entry?.gistId) continue;
    const tomb = tombstones[id];
    if (tomb && entry.updatedAt <= tomb) continue; // locally deleted — don't re-pull
    try {
      const pulled = await pullRemoteNote(entry, token, nextNotes);
      if (pulled) changed = true;
    } catch (err) {
      console.error('[notes-sync] remote pull failed:', err.message);
    }
  }

  // 3. Persist + propagate.
  if (changed) {
    writeLocalNotes(nextNotes, idx);
    writeIndex(index);
    syncEngine.pushKey(STORAGE_KEYS.NOTES_INDEX);
  }

  return { changed };
}

// ── Module init ──────────────────────────────────────────────────────────────

// Run the full reconcile after each full sync cycle (daily auto-sync + manual).
syncEngine.registerSyncHook(syncNotes);

const notesSync = {
  onNoteChanged,
  onNoteDeleted,
  syncNotes,
  readLocalNotes,
};

export default notesSync;
