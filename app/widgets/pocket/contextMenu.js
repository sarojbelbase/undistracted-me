/**
 * Pocket — service-worker side of the context-menu save flow.
 *
 * Creates the single "Add to Undistracted Me" context menu (contexts
 * selection | link | page), classifies + cleans + dedupes + stores the save
 * through pocketStore, then gives feedback via an injected toast (or an action
 * badge fallback on restricted pages).
 *
 * Kept in its own module so bg.js only wires up two small call sites.
 */

import { classifyKind, cleanText, cleanUrl, hostFromUrl } from "./utils";
import { addItem, flush, whenHydrated } from "./pocketStore";

export const POCKET_MENU_ID = "pocket-save";
export const POCKET_MENU_TITLE = "Add to Undistracted Me";

function isHttpUrl(url) {
  return /^https?:\/\//i.test(url || "");
}

function hasContextMenus() {
  return typeof chrome !== "undefined" && chrome.contextMenus;
}

/**
 * Register the context menu. Idempotent: removes any existing item first so
 * re-running on install/startup never leaves duplicates.
 */
export function setupPocketContextMenu() {
  if (!hasContextMenus()) return;
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: POCKET_MENU_ID,
      title: POCKET_MENU_TITLE,
      contexts: ["selection", "link", "page"],
    });
  });
}

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
 * Save the click info as a Pocket item. Called from chrome.contextMenus.onClicked.
 * Selection wins over link/page. Returns { status: "added" | "duplicate" | "empty" }.
 */
export async function handlePocketSave(info, tab) {
  const t = Date.now();
  const pageUrl = tab?.url || info.pageUrl || "";
  const pageTitle = tab?.title || "";
  const favicon = isHttpUrl(tab?.favIconUrl) ? tab?.favIconUrl : "";
  const sourceUrl = isHttpUrl(pageUrl) ? pageUrl : "";
  const sourceHost = sourceUrl ? hostFromUrl(sourceUrl) : "";

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
      folderIds: [],
      createdAt: t,
      updatedAt: t,
      deletedAt: null,
    };
  } else if (info.linkUrl) {
    const url = cleanUrl(info.linkUrl);
    if (!url) return { status: "empty" };
    item = {
      id: crypto.randomUUID(),
      kind: "link",
      text: url,
      title: "", // link text is not exposed by the contextMenus API
      host: hostFromUrl(url),
      sourceUrl: "",
      favicon,
      folderIds: [],
      createdAt: t,
      updatedAt: t,
      deletedAt: null,
    };
  } else {
    if (!sourceUrl) return { status: "empty" };
    item = {
      id: crypto.randomUUID(),
      kind: "link",
      text: sourceUrl,
      title: pageTitle || "",
      host: sourceHost,
      sourceUrl: "",
      favicon,
      folderIds: [],
      createdAt: t,
      updatedAt: t,
      deletedAt: null,
    };
  }

  await whenHydrated();
  const res = addItem(item);
  await flush();

  if (res.status === "duplicate") {
    injectToast(tab?.id, "Already in your Pocket");
  } else if (truncated) {
    injectToast(tab?.id, "Saved (trimmed to 20,000 characters)", item.id);
  } else {
    injectToast(tab?.id, "Saved to Pocket", item.id);
  }

  return res;
}
