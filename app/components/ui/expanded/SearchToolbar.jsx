import { PlusLg, Search, XLg } from "react-bootstrap-icons";
import { Button } from "../Button";
import { Input } from "../Input";

/**
 * SearchToolbar — the expanded view's main-pane header, shared by Pocket and
 * Expense. Two quiet rows:
 *   1. search (grows) + a secondary "Add" button
 *   2. the view title (h2) with a muted count, and an optional `trailing`
 *      control on the right (e.g. Pocket's "Group saves by" switch)
 *
 * Props:
 *   query, onQueryChange, onClear, onAdd  – search + add wiring
 *   title, count                          – heading + muted count
 *   placeholder                           – search input placeholder (also aria-label)
 *   searchRef                             – ref forwarded to the search input
 *   addLabel, addIcon                     – the "Add" button content
 *   trailing                              – ReactNode (optional); right-side control
 */
export function SearchToolbar({
  query,
  onQueryChange,
  onClear,
  onAdd,
  title,
  count,
  placeholder,
  searchRef,
  addLabel = "Add",
  addIcon = <PlusLg size={13} />,
  trailing = null,
}) {
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
            placeholder={placeholder}
            aria-label={placeholder}
          />
        </div>
        <Button variant="secondary" size="md" onClick={onAdd}>
          {addIcon}
          {addLabel}
        </Button>
      </div>

      <div className="pocket-toolbar__row">
        <h2 className="pocket-toolbar__heading">{title}</h2>
        <span className="w-caption" style={{ color: "var(--w-ink-4)" }}>{count}</span>
        {trailing && <div className="pocket-toolbar__group">{trailing}</div>}
      </div>
    </div>
  );
}
