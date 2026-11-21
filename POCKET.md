# TASK: Build "Pocket", a text-saving widget for the Undistracted Me browser extension

## 0. How to work (read first)

You are extending an existing, shipped browser extension (Chrome + Firefox, React widgets on a new-tab page). Do not rebuild or restyle anything that already exists.

Step 1. Investigate before writing code. Open and read:
- where widgets are declared/registered
- the existing RSS Digest widget: component, styles, size handling, settings menu, expanded/full view, empty state and how it groups items by source
- src/theme/profiles.js (card profiles: paper, glass, comic) and accents.js (default accent: Matte Black)
- shared UI primitives (card, modal, button, chip, tooltip, toast, icons)
- the manifest file(s), the background/service worker and any existing storage helpers

Step 2. Reply with at most 15 lines: what you found, what you will reuse and any conflicts. Ask at most 3 questions, and only if truly blocking. Otherwise state your assumption and proceed.

Step 3. Implement Phase 1 completely, then STOP. Give me a summary and a manual test checklist. Do not start Phase 2 until I say so.

Rules:
- Small focused edits. No wholesale rewrites of existing files.
- No new dependencies unless unavoidable (justify each in one line).
- No hard-coded colors, radii, shadows, fonts or spacing. Use theme tokens only.
- Do not change how existing widgets behave.
- Match the repo's existing code style, naming and folder conventions.
- Output format: list of files created/changed, then full code for new files and diffs for changed files.

## 1. Product in one paragraph

Pocket is where small, text-only things go so you don't lose them: a link, a blog URL, a word, a sentence, a paragraph, a code snippet. Right-click anything on a page, choose "Save to Pocket" and it lands in the Pocket widget on the new tab, auto-sorted by type and by website and optionally filed into folders you create. Think Instagram's Save with collections, but for text and calm.

Job to be done: "When I come across something worth keeping while reading or working, let me save it in one gesture without leaving the page and let me find it again in seconds."

Principles:
1. One gesture to save, zero decisions at save time. Organizing is optional and happens later.
2. Calm. No red badges, streaks, nags or "you have 47 unread" pressure.
3. Text only. Never save images, video, audio or files.
4. Local-first. Fully works offline. Google Drive sync is opt-in (Phase 2).
5. Consistent. It must look like it was always part of Undistracted Me.

Theme statement: quiet, tactile, pocket-sized.

## 2. Phases

Phase 1 (build now, local only): context-menu save, store, widget (Recent / All / Sites), type filters, user folders, search, quick-add, copy/open/delete + undo, empty states, settings, Export/Import JSON, theme support.
Phase 2 (later, on my go-ahead): Google Drive sync.
Phase 3 (do NOT build; just keep the data model compatible): folder submenu inside the context menu, keyboard shortcut to save, "open at quote" using text fragments, pin/star, multi-select, tags, "resurface an old save" line.

## 3. Saving flow (service worker)

3.1 Context menu: ONE item. id "pocket-save", title exactly "Save to Pocket", contexts ["selection","link","page"]. Never register image, video or audio contexts. Create it on install/startup the way each browser requires (Chrome contextMenus, Firefox menus/contextMenus). No submenus.

3.2 What gets saved:
- Selection: the selected text. Prefer window.getSelection().toString() via scripting.executeScript (activeTab) so line breaks and indentation survive (important for code). Fall back to info.selectionText.
- Right-click on a link (no selection): kind "link", text = the link URL, title = the link text.
- Right-click on empty page: kind "link", text = current page URL, title = page title.
- Selection wins over link/page. Every text save also records the source page.
- Only http/https URLs count as sources. If there is no valid source, host is "" and it shows under "No website".

3.3 Auto-classify with a pure function classifyKind(text, context) plus unit tests:
1. Came from link/page context, or text is a single http(s) URL: "link".
2. Selection inside pre/code/.highlight/[class*=language-], or a code-likeness score of 2+ (indented lines, braces/semicolons, "=>", "function", "def ", "import ", closing tags) with a newline or 20+ chars: "code".
3. Exactly one word, 40 chars or fewer (hyphens/apostrophes allowed): "word".
4. No line break and 280 chars or fewer: "sentence".
5. Otherwise: "paragraph".
The user can fix a wrong guess via "Change type".

3.4 Cleaning: trim; collapse 3+ blank lines to 2; max 20,000 characters (truncate and say so in the toast); reject empty; strip tracking params from URLs (utm_*, fbclid, gclid, mc_cid, igshid).

