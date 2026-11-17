import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowsFullscreen,
  Check2,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  PlusLg,
  Search,
  XLg,
} from "react-bootstrap-icons";

import { BaseWidget } from "../BaseWidget";
import { Modal } from "../../components/ui/Modal";
import { Divider } from "../../components/ui/Divider";
import { TooltipBtn } from "../../components/ui/TooltipBtn";
import { PillButton } from "../../components/ui/PillButton";
import { TintedChip } from "../../components/ui/TintedChip";
import { Input } from "../../components/ui/Input";
import { PocketIcon } from "../../assets/svg/PocketIcon";
import { ItemRow } from "./ItemRow";
import { LetterTile } from "./LetterTile";
import { Settings } from "./Settings";
import { usePocket } from "./usePocket";
import { addItem, createFolder } from "./pocketStore";
import {
  classifyKind,
  cleanText,
  groupBySite,
  searchItems,
  timeBucket,
  TIME_BUCKET_LABELS,
} from "./utils";
import { FOLDER_COLOR_MAP, KINDS, KIND_META, PAGE_SIZE, RECENT_LIMIT } from "./constants";

const TABS = [
  { id: "recent", label: "Recent" },
  { id: "all", label: "All" },
  { id: "sites", label: "Sites" },
];

const CHIP_KINDS = ["link", "word", "sentence", "paragraph", "code"];

function groupIntoBuckets(list) {
  const order = ["today", "yesterday", "week", "earlier"];
  const map = new Map();
  for (const it of list) {
    const b = timeBucket(it.updatedAt);
    if (!map.has(b)) map.set(b, []);
    map.get(b).push(it);
  }
  return order
    .filter((b) => map.has(b))
    .map((b) => ({ key: b, label: TIME_BUCKET_LABELS[b], items: map.get(b) }));
}

/**
 * Widget — Pocket, the text-saving widget (Phase 1, local only).
 *
 * Widget mode is deliberately calm and minimal: header + tabs + a type-only
 * filter row + list + quick-add. Organization (folders, change type, open
 * source) lives in the expanded two-pane Library so the card stays uncluttered.
 */
