/**
 * Pocket — service-worker side of the context-menu save flow.
 *
 * Creates the "Add to Pocket" context menu (contexts selection | link | page)
 * with a Bitwarden-style submenu: a top "Default" entry (no folder) followed by
 * every user folder. Selecting a folder files the save into it.
 *
 * The menu is rebuilt whenever folders change (create/rename/delete from the
 * widget, or the SW's own first-run seed), so the submenu always mirrors the
 * folder list. classifies + cleans + dedupes + stores the save through
 * pocketStore, then gives feedback via an injected toast (or an action badge
 * fallback on restricted pages).
 *
 * Kept in its own module so bg.js only wires up two small call sites.
 */

import { classifyKind, cleanText, cleanUrl, hostFromUrl } from "./utils";
import { POCKET_KEYS } from "./constants";
import { addItem, flush, getPrefs, whenHydrated, getSnapshot } from "./pocketStore";

export const POCKET_MENU_ID = "pocket-save";
export const POCKET_MENU_TITLE = "Add to Pocket";
export const POCKET_FOLDER_DEFAULT_ID = "pocket-folder-default";
export const POCKET_FOLDER_PREFIX = "pocket-folder:";

const CONTEXTS = ["selection", "link", "page"];

/**
 * Resolve the context-menus API across browsers. Chrome exposes
 * `chrome.contextMenus`; Firefox exposes `browser.menus` / `chrome.menus`
 * (its manifest patch renames the `contextMenus` permission to `menus`).
 */
export function getMenus() {
  return (
    globalThis.chrome?.contextMenus ??
    globalThis.chrome?.menus ??
    globalThis.browser?.contextMenus ??
    globalThis.browser?.menus ??
    null
  );
}

function hasMenus() {
  const m = getMenus();
  return !!m && typeof m.create === "function" && typeof m.removeAll === "function";
}

function isHttpUrl(url) {
  return /^https?:\/\//i.test(url || "");
}

// --- Menu construction ----------------------------------------------------

let rebuildTimer = null;

/** Stable signature of a folder list, used to skip no-op rebuilds. */
function foldersSignature(folders) {
  return (folders || [])
    .map((f) => `${f.id}:${f.name}`)
    .join("|");
}

/** Drop soft-deleted folders and order by `order`. */
function normalizeFolders(folders) {
  return (folders || [])
    .filter((f) => !f.deletedAt)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** Signature of the menu as last built, so no-op writes don't churn the menu. */
let lastBuiltSig = null;

/**
 * Rebuild the full menu tree (debounced): parent → "Default" → separator →
 * folders. Accepts an explicit folder list (from a storage change) so it works
 * even before the SW's snapshot is hydrated; falls back to the hydrated
 * snapshot otherwise.
 */
function buildMenu(folders) {
  if (rebuildTimer) clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    rebuildTimer = null;
    if (!hasMenus()) return;
    const api = getMenus();
    const list = normalizeFolders(folders ?? getSnapshot().folders);
    lastBuiltSig = foldersSignature(list);

    api.removeAll(() => {
      api.create({ id: POCKET_MENU_ID, title: POCKET_MENU_TITLE, contexts: CONTEXTS });
      api.create({
        id: POCKET_FOLDER_DEFAULT_ID,
        parentId: POCKET_MENU_ID,
        title: "Default",
        contexts: CONTEXTS,
      });
      if (list.length > 0) {
        api.create({
          id: `${POCKET_MENU_ID}-sep`,
          parentId: POCKET_MENU_ID,
          type: "separator",
          contexts: CONTEXTS,
        });
        for (const f of list) {
          api.create({
            id: `${POCKET_FOLDER_PREFIX}${f.id}`,
            parentId: POCKET_MENU_ID,
            title: f.name,
            contexts: CONTEXTS,
          });
        }
      }
    });
  }, 80);
}

/**
 * Rebuild the submenu whenever folders actually change, from any context (the
 * widget on a new-tab page, another tab, or the SW's own first-run seed).
 *
 * Registered at module top level so it survives service-worker restarts. The
 * previous approach wired this through a one-time pocketStore.subscribe() in
 * setupPocketContextMenu(), which only ran on install/startup — Chrome suspends
 * the SW after ~30s idle, and the subscribe was lost on the next wake, so
 * folders created later never appeared in the submenu. A top-level listener
 * re-registers on every wake.
 */
