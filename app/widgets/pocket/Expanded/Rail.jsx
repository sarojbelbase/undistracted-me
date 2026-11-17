import { useRef, useState } from "react";
import {
  Check2,
  ChevronDown,
  FolderPlus,
  GearFill,
  Pencil,
  Trash,
  ThreeDots,
} from "react-bootstrap-icons";
import { IconButton } from "../../../components/ui/IconButton";
import { ActionMenu } from "../../../components/ui/ActionMenu";
import { ConfirmButton } from "../../../components/ui/ConfirmButton";
import { KIND_ICONS } from "../kindIcons";
import { usePocket } from "../usePocket";
import { createFolder, updateFolder, deleteFolder } from "../pocketStore";
import { countByFolder, countByKind, liveFolders, totalCount } from "../selectors";
import { folderNameTaken } from "../utils";
import { FOLDER_COLORS, FOLDER_COLOR_MAP, KINDS, KIND_META, MAX_FOLDER_NAME_LENGTH } from "../constants";

/**
 * Rail — the left navigation of the expanded view: Library (All + kinds) and a
 * collapsible Folders section (color dot, count, hover rename/delete, and a
 * "New folder" action). The Folders section starts collapsed so it doesn't
 * dominate the rail; its color dot is a clickable color key. A "Settings" entry
 * pins the Pocket settings at the bottom. The rail scrolls on its own.
 */
export function Rail({ filter, onPick, onOpenSettings }) {
  const { items, folders } = usePocket();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");
  const [foldersOpen, setFoldersOpen] = useState(false);

  const total = totalCount(items);
  const kindCounts = countByKind(items);
  const folderCounts = countByFolder(items);
  const live = liveFolders(folders).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const commitCreate = () => {
    const name = newName.trim();
    if (!name) {
      setError("Give the folder a name.");
      return;
    }
    if (folderNameTaken(folders, name)) {
      setError("A folder with that name already exists.");
      return;
    }
    createFolder(name);
    setNewName("");
    setCreating(false);
    setFoldersOpen(true);
    setError("");
  };

  const commitRename = (id) => {
    const name = editName.trim();
    if (!name) {
      setError("Give the folder a name.");
      return;
    }
    if (folderNameTaken(folders, name, id)) {
      setError("A folder with that name already exists.");
      return;
    }
    updateFolder(id, { name: name.slice(0, MAX_FOLDER_NAME_LENGTH) });
    setEditingId(null);
    setEditName("");
    setError("");
  };

  const startEdit = (f) => {
    setEditingId(f.id);
    setEditName(f.name);
    setError("");
  };

  const renderItem = (active, onClick, icon, label, count, colorDot) => (
    <button
      type="button"
      aria-current={active ? "true" : undefined}
      className={`pocket-rail-item ${active ? "pocket-rail-item--active" : ""}`}
      onClick={onClick}
    >
      {icon && <span className="pocket-rail-item__icon">{icon}</span>}
      {colorDot}
      <span className="flex-1 text-left truncate">{label}</span>
      <span className="w-caption">{count}</span>
    </button>
  );

  return (
    <nav className="pocket-rail" aria-label="Pocket library">
      <span className="pocket-rail__title">Library</span>
      {renderItem(!filter, () => onPick(null), null, "All", total)}
      {KINDS.map((k) => {
        const Icon = KIND_ICONS[k];
        const active = filter?.type === "kind" && filter.value === k;
        return renderItem(active, () => onPick({ type: "kind", value: k }), <Icon size={14} />, KIND_META[k].label, kindCounts.get(k) || 0);
      })}

      <button
        type="button"
        className="pocket-rail__title pocket-rail__title--btn"
        aria-expanded={foldersOpen}
        onClick={() => setFoldersOpen((v) => !v)}
      >
        Folders
        <span className="pocket-rail__title-count">{live.length}</span>
        <span className="pocket-rail__chevron" style={{ transform: foldersOpen ? "rotate(180deg)" : "none" }}>
          <ChevronDown size={12} />
        </span>
      </button>

      {foldersOpen &&
        live.map((f) => {
          const active = filter?.type === "folder" && filter.value === f.id;
          if (editingId === f.id) {
            return (
              <div key={f.id} className="pocket-rail-edit">
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename(f.id);
                    if (e.key === "Escape") {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditingId(null);
                      setError("");
                    }
                  }}
                  placeholder="Folder name"
                  maxLength={MAX_FOLDER_NAME_LENGTH}
                  className="pocket-inline-input"
                  style={{ flex: 1 }}
                />
                <div className="pocket-rail-edit__dots" role="radiogroup" aria-label="Folder color">
                  {FOLDER_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={f.color === c.id}
                      aria-label={c.id}
                      className="pocket-color-dot"
                      style={{ background: c.value, outline: f.color === c.id ? "2px solid var(--w-accent)" : "none" }}
                      onClick={() => updateFolder(f.id, { color: c.id })}
                    />
                  ))}
                </div>
                <IconButton label="Save folder name" onClick={() => commitRename(f.id)}>
                  <Check2 size={14} />
                </IconButton>
              </div>
            );
          }
          return (
            <FolderRow
              key={f.id}
              folder={f}
              count={folderCounts.get(f.id) || 0}
              active={active}
              onPick={() => onPick({ type: "folder", value: f.id })}
              onRename={() => startEdit(f)}
              onDelete={() => deleteFolder(f.id)}
            />
          );
        })}

      {foldersOpen && creating ? (
        <div className="pocket-rail-edit" style={{ margin: "4px 8px" }}>
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitCreate();
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                setCreating(false);
                setNewName("");
                setError("");
              }
            }}
            placeholder="Folder name"
            maxLength={MAX_FOLDER_NAME_LENGTH}
            className="pocket-inline-input"
            style={{ flex: 1 }}
          />
          <IconButton label="Create folder" onClick={commitCreate}>
            <Check2 size={14} />
          </IconButton>
        </div>
      ) : (
        <button
          type="button"
          className="pocket-rail-item pocket-rail-item--new"
          onClick={() => {
            setCreating(true);
            setFoldersOpen(true);
            setError("");
          }}
        >
          <FolderPlus size={12} />
          <span>New folder</span>
        </button>
      )}

      {error && <span className="pocket-rail__error w-caption">{error}</span>}

      <div className="pocket-rail__footer">
        <button type="button" className="pocket-rail-item" onClick={onOpenSettings}>
          <span className="pocket-rail-item__icon"><GearFill size={13} /></span>
          <span className="flex-1 text-left truncate">Settings</span>
        </button>
      </div>
    </nav>
  );
}

