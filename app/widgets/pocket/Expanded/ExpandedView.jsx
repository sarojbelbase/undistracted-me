import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { EmptyState } from "../../../components/ui/EmptyState";
import { SegmentedControl } from "../../../components/ui/SegmentedControl";
import { PocketIcon } from "../../../assets/svg/PocketIcon";
import { usePocket } from "../usePocket";
import { updatePrefs } from "../pocketStore";
import { filterItems, totalCount } from "../selectors";
import { searchItems } from "../utils";
import { KIND_META, PAGE_SIZE, GROUP_BY_OPTIONS } from "../constants";
import { EMPTY_STATES } from "../../../constants/emptyStates";
import { SkeletonRows } from "../Skeleton";
import { Rail } from "./Rail";
import { GroupedList } from "./GroupedList";
import { ExpandedShell } from "../../../components/ui/expanded/ExpandedShell";
import { SearchToolbar } from "../../../components/ui/expanded/SearchToolbar";

/**
 * ExpandedView: the full Pocket library, rendered through the shared
 * ExpandedShell. Owns the filter, search query, pagination and website
 * collapse state; composes Pocket's Rail + the shared SearchToolbar +
 * Pocket's GroupedList.
 */
export function ExpandedView({ onClose, onOpenSettings, onAdd }) {
  const { items, folders, meta, hydrated } = usePocket();
  const prefs = meta?.prefs || {};
  const [filter, setFilter] = useState(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [collapsedHosts, setCollapsedHosts] = useState(() => new Set());
  const searchRef = useRef(null);

  // Debounce search (120 ms).
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 120);
    return () => clearTimeout(t);
  }, [query]);

  const base = useMemo(() => filterItems(items, filter), [items, filter]);
  const searching = debouncedQuery.trim().length > 0;
  // `filterItems` already returns newest-first; `searchItems` preserves store
  // order, so sort the searched subset inside this memo. Memoizing here stops a
  // repeated O(n log n) search on every render (e.g. "Load more" pagination
  // clicks that don't change the query).
  const searched = useMemo(
    () => (searching
      ? searchItems(items, folders, debouncedQuery).sort((a, b) => b.updatedAt - a.updatedAt)
      : null),
    [searching, items, folders, debouncedQuery],
  );
  const list = searched ?? base;

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

  const pickFilter = (f) => {
    setFilter(f);
    setVisible(PAGE_SIZE);
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
    const copy = filter == null ? EMPTY_STATES.pocket.all : filter.type === "kind" ? EMPTY_STATES.pocket[filter.value] : null;
    if (filter?.type === "folder") {
      const folder = folders.find((f) => f.id === filter.value);
      return (
        <EmptyState
          icon={<PocketIcon size={22} />}
          title={`${folder?.name || "Folder"} is empty.`}
          text="Open More actions on any save and choose Add to Folder."
        />
      );
    }
    return (
      <EmptyState
        icon={<PocketIcon size={22} />}
        title={copy?.title || EMPTY_STATES.pocket.all.title}
        text={copy?.text || EMPTY_STATES.pocket.all.text}
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
    <ExpandedShell
      ariaLabel="Pocket"
      icon={<PocketIcon size={16} />}
      title="Pocket"
      count={total}
      onClose={onClose}
      searchRef={searchRef}
      rail={<Rail filter={filter} onPick={pickFilter} onOpenSettings={onOpenSettings} />}
      toolbar={
        <SearchToolbar
          query={query}
          onQueryChange={setQuery}
          onClear={clearSearch}
          onAdd={onAdd}
          title={title}
          count={countText}
          placeholder="Search your saves"
          searchRef={searchRef}
          trailing={
            <SegmentedControl
              inline
              size="sm"
              variant="subtle"
              ariaLabel="Group saves by"
              options={GROUP_BY_OPTIONS}
              value={prefs.groupBy || "date"}
              onChange={(v) => updatePrefs({ groupBy: v })}
            />
          }
        />
      }
      bodyClassName={prefs.density === "compact" ? "pocket-expanded__body--compact" : ""}
    >
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
    </ExpandedShell>
  );
}
