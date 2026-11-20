import { useEffect, useRef, useState, memo } from "react";
import { BoxArrowUpRight, Check2, Copy, TextLeft, Trash, XLg } from "react-bootstrap-icons";
import { Button } from "../../components/ui/Button";
import { IconButton } from "../../components/ui/IconButton";
import { KIND_ICONS } from "./kindIcons";
import { usePocketFolders } from "./usePocket";
import { setItemFolders } from "./pocketStore";
import { copyText, openUrl, openItemSource } from "./actions";
import { previewClamp } from "./previewLines";
import { detectLanguage, formatSavedDate, middleEllipsis } from "./utils";
import { humanizeAge } from "../../utilities";
import { KIND_META, FOLDER_COLOR_MAP } from "./constants";
import { LinkBody } from "./items/LinkBody";
import { SentenceBody } from "./items/SentenceBody";
import { ParagraphBody } from "./items/ParagraphBody";
import { CodeBody } from "./items/CodeBody";
import { SiteTile } from "./items/SiteTile";
import { RowActions, deleteWithUndo } from "./RowActions";
import { FolderPicker } from "./FolderPicker";

/**
 * ItemRow — the shell for one save: layout, click handling, expanded state.
 *
 * variant: "widget" (small card — compact uniform row, no site icons, hover
 * actions, click opens the expanded view) | "list" (expanded view — the rich
 * per-kind entry design with an expandable Details block).
 */