if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    const foldersChange = changes[POCKET_KEYS.folders];
    if (!foldersChange) return;
    const next = normalizeFolders(foldersChange.newValue);
    if (foldersSignature(next) === lastBuiltSig) return;
    buildMenu(next);
  });
}

/**
 * Register the context menu on install/startup. Waits for hydration so the
 * initial build reflects the persisted folder list, then builds the tree.
 */
export async function setupPocketContextMenu() {
  if (!hasMenus()) return;
  await whenHydrated();
  buildMenu();
}

// --- Save flow ------------------------------------------------------------

/**
 * Read the live selection via scripting.executeScript so line breaks and
 * indentation survive (matters for code). Also detects whether the selection
 * lives inside a code container (pre / code / .highlight / [class*=language-]).
 * Returns { text, codeContext } or null when injection is impossible.
 */
function readSelection(tabId) {
  if (tabId == null || typeof chrome === "undefined" || !chrome.scripting) {
    return Promise.resolve(null);
  }
  return chrome.scripting
    .executeScript({
      target: { tabId },
      func: () => {
        const sel = window.getSelection();
        const text = sel ? sel.toString() : "";
        let codeContext = false;
        if (sel && sel.rangeCount > 0) {
          const node = sel.getRangeAt(0).commonAncestorContainer;
          const el = node && node.nodeType === 1 ? node : node && node.parentElement;
          if (el) {
            codeContext = !!(
              el.closest && el.closest("pre, code, .highlight, [class*='language-']")
            );
          }
        }
        return { text, codeContext };
      },
    })
    .then((results) => (results && results[0] && results[0].result) || null)
    .catch(() => null);
}

/** Fallback feedback for restricted pages: action badge "✓" for 1.5 s. */
function showBadge() {
  try {
    if (!chrome.action?.setBadgeText) return;
    chrome.action.setBadgeText({ text: "✓" });
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), 1500);
  } catch {
    /* ignore */
  }
}

/**
 * Inject a tiny toast into a closed shadow root, bottom-right, neutral colors
 * that follow the page's prefers-color-scheme, auto-dismiss after 2.5 s.
 * `undoId` (when present) renders an "Undo" button that asks the service
 * worker to soft-delete the just-saved item.
 *
 * NOTE: these neutral colors are intentionally hardcoded — the toast is
 * injected into arbitrary pages that have no access to the extension's theme
 * tokens, so it must be self-contained. The extension widget itself uses
 * tokens only.
 */
function injectToast(tabId, message, undoId) {
  if (tabId == null || typeof chrome === "undefined" || !chrome.scripting) {
    showBadge();
    return;
  }
  chrome.scripting
    .executeScript({
      target: { tabId },
      func: (msg, id) => {
        try {
          const host = document.createElement("div");
          host.style.all = "initial";
          host.style.position = "fixed";
          host.style.right = "16px";
          host.style.bottom = "16px";
          host.style.zIndex = "2147483647";
          host.style.pointerEvents = "none";
          const root = host.attachShadow({ mode: "closed" });

          const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
          const toast = document.createElement("div");
          toast.style.pointerEvents = "auto";
          toast.style.display = "flex";
          toast.style.alignItems = "center";
          toast.style.gap = "10px";
          toast.style.background = dark ? "rgba(38,38,38,0.96)" : "rgba(255,255,255,0.96)";
          toast.style.color = dark ? "#f2f2f2" : "#1a1a1a";
          toast.style.border = `1px solid ${dark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)"}`;
          toast.style.borderRadius = "10px";
          toast.style.padding = "9px 14px";
          toast.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";
          toast.style.font = "13px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

          const label = document.createElement("span");
          label.textContent = msg;
          toast.appendChild(label);

          if (id) {
            const undo = document.createElement("button");
            undo.textContent = "Undo";
            undo.style.border = "none";
            undo.style.background = "none";
            undo.style.padding = "2px 4px";
            undo.style.cursor = "pointer";
            undo.style.font = "inherit";
            undo.style.fontWeight = "600";
            undo.style.color = dark ? "#8ab4ff" : "#1a6bff";
            undo.addEventListener("click", () => {
              try {
                if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
                  chrome.runtime.sendMessage({ type: "POCKET_UNDO", id });
                }
              } catch {
                /* ignore */
              }
              host.remove();
            });
            toast.appendChild(undo);
          }

          root.appendChild(toast);
          document.body.appendChild(host);
          setTimeout(() => host.remove(), 2500);
        } catch {
          /* injection failed on a restricted page — the badge fallback covers it */
        }
      },
      args: [message, undoId],
    })
    .catch(() => showBadge());
}

