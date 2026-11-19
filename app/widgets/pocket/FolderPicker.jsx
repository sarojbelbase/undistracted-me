import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check2, PlusLg, XLg } from "react-bootstrap-icons";
import { Popup } from "../../components/ui/Popup";
import { IconButton } from "../../components/ui/IconButton";
import { usePocket } from "./usePocket";
import { createFolder, setItemFolders } from "./pocketStore";
import { liveFolders } from "./selectors";
import { FOLDER_COLOR_MAP } from "./constants";

/**
 * FolderPicker — a popover for toggling which folders an item belongs to.
 * Rendered on Popup with a transparent backdrop; multi-select checkboxes plus
 * an inline "New folder" input. Used by the "Add to Folder" menu item and the
 * expanded Details "Add to folder" button.
 */
export function FolderPicker({ anchor, item, onClose, autoCreate = false }) {
  const { folders } = usePocket();
  const [creating, setCreating] = useState(autoCreate);
  const [name, setName] = useState("");
  const active = new Set(item.folderIds || []);
  const visible = liveFolders(folders).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const toggle = (id) => {
    const next = active.has(id) ? [...active].filter((x) => x !== id) : [...active, id];
    setItemFolders(item.id, next);
  };

  const doCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return setCreating(false);
    const folder = createFolder(trimmed);
    setItemFolders(item.id, [...active, folder.id]);
    setName("");
    setCreating(false);
  };

  // Capture-phase Escape closes the picker before the enclosing Modal's own
  // Escape handler can fire (§4: Esc closes the topmost layer).
  useEffect(() => {
    if (!anchor) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [anchor, onClose]);

  if (!anchor) return null;

  return (
    <>
      {createPortal(
        <div aria-hidden="true" className="fixed inset-0" style={{ zIndex: 9998 }} onClick={onClose} />,
        document.body,
      )}
      <Popup anchor={anchor} className="p-1.5">
        <div className="pocket-folder-picker" style={{ minWidth: 190 }}>
          <div className="flex items-center justify-between px-1.5 py-0.5">
            <span className="w-label font-semibold" style={{ color: "var(--w-ink-2)" }}>
              Folders
            </span>
            <IconButton label="Close" onClick={onClose}>
              <XLg size={12} />
            </IconButton>
          </div>
          <div className="pocket-folder-picker__list">
            {visible.map((f) => (
              <button
                key={f.id}
                type="button"
                role="checkbox"
                aria-checked={active.has(f.id)}
                className="pocket-folder-picker__item"
                onClick={() => toggle(f.id)}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: FOLDER_COLOR_MAP[f.color] || FOLDER_COLOR_MAP.slate,
                    flexShrink: 0,
                  }}
                />
                <span className="flex-1 truncate text-left">{f.name}</span>
                {active.has(f.id) && <Check2 size={13} style={{ color: "var(--w-accent)" }} />}
              </button>
            ))}
            {visible.length === 0 && !creating && <div className="w-muted py-1">No folders yet</div>}
          </div>
          {creating ? (
            <div className="flex items-center gap-1 px-1.5 py-1">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") doCreate();
                  if (e.key === "Escape") {
                    e.stopPropagation();
                    setCreating(false);
                  }
                }}
                placeholder="Folder name"
                className="pocket-inline-input"
                style={{ flex: 1, minWidth: 0 }}
              />
              <IconButton label="Create folder" onClick={doCreate}>
                <Check2 size={14} />
              </IconButton>
            </div>
          ) : (
            <button
              type="button"
              className="pocket-folder-picker__item"
              style={{ color: "var(--w-accent)" }}
              onClick={() => setCreating(true)}
            >
              <PlusLg size={12} />
              <span>New folder</span>
            </button>
          )}
        </div>
      </Popup>
    </>
  );
}
