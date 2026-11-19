import { useRef, useState } from "react";
import {
  BoxArrowUpRight,
  Check2,
  Copy,
  Folder2,
  Link45deg,
  PlusLg,
  Quote,
  TextLeft,
  ThreeDots,
  Trash,
} from "react-bootstrap-icons";
import { IconButton } from "../../components/ui/IconButton";
import { ActionMenu } from "../../components/ui/ActionMenu";
import { snackbar } from "../../components/ui/Snackbar";
import { KIND_ICONS } from "./kindIcons";
import { openUrl, openItemSource } from "./actions";
import { softDelete, undoDelete, updateItem, setItemFolders } from "./pocketStore";
import { KINDS, KIND_META, FOLDER_COLOR_MAP } from "./constants";
import { liveFolders } from "./selectors";
import { usePocket } from "./usePocket";
import { FolderPicker } from "./FolderPicker";

/**
 * RowActions — the primary action icon button + the "More actions" menu for a
 * single row. Kept out of ItemRow so the shell stays lean.
 *
 * Primary action: Open link (link) · Copy (sentence / paragraph / code) — one
 * consistent primary per row, so the icon is never a mystery.
 *
 * More actions: Copy Link (link) · Open at Quote / Open Source Page / Add to
 * Folder / Change Type / Delete (text + code).
 *
 * Both buttons are quiet at rest: the list reveals them on hover, keyboard
 * focus, an expanded row or an open menu (always visible on touch) via the
 * .pocket-row__actions class.
 */

/** Delete one entry immediately, with a Snackbar "Deleted." + Undo (6s). */
export function deleteWithUndo(item) {
  softDelete(item.id);
  snackbar("Deleted.", { action: "Undo", onAction: () => undoDelete(item.id), duration: 6000 });
}

export function RowActions({ item, copied, onCopy }) {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [folderAnchor, setFolderAnchor] = useState(null);
  const moreRef = useRef(null);
  const { folders } = usePocket();

  const isLink = item.kind === "link";
  const isCode = item.kind === "code";
  const hasSource = !!item.sourceUrl;
  const KindIcon = KIND_ICONS[item.kind] || TextLeft;

  const visibleFolders = liveFolders(folders).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const activeFolders = new Set(item.folderIds || []);

  const toggleFolder = (id) => {
    const next = activeFolders.has(id)
      ? [...activeFolders].filter((x) => x !== id)
      : [...activeFolders, id];
    setItemFolders(item.id, next);
  };

  const openMenu = (e) => {
    e.stopPropagation();
    moreRef.current = e.currentTarget; // remember the trigger for focus-return on Escape
    const r = e.currentTarget.getBoundingClientRect();
    setMenuAnchor({ left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height });
  };

  const doDelete = () => deleteWithUndo(item);

  const changeType = (kind) => updateItem(item.id, { kind, kindLocked: true });

  const folderMenu = {
    label: "Add to Folder",
    icon: <Folder2 size={13} />,
    submenu: [
      ...visibleFolders.map((f) => ({
        label: f.name,
        icon: (
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
        ),
        checked: activeFolders.has(f.id),
        keepOpen: true,
        onSelect: () => toggleFolder(f.id),
      })),
      {
        label: "New folder",
        icon: <PlusLg size={13} />,
        onSelect: () => {
          setFolderAnchor(menuAnchor);
          setMenuAnchor(null);
        },
      },
    ],
  };

  const menuItems = isLink
    ? [
        { label: "Copy Link", icon: <Link45deg size={13} />, onSelect: onCopy },
        { divider: true },
        folderMenu,
        { divider: true },
        { label: "Delete", icon: <Trash size={13} />, danger: true, onSelect: doDelete },
      ]
    : [
        ...(hasSource && !isCode
          ? [{ label: "Open at Quote", icon: <Quote size={13} />, onSelect: () => openItemSource(item) }]
          : []),
        ...(hasSource
          ? [{ label: "Open Source Page", icon: <BoxArrowUpRight size={13} />, onSelect: () => openUrl(item.sourceUrl) }]
          : []),
        folderMenu,
        {
          label: "Change Type",
          icon: <KindIcon size={13} />,
          submenu: KINDS.map((k) => ({ label: KIND_META[k].label, onSelect: () => changeType(k) })),
        },
        { divider: true },
        { label: "Delete", icon: <Trash size={13} />, danger: true, onSelect: doDelete },
      ];

  const primary = isLink ? (
    <IconButton label="Open link" onClick={(e) => { e.stopPropagation(); openUrl(item.text); }}>
      <BoxArrowUpRight size={13} />
    </IconButton>
  ) : (
    <IconButton label={copied ? "Copied" : "Copy"} onClick={(e) => { e.stopPropagation(); onCopy(); }}>
      {copied ? <Check2 size={13} /> : <Copy size={13} />}
    </IconButton>
  );

  return (
    <div
      className={`pocket-row__actions flex items-center gap-0.5 shrink-0 ${menuAnchor || folderAnchor ? "pocket-row__actions--active" : ""}`}
      onClick={(e) => e.stopPropagation()}
    >
      {primary}
      <IconButton
        label="More actions"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={openMenu}
      >
        <ThreeDots size={14} />
      </IconButton>
      {menuAnchor && (
        <ActionMenu anchor={menuAnchor} triggerRef={moreRef} items={menuItems} onClose={() => setMenuAnchor(null)} />
      )}
      {folderAnchor && (
        <FolderPicker anchor={folderAnchor} item={item} autoCreate onClose={() => setFolderAnchor(null)} />
      )}
    </div>
  );
}