export const Widget = ({ id, onRemove }) => {
  const { items, folders, meta, hydrated } = usePocket();
  const cardRef = useRef(null);
  const [width, setWidth] = useState(0);

  const [tab, setTab] = useState("recent");
  const [filter, setFilter] = useState(null); // { type: "kind"|"folder", value } | null
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [siteView, setSiteView] = useState(null); // host when drilling into a site
  const [expanded, setExpanded] = useState(false);
  const [quickAdd, setQuickAdd] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [openSites, setOpenSites] = useState(() => new Set());
  const [highlightId, setHighlightId] = useState(null);
  const [toast, setToast] = useState(null);
  const [copiedWordId, setCopiedWordId] = useState(null);

  const prevFirstId = useRef(null);
  const toastTimer = useRef(null);
  const highlightTimer = useRef(null);
  const searchRef = useRef(null);
  const wordCopyTimer = useRef(null);

  // Track container width for responsive (compact/regular).
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => () => clearTimeout(wordCopyTimer.current), []);

  // Apply the "Default tab" pref once hydrated.
  useEffect(() => {
    if (hydrated) setTab(meta?.prefs?.defaultTab || "recent");
  }, [hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  // New-save highlight: when the newest item id changes, flash the top row.
  useEffect(() => {
    const alive = items.filter((i) => !i.deletedAt).sort((a, b) => b.updatedAt - a.updatedAt);
    const firstId = alive[0]?.id ?? null;
    if (firstId && firstId !== prevFirstId.current && prevFirstId.current !== null) {
      setHighlightId(firstId);
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => setHighlightId(null), 1200);
    }
    prevFirstId.current = firstId;
  }, [items]);

  const compact = width > 0 && width < 300;

  // --- derived data -------------------------------------------------------
  const alive = useMemo(
    () => items.filter((i) => !i.deletedAt).sort((a, b) => b.updatedAt - a.updatedAt),
    [items],
  );

  const byFilter = useMemo(() => {
    if (!filter) return alive;
    if (filter.type === "kind") return alive.filter((i) => i.kind === filter.value);
    return alive.filter((i) => (i.folderIds || []).includes(filter.value));
  }, [alive, filter]);

  const searched = useMemo(
    () => (query ? searchItems(items, folders, query) : null),
    [items, folders, query],
  );

  const sites = useMemo(() => groupBySite(byFilter), [byFilter]);

  const folderById = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);

  const kindCounts = useMemo(() => {
    const m = new Map();
    for (const i of alive) m.set(i.kind, (m.get(i.kind) || 0) + 1);
    return m;
  }, [alive]);

  const folderCounts = useMemo(() => {
    const m = new Map();
    for (const i of alive) for (const fid of i.folderIds || []) m.set(fid, (m.get(fid) || 0) + 1);
    return m;
  }, [alive]);

  const totalCount = alive.length;
  const isWordCloud = filter?.type === "kind" && filter.value === "word" && tab !== "sites";

  // --- actions ------------------------------------------------------------
  const showToast = (msg) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  const saveQuickAdd = () => {
    const raw = quickAdd;
    if (!raw.trim()) return;
    const { text, truncated } = cleanText(raw);
    if (!text) return;
    const item = {
      id: crypto.randomUUID(),
      kind: classifyKind(text, {}),
      text,
      title: "",
      host: "",
      sourceUrl: "",
      favicon: "",
      folderIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deletedAt: null,
    };
    const res = addItem(item);
    setQuickAdd("");
    if (truncated) showToast("Saved (trimmed to 20,000 characters)");
    else if (res.status === "duplicate") showToast("Already in your Pocket");
    else showToast("Saved to Pocket");
  };

  const onNewFolderKey = (e) => {
    if (e.key === "Enter") {
      const name = newFolderName.trim();
      if (name) createFolder(name);
      setNewFolderName("");
      setCreatingFolder(false);
    }
    if (e.key === "Escape") {
      setNewFolderName("");
      setCreatingFolder(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setSearchOpen(false);
  };

  const pickFilter = (f) => {
    setFilter(f);
    setSiteView(null);
    setVisible(PAGE_SIZE);
  };

  // --- tabs (ARIA tabs pattern: roving tabindex + arrow-key nav) -----------
  const PANEL_ID = "pocket-tabpanel";
  const tabId = (t) => `pocket-tab-${t}`;

  const onTablistKey = (e) => {
    const idx = TABS.findIndex((t) => t.id === tab);
    let next = -1;
    if (e.key === "ArrowRight") next = (idx + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    if (next >= 0 && next !== idx) {
      e.preventDefault();
      setTab(TABS[next].id);
      document.getElementById(tabId(TABS[next].id))?.focus();
    }
  };

  const renderTabs = () => (
    <div className="pocket-tabs" role="tablist" aria-label="View" onKeyDown={onTablistKey}>
      {TABS.map((t) => (
        <button
          key={t.id}
          id={tabId(t.id)}
          role="tab"
          aria-selected={tab === t.id}
          aria-controls={PANEL_ID}
          tabIndex={tab === t.id ? 0 : -1}
          type="button"
          className={`pocket-tab ${tab === t.id ? "pocket-tab--active" : ""}`}
          onClick={() => setTab(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  // --- keyboard on the widget root ----------------------------------------
  const onRootKey = (e) => {
    if (e.key === "/" && !searchOpen && !expanded) {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      e.preventDefault();
      setSearchOpen(true);
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  };

  // --- render helpers -----------------------------------------------------
  const renderQuickAdd = () => {
    if (compact) return null;
    return (
      <div className="pocket-quickadd">
        <PlusLg size={13} style={{ color: "var(--w-ink-4)", flexShrink: 0, marginTop: 2 }} />
        <textarea
          rows={1}
          value={quickAdd}
          onChange={(e) => setQuickAdd(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              saveQuickAdd();
            }
          }}
          placeholder="Paste or type to save…"
          aria-label="Quick add"
          className="pocket-quickadd__input"
        />
      </div>
    );
  };

  const renderEmpty = () => {
    if (query) {
      return (
        <div className="pocket-empty">
          <span className="w-body" style={{ color: "var(--w-ink-2)" }}>
            Nothing matches "{query}".
          </span>
          <button type="button" className="pocket-undo-btn" onClick={clearSearch}>
            Clear search
          </button>
        </div>
      );
    }
    if (filter?.type === "folder") {
      const folder = folderById.get(filter.value);
      return (
        <div className="pocket-empty">
          <span className="w-body" style={{ color: "var(--w-ink-2)" }}>
            Nothing in {folder?.name || "this folder"} yet. Use Folders on any save to add it.
          </span>
        </div>
      );
    }
    if (filter?.type === "kind") {
      return (
        <div className="pocket-empty">
          <span className="w-body" style={{ color: "var(--w-ink-2)" }}>
            No {KIND_META[filter.value].label.toLowerCase()} yet.
          </span>
        </div>
      );
    }
    // First-run empty state (§7)
    return (
      <div className="pocket-empty pocket-empty--first">
        <PocketIcon size={22} style={{ color: "var(--w-ink-4)" }} />
        <span className="w-heading" style={{ color: "var(--w-ink-1)" }}>
          Your pocket is empty.
        </span>
        <span className="w-body" style={{ color: "var(--w-ink-4)", maxWidth: 220 }}>
          Select text on any page, right-click, and choose Add to Pocket.
        </span>
        <div className="pocket-steps" role="list">
          <span className="pocket-step" role="listitem">Select</span>
          <span className="pocket-step" role="listitem">Right-click</span>
          <span className="pocket-step" role="listitem">Saved</span>
        </div>
        <span className="pocket-quickadd__label">Or paste something here.</span>
        {renderQuickAdd()}
      </div>
    );
  };

  const renderRow = (full) => (it) => (
    <ItemRow
      key={it.id}
      item={it}
      isNew={it.id === highlightId}
      showFavicons={meta?.prefs?.showFavicons !== false}
      full={full}
    />
  );

  const renderFlat = (list, withBuckets = true, full = false) => {
    if (!withBuckets) return <div role="list">{list.map(renderRow(full))}</div>;
    const buckets = groupIntoBuckets(list);
    return (
      <div role="list">
        {buckets.map((b) => (
          <div key={b.key}>
            <div className="pocket-time-label">{b.label}</div>
            {b.items.map(renderRow(full))}
          </div>
        ))}
      </div>
    );
  };

  const copyWord = (it) => {
    const done = () => {
      setCopiedWordId(it.id);
      if (wordCopyTimer.current) clearTimeout(wordCopyTimer.current);
      wordCopyTimer.current = setTimeout(() => setCopiedWordId(null), 1200);
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(it.text).then(done).catch(() => {});
    else done();
  };

  const renderWordCloud = (list) => (
    <div className="pocket-cloud" role="list">
      {list.map((it) => (
        <button
          key={it.id}
          type="button"
          className={`pocket-word-pill ${copiedWordId === it.id ? "pocket-word-pill--copied" : ""}`}
          onClick={() => copyWord(it)}
          title="Copy"
        >
          {copiedWordId === it.id && <Check2 size={11} aria-hidden="true" />}
          {it.text}
        </button>
      ))}
    </div>
  );

  const renderSites = (full = false) => {
    if (siteView) {
      const siteItems = byFilter.filter((i) => (i.host || "") === siteView);
      return (
        <div>
          <div className="pocket-breadcrumb">
            <button type="button" className="pocket-undo-btn" onClick={() => setSiteView(null)}>
              Sites
            </button>
            <ChevronRight size={12} style={{ color: "var(--w-ink-5)" }} />
            <span className="w-caption">{siteView}</span>
          </div>
          {siteItems.length === 0 ? renderEmpty() : renderFlat(siteItems, true, full)}
        </div>
      );
    }
    if (sites.length === 0) return renderEmpty();
    return (
      <div>
        {sites.map((g) => {
          const open = openSites.has(g.host || "");
          const visibleItems = g.items.slice(0, 5);
          return (
            <div key={g.host || "none"}>
              <button
                type="button"
                className="pocket-site-header"
                aria-expanded={open}
                onClick={() =>
                  setOpenSites((prev) => {
                    const next = new Set(prev);
                    const key = g.host || "";
                    if (next.has(key)) next.delete(key);
                    else next.add(key);
                    return next;
                  })
                }
              >
                <LetterTile text={g.host || ""} size={18} />
                <span className="flex-1 truncate text-left" style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--w-ink-1)" }}>
                  {g.host || "No website"}
                </span>
                <span className="w-caption" style={{ color: "var(--w-ink-5)" }}>
                  {g.items.length}
                </span>
                <span className="pocket-chevron" style={{ transform: open ? "rotate(180deg)" : "none" }}>
                  <ChevronDown size={13} />
                </span>
              </button>
              {open && (
                <div>
                  <div role="list">{visibleItems.map(renderRow(full))}</div>
                  {g.items.length > 5 && (
                    <div className="px-3 py-1.5">
                      <TintedChip size="sm" onClick={() => setSiteView(g.host)}>
                        View all {g.items.length}
                      </TintedChip>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderBody = (full = false) => {
    if (!hydrated) return null; // avoid flashing "empty" before storage hydrates
    if (searched) {
      return searched.length === 0 ? renderEmpty() : (
        <div role="list">{searched.map(renderRow(full))}</div>
      );
    }
    if (tab === "sites") return renderSites(full);

    let list;
    if (isWordCloud) {
      list = renderWordCloud(byFilter);
    } else if (tab === "recent") {
      const recent = byFilter.slice(0, RECENT_LIMIT);
      list = recent.length === 0 ? renderEmpty() : renderFlat(recent, true, full);
    } else {
      const paged = byFilter.slice(0, visible);
      list =
        paged.length === 0 ? (
          renderEmpty()
        ) : (
          <>
            {renderFlat(paged, true, full)}
            {byFilter.length > visible && (
              <div className="px-3 py-1.5">
                <TintedChip size="sm" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                  Load more
                </TintedChip>
              </div>
            )}
          </>
        );
    }
    return list;
  };

  const renderChips = () => (
    <div className="pocket-chip-row" role="list" aria-label="Filter">
      <PillButton active={!filter} tinted onClick={() => pickFilter(null)}>
        All
      </PillButton>
      {CHIP_KINDS.map((k) => (
        <PillButton
          key={k}
          active={filter?.type === "kind" && filter.value === k}
          tinted
          onClick={() => pickFilter({ type: "kind", value: k })}
        >
          {KIND_META[k].label}
        </PillButton>
      ))}
    </div>
  );

  const header = (
    <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-2 shrink-0">
      <PocketIcon size={14} style={{ color: "var(--w-accent)", flexShrink: 0 }} />
      <span className="w-label font-semibold flex-1 truncate" style={{ color: "var(--w-ink-2)" }}>
        Pocket
      </span>
      {!compact && (
        <span className="w-caption" style={{ color: "var(--w-ink-5)" }}>
          {totalCount}
        </span>
      )}
      <div className="flex items-center gap-0.5 shrink-0">
        {!compact && (
          <TooltipBtn
            tooltip="Search"
            className="pocket-icon-btn"
            onClick={() => {
              setSearchOpen((v) => !v);
              if (!searchOpen) requestAnimationFrame(() => searchRef.current?.focus());
            }}
          >
            <Search size={13} />
          </TooltipBtn>
        )}
        <TooltipBtn
          tooltip="Add"
          className="pocket-icon-btn"
          onClick={() => {
            if (compact) {
              setExpanded(true);
            } else {
              cardRef.current?.querySelector(".pocket-quickadd__input")?.focus();
            }
          }}
        >
          <PlusLg size={13} />
        </TooltipBtn>
        {!compact && (
          <TooltipBtn tooltip="Expand" className="pocket-icon-btn" onClick={() => setExpanded(true)}>
            <ArrowsFullscreen size={13} />
          </TooltipBtn>
        )}
      </div>
    </div>
  );

  const searchBar = searchOpen && (
    <div className="px-3 pb-2 shrink-0">
      <Input
        pill
        ref={searchRef}
        icon={<Search size={13} />}
        suffix={
          query ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={clearSearch}
              className="flex items-center justify-center rounded"
              style={{ width: 20, height: 20, color: "var(--w-ink-4)", cursor: "pointer", border: "none", background: "transparent" }}
            >
              <XLg size={12} />
            </button>
          ) : null
        }
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && clearSearch()}
        placeholder="Search text, title, site or folder"
        aria-label="Search Pocket"
      />
    </div>
  );

  const expandedContent = (
    <div className="pocket-expanded">
      <div className="pocket-rail">
        <span className="pocket-rail__title">Library</span>
        <button
          type="button"
          aria-pressed={!filter}
          className={`pocket-rail-item ${!filter ? "pocket-rail-item--active" : ""}`}
          onClick={() => pickFilter(null)}
        >
          <span className="flex-1 text-left">All</span>
          <span className="w-caption">{alive.length}</span>
        </button>
        {KINDS.map((k) => {
          const n = kindCounts.get(k) || 0;
          return (
            <button
              key={k}
              type="button"
              aria-pressed={filter?.type === "kind" && filter.value === k}
              className={`pocket-rail-item ${filter?.type === "kind" && filter.value === k ? "pocket-rail-item--active" : ""}`}
              onClick={() => pickFilter({ type: "kind", value: k })}
            >
              <span className="flex-1 text-left">{KIND_META[k].label}</span>
              <span className="w-caption">{n}</span>
            </button>
          );
        })}
        <span className="pocket-rail__title">Folders</span>
        {folders
          .filter((f) => !f.deletedAt)
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((f) => {
            const n = folderCounts.get(f.id) || 0;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter?.type === "folder" && filter.value === f.id}
                className={`pocket-rail-item ${filter?.type === "folder" && filter.value === f.id ? "pocket-rail-item--active" : ""}`}
                onClick={() => pickFilter({ type: "folder", value: f.id })}
              >
                <span
                  aria-hidden="true"
                  style={{ width: 8, height: 8, borderRadius: 2, background: FOLDER_COLOR_MAP[f.color] || FOLDER_COLOR_MAP.slate }}
                />
                <span className="flex-1 text-left truncate">{f.name}</span>
                <span className="w-caption">{n}</span>
              </button>
            );
          })}
        {creatingFolder ? (
          <input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={onNewFolderKey}
            onBlur={() => setCreatingFolder(false)}
            placeholder="Folder name"
            className="pocket-inline-input"
            style={{ margin: "4px 8px" }}
          />
        ) : (
          <button
            type="button"
            className="pocket-rail-item pocket-rail-item--new"
            onClick={() => setCreatingFolder(true)}
          >
            <FolderPlus size={12} />
            <span>New folder</span>
          </button>
        )}
      </div>
      <div className="pocket-main">
        <div className="pocket-main__top">
          <Input
            pill
            icon={<Search size={13} />}
            suffix={
              query ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={clearSearch}
                  className="flex items-center justify-center rounded"
                  style={{ width: 20, height: 20, color: "var(--w-ink-4)", cursor: "pointer", border: "none", background: "transparent" }}
                >
                  <XLg size={12} />
                </button>
              ) : null
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && clearSearch()}
            placeholder="Search Pocket"
            aria-label="Search Pocket"
          />
          {renderTabs()}
        </div>
        <div
          className="pocket-expanded__body"
          role="tabpanel"
          id={PANEL_ID}
          aria-labelledby={tabId(tab)}
        >
          {renderBody(true)}
        </div>
      </div>
    </div>
  );

  return (
    <BaseWidget
      className="flex flex-col overflow-hidden"
      settingsContent={<Settings />}
      settingsTitle="Pocket"
      modalWidth="w-96"
      onRemove={onRemove}
      cardStyle={{ overflow: "hidden" }}
    >
      <div ref={cardRef} className="pocket-root" onKeyDown={onRootKey}>
        {header}
        <Divider />
        {searchBar}
        {!expanded && (
          <>
            {renderTabs()}
            {!compact && renderChips()}
            <div
              className="pocket-list"
              role="tabpanel"
              id={PANEL_ID}
              aria-labelledby={tabId(tab)}
            >
              {renderBody(false)}
            </div>
            {renderQuickAdd()}
          </>
        )}
      </div>

      {expanded && (
        <Modal
          onClose={() => setExpanded(false)}
          className="flex flex-col"
          style={{ width: "min(720px, 92vw)", height: "min(640px, 88vh)" }}
          ariaLabel="Pocket library"
        >
          <div className="pocket-modal__head">
            <div className="flex items-center gap-1.5 min-w-0">
              <PocketIcon size={14} style={{ color: "var(--w-accent)" }} />
              <span className="w-label font-semibold" style={{ color: "var(--w-ink-2)" }}>
                Pocket
              </span>
            </div>
            <button type="button" className="pocket-icon-btn" aria-label="Close" onClick={() => setExpanded(false)}>
              <XLg size={14} />
            </button>
          </div>
          {expandedContent}
        </Modal>
      )}

      {toast &&
        createPortal(
          <div className="pocket-toast" role="status">
            {toast}
          </div>,
          document.body,
        )}
    </BaseWidget>
  );
};
