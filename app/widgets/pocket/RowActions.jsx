import { useRef, useState } from "react";
import {
  BoxArrowUpRight,
  Check2,
  Copy,
  Folder2,
  Link45deg,
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
import { softDelete, undoDelete, updateItem } from "./pocketStore";
import { KINDS, KIND_META } from "./constants";
import { FolderPicker } from "./FolderPicker";

/**
 * RowActions — the primary action icon button + the "More actions" menu for a
 * single row. Kept out of ItemRow so the shell stays lean.
 *
 * Primary action: Open link (link) · Copy (sentence/paragraph) · none for
 * code (Copy lives in the code-block header).
 *
 * More actions: Copy Link (link) · Open Source Page / Open at Quote / Add to
 * Folder / Change Type / Delete (text + code).
 */

/** Delete one entry immediately, with a Snackbar "Deleted." + Undo (6s). */
export function deleteWithUndo(item) {
  softDelete(item.id);
  snackbar("Deleted.", { action: "Undo", onAction: () => undoDelete(item.id), duration: 6000 });
}

export function RowActions({ item, copied, onCopy, hidePrimary = false }) {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [folderAnchor, setFolderAnchor] = useState(null);
  const moreRef = useRef(null);

  const isLink = item.kind === "link";
  const isCode = item.kind === "code";
  const hasSource = !!item.sourceUrl;
  const KindIcon = KIND_ICONS[item.kind] || TextLeft;

  const openMenu = (e) => {
    e.stopPropagation();
    moreRef.current = e.currentTarget; // remember the trigger for focus-return on Escape
    const r = e.currentTarget.getBoundingClientRect();
    setMenuAnchor({ left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height });
  };

  const doDelete = () => deleteWithUndo(item);

  const changeType = (kind) => updateItem(item.id, { kind, kindLocked: true });

  const menuItems = isLink
    ? [
        { label: "Copy Link", icon: <Link45deg size={13} />, onSelect: onCopy },
        { divider: true },
        {
          label: "Add to Folder",
          icon: <Folder2 size={13} />,
          onSelect: () => {
            setFolderAnchor(menuAnchor);
            setMenuAnchor(null);
          },
        },
        { divider: true },
        { label: "Delete", icon: <Trash size={13} />, danger: true, onSelect: doDelete },
      ]
    : [
        { label: "Copy", icon: <Copy size={13} />, onSelect: onCopy },
        ...(hasSource
          ? [{ label: "Open Source Page", icon: <BoxArrowUpRight size={13} />, onSelect: () => openUrl(item.sourceUrl) }]
          : []),
        {
          label: "Add to Folder",
          icon: <Folder2 size={13} />,
          onSelect: () => {
            setFolderAnchor(menuAnchor);
            setMenuAnchor(null);
          },
        },
        {
          label: "Change Type",
          icon: <KindIcon size={13} />,
          submenu: KINDS.map((k) => ({ label: KIND_META[k].label, onSelect: () => changeType(k) })),
        },
        { divider: true },
        { label: "Delete", icon: <Trash size={13} />, danger: true, onSelect: doDelete },
      ];

  const primary = hidePrimary ? null : isLink ? (
    <IconButton label="Open link" onClick={(e) => { e.stopPropagation(); openUrl(item.text); }}>
      <BoxArrowUpRight size={13} />
    </IconButton>
  ) : hasSource ? (
    <IconButton label="Open at quote" onClick={(e) => { e.stopPropagation(); openItemSource(item); }}>
      <Quote size={13} />
    </IconButton>
  ) : isCode ? null : (
    <IconButton label={copied ? "Copied" : "Copy"} onClick={(e) => { e.stopPropagation(); onCopy(); }}>
      {copied ? <Check2 size={13} /> : <Copy size={13} />}
    </IconButton>
  );

  return (
    <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
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
      {folderAnchor && <FolderPicker anchor={folderAnchor} item={item} onClose={() => setFolderAnchor(null)} />}
    </div>
  );
}
