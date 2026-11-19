import { PlusLg, Search, XLg } from "react-bootstrap-icons";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { SegmentedControl } from "../../../components/ui/SegmentedControl";
import { GROUP_BY_OPTIONS } from "../constants";

/**
 * Toolbar — the expanded view's main-pane header, kept to two quiet rows:
 *   1. search (grows) + a secondary "Add" button
 *   2. the view title (h2) with a muted count, and a quiet "Group saves by"
 *      switch on the right
 */
export function Toolbar({ query, onQueryChange, onClear, onAdd, groupBy, onGroupBy, title, count, searchRef }) {
  return (
    <div className="pocket-toolbar">
      <div className="pocket-toolbar__top">
        <div className="pocket-toolbar__search">
          <Input
            pill
            ref={searchRef}
            icon={<Search size={13} />}
            suffix={
              query ? (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={onClear}
                  className="flex items-center justify-center rounded"
                  style={{ width: 20, height: 20, color: "var(--w-ink-4)", cursor: "pointer", border: "none", background: "transparent" }}
                >
                  <XLg size={12} />
                </button>
              ) : null
            }
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && onClear()}
            placeholder="Search your saves"
            aria-label="Search your saves"
          />
        </div>
        <Button variant="secondary" size="md" onClick={onAdd}>
          <PlusLg size={13} />
          Add
        </Button>
      </div>

      <div className="pocket-toolbar__row">
        <h2 className="pocket-toolbar__heading">{title}</h2>
        <span className="w-caption" style={{ color: "var(--w-ink-4)" }}>{count}</span>
        <div className="pocket-toolbar__group">
          <SegmentedControl
            inline
            size="sm"
            ariaLabel="Group saves by"
            options={GROUP_BY_OPTIONS}
            value={groupBy}
            onChange={onGroupBy}
          />
        </div>
      </div>
    </div>
  );
}
