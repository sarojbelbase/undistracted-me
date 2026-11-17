import { useEffect, useRef, useState } from "react";
import {
  BoxArrowUpRight,
  Check2,
  ChevronDown,
  ChevronRight,
  CodeSlash,
  Copy,
  Folder2,
  Link45deg,
  PlusLg,
  Quote,
  TextLeft,
  Type,
  XLg,
} from "react-bootstrap-icons";

import { usePocket } from "./usePocket";
import { PocketMenu } from "./PocketMenu";
import { LetterTile } from "./LetterTile";
import {
  createFolder,
  setItemFolders,
  softDelete,
  updateItem,
} from "./pocketStore";
import { FOLDER_COLOR_MAP, KINDS, KIND_META } from "./constants";
import { humanizeAge } from "../../utilities";

const KIND_ICON = {
  link: Link45deg,
  word: Type,
  sentence: Quote,
  paragraph: TextLeft,
  code: CodeSlash,
};

const MONO =
  "ui-monospace, SFMono-Regular, Menlo, Consolas, Liberation Mono, monospace";

function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  return Promise.reject(new Error("clipboard unavailable"));
}

function isHttpUrl(s) {
  return /^https?:\/\//i.test(s || "");
}

function openUrl(url) {
  if (!isHttpUrl(url)) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

function Tile({ item, size = 28 }) {
  const [errored, setErrored] = useState(false);
  if (item.favicon && isHttpUrl(item.favicon) && !errored) {
    return (
      <img
        src={item.favicon}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size, borderRadius: 8, objectFit: "contain", flexShrink: 0 }}
        onError={() => setErrored(true)}
      />
    );
  }
  return <LetterTile text={item.host || item.text || ""} size={size} />;
}

function FoldersContent({ item, onClose }) {
  const { folders } = usePocket();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const active = new Set(item.folderIds || []);

  const toggle = (id) => {
    const next = active.has(id)
      ? [...active].filter((x) => x !== id)
      : [...active, id];
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

  const visibleFolders = folders
    .filter((f) => !f.deletedAt)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div className="pocket-menu" style={{ minWidth: 190 }}>
      <div className="flex items-center justify-between px-1.5 py-0.5">
        <span className="w-label font-semibold" style={{ color: "var(--w-ink-2)" }}>
          Folders
        </span>
        <button type="button" className="pocket-icon-btn" aria-label="Close" onClick={onClose}>
          <XLg size={12} />
        </button>
      </div>
      <div className="pocket-menu-list">
        {visibleFolders.map((f) => (
          <button
            key={f.id}
            type="button"
            role="checkbox"
            aria-checked={active.has(f.id)}
            className="pocket-menu-item"
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
            {active.has(f.id) && (
              <Check2 size={13} style={{ color: "var(--w-accent)" }} />
            )}
          </button>
        ))}
        {visibleFolders.length === 0 && !creating && (
          <div className="w-muted py-1">No folders yet</div>
        )}
      </div>
      {creating ? (
        <div className="flex items-center gap-1 px-1.5 py-1">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") doCreate();
              if (e.key === "Escape") setCreating(false);
            }}
            placeholder="Folder name"
            className="pocket-inline-input"
            style={{ flex: 1 }}
          />
          <button type="button" className="pocket-icon-btn" aria-label="Create folder" onClick={doCreate}>
            <Check2 size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="pocket-menu-item"
          style={{ color: "var(--w-accent)" }}
          onClick={() => setCreating(true)}
        >
          <PlusLg size={12} />
          <span>New folder…</span>
        </button>
      )}
    </div>
  );
}

function TypeContent({ item, onClose }) {
  return (
    <div className="pocket-menu" style={{ minWidth: 150 }}>
      <div className="w-label font-semibold px-1.5 py-0.5" style={{ color: "var(--w-ink-2)" }}>
        Change type
      </div>
      {KINDS.map((k) => (
        <button
          key={k}
          type="button"
          className="pocket-menu-item"
          style={item.kind === k ? { color: "var(--w-accent)" } : undefined}
          onClick={() => {
            updateItem(item.id, { kind: k });
            onClose();
          }}
        >
          {item.kind === k ? <Check2 size={13} /> : <span style={{ width: 13 }} />}
          <span>{KIND_META[k].label}</span>
        </button>
      ))}
    </div>
  );
}

const clampStyle = (n) => ({
  display: "-webkit-box",
  WebkitLineClamp: n,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
});

const expandedStyle = {
  maxHeight: 240,
  overflowY: "auto",
  paddingRight: 2,
};

/**
 * ItemRow — renders one save in its collapsed/expanded states with the
 * copy / open source / folders / change-type / delete action bar.
 */