/**
 * Save the click info as a Pocket item. Called from the context-menus onClicked
 * listener. Selection wins over link/page. `folderId` (when set) files the save
 * into that folder; when null, the save goes to the user's default folder (or
 * stays unfiled when none is set).
 *
 * Honors the user's prefs: cleanLinks (strip tracking), skipDuplicates (dedupe)
 * and pageNotice (injected toast). Returns { status: "added" | "duplicate" | "empty" }.
 */
export async function handlePocketSave(info, tab, folderId = null) {
  const prefs = getPrefs();
  const t = Date.now();
  const pageUrl = tab?.url || info.pageUrl || "";
  const pageTitle = tab?.title || "";
  const favicon = isHttpUrl(tab?.favIconUrl) ? tab?.favIconUrl : "";
  const sourceUrl = isHttpUrl(pageUrl) ? pageUrl : "";
  const sourceHost = sourceUrl ? hostFromUrl(sourceUrl) : "";

  // A "Default" save (folderId null) files into the user's default folder.
  const resolvedFolderId = folderId || prefs.defaultFolderId || null;
  const folderIds = resolvedFolderId ? [resolvedFolderId] : [];

  const hasSelection =
    typeof info.selectionText === "string" && info.selectionText.trim() !== "";

  let item;
  let truncated = false;

  if (hasSelection) {
    let selection = null;
    try {
      selection = await readSelection(tab?.id);
    } catch {
      selection = null;
    }
    const raw =
      selection && typeof selection.text === "string" && selection.text.trim() !== ""
        ? selection.text
        : info.selectionText;
    const codeContext = !!(selection && selection.codeContext);
    const cleaned = cleanText(raw);
    if (!cleaned.text) return { status: "empty" };
    truncated = cleaned.truncated;
    item = {
      id: crypto.randomUUID(),
      kind: classifyKind(cleaned.text, { codeContext }),
      text: cleaned.text,
      title: pageTitle || "",
      host: sourceHost,
      sourceUrl,
      favicon,
      folderIds,
      createdAt: t,
      updatedAt: t,
      deletedAt: null,
    };
  } else if (info.linkUrl) {
    const url = prefs.cleanLinks !== false ? cleanUrl(info.linkUrl) : info.linkUrl;
    if (!url) return { status: "empty" };
    item = {
      id: crypto.randomUUID(),
      kind: "link",
      text: url,
      title: "", // link text is not exposed by the contextMenus API
      host: hostFromUrl(url),
      sourceUrl: "",
      favicon,
      folderIds,
      createdAt: t,
      updatedAt: t,
      deletedAt: null,
    };
  } else {
    if (!sourceUrl) return { status: "empty" };
    const url = prefs.cleanLinks !== false ? cleanUrl(sourceUrl) : sourceUrl;
    item = {
      id: crypto.randomUUID(),
      kind: "link",
      text: url,
      title: pageTitle || "",
      host: hostFromUrl(url),
      sourceUrl: "",
      favicon,
      folderIds,
      createdAt: t,
      updatedAt: t,
      deletedAt: null,
    };
  }

  await whenHydrated();
  const res = addItem(item, { skipDuplicates: prefs.skipDuplicates !== false });
  await flush();

  if (prefs.pageNotice === false) return res;

  if (res.status === "duplicate") {
    injectToast(tab?.id, "Already in your Pocket");
  } else if (truncated) {
    injectToast(tab?.id, "Saved (trimmed to 20,000 characters)", item.id);
  } else {
    // Name the folder when the save landed somewhere other than the default.
    const folderName =
      resolvedFolderId && resolvedFolderId !== prefs.defaultFolderId
        ? getSnapshot().folders.find((f) => f.id === resolvedFolderId)?.name
        : null;
    injectToast(tab?.id, folderName ? `Saved to ${folderName} folder` : "Saved to Pocket", item.id);
  }

  return res;
}
