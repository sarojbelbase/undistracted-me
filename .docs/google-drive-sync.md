# Google Drive Sync — Migration Feasibility Research

> **Status:** Research → **Implemented** (see [`app/utilities/syncTransport.js`](../app/utilities/syncTransport.js) + [`sync-architecture.md`](./sync-architecture.md))
> **Applies to:** `app/utilities/syncEngine.js`, `app/utilities/syncTransport.js`, `app/utilities/notesSync.js`
> **Scope:** migrating cross-device config + notes sync from GitHub Gists to Google Drive `appDataFolder`

This document assesses the feasibility of moving the "Undistracted Me" cross-device
sync layer from GitHub Gists to Google Drive. It is grounded **only** in official
Google/Chrome developer documentation, cited inline. It answers eight research
questions, gives a feasibility verdict, a Gist-vs-Drive comparison, a concrete
migration plan, and a dedicated multi-device-benefits + risks section.

> **Source note:** two URLs in the brief 404 on Google's current site and are
> substituted with their live equivalents: `guides/changes` →
> [`guides/manage-changes`](https://developers.google.com/drive/api/guides/manage-changes),
> and `guides/ref-single-vs-multi` is no longer published (its content is covered by
> the `appdata`, `manage-uploads`, and `search-files` guides cited below).

---

## 1. Feasibility verdict

**Verdict: EASY** (transport and data model), with **one MEDIUM gate** (unifying the
OAuth client identity across Chrome and Firefox — see §8 and §10).

Reasoning:

- **The transport is a near one-for-one drop-in.** Gist `GET`/`POST`/`PATCH` map
  directly onto Drive `files.get` / `files.create` / `files.update` with `alt=media`
  media uploads. The current per-key/per-item JSON merge logic (`syncMerge.js`,
  tombstones, LWW element sets) is **transport-agnostic** and does not need to change.
- **The hard problem of the current system — cross-device discovery — disappears.**
  Gists require listing the user's gists and matching description + filename because a
  gist id is random and per-device cached. Drive's `appDataFolder` is **deterministic
  for a given Google account + app**, so there is nothing to discover.
- **The app already has Google OAuth** (Calendar/People/Tasks), so adding
  `drive.appdata` is an incremental scope, not a new auth stack.
- **The two real work items** are (a) picking a *single* OAuth client identity shared
  by Chrome and Firefox so they land in the same `appDataFolder` (§10.4), and
  (b) writing a one-shot gist→Drive importer (§9). Neither is architecturally hard,
  but (a) is a correctness gate that must be verified before launch.

---

## 2. GitHub Gist vs Google Drive — side by side

| Dimension | GitHub Gist (current) | Google Drive `appDataFolder` (proposed) |
|---|---|---|
| **Transport** | REST `GET/POST/PATCH` on gists + per-gist file blob; private gists, `gist` scope ([GitHub gists API](https://docs.github.com/en/rest/gists)) | `files.get` (`alt=media`) read; `files.create`/`files.update` (multipart media) write; `files.list` enumerate ([Drive files resource](https://developers.google.com/drive/api/reference/rest/v3/files), [manage-uploads](https://developers.google.com/drive/api/guides/manage-uploads)) |
| **Storage model** | Config gist + one gist per note; index embedded in config | `appDataFolder` (hidden, per-app): config file + one file per note; index in config file, or `appProperties` on each file ([appdata](https://developers.google.com/drive/api/guides/appdata)) |
| **Cross-device discovery** | Required: list gists, match `description` + filename; per-device `github_gist_id` cache (broken today — §Q3 of `sync-architecture.md`) | **None.** Same account + same app = same `appDataFolder`; files found deterministically by `spaces=appDataFolder` / `'appDataFolder' in parents` ([appdata](https://developers.google.com/drive/api/guides/appdata)) |
| **Multi-device behavior** | Two devices each hold their own gist until discovery is fixed | Same files visible to every device signed into the account; no registry needed for discovery ([appdata](https://developers.google.com/drive/api/guides/appdata)) |
| **Real-time / change detection** | None practical (poll gist `updated_at`) | `changes.getStartPageToken` + `changes.list` polling; push via `changes.watch`/`files.watch` but needs a server webhook ([manage-changes](https://developers.google.com/drive/api/guides/manage-changes), [push](https://developers.google.com/drive/api/guides/push)) |
| **Quotas / limits** | ~5,000 req/hr authenticated; drives the 5-min throttle | Per-min-per-user 325,000 quota units; per-day 400M units (project); tiny files = trivially within quota → near-continuous sync is feasible ([limits](https://developers.google.com/drive/api/guides/limits)) |
| **OAuth scope + consent** | `gist` (GitHub OAuth device grant, no server) | `drive.appdata` — **non-sensitive**, no restricted-scope review ([api-specific-auth](https://developers.google.com/drive/api/guides/api-specific-auth)) |
| **Auth UX** | Device-flow code, user pastes into browser | Reuses existing Google sign-in; one extra consent line for "config data in Drive" |

---

## 3. The eight research questions

### Q1 — Storage model: `appDataFolder` vs My Drive vs single JSON blob

**Answer: `appDataFolder` (the "application data folder") is the correct fit.**

The application data folder is a **hidden, per-app** folder "for app-specific data
such as configuration files", "only accessible by your app", and "hidden from the
user and from other Google Drive apps"
([appdata guide](https://developers.google.com/drive/api/guides/appdata)). The Drive
"about" overview describes it as "a dedicated Drive folder to store
application-specific data so the app cannot access all the user's content stored in
Drive" ([about-sdk](https://developers.google.com/drive/api/guides/about-sdk)).

Trade-offs:

| Option | Pros | Cons |
|---|---|---|
| **`appDataFolder`** | Purpose-built for config; hidden; non-sensitive `drive.appdata` scope; deterministic per account | Cannot share/move/trash files inside it; deleted on app uninstall; keyed per-app identity (§10.4) |
| **Regular file in My Drive** | Visible/editable by user; survives app uninstall | Pollutes user's Drive; needs `drive.file` and a way to (re)find the file on a 2nd device — reintroduces the discovery problem |
| **Single JSON file holding everything** | Fewest requests; trivial merge | One big blob re-introduces whole-file last-write-wins (the exact bug `sync-architecture.md` §Q2 set out to fix); large notes churn the whole file |

**Does `appData` need cross-device "discovery" like gists? No.** The folder is
"created per third-party app" and "automatically created when you attempt to create a
file in it" ([appdata](https://developers.google.com/drive/api/guides/appdata)). It is
**deterministically the same for a given Google account + app** — there is no random
id to discover. The app finds its own files with `files.list?spaces=appDataFolder` or
`q = 'appDataFolder' in parents` ([appdata](https://developers.google.com/drive/api/guides/appdata),
[search-files](https://developers.google.com/drive/api/guides/search-files)).

**Recommended layout:** one `undistracted-me-sync.json` config file + one file per
note, all in `appDataFolder`, exactly mirroring today's config-gist + per-note-gist
structure. Keep the notes index in the config file (or also tag note files with
`appProperties` — see Q3).

### Q2 — OAuth scope: least-privilege AND sufficient, plus consent classification

**Answer: `https://www.googleapis.com/auth/drive.appdata` is both least-privilege
and sufficient, and it is NON-sensitive.**

The Drive-specific auth guide classifies Drive scopes into three tiers
([api-specific-auth](https://developers.google.com/drive/api/guides/api-specific-auth)):

- **Non-sensitive:** `drive.appdata` / `drive.appfolder` ("View and manage the app's
  own configuration data in your Google Drive"), `drive.file`, `drive.install`.
- **Sensitive:** `drive.apps.readonly`.
- **Restricted:** `drive`, `drive.readonly`, `drive.metadata`, `drive.metadata.readonly`,
  `drive.activity*`, `drive.meet.readonly`, `drive.scripts`.

The OAuth scopes reference confirms the description — `drive.appdata`: "See, create,
and delete its own configuration data in your Google Drive"
([oauth2 scopes — Google Drive API section](https://developers.google.com/identity/protocols/oauth2/scopes#drive)).

Why `drive.appdata` beats the alternatives for this app:

- **`drive`** is restricted ("View and manage **all** your Drive files"). Using it
  would trigger restricted-scope OAuth verification and, if data is stored/transmitted
  on servers, a security assessment
  ([api-specific-auth](https://developers.google.com/drive/api/guides/api-specific-auth)).
  This is the one to **avoid**.
- **`drive.file`** is non-sensitive but grants per-file access to files "you open with
  an app or that the user shares with an app via the Picker" — it is *not* the right
  tool for a hidden config store, and does not grant `appDataFolder` access at all
  (that folder requires `drive.appdata` specifically)
  ([appdata](https://developers.google.com/drive/api/guides/appdata),
  [api-specific-auth](https://developers.google.com/drive/api/guides/api-specific-auth)).

`drive.appdata` alone authorizes read/write of the app's own files in `appDataFolder`
on every device the same account signs into — the `files.get`, `files.create`,
`files.update`, `files.list`, and `changes.list` methods all list `drive.appdata`
among their accepted scopes ([changes.list reference](https://developers.google.com/drive/api/reference/rest/v3/changes/list)).

**Consent impact:** because it is non-sensitive, only **basic app verification** is
required — no sensitive/restricted-scope review and no security assessment
([configure-oauth-consent](https://developers.google.com/workspace/guides/configure-oauth-consent)).
The scope must be declared on the Cloud Console OAuth consent screen *and* requested
by the app at runtime ([api-specific-auth](https://developers.google.com/drive/api/guides/api-specific-auth)).

### Q3 — Transport mapping: Drive verbs vs gist operations

| Gist operation (current) | Drive equivalent | Notes |
|---|---|---|
| Read gist file (`GET /gists/{id}`) | `files.get` with `alt=media` | Returns raw file bytes; without `alt=media` it returns metadata only ([appdata](https://developers.google.com/drive/api/guides/appdata), [manage-uploads](https://developers.google.com/drive/api/guides/manage-uploads)) |
| Create gist (`POST /gists`) | `files.create` with `parents: ["appDataFolder"]`, media upload | Use `uploadType=multipart` (≤5 MB) — JSON metadata + media in one request; `resumable` also works for small files at +1 request ([appdata](https://developers.google.com/drive/api/guides/appdata), [manage-uploads](https://developers.google.com/drive/api/guides/manage-uploads)) |
| Patch gist (`PATCH /gists/{id}`) | `files.update` (`PATCH /files/{fileId}`) with media | Full content replace of the blob; metadata-only updates via bare `PATCH` ([manage-uploads](https://developers.google.com/drive/api/guides/manage-uploads)) |
| List gists / discover (`GET /gists`) | `files.list?spaces=appDataFolder` or `q = 'appDataFolder' in parents` | Deterministic; no description/filename matching needed ([appdata](https://developers.google.com/drive/api/guides/appdata), [search-files](https://developers.google.com/drive/api/guides/search-files)) |
| (n/a — no metadata in gists) | `appProperties` (private per-app key/value) on each file | Tag note files with `{ noteId }` / `{ schemaVersion }` and search with `appProperties has { key='…' and value='…' }` ([properties](https://developers.google.com/drive/api/guides/properties), [search-files](https://developers.google.com/drive/api/guides/search-files)) |

**Per-note file vs single config file:** both are first-class. Because a Drive file is
the same `File` resource regardless of parent, a per-note file is created exactly like
the config file, just with a different `name` (and optionally an `appProperties.noteId`
tag). The notes index (currently in the config gist) can stay in the config file, or
be replaced by an `appProperties` search — `appProperties` is private to the app,
retrievable only with an OAuth token (not an API key), capped at 30 private properties
and 124 bytes per key+value per file
([properties](https://developers.google.com/drive/api/guides/properties)).

**Finding the app's files:** `files.list?spaces=appDataFolder` returns everything in
the folder; `q` filters by `name`, `appProperties`, or `'appDataFolder' in parents`
([appdata](https://developers.google.com/drive/api/guides/appdata),
[search-files](https://developers.google.com/drive/api/guides/search-files)).

### Q4 — Multi-device benefits (see §8 for the full section)

Concretely, a single Google account makes the **same** `appDataFolder` (and therefore
the same config + note files) visible on every device the account signs into — there
is no per-device file id and no discovery. This eliminates the current `github_gist_id`
localStorage cache and the entire "list gists → match description + filename → adopt
oldest → delete duplicates" machinery (`sync-architecture.md` §3, Phase 1).

**Is a device registry still needed?** Not for *discovery* (that need is gone). It
remains *useful* — but optional — for the same reasons it exists today: as a container
for per-device clock/state to support the LWW merge and future conflict surfacing. It is
no longer a correctness requirement.

### Q5 — Real-time / change detection: push vs poll

Drive offers both `changes.list` polling and push notifications
([manage-changes](https://developers.google.com/drive/api/guides/manage-changes),
[push](https://developers.google.com/drive/api/guides/push)):

- **Push (`files.watch` / `changes.watch`):** requires setting up a "webhook" receiving
  URL — "an HTTPS server" with a **valid SSL certificate** ("self-signed… untrusted…
  revoked… subject doesn't match hostname" are all invalid) that Drive POSTs
  notifications to ([push](https://developers.google.com/drive/api/guides/push)). **A
  browser extension has no such server**, so push is **not viable** for this app.
- **Poll (`changes.getStartPageToken` → `changes.list` with a page token):** fully
  client-side and works from an extension. Store the start page token, call
  `changes.list`, then store `newStartPageToken` for the next poll
  ([manage-changes](https://developers.google.com/drive/api/guides/manage-changes)).
  `changes.list` supports `spaces='appDataFolder'`, and note `restrictToMyDrive=true`
  **omits** Application Data folder changes — so leave it off (default) to see appData
  changes ([changes.list reference](https://developers.google.com/drive/api/reference/rest/v3/changes/list)).

**Reasonable polling interval:** `changes.list` costs **100 quota units** and
`changes.getStartPageToken`/`channels.stop` cost 5 each; the per-user-per-minute budget
is **325,000 units** ([limits](https://developers.google.com/drive/api/guides/limits)).
A poll every 30–60 s is utterly negligible; even per-second polling of a few files
stays far under budget. A 1-minute (or even 30-second) poll is both safe and far more
"continuous" than today's daily + 5-min throttle. There is no separate request-count
cap for Drive the way GitHub's ~5000 req/hr exists — the binding limit is quota units.

### Q6 — Quotas & limits: relaxing the throttle

**Answer: yes, the 5-minute throttle can be relaxed to near-continuous sync.**

Drive quotas (as of the May 1 2026 revision)
([limits](https://developers.google.com/drive/api/guides/limits)):

| Limit | Value |
|---|---|
| Per minute per project | 1,000,000 quota units |
| Per minute per user per project | 325,000 quota units |
| Per day per project | 1 TB egress / 400,000,000 quota units (billing threshold) |

Per-method quota-unit cost ([limits](https://developers.google.com/drive/api/guides/limits)):

| Method | Cost |
|---|---|
| `files.get` (metadata, no `alt=media`) | 5 |
| `files.list` / `changes.list` / `*.watch` | 100 |
| `files.create` / `files.update` / `files.patch` | 50 |
| `files.get` with `alt=media` (download) | 200 |
| `changes.getStartPageToken`, `channels.stop` | 5 |

A full sync cycle (one `changes.list` = 100, plus a handful of `files.get alt=media` =
200 each) costs on the order of a few hundred units. Even 1,000 full sync cycles/day
would use < 0.1% of the daily budget. GitHub's authenticated ~5,000 req/hr cap is the
reason for today's throttle; Drive has no equivalent per-user request ceiling — the
5-minute throttle can safely drop to a **1-minute poll + change-driven pull**, or an
even shorter interval, without risking quota.

**Size limits:** individual uploads up to **5 TB** (and only the first file over the
limit completes); Google Workspace users may upload 750 GB/day across My Drive/shared
drives ([limits](https://developers.google.com/drive/api/guides/limits)). For JSON
config/notes this is irrelevant. There is no documented special per-file cap for
`appDataFolder` beyond these general Drive limits — it consumes the user's Drive
storage quota.

### Q7 — Migration path

**Answer: an additive, verify-then-delete sequence.** The app already holds the GitHub
token and can read every gist, so the import is fully client-side.

1. **Freeze GitHub writes** (or just run the import in a one-shot mode): read the
   config gist and all per-note gists via the existing GitHub client.
2. **Write to Drive** using `files.create` with `parents:["appDataFolder"]` for each
   logical file: one `undistracted-me-sync.json` (config, incl. notes index) + one file
   per note (`undistracted-me-note-<noteId>.json`), each tagged with an
   `appProperties` marker (e.g. `umType`, `noteId`, `schemaVersion`).
3. **Verify** with `files.list?spaces=appDataFolder` + `files.get alt=media` and
   re-run the merge/pull path to confirm the data round-trips identically.
4. **Keep gists as a read-only backup** for one release; only then (optionally) delete
   them. Deleting is destructive and non-essential — leaving the gists in place costs
   nothing and gives an instant rollback.
5. **Flip the runtime transport** behind the existing abstraction: the merge layer
   (`syncMerge.js`) is untouched; only the read/create/update/list primitives change.

Least-risk sequence: write → verify → parallel-read for one release → retire gists. At
no point is existing data deleted before the Drive copy is verified.

### Q8 — Auth / CORS: manifest `host_permissions`, origins, and the OAuth client

**Origins to allow in `host_permissions`** (from the endpoints the guides use):

- `https://www.googleapis.com/*` — the REST API surface (`/drive/v3/files`,
  `/drive/v3/changes`, `/drive/v3/channels/stop`).
- `https://content.googleapis.com/*` — the media/upload host used by `files.create`
  (the `appdata` guide's curl uploads hit `content.googleapis.com/drive/v3/files`)
  ([appdata](https://developers.google.com/drive/api/guides/appdata)).
- The `/upload/…` URI for media uploads is `https://www.googleapis.com/upload/drive/v3/files`
  ([manage-uploads](https://developers.google.com/drive/api/guides/manage-uploads)) —
  covered by the `www.googleapis.com` host permission above.

**Token acquisition (Chrome):** `chrome.identity.getAuthToken` uses "the client ID and
scopes specified in the `oauth2` section of manifest.json", and the Identity API caches
tokens and handles expiry. The Drive scope must therefore be added **both** to the
manifest `oauth2.scopes` **and** to the OAuth client's consent configuration. Passing a
`scopes` array in `TokenDetails` overrides the manifest scopes for that call
([chrome identity reference](https://developer.chrome.com/docs/extensions/reference/api/identity)).
The `identity` permission is required.

**Cloud Console:** the scope must be declared on the OAuth consent screen
([api-specific-auth](https://developers.google.com/drive/api/guides/api-specific-auth),
[configure-oauth-consent](https://developers.google.com/workspace/guides/configure-oauth-consent)).
`drive.appdata` is non-sensitive, so no restricted-scope verification — but the client
identity question in §10.4 is the real gate.

---

## 4. Migration plan — Drive file mapping

| Current (GitHub Gist) | New (Drive `appDataFolder`) | `name` | `appProperties` (optional) |
|---|---|---|---|
| Config gist `undistracted-me-sync.json` | One config file | `undistracted-me-sync.json` | `{ umType: "config", schemaVersion: "<v>" }` |
| Per-note gist `undistracted-me-note.json` | One file per note | `undistracted-me-note-<noteId>.json` | `{ umType: "note", noteId: "<id>" }` |
| Notes index (inside config gist) | Keep inside config file **or** derive from `appProperties` search | — | — |
| `github_gist_id` (per-device cache) | **Removed.** Files found via `spaces=appDataFolder` | — | — |

The merge, tombstone, and LWW logic (`syncMerge.js`, schema-versioning) is **unchanged**
— it operates on the JSON payloads, not on the transport.

---

## 5. Multi-device benefits

1. **No discovery.** The `appDataFolder` is the same for a given account + app, on
   every device. The "second device creates a brand-new gist" bug
   (`sync-architecture.md` §Q3) cannot occur — there is no per-device id to cache.
2. **No duplicate/race cleanup.** Phase 3.3 (delete duplicate sync gists, adopt oldest)
   becomes obsolete; there is exactly one folder and one set of files.
3. **One account, one source of truth.** Any device signed into the same Google account
   reads/writes the same files, matching how Calendar/People/Tasks already behave in
   this app.
4. **Simpler state.** The `github_gist_id` localStorage key, the description+f filename
   matching heuristic, and the 404→"recreate" recovery path all disappear.
5. **Near-continuous convergence.** Without GitHub's 5,000 req/hr ceiling, devices can
   poll `changes.list` on a 1-minute (or shorter) cadence and pull immediately after a
   remote edit — dramatically shrinking the "stale device" window.

The one new requirement (flagged in §10.4): Chrome and Firefox must resolve to the
**same** OAuth client identity, or they will each get their **own** `appDataFolder`.

---

## 6. Risks & caveats

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| 1 | **OAuth consent verification** — choosing `drive`/`drive.readonly`/`drive.metadata` would be *restricted* and trigger restricted-scope verification (+ security assessment if data stored/transmitted) ([api-specific-auth](https://developers.google.com/drive/api/guides/api-specific-auth)) | High (launch blocker) | Use `drive.appdata` (non-sensitive). Only basic verification required. |
| 2 | **Push notifications not viable for an extension** — `files.watch`/`changes.watch` need an HTTPS webhook server with a valid cert ([push](https://developers.google.com/drive/api/guides/push)) | Med | Poll `changes.list` with a page token; renew on a timer. |
| 3 | **`appDataFolder` lifecycle** — "deleted when a user uninstalls your app from their My Drive"; users can also delete it manually; files in it can't be shared/moved/trashed ([appdata](https://developers.google.com/drive/api/guides/appdata)) | Med (data loss on uninstall) | Document; treat "uninstall = wipe app config" as intended; keep a one-shot export. |
| 4 | **Per-app identity = Chrome vs Firefox** — the folder is "created per third-party app" and "only the application that created the data… can access it" ([appdata](https://developers.google.com/drive/api/guides/appdata)). Chrome (`chrome.identity.getAuthToken`) and Firefox (PKCE + server-side exchange) currently use *different* OAuth clients | High (silent split-brain across browsers) | Unify on a **single OAuth client ID** (and same scopes) across both browsers before shipping, or cross-browser Drive sync silently diverges. |
| 5 | **Quota model change (May 2026)** — Drive quota limits were revised; new projects get the new quotas; per-day billing threshold now exists ([limits](https://developers.google.com/drive/api/guides/limits)) | Low | Volumes here are tiny; still wrap calls with exponential backoff on `403`/`429`. |
| 6 | **`appProperties` limits** — max 30 private props/file, 124 bytes per key+value ([properties](https://developers.google.com/drive/api/guides/properties)) | Low | Only store short ids/tags, not content. |
| 7 | **No server-side conflict resolution** — Drive does not merge JSON; LWW still client-side | Med (same as today) | Reuse existing merge layer; unchanged. |

---

## 7. Primary sources consulted

- https://developers.google.com/drive/api/guides/about-sdk
- https://developers.google.com/drive/api/guides/appdata
- https://developers.google.com/drive/api/guides/api-specific-auth
- https://developers.google.com/drive/api/reference/rest/v3/files
- https://developers.google.com/drive/api/guides/manage-uploads
- https://developers.google.com/drive/api/guides/manage-changes (was `guides/changes`)
- https://developers.google.com/drive/api/guides/push
- https://developers.google.com/drive/api/guides/limits
- https://developers.google.com/identity/protocols/oauth2/scopes#drive
- https://developer.chrome.com/docs/extensions/reference/api/identity
- https://developers.google.com/workspace/guides/configure-oauth-consent
- https://developers.google.com/drive/api/guides/search-files
- https://developers.google.com/drive/api/guides/properties
- https://developers.google.com/drive/api/reference/rest/v3/changes/list

## 8. Open questions

- Do Chrome and Firefox already share one Google OAuth client ID, or must one be
  unified for `appDataFolder` to be shared across browsers? (§10.4 — verify first.)
- Prefer a 1-minute `changes.list` poll, or a plain `files.list?spaces=appDataFolder`
  + `modifiedTime` diff? (The former is cheaper and change-driven; the latter is
  simpler.)
- Keep the notes index in the config file, or migrate it to `appProperties` search?