3.5 Dedupe: same kind + same normalized text (words case-insensitive) that is not deleted means do not duplicate. Move it to the top (updatedAt = now) and toast "Already in your Pocket".

3.6 Feedback (the context menu has no UI, so this matters): inject a tiny toast via scripting.executeScript into a closed shadow root. Bottom-right, "Saved to Pocket" + "Undo" button, auto-dismisses after 2.5 s, neutral colors that follow the page's prefers-color-scheme, pointer-events only on the toast itself. Undo soft-deletes the item. If injection is impossible (restricted pages), still save and show action badge "✓" for 1.5 s.

3.7 The new-tab widget subscribes to storage.onChanged, so new saves appear live (new row slides in at the top with a brief accent highlight).

## 4. Data model (storage.local, schema 1)

Item
  id          string (crypto.randomUUID())
  kind        "link" | "word" | "sentence" | "paragraph" | "code"
  text        string (the content; for links, the URL)
  title       string, optional (page or link title)
  host        string (website group key: lowercase, no "www."; for links it is the link's own host, for text it is the source page's host; "" if none)
  sourceUrl   string, optional (page it was saved from)
  favicon     string, optional (tab.favIconUrl captured at save time; store the URL only, never image data)
  folderIds   string[] (zero or more user folders)
  createdAt, updatedAt   number (ms)
  deletedAt   number | null (tombstone, needed for sync later)

Folder
  id, name (max 24 chars), color (a theme token key), order, createdAt, updatedAt, deletedAt

Meta
  schema: 1, syncEnabled, lastSyncAt, driveFileId, prefs { defaultTab, showFavicons, compactCount }

Keys: "pocket:items", "pocket:folders", "pocket:meta". All access goes through ONE module (pocketStore: get, subscribe, addItem, updateItem, softDelete, undoDelete, folder CRUD, export/import). UI components never touch storage directly. Keep classifyKind, dedupe, search, grouping and (later) mergeStates as pure, unit-tested functions.

Built-in "smart folders" are NOT stored. They are derived from kind: Links, Words, Sentences, Paragraphs, Code. Starter user folders on first run (normal, renamable, deletable): "Read later", "Quotes", "Ideas".

So the same items can be viewed four ways: by time (Recent/All), by type (smart folders), by website (Sites) and by user folder.

## 5. Widget structure and behavior

Mirror the RSS Digest's patterns wherever they exist (header, grouping by source, list rows, expanded view, settings menu). Map: feeds = websites/folders, articles = saves, "digest" = Recent. Where the RSS widget differs from what is written here, the RSS widget wins.

Header: pocket glyph + "Pocket" + muted total count on the left. On the right: search, add (+), expand and a "..." menu.

Tabs (segmented, accent underline): Recent | All | Sites.
- Recent: newest 20, flat, under sticky labels Today / Yesterday / Earlier this week / Earlier.
- All: everything, same time labels, "Load more" at 50 per page.
- Sites: accordion groups by host, ordered by most recent save. Group header = favicon (or letter tile) + host + count + chevron. Shows 5 items then "View all N", which filters to that site with a breadcrumb "Sites > react.dev".

Chip row under the tabs (horizontal scroll, soft edge fade): All, Links, Words, Sentences, Paragraphs, Code, then a thin divider, then user folders, then "+ New folder". One active chip at a time; it filters the current tab.

Quick add: a one-line input pinned at the bottom of the list, "Paste or type to save...". It auto-grows up to 4 lines. Enter saves through the same classify path; Shift+Enter inserts a newline.

Item rows, by kind:
- Link: 28 px tile (favicon, else a letter tile in a muted hue derived from the host) + title (1 line, weight 500) + host (small, muted) + relative time on the right. Click opens the URL in a new tab.
- Word: the word itself set larger (about 1.25x body, weight 600), muted "from host", time. In the "Words" filter, words render as a wrapping cloud of pills; click copies.
- Sentence: 2 px accent-tinted bar on the left, text clamped to 2 lines, meta line "host - time".
- Paragraph: clamped to 3 lines with a fade on the last line, meta line.
- Code: inset block, monospace, 4 lines max, subtle surface token, optional small language chip (best-effort guess; omit if unsure).

