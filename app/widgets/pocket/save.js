import { snackbar } from "../../components/ui/Snackbar";
import { addItem, softDelete } from "./pocketStore";
import { classifyKind, cleanText } from "./utils";

/**
 * saveText — the single "save a pasted/typed text" flow, shared by the Add
 * dialog and the paste-immediate path. Classifies, cleans, adds (honoring
 * skipDuplicates), then shows the right snackbar.
 *
 * Returns the addItem result, or null when there is nothing to save.
 */
export function saveText(text, { kind, folderId, skipDuplicates = true, kindLocked = false } = {}) {
  const { text: cleaned, truncated } = cleanText(text);
  if (!cleaned) return null;
  const item = {
    id: crypto.randomUUID(),
    kind: kind || classifyKind(cleaned, {}),
    text: cleaned,
    title: "",
    host: "",
    sourceUrl: "",
    favicon: "",
    folderIds: folderId ? [folderId] : [],
    kindLocked,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    deletedAt: null,
  };
  const res = addItem(item, { skipDuplicates });
  if (truncated) {
    snackbar("Saved. Trimmed to 20,000 characters.");
  } else if (res.status === "duplicate") {
    snackbar("Already in Pocket.");
  } else {
    // Undo a fresh save by soft-deleting it (hides the just-added item).
    snackbar("Saved to Pocket.", { action: "Undo", onAction: () => softDelete(res.item.id), duration: 6000 });
  }
  return res;
}
