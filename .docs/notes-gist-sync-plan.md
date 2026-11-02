# Notes Sync via Private Gists — Implementation Plan

> **Status:** Implemented (see `src/utilities/notesSync.js` + `src/utilities/noteText.js`)
> **Depends on:** GitHub OAuth device flow + gist transport (shipped in `abe4245`)
> **Scope:** Sync each Notes-widget note as its own discoverable, private GitHub gist,
> separate from the settings/config gist. The config gist keeps a `note_id → note_key`
> index so notes stay discoverable and identifiable across devices.

> **Known limitation:** only the *default* notes instance (`widgetSettings_notes`) is
> synced; additional notes-widget instances are out of scope for v1.

---

## 1. Objective

Today the Notes widget stores everything locally in `widgetSettings_notes` as
`{ notes: string[], idx: number }` and is **not** part of cross-device sync.

We want each note to be:

- **Synced** across devices through a private GitHub gist.
- **Discoverable as a gist** — one gist per note, with a human-readable description.
- **Separate from the config/settings gist** — note *content* lives in its own gist;
  the settings/config gist only holds a lightweight *index* of note IDs and keys.

The config gist keeps the `note_id` (gist id) + a `note_key` (a title/body-derived
label) for every note, so any device — or the user browsing `gist.github.com` — can
see what each note is without opening it.

---

## 2. Data Model

### 2.1 Note identity (stable `note_id`)

Notes currently have no stable identity (array-index based). We introduce a stable
`note_id` (UUID) so a note can be tracked across reorders, edits, and devices.

```js
// crypto.randomUUID() is available in MV3 Chrome 92+/Firefox 95+.
// Fallback: generateDeviceId()-style crypto.getRandomValues hex.
const noteId = crypto.randomUUID();
```

**Local storage migration:** on first load, upgrade `notes: string[]` to a structured
array without breaking the existing widget UI:

```js
// New persisted shape (backward-compatible):
widgetSettings_notes = {
  notes: [ { id: "…", text: "title\nbody" }, … ],
  idx: 0,
}

// migrateNotes(raw):
//   if notes are strings → map each to { id: crypto.randomUUID(), text }
//   if notes already objects → keep
```

Keeping `text` as the single `"title\nbody"` string preserves the existing
`splitNote`/`mergeNote` logic in `Widget.jsx` unchanged; only the array element type
changes from `string` to `{ id, text }`.

### 2.2 Note gist (one per note)

Each note is a standalone **private** gist:

```
gist:
  description: "Undistracted Me — <label>"
  public: false
  files:
    undistracted-me-note.json: {
      v: 1,
      id: "<note_id>",
      title: "<first line, may be empty>",
      body:  "<everything after first line>",
      updatedAt: <epochMs>
    }
```

- `title` / `body` are derived with the existing `splitNote(text)`.
- `updatedAt` is the source of truth for last-write-wins.

### 2.3 Config index (note_id → note_key)

The **config/settings gist** (`undistracted-me-sync.json`) gains a `notes` index map
inside its existing `keys` object (reusing the LWW machinery), keyed by `note_id`:

```json
{
  "v": 2,
  "deviceId": "…",
  "updatedAt": 123,
  "keys": {
    "undistracted_settings": { "v": …, "t": … },
    "widget_instances":   { "v": …, "t": … },
    "notes_index": {
      "v": {
        "<note_id>": {
          "gistId": "<github gist id>",
          "label":  "<note_key — title or body snippet>",
          "updatedAt": 123
        }
      },
      "t": 123
    }
  }
}
```

**`label` (the `note_key`) rule** — the config always stores a human-readable key so
the note is identifiable when it has *at least* a title or a body:

| Note has…                      | `label` value                              |
|--------------------------------|--------------------------------------------|
| title (first line non-empty)   | the title                                  |
| no title, but body non-empty   | first ~80 chars of body (single line)      |
| neither title nor body (empty) | `"Untitled note"`                          |

This satisfies "key to be shared in the config if the note has a title or the body —
at least one of each".

### 2.4 Local index (note_id → gist)

A new localStorage key mirrors the config index locally so the Notes widget can
resolve a note's gist without a network round-trip:

```
notes_gist_index = { "<note_id>": { gistId, label, updatedAt } }
```

This is **non-secret** (like `github_gist_id`) — it only needs the gist id + label.

---

## 3. Sync Engine Changes

Add a dedicated module `src/utilities/notesSync.js` (or extend `syncEngine.js`) that
orchestrates note gists. Reuse `githubAuth` for the token, gist headers, and
`User-Agent`.

### 3.1 Primitives

```js
// Read one note gist by id → { id, title, body, updatedAt } | { notFound: true } | null
readNoteGist(gistId)

// Create-or-update a note gist → returns { gistId }
writeNoteGist({ id, title, body, updatedAt })
  // POST /gists on first write (no gistId yet), PATCH /gists/:id otherwise

// Delete a note gist (best-effort)
deleteNoteGist(gistId)  // DELETE /gists/:id

// Read/write the config's notes index (via existing config gist)
getNotesIndex()   // parse keys.notes_index.v ?? {}
setNotesIndex(map, ts)
```

### 3.2 Flow

- **On note change (debounced/throttled):**
  1. `writeNoteGist(note)` → upsert the note's own gist.
  2. Update `notes_gist_index` locally.
  3. Update the config gist's `notes_index` entry (`{ gistId, label, updatedAt }`)
     and push it (piggyback on the existing serialized write queue).