function FolderRow({ folder, count, active, onPick, onRename, onDelete }) {
  const [touchAnchor, setTouchAnchor] = useState(null);
  const [swatches, setSwatches] = useState(false);
  const touchRef = useRef(null);

  return (
    <div className="pocket-folder-row">
      <button
        type="button"
        aria-label={`Change ${folder.name} color`}
        title="Change color"
        className="pocket-folder-row__key"
        style={{ background: FOLDER_COLOR_MAP[folder.color] || FOLDER_COLOR_MAP.slate }}
        onClick={() => setSwatches((v) => !v)}
      />
      <button
        type="button"
        aria-current={active ? "true" : undefined}
        className={`pocket-rail-item pocket-rail-item--folder ${active ? "pocket-rail-item--active" : ""}`}
        onClick={onPick}
      >
        <span className="flex-1 text-left truncate">{folder.name}</span>
        <span className="w-caption pocket-folder-row__count">{count}</span>
      </button>

      {swatches && (
        <div className="pocket-rail-swatches" role="radiogroup" aria-label="Folder color">
          {FOLDER_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={folder.color === c.id}
              aria-label={c.id}
              className="pocket-color-dot"
              style={{ background: c.value, outline: folder.color === c.id ? "2px solid var(--w-accent)" : "none" }}
              onClick={() => {
                updateFolder(folder.id, { color: c.id });
                setSwatches(false);
              }}
            />
          ))}
        </div>
      )}

      <div className="pocket-folder-row__actions">
        <IconButton label="Rename folder" onClick={onRename}>
          <Pencil size={12} />
        </IconButton>
        <ConfirmButton
          danger
          label="Delete folder"
          className="um-icon-btn"
          style={{ width: 32, height: 32, borderRadius: 8 }}
          onConfirm={onDelete}
        >
          <Trash size={12} />
        </ConfirmButton>
      </div>

      <div className="pocket-folder-row__touch">
        <IconButton
          label="Folder actions"
          onClick={(e) => {
            touchRef.current = e.currentTarget;
            const r = e.currentTarget.getBoundingClientRect();
            setTouchAnchor({ left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height });
          }}
        >
          <ThreeDots size={13} />
        </IconButton>
      </div>

      {touchAnchor && (
        <ActionMenu
          anchor={touchAnchor}
          triggerRef={touchRef}
          onClose={() => setTouchAnchor(null)}
          items={[
            { label: "Rename Folder", icon: <Pencil size={13} />, onSelect: onRename },
            {
              label: "Change Color",
              icon: <span style={{ width: 10, height: 10, borderRadius: 3, background: FOLDER_COLOR_MAP[folder.color] || FOLDER_COLOR_MAP.slate }} />,
              submenu: FOLDER_COLORS.map((c) => ({
                label: c.id,
                icon: <span style={{ width: 10, height: 10, borderRadius: 3, background: c.value }} />,
                onSelect: () => updateFolder(folder.id, { color: c.id }),
              })),
            },
            { divider: true },
            { label: "Delete Folder", icon: <Trash size={13} />, danger: true, onSelect: onDelete },
          ]}
        />
      )}
    </div>
  );
}