export const ItemRow = memo(function ItemRow({
  item,
  isNew = false,
  variant = "list",
  showSiteIcons = true,
  inWebsiteGroup = false,
  previewLength = "medium",
  wrapCode = false,
  onOpen,
}) {
  if (variant === "widget") {
    return <WidgetRow item={item} isNew={isNew} onOpen={onOpen} />;
  }

  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef(null);

  const isLink = item.kind === "link";

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const doCopy = () => {
    copyText(item.text)
      .then(() => {
        setCopied(true);
        if (copiedTimer.current) clearTimeout(copiedTimer.current);
        copiedTimer.current = setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  };

  const handleClick = () => {
    if (isLink) openUrl(item.text);
    else setExpanded((v) => !v);
  };

  const handleKey = (e) => {
    // Only react when the row itself is focused — not a descendant button
    // (More actions, Copy, Open link), whose own activation must win.
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter") {
      e.preventDefault();
      handleClick();
    } else if (e.key === " " && !isLink) {
      e.preventDefault();
      setExpanded((v) => !v);
    } else if (e.key === "c" && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      doCopy();
    } else if (e.key === "o" && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      if (isLink) openUrl(item.text);
      else if (item.sourceUrl) openUrl(item.sourceUrl);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      deleteWithUndo(item);
    }
  };

  const clamp = previewClamp(item.kind, previewLength);

  let body;
  if (isLink) body = <LinkBody item={item} showSiteIcons={showSiteIcons} />;
  else if (item.kind === "sentence") body = <SentenceBody item={item} clamp={clamp} expanded={expanded} />;
  else if (item.kind === "paragraph") {
    body = (
      <ParagraphBody
        item={item}
        clamp={clamp}
        expanded={expanded}
        variant={variant}
        onToggle={() => setExpanded((v) => !v)}
      />
    );
  } else {
    body = (
      <CodeBody
        item={item}
        clamp={clamp}
        expanded={expanded}
        variant={variant}
        wrapCode={wrapCode}
        onToggle={() => setExpanded((v) => !v)}
      />
    );
  }

  const showDetails = variant === "list" && expanded && !isLink;

  return (
    <div
      role="listitem"
      tabIndex={0}
      aria-expanded={isLink ? undefined : expanded}
      className={`pocket-item ${isNew ? "pocket-item--new" : ""}`}
      onClick={handleClick}
      onKeyDown={handleKey}
    >
      <div className="pocket-row">
        <div className="pocket-row__main">
          {body}
          {!isLink && (
            <SourceLine
              item={item}
              showSiteIcons={showSiteIcons}
              inWebsiteGroup={inWebsiteGroup}
            />
          )}
        </div>
        <RowActions item={item} copied={copied} onCopy={doCopy} />
      </div>

      <span className="um-sr-only" role="status">
        {copied ? "Copied" : ""}
      </span>

      {showDetails && <Details item={item} />}
    </div>
  );
});

/**
 * WidgetRow — the compact, uniform row used on the small card face. Content
 * first (single ellipsized line), a leading accent-tinted kind-glyph tile, and
 * a quiet meta line beneath. No site icons. Actions are revealed only on hover.
 * Every kind shares the same height and structure.
 *
 * Click: text rows open the expanded view; links open the link.
 */
function WidgetRow({ item, isNew, onOpen }) {
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef(null);
  const isLink = item.kind === "link";
  const age = humanizeAge(item.updatedAt) || "";
  const host = item.host || "";
  const content = isLink ? item.title || item.host || item.text : item.text;
  const mono = item.kind === "code";
  const serif = item.kind === "sentence" || item.kind === "paragraph";
  const KindIcon = KIND_ICONS[item.kind] || TextLeft;

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  const doCopy = () => {
    copyText(item.text)
      .then(() => {
        setCopied(true);
        if (copiedTimer.current) clearTimeout(copiedTimer.current);
        copiedTimer.current = setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  };

  const activate = () => {
    if (isLink) openUrl(item.text);
    else onOpen?.();
  };

  const onKey = (e) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter") {
      e.preventDefault();
      activate();
    } else if (e.key === "c" && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      doCopy();
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      deleteWithUndo(item);
    }
  };

  return (
    <div
      role="listitem"
      tabIndex={0}
      className={`pocket-item pocket-widget-item ${isNew ? "pocket-item--new" : ""}`}
      onClick={activate}
      onKeyDown={onKey}
    >
      <span className="pocket-widget-item__tile" aria-hidden="true">
        <KindIcon size={12} />
      </span>

      <div className="pocket-widget-item__main">
        <div
          className={`pocket-widget-item__text ${mono ? "pocket-widget-item__text--mono" : serif ? "pocket-widget-item__text--serif" : ""}`}
          title={item.text}
        >
          {content}
        </div>
        <div className="pocket-widget-item__meta">
          {host && <span className="pocket-widget-item__host">{host}</span>}
          {host && age && <span className="pocket-widget-item__dot">·</span>}
          {age && <span className="pocket-widget-item__time">{age}</span>}
        </div>
      </div>

      <div className="pocket-widget-item__actions" onClick={(e) => e.stopPropagation()}>
        {isLink ? (
          <>
            <IconButton label="Open link" size="sm" onClick={(e) => { e.stopPropagation(); openUrl(item.text); }}>
              <BoxArrowUpRight size={12} />
            </IconButton>
            <IconButton label="Copy link" size="sm" onClick={(e) => { e.stopPropagation(); doCopy(); }}>
              {copied ? <Check2 size={12} /> : <Copy size={12} />}
            </IconButton>
            <IconButton label="Delete" size="sm" onClick={(e) => { e.stopPropagation(); deleteWithUndo(item); }}>
              <Trash size={12} />
            </IconButton>
          </>
        ) : (
          <>
            <IconButton label={copied ? "Copied" : "Copy"} size="sm" onClick={(e) => { e.stopPropagation(); doCopy(); }}>
              {copied ? <Check2 size={12} /> : <Copy size={12} />}
            </IconButton>
            <IconButton label="Delete" size="sm" onClick={(e) => { e.stopPropagation(); deleteWithUndo(item); }}>
              <Trash size={12} />
            </IconButton>
          </>
        )}
      </div>

      <span className="um-sr-only" role="status">
        {copied ? "Copied" : ""}
      </span>
    </div>
  );
}

/**
 * SourceLine — the one quiet line under a text entry: site icon, host, age.
 * Code adds its language. Everything else (page title, kind, full date) lives
 * in the expanded Details block, so a collapsed row stays calm.
 */
function SourceLine({ item, showSiteIcons, inWebsiteGroup }) {
  const host = item.host || "";
  const age = humanizeAge(item.updatedAt) || "";
  const parts = [];
  if (!inWebsiteGroup && host) parts.push(host);
  if (item.kind === "code") {
    const language = detectLanguage(item.text);
    if (language !== "Code") parts.push(language);
  }
  if (age) parts.push(age);
  // title attribute: full URL + absolute date (hover)
  const title = [item.sourceUrl || "", formatSavedDate(item.updatedAt)].filter(Boolean).join(" · ");

  return (
    <div className="pocket-row__meta" title={title}>
      {!inWebsiteGroup && <SiteTile url={item.sourceUrl || ""} host={host} size={14} showFavicon={showSiteIcons} />}
      <span className="pocket-row__meta-text truncate">{parts.join(" · ") || "No website"}</span>
    </div>
  );
}

/**
 * Details — the less-used information, shown only when a row is expanded, as
 * quiet label/value rows: Source (page title, path, actions), Folders, Saved.
 */
function Details({ item }) {
  const folders = usePocketFolders();
  const [folderAnchor, setFolderAnchor] = useState(null);
  const folderById = new Map(folders.map((f) => [f.id, f]));
  const hasSource = !!item.sourceUrl;

  const openFolderPicker = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    setFolderAnchor({ left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height });
  };

  return (
    <div className="pocket-details" onClick={(e) => e.stopPropagation()}>
      {hasSource && (
        <div className="pocket-details__row">
          <span className="pocket-details__label">Source</span>
          <div className="pocket-details__value">
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="pocket-details__link"
              onClick={(e) => e.stopPropagation()}
            >
              {item.title || item.host || item.sourceUrl}
            </a>
            <div className="w-caption truncate" title={item.sourceUrl} style={{ color: "var(--w-ink-4)" }}>
              {middleEllipsis(item.sourceUrl)}
            </div>
            <div className="pocket-details__actions">
              {item.kind !== "code" && (
                <Button variant="secondary" size="sm" onClick={() => openItemSource(item)}>
                  Open at quote
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => openUrl(item.sourceUrl)}>
                Open page
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="pocket-details__row">
        <span className="pocket-details__label">Folders</span>
        <div className="pocket-details__value pocket-details__value--wrap">
          {(item.folderIds || []).map((fid) => {
            const f = folderById.get(fid);
            if (!f) return null;
            return (
              <button
                key={fid}
                type="button"
                className="pocket-folder-chip"
                onClick={() => setItemFolders(item.id, (item.folderIds || []).filter((x) => x !== fid))}
              >
                <span
                  aria-hidden="true"
                  style={{ width: 8, height: 8, borderRadius: 2, background: FOLDER_COLOR_MAP[f.color] || FOLDER_COLOR_MAP.slate }}
                />
                <span className="truncate">{f.name}</span>
                <XLg size={10} aria-hidden="true" />
              </button>
            );
          })}
          <button type="button" className="pocket-text-btn" onClick={openFolderPicker}>
            Add to folder
          </button>
        </div>
      </div>

      <div className="pocket-details__row">
        <span className="pocket-details__label">Saved</span>
        <span className="w-caption" style={{ color: "var(--w-ink-3)" }}>
          {formatSavedDate(item.createdAt)} · {KIND_META[item.kind].singular}
        </span>
      </div>

      {folderAnchor && <FolderPicker anchor={folderAnchor} item={item} onClose={() => setFolderAnchor(null)} />}
    </div>
  );
}