export function ItemRow({ item, isNew = false, showFavicons = true }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [undoVisible, setUndoVisible] = useState(false);
  const [menu, setMenu] = useState(null); // { anchor, kind: "folders" | "type" }
  const copiedTimer = useRef(null);
  const undoTimer = useRef(null);

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      if (undoTimer.current) clearTimeout(undoTimer.current);
    },
    [],
  );

  const Icon = KIND_ICON[item.kind] || TextLeft;
  const age = humanizeAge(item.updatedAt) || "";
  const isLink = item.kind === "link";

  const doCopy = (e) => {
    e?.stopPropagation();
    copyText(item.text).then(() => {
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 1200);
    });
  };

  const doDelete = (e) => {
    e?.stopPropagation();
    setExpanded(false);
    setUndoVisible(true);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    // Defer the soft-delete so the inline "Deleted - Undo" row stays mounted
    // for the 5s window; cancelling the timer (Undo) keeps the item.
    undoTimer.current = setTimeout(() => softDelete(item.id), 5000);
  };

  const doUndo = (e) => {
    e?.stopPropagation();
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndoVisible(false);
  };

  const openMenu = (kind) => (e) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    setMenu({ anchor: { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }, kind });
  };

  const handleClick = () => {
    if (isLink) openUrl(item.text);
    else setExpanded((v) => !v);
  };

  const handleKey = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleClick();
    } else if (e.key === "c" && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      doCopy();
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      doDelete(e);
    }
  };

  if (undoVisible) {
    return (
      <div className="pocket-row pocket-row--deleted" role="listitem">
        <span className="w-caption" style={{ color: "var(--w-ink-4)" }}>
          Deleted
        </span>
        <button type="button" className="pocket-undo-btn" onClick={doUndo}>
          Undo
        </button>
      </div>
    );
  }

  return (
    <div
      role="listitem"
      tabIndex={0}
      aria-expanded={isLink ? undefined : expanded}
      className={`pocket-row ${isNew ? "pocket-row--new" : ""}`}
      onClick={handleClick}
      onKeyDown={handleKey}
    >
      {item.kind === "word" ? (
        <div className="flex-1 min-w-0">
          <div
            className="truncate"
            style={{ fontSize: "1.075rem", fontWeight: 600, color: "var(--w-ink-1)" }}
          >
            {item.text}
          </div>
          <div className="w-caption truncate">
            {item.host ? `from ${item.host}` : "No website"}
            {age ? ` · ${age}` : ""}
          </div>
        </div>
      ) : item.kind === "link" ? (
        <>
          {showFavicons && <Tile item={item} />}
          <div className="flex-1 min-w-0">
            <div
              className="truncate"
              style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--w-ink-1)" }}
            >
              {item.title || item.text}
            </div>
            <div className="w-caption truncate">{item.host || item.text}</div>
          </div>
        </>
      ) : item.kind === "code" ? (
        <div className="flex-1 min-w-0">
          <pre
            className="pocket-code"
            style={{
              fontFamily: MONO,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              ...(expanded ? expandedStyle : clampStyle(4)),
            }}
          >
            {item.text}
          </pre>
          <div className="w-caption truncate" style={{ marginTop: 4 }}>
            {item.host ? `${item.host} · ` : ""}
            {age}
          </div>
        </div>
      ) : item.kind === "sentence" ? (
        <div className="flex-1 min-w-0" style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
          <span
            aria-hidden="true"
            style={{ width: 2, borderRadius: 1, flexShrink: 0, background: "var(--w-accent)" }}
          />
          <div className="min-w-0 flex-1">
            <div
              style={{
                color: "var(--w-ink-1)",
                fontSize: "0.8125rem",
                lineHeight: 1.5,
                ...(expanded ? expandedStyle : clampStyle(2)),
              }}
            >
              {item.text}
            </div>
            <div className="w-caption truncate">
              {item.host ? `${item.host} · ` : ""}
              {age}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-w-0">
          <div
            style={{
              color: "var(--w-ink-1)",
              fontSize: "0.8125rem",
              lineHeight: 1.5,
              ...(expanded
                ? expandedStyle
                : {
                    ...clampStyle(3),
                    WebkitMaskImage: "linear-gradient(to bottom, #000 78%, transparent 100%)",
                    maskImage: "linear-gradient(to bottom, #000 78%, transparent 100%)",
                  }),
            }}
          >
            {item.text}
          </div>
          <div className="w-caption truncate">
            {item.host ? `${item.host} · ` : ""}
            {age}
          </div>
        </div>
      )}

      <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="pocket-icon-btn pocket-row-hover" aria-label="Copy" onClick={doCopy}>
          {copied ? <Check2 size={13} /> : <Copy size={13} />}
        </button>
        <span
          className="pocket-chevron"
          style={{ transform: expanded ? "rotate(180deg)" : "none" }}
        >
          {isLink ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
        </span>
      </div>

      {expanded && (
        <div className="pocket-row__actions" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="pocket-action-btn" onClick={doCopy}>
            {copied ? <Check2 size={12} /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>
          {item.sourceUrl && (
            <button type="button" className="pocket-action-btn" onClick={() => openUrl(item.sourceUrl)}>
              <BoxArrowUpRight size={12} />
              Open source
            </button>
          )}
          <button type="button" className="pocket-action-btn" onClick={openMenu("folders")}>
            <Folder2 size={12} />
            Folders
          </button>
          <button type="button" className="pocket-action-btn" onClick={openMenu("type")}>
            <Icon size={12} />
            Change type
          </button>
          <button type="button" className="pocket-action-btn pocket-action-btn--danger" onClick={doDelete}>
            <XLg size={12} />
            Delete
          </button>
        </div>
      )}

      {menu && menu.kind === "folders" && (
        <PocketMenu anchor={menu.anchor} onClose={() => setMenu(null)}>
          <FoldersContent item={item} onClose={() => setMenu(null)} />
        </PocketMenu>
      )}
      {menu && menu.kind === "type" && (
        <PocketMenu anchor={menu.anchor} onClose={() => setMenu(null)}>
          <TypeContent item={item} onClose={() => setMenu(null)} />
        </PocketMenu>
      )}
    </div>
  );
}
