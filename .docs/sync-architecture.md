# Cross-Device Sync — Architecture & Edge-Case Handling

> **Status:** In progress
> **Applies to:** `src/utilities/syncEngine.js`, `src/utilities/githubAuth.js`, `src/utilities/notesSync.js`

This document explains how the current sync works, the edge cases it does and does
not handle, and the target architecture. It answers, concretely, the four questions:
first-time pull/push, key update vs config override, multi-device behaviour, and
local versioning.

---

## 1. How it works today (the mechanics)

### Transport
One **private gist** holds one file `undistracted-me-sync.json`:

```json
{ "v": 1, "deviceId": "dev_…", "updatedAt": 1699999999999,
  "keys": { "<localKey>": { "v": <value>, "t": <epochMs> } } }
```

`keys` is a map of syncable keys, each with a value `v` and a last-write timestamp `t`.

### The four questions, answered

**Q1 — "Does sync pull or push on first time?"**

`enableSync()` (runs on connect and on app load) does **pull first, then push**:

1. `pullFromSync()` reads the gist; for each key where `remote.t > local.t`,
   the remote value overwrites the local value (`local.t` starts at 0 on a fresh
   device, so *remote always wins* on first contact for any key that exists remotely).
2. `pushAll()` then compares local vs remote and pushes any key whose value differs.

So first time is **remote-wins for pre-existing keys, local-pushes for keys the
remote doesn't have**. This means: if *two* devices already hold *different* data for
the same key (e.g. different bookmarks) and the second device connects, the second
device's local data for that key is **silently discarded** (remote wins). This is the
"first-time clobber" edge case — see §3.

**Q2 — "Does it update keys, or override the whole config?"**

Both, at the wrong granularity in places:

- `notes_index` → merged **per entry** (union of `note_id`s, newer `updatedAt` wins).
- `widget_events`, `widget_bookmarks`, `countdown_pinned` → **whole array** replaced
  by whichever side has the newer `t`. Concurrent edits to *different* items lose one
  side entirely.
- `undistracted_settings`, `widget_instances` → **whole object** replaced. Concurrent
  edits to *different fields* (e.g. accent on A, language on B) lose one side.

**Q3 — "How do multiple devices work?"**

**They don't, reliably — there is a critical bug.** The gist id is stored in
`localStorage` (`github_gist_id`), which is **per-device**. On the second device,
`ensureGist()` sees no cached id and **creates a brand-new gist**. The two devices
therefore each have their own gist and never see each other's data.

Fix (§4.1): after connect, **discover** the existing gist by listing the user's gists
and matching `description === "Undistracted Me Sync"` + `undistracted-me-sync.json`.

**Q4 — "Can we account for a version number locally?"**

Not yet. The gist has a `v` field but nothing reads it, and local storage has no sync
schema version. Fix (§4.2): add `GIST_SCHEMA_VERSION`, store it in the gist *and* in a
local `sync_version` key, and run a migration hook when they mismatch.

---

## 2. Edge cases (deep)

| # | Edge case | Current behaviour | Target |
|---|-----------|-------------------|--------|
| 1 | Second device connects | Creates a separate gist (broken) | Discover existing gist |
| 2 | First connect, both devices have conflicting data for one key | Remote wins, local discarded | Per-item / per-field merge |
| 3 | Concurrent edits to different fields (settings / widgets) | Whole-object LWW loses one | Field/instance-level merge |
| 4 | Concurrent edits to different items (events / bookmarks) | Whole-array LWW loses one | Per-item union + LWW |
| 5 | Delete on A, edit on B (same key) | B's newer `t` re-adds deleted item | Tombstones (already done for notes) |
| 6 | Clock skew between devices | `Date.now()` biased | Logical clock or documented limitation |
| 7 | Schema changes over releases | No migration path | `v` check + local `sync_version` migration |
| 8 | Duplicate sync gists (race / reconnect) | Divergence | Adopt oldest match on discovery |
| 9 | Gist deleted on GitHub | 404 → treated as "no remote", next push re-creates | Recreate + re-push local (acceptable) |
| 10 | Multiple notes-widget instances | Only default instance synced | Document limitation (v1) |
| 11 | Remote written by a *newer* app version | Silently parsed as-is | Refuse/skip + warn |

---

## 3. Target architecture

### Principle: converge on a shared state, never lose data silently

- **Gist = transport.** One config gist (settings/index), plus per-note gists.
- **Merge is the unit of correctness.** Pulls and pushes both *merge*, they never
  *replace*. Last-write-wins is applied at the **finest granularity the data allows**:
  - arrays of identified items → union by `id`, LWW per item
  - objects → LWW per field / per instance
- **Deletes are first-class** via tombstones (a `{ id, deletedAt }` that survives sync).
- **Versioning** is explicit on both the gist and local storage.

### Concurrency model

- **Sync windows:** daily auto-sync + manual "Sync now", 5-min throttle after a
  successful sync. Never continuous.
- **LWW clock:** `updatedAt` per item (edit time), not per push. Clock skew accepted as
  a documented limitation for v1 (a Lamport clock is a possible later upgrade).
- **Idempotent writes:** a sync that changes nothing performs zero GitHub writes.

---

## 4. Phased tasks

### Phase 1 — Multi-device correctness (foundational) ✅ implement now
- [ ] **Task 1.1 — Gist discovery.** `ensureGist` lists the user's gists and adopts the
  existing sync gist (match description + filename, prefer oldest); verifies a cached id
  and redis covers on 404; creates only when nothing is found.
- [ ] **Task 1.2 — Schema versioning.** Add `GIST_SCHEMA_VERSION`; write it into the gist
  `v` and a local `sync_version`; read it back; add a `migrateSync(fromVersion)` hook;
  skip + warn when the remote `v` is newer than we understand.

### Phase 2 — Merge granularity (data safety)
- [ ] **Task 2.1 — Per-item merge for arrays.** events/bookmarks/countdown gain a per-item
  `updatedAt`; pull/push union by `id` with per-item LWW.
- [ ] **Task 2.2 — Field/instance merge for objects.** settings → per-field LWW;
  widget_instances → per-instance + per-widget-setting LWW.
- [ ] **Task 2.3 — Generalize tombstones.** Reuse the notes deletion model for events,
  bookmarks, and widget instances.

### Phase 3 — Robustness & UX
- [ ] **Task 3.1 — Conflict surfacing.** Report "merged N changes from other devices"
  in the sync status (no silent data loss).
- [ ] **Task 3.2 — Clock-skew policy.** Either adopt a logical clock or document the
  limitation explicitly in the privacy/ToS.
- [ ] **Task 3.3 — Duplicate-gist cleanup.** Best-effort removal of orphaned duplicate
  sync gists discovered during Phase 1.

---

## 5. Risks & mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Gist list rate limits (unauthenticated 60/h vs auth 5000/h) | Low (auth token) | List only on connect/reconnect, not per sync |
| Duplicate gist created by a connect race | Med | Deterministic "oldest wins" + Phase 3.3 cleanup |
| Per-item merge requires stable ids + timestamps on all items | Med | Add ids/`updatedAt` lazily during Phase 2 migration |
| Clock skew | Med | Document; logical clock in Phase 3 |
| Notes multi-instance out of scope | Low | Documented limitation |

## 6. Open questions
- Should silent LWW be replaced with user-facing conflict resolution, or is silent
  merge + a status note enough? (Phase 3.1)
- Do we add a Lamport/logical clock now or accept clock skew for v1? (Phase 3.2)