Row interactions:
- Click expands the row (links open instead; the chevron expands them). Expanded text shows in full (scrolls past 12 lines), followed by an action bar: Copy | Open source | Folders (multi-select popover with checkboxes + "New folder...") | Change type | Delete.
- Copy swaps the button label to "Copied" for 1.2 s (no toast).
- Hover shows a copy icon on every row.
- Delete soft-deletes and shows an inline "Deleted - Undo" for 5 s.
- Keyboard: Up/Down move, Enter expand/open, C copy, Delete removes (with undo), "/" focuses search, Esc collapses or closes.

Search: opens inline under the header. Live filter across text, title, host and folder names. It searches all tabs and shows a flat result list with the match highlighted using a token-styled mark. "x" clears.

Folder management: + New folder creates an inline name field (Enter to create). Each folder has a "..." with Rename, Color (6 muted swatches from theme tokens), Delete. Deleting a folder never deletes items; confirm first.

Expanded view (the expand icon): reuse the app's existing expanded/modal pattern from the RSS Digest. Layout is a left rail plus list.

Responsive by CONTAINER width (use container queries, or the app's existing widget-size mechanism if there is one; not viewport breakpoints):
- Compact (under 300 px): icons collapse into "...", except add. Chips collapse into one "All types" dropdown. Show 4 rows. No quick-add input (use +).
- Regular (300 to 520 px): as described above.
- Wide (over 520 px) and the expanded view: two panes. Left rail "Library" (All, Links, Words, Sentences, Paragraphs, Code, each with a count), then "Folders" (each with a count, plus "+ New folder"). Right: search at top, tabs, list.

Footer (regular and up): left, quiet "Local only" (Phase 2: sync status such as "Synced 2m ago"). Right, "128 saved".

Intent wireframes (not pixel-perfect):

+--------------------------------------------+
| [p] Pocket  128             /  +  [ ]  ... |
| Recent   All   Sites                       |
| ------                                     |
| (All) Links Words Sentences Para.. > fade  |
|                                            |
| TODAY                                      |
| [r] How React batches state updates   2m   |
|     react.dev                              |
| |  "Make it work, then make it right."  1h |
| |  paulgraham.com - sentence               |
| +-------------------------------------+    |
| | const sum = (a, b) => a + b;        | 3h |
| +-------------------------------------+    |
|   serendipity     from wikipedia.org   5h  |
|                                            |
| YESTERDAY ...                              |
| [ Paste or type to save...             ]   |
| Local only                       128 saved |
+--------------------------------------------+

+--------------+-----------------------------+
| LIBRARY      | [ search...              ]  |
| All      128 | Recent   All   Sites        |
| Links     41 |                             |
| Words     22 |  ... list ...               |
| Sentences 30 |                             |
| Paragraphs 19|                             |
| Code      16 |                             |
| FOLDERS      |                             |
| Read later  9|                             |
| Quotes     14|                             |
| + New folder |                             |
+--------------+-----------------------------+

## 6. Visual design

- The widget root is the same card component the other widgets use. It must render correctly in all three card profiles (paper, glass, comic), with the default accent (Matte Black) and at least two other accents. It only consumes tokens, so profiles restyle it for free: paper = hairline borders and soft shadow, glass = translucent surface and blur, comic = heavier borders and offset shadow, each as the profile defines.
- Accent usage is restrained: active tab underline, active chip (accent at ~12% fill + accent text), focus ring, new-save highlight, link hover. Never large accent-filled areas.
- Type: use the extension's existing font tokens; do not add font files. Header title 13-14 px semibold; row primary 13 px; meta 11 px muted; code uses a system monospace stack (ui-monospace, SFMono-Regular, Menlo, Consolas, monospace).
- Spacing on a 4 px base (4/8/12/16). Row height 44-52 px. Every tap target at least 32 px.
- Motion: 120-180 ms ease-out. New save slides in and its highlight fades over about 1.2 s. Row expand animates height. Respect prefers-reduced-motion by disabling all of it.
- Icons: reuse the app's icon set. The Pocket glyph is a 16 px stroke icon of a patch pocket (rounded-bottom rectangle with a short stitched line along the top). It must NOT resemble a chevron or heart.
- Folders show a small color dot taken from theme tokens (6 muted swatches defined in the theme file, never in components).
- Letter tiles: first letter of the host, muted hue from a hash of the host, token-based lightness so contrast stays AA.

## 7. Copy (calm, sentence case, no exclamation marks, no emoji)

- Empty (first run): title "Your pocket is empty." Body: "Select text on any page, right-click and choose Save to Pocket." Show three tiny steps: Select, Right-click, Saved. Below it, the quick-add input labeled "Or paste something here."
- Empty folder: "Nothing in {folder} yet. Use Folders on any save to add it."
- No search results: "Nothing matches "{query}"." with a "Clear search" link.
- Toasts: "Saved to Pocket" / "Already in your Pocket" / "Saved (trimmed to 20,000 characters)".
- Menu items: "Default tab", "Show site icons", "Export Pocket (JSON)", "Import Pocket (JSON)", "Clear all saves".
- Clear all: confirm dialog, destructive style from a token, "Delete everything in Pocket? This can't be undone."
- Privacy line in the menu: "Pocket stores text only, on this device."

## 8. Sync (PHASE 2, spec only; do not build in Phase 1, but keep the data model ready)

- Google Drive REST v3, scope https://www.googleapis.com/auth/drive.appdata ONLY (a hidden app folder; the extension never sees the user's other files). No host permissions: Google APIs allow CORS, so call fetch with a Bearer token.
- Auth: identity.launchWebAuthFlow with a Google OAuth Web-application client (one code path for Chrome and Firefox), redirect from identity.getRedirectURL(). Keep the token in memory/session only. Try interactive:false to refresh silently; if that fails, show "Reconnect". Put the client ID in one config constant with a TODO. Do NOT invent a client ID.
- Storage: one file "pocket.json" in appDataFolder holding { schema, items, folders, updatedAt }.
- Sync = pull, merge, push (only if the merged result differs from remote). Triggers: new-tab load, visibilitychange (at least 60 s since last), 5 s debounce after a local change, "Sync now", best-effort right after a context-menu save. The sync module is shared; the new-tab page runs it and the service worker only flags "dirty" or tries once.
- Merge: pure function mergeStates(local, remote). Per id the higher updatedAt wins; tombstones beat older edits; purge tombstones older than 30 days; deleting a folder removes its id from items' folderIds. Unit test: concurrent edits, delete vs edit, clock skew, duplicate ids.
- Failure: offline/429/5xx uses exponential backoff up to 5 minutes, never blocks the UI, never loses local data.
- UI: menu > "Sync with Google Drive" (Connect/Disconnect), status line, "Sync now", last-synced time. Consent copy: "Pocket keeps one small file in a private Drive folder only this extension can open. Nothing else in your Drive is read." Disconnect keeps local data and offers a second action "Also delete Pocket data from Drive".
- Export/Import JSON (built in Phase 1) uses the same schema and merges via mergeStates.

## 9. Manifest and permissions

- Phase 1 permissions: storage, contextMenus, activeTab, scripting. Phase 2 adds identity.
- NOT allowed: <all_urls>, tabs, host permissions, clipboardRead.
- Copy uses navigator.clipboard.writeText inside a user gesture.
- A permission that triggers an install-time warning makes Chrome disable the extension for existing users until they approve. State exactly which permissions you add and whether each triggers a warning. Avoid any that do.
- Support both browsers with whatever namespace shim the repo already uses (browser/chrome). Flag anything that needs a Firefox-specific manifest change.

## 10. Security and privacy

- Render all saved text as text nodes. No dangerouslySetInnerHTML.
- Open only http/https URLs, with rel="noopener noreferrer".
- Validate and sanitize imported JSON against the schema before merging.
- No eval, no remote code, no analytics, no logging of saved content.

## 11. Accessibility and performance

- Tabs use role=tablist/tab; lists use list/listitem; the toast uses role=status. Every icon button has an aria-label. Focus ring uses the accent and is always visible on keyboard focus. Text contrast meets WCAG AA in every profile.
- Render at most 50 rows at a time ("Load more"). Debounce search by 120 ms over a precomputed lowercase field. Group-by and filters are memoized.

## 12. Tests and QA

Unit tests: classifyKind (word, sentence, paragraph, code, link, edge cases), URL cleaning, dedupe, search, grouping, (Phase 2) mergeStates.
Manual checklist you must give me:
- Save a selection, link and page (Chrome and Firefox).
- Undo from the toast; duplicate save.
- Save on a restricted page (badge fallback).
- Folder create/rename/recolor/delete; multi-folder membership.
- Search; keyboard flow; compact/regular/wide sizes; expanded view.
- All three profiles x three accents.
- Export then Import round trip.
- 2,000-item stress test stays smooth.

## 13. Definition of done (Phase 1)

A first-time user can select text, right-click, see "Saved to Pocket", open a new tab, find it under Recent, Sites and its type chip, move it into a folder, copy it and delete it with undo, with no setup. The widget is visually indistinguishable in style from the RSS Digest widget. Nothing existing broke.