- **On pull (daily auto-sync or manual "Sync now"):**
  1. Read config gist → `notes_index` (the map of note_id → { gistId, label, updatedAt }).
  2. For each remote note where `updatedAt > local`, `readNoteGist(gistId)` and merge
     into the local Notes widget storage.
  3. For local notes missing from the remote index (new/edited locally), push them.
  4. Detect **deletions** (local note gone, remote index still has it) and delete the
     remote gist + index entry.

- **Throttle:** note writes ride the existing **5-minute sync throttle** so a burst of
  keystrokes never spams `POST /gists`. The daily auto-sync + manual "Sync now"
  remain the primary sync windows (consistent with the shipped schedule).

### 3.3 Deletion semantics

- Deleting a note in the widget → `deleteNoteGist(gistId)` (best-effort) + remove the
  `notes_index` entry + push config.
- If `DELETE` fails (e.g. network), the index entry is still removed locally and the
  config is marked; a cleanup sweep on the next sync retries orphaned gists.
- **Never delete a gist we didn't create**: only delete gists whose description
  matches the `Undistracted Me —` prefix and whose `note.json` `id` matches.

---

## 4. Notes Widget Changes

`src/widgets/notes/Widget.jsx`:

- Load settings via `resolveSettings` (already migrates `{ text }` → `{ notes, idx }`).
  Extend it to also migrate `string[]` → `{ id, text }[]`.
- `addNote` assigns a new `crypto.randomUUID()` id.
- `deleteNote` also removes the note from `notes_gist_index` and triggers
  `notesSync.deleteNote(id)`.
- `handleTitleChange` / `handleBodyChange` / `handleWidgetTextChange` continue to
  produce `text = "title\nbody"`; after `persist`, call `notesSync.onNoteChanged(id, text)`.

`src/constants/defaults.js` — the demo/seed notes gain ids on write (no source change
needed if migration is lazy).

---

## 5. Discoverability & UI

- Each note gist description = `"Undistracted Me — <label>"`, so notes appear
  clearly in the user's `gist.github.com` list and are linkable.
- Config gist holds the `notes_index`, so the Data tab (or a future Notes-sync panel)
  can list every synced note with its `label` and a link to its gist — but the actual
  gist *file* stays hidden behind the existing "Go to config" link (consistent with the
  Data-tab redesign in `abe4245`).
- The Notes widget itself stays minimal (no new chrome); optionally a small
  "synced" affordance via `SyncStatusBadge`-style text when a note is linked to a gist.

---

## 6. Edge Cases

| Case | Handling |
|------|----------|
| Empty note (no title, no body) | Still create a gist with `label: "Untitled note"`; or skip until it has content. **Recommend: skip** — don't create gists for empty notes; create on first non-empty keystroke. |
| Note edited to empty on device A, still present on B | Last-write-wins on `updatedAt`; empty note → delete gist + index entry. |
| Reordering notes | Order is local-only (index/id stable); sync unaffected since each gist is keyed by id. |
| Two devices edit the same note offline | LWW on `updatedAt` (same as config sync). Document as a known limitation. |
| Orphaned gist (note deleted but DELETE failed) | Cleanup sweep: on next sync, delete gists in the local index marked `deleted: true`. |
| GitHub rate limit (gist POST is 60/hr unauth, 5000/hr auth) | 5-min throttle + serialized write queue; batch note-gist creation on first migration. |

---

## 7. Security & Privacy

- **Private gists only** — `public: false` always; never expose a note as public.
- **Minimal scope** — `gist` scope already covers create/read/update/delete gists;
  no new scope or backend required (device flow, no client secret, no redirect).
- **Token storage** — token stays in `chrome.storage.local`; only gist id + label
  (non-secret) are in localStorage via `notes_gist_index`.
- **No data on our servers** — note gists are written directly to GitHub's API.
- **Rate-limit hygiene** — reuse the 5-min throttle + write queue; do not fetch every
  note gist on every focus (only on daily/manual sync or when a note is opened).
- Update `api/pp-and-tos.js` §5 (GitHub Sync) to list notes as stored-in-gist data
  (already listed) and note the "one gist per note" layout.

---

## 8. Migration Path

1. On first load after upgrade, `resolveSettings` migrates `string[]` → `{ id, text }[]`,
   assigning `crypto.randomUUID()` ids. No data loss.
2. On first sync enable, lazily create a gist for each non-empty note and populate the
   config `notes_index`. (Batched, throttled, non-blocking.)
3. Empty notes are skipped until they gain content.

---

## 9. File Structure

```
src/utilities/notesSync.js          # note gist CRUD + index maintenance (new)
src/utilities/syncEngine.js         # add notes_index to SYNC_MAP + pull/push hooks
src/constants/urls.js               # (reuse GITHUB_GISTS_API)
src/constants/storageKeys.js        # add NOTES_GIST_INDEX = "notes_gist_index"
src/constants/defaults.js           # note defaults (no shape change; lazy ids)
src/widgets/notes/Widget.jsx        # stable ids + onNoteChanged/delete hooks
tests/unit/canvas/notesSync.test.js # (new) note gist CRUD + LWW + migration
tests/unit/canvas/syncEngine.test.js# notes_index round-trip
```

---

## 10. Sequencing

1. **Data model + migration** — stable ids in the Notes widget (no sync yet).
2. **notesSync module** — note gist CRUD + index, with unit tests (happy path first).
3. **Config index integration** — add `notes_index` to the config gist sync.
4. **Wire the widget** — onNoteChanged/delete hooks.
5. **UI polish** — note gist links / discoverability.
6. **Docs + legal** — update CONTEXT.md and `api/pp-and-tos.js`.
7. **Build, test, commit.**
