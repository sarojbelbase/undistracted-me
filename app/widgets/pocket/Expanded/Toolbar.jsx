import { Search, XLg } from "react-bootstrap-icons";
import { Input } from "../../../components/ui/Input";
import { SegmentedControl } from "../../../components/ui/SegmentedControl";
import { GROUP_BY_OPTIONS } from "../constants";

/**
 * Toolbar — the expanded view's main-pane header: search input, then the view
 * title (h2) with a muted count on the left and a "Group by" SegmentedControl
 * on the right.
 */
export function Toolbar({ query, onQueryChange, onClear, groupBy, onGroupBy, title, count, searchRef }) {
  return (
    <div className="pocket-toolbar">
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

      <div className="pocket-toolbar__row">
        <h2 className="pocket-toolbar__heading">{title}</h2>
        <span className="w-caption" style={{ color: "var(--w-ink-5)" }}>{count}</span>
        <div className="pocket-toolbar__group">
          <span className="w-label" style={{ color: "var(--w-ink-4)" }}>Group by</span>
          <div style={{ width: 176 }}>
            <SegmentedControl options={GROUP_BY_OPTIONS} value={groupBy} onChange={onGroupBy} />
          </div>
        </div>
      </div>
    </div>
  );
}
