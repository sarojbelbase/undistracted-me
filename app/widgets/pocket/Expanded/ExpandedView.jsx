import { useEffect, useMemo, useRef, useState } from "react";
import { List, PlusLg } from "react-bootstrap-icons";
import { Button } from "../../../components/ui/Button";
import { EmptyState } from "../../../components/ui/EmptyState";
import { WidgetHeaderFull } from "../../../components/ui/WidgetHeaderFull";
import { PocketIcon } from "../../../assets/svg/PocketIcon";
import { usePocket } from "../usePocket";
import { updatePrefs } from "../pocketStore";
import { filterItems, totalCount } from "../selectors";
import { searchItems } from "../utils";
import { EMPTY_COPY, KIND_META, PAGE_SIZE } from "../constants";
import { ScrollFade } from "../../../components/ui/ScrollFade";
import { SkeletonRows } from "../Skeleton";
import { Rail } from "./Rail";
import { Toolbar } from "./Toolbar";
import { GroupedList } from "./GroupedList";

/**
 * ExpandedView — the full Pocket library, rendered inside a Modal. Owns the
 * filter, search query, pagination and website collapse state; composes the
 * Rail (navigation) with the Toolbar + GroupedList (main pane).
 */
export function ExpandedView({ onClose, onOpenSettings, onAdd }) {
  const { items, folders, meta, hydrated } = usePocket();
  const prefs = meta?.prefs || {};
  const [filter, setFilter] = useState(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [collapsedHosts, setCollapsedHosts] = useState(() => new Set());
  const [railOpen, setRailOpen] = useState(false);
  const searchRef = useRef(null);

  // Debounce search (120 ms).
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 120);
    return () => clearTimeout(t);
  }, [query]);

  // "/" focuses search (ignored when already typing).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "/") return;
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const base = useMemo(() => filterItems(items, filter), [items, filter]);
  const searching = debouncedQuery.trim().length > 0;
  const searched = searching ? searchItems(items, folders, debouncedQuery) : null;
  const list = useMemo(() => {
    const src = searched ?? base;
    return [...src].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [searched, base]);

  const total = totalCount(items);
  const paged = list.slice(0, visible);
  const hasMore = list.length > visible;

  const title = searching
    ? "Search results"
    : filter == null
      ? "All saves"
      : filter.type === "kind"
        ? KIND_META[filter.value].label
        : folders.find((f) => f.id === filter.value)?.name || "Folder";
  const countText = searching ? `${list.length} results` : `${list.length}`;
  const showKind = !(filter?.type === "kind");

  const pickFilter = (f) => {
    setFilter(f);
    setVisible(PAGE_SIZE);
    setRailOpen(false);
  };
  const clearSearch = () => {
    setQuery("");
    setDebouncedQuery("");
  };

  const renderEmpty = () => {
    if (searching) {
      return (
        <EmptyState
          title={`No results for “${debouncedQuery}”.`}
          text=""
          action={
            <Button variant="ghost" size="sm" onClick={clearSearch}>
              Clear search
            </Button>
          }
        />
      );
    }
    const copy = filter == null ? EMPTY_COPY.all : filter.type === "kind" ? EMPTY_COPY[filter.value] : null;
    if (filter?.type === "folder") {
      const folder = folders.find((f) => f.id === filter.value);
      return (
        <EmptyState
          title={`${folder?.name || "Folder"} is empty.`}
          text="Open More actions on any save and choose Add to Folder."
        />
      );
    }
    return (
      <EmptyState
        title={copy?.title || EMPTY_COPY.all.title}
        text={copy?.text || EMPTY_COPY.all.text}
        action={
          filter == null ? (
            <Button variant="primary" size="sm" onClick={onAdd}>
              Add or paste
            </Button>
          ) : null
        }
      />
    );
  };

  return (
    <div className="pocket-modal">
      <WidgetHeaderFull
        className="pocket-modal__head"
        icon={<PocketIcon size={14} />}
        title="Pocket"
        count={total}
        leading={
          <Button variant="ghost" size="sm" className="pocket-library-toggle" onClick={() => setRailOpen(true)}>
            <List size={13} />
            Library
          </Button>
        }
        onClose={onClose}
        actions={[
          <Button key="add" variant="primary" size="sm" onClick={onAdd}>
            <PlusLg size={12} />
            Add
          </Button>,
        ]}
      />

      <div className={`pocket-expanded ${railOpen ? "pocket-expanded--rail-open" : ""}`}>
        <Rail filter={filter} onPick={pickFilter} onOpenSettings={onOpenSettings} />
        <div className="pocket-main">
          <Toolbar
            query={query}
            onQueryChange={setQuery}
            onClear={clearSearch}
            groupBy={prefs.groupBy || "date"}
            onGroupBy={(v) => updatePrefs({ groupBy: v })}
            title={title}
            count={countText}
            searchRef={searchRef}
          />
          <div className={`pocket-expanded__body ${prefs.density === "compact" ? "pocket-expanded__body--compact" : ""}`}>
            <span className="um-sr-only" role="status">
              {searching ? `${list.length} results` : ""}
            </span>
            {!hydrated ? (
              <SkeletonRows count={8} />
            ) : paged.length === 0 ? (
              renderEmpty()
            ) : (
              <>
                <GroupedList
                  items={paged}
                  groupBy={prefs.groupBy || "date"}
                  searching={searching}
                  showSiteIcons={prefs.showSiteIcons !== false}
                  previewLength={prefs.previewLength || "medium"}
                  wrapCode={!!prefs.wrapCode}
                  showKind={showKind}
                  collapsedHosts={collapsedHosts}
                  onToggleHost={(h) =>
                    setCollapsedHosts((prev) => {
                      const n = new Set(prev);
                      if (n.has(h)) n.delete(h);
                      else n.add(h);
                      return n;
                    })
                  }
                />
                {hasMore && (
                  <div className="pocket-load-more">
                    <Button variant="ghost" size="sm" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                      Load more
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <ScrollFade />

      {railOpen && (
        <div className="pocket-rail-backdrop" onClick={() => setRailOpen(false)} aria-hidden="true" />
      )}
    </div>
  );
}
