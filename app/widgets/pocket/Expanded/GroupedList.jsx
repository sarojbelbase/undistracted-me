import { ChevronDown } from "react-bootstrap-icons";
import { ItemRow } from "../ItemRow";
import { SiteTile } from "../items/SiteTile";
import { Button } from "../../../components/ui/Button";
import { groupByDate } from "../selectors";
import { groupByPage, groupBySite, middleEllipsis } from "../utils";
import { openUrl } from "../actions";

/**
 * GroupedList — renders the expanded view's list in one of several shapes:
 *   - a flat results list while searching,
 *   - time-bucketed groups (Date), or
 *   - website groups with optional per-page sub-headings (Website).
 */
export function GroupedList({
  items,
  groupBy,
  searching,
  showSiteIcons,
  previewLength,
  wrapCode,
  highlightId,
  collapsedHosts,
  onToggleHost,
}) {
  const rowProps = (it) => ({
    item: it,
    variant: "list",
    showSiteIcons,
    previewLength,
    wrapCode,
    isNew: it.id === highlightId,
  });

  if (searching) {
    return (
      <div role="list" className="pocket-list-inner">
        {items.map((it) => <ItemRow key={it.id} {...rowProps(it)} />)}
      </div>
    );
  }

  if (groupBy === "website") {
    return (
      <WebsiteGroups
        items={items}
        rowProps={rowProps}
        showSiteIcons={showSiteIcons}
        collapsedHosts={collapsedHosts}
        onToggleHost={onToggleHost}
      />
    );
  }

  return (
    <div role="list" className="pocket-list-inner">
      {groupByDate(items).map((b) => (
        <div key={b.key}>
          <div className="pocket-time-label">{b.label}</div>
          {b.items.map((it) => <ItemRow key={it.id} {...rowProps(it)} />)}
        </div>
      ))}
    </div>
  );
}

function WebsiteGroups({ items, rowProps, showSiteIcons, collapsedHosts, onToggleHost }) {
  const sites = groupBySite(items);
  return (
    <div role="list" className="pocket-list-inner">
      {sites.map((g) => {
        const key = g.host || "";
        const collapsed = collapsedHosts.has(key);
        return (
          <div key={key || "none"}>
            <button
              type="button"
              className="pocket-site-header"
              aria-expanded={!collapsed}
              onClick={() => onToggleHost(key)}
            >
              <SiteTile url={g.items[0]?.sourceUrl || g.items[0]?.text || ""} host={g.host || ""} size={18} showFavicon={showSiteIcons} />
              <span className="flex-1 truncate text-left" style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--w-ink-1)" }}>
                {g.host || "No website"}
              </span>
              <span className="w-caption" style={{ color: "var(--w-ink-5)" }}>{g.items.length}</span>
              <span className="pocket-chevron" style={{ transform: collapsed ? "none" : "rotate(180deg)" }}>
                <ChevronDown size={13} />
              </span>
            </button>

            {!collapsed && (
              <div className="pocket-group-collapse">
                <div className="pocket-group-collapse__inner">
                  <PageGroups group={g} rowProps={rowProps} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PageGroups({ group, rowProps }) {
  const { pages, ungrouped, multiPage } = groupByPage(group.items);
  if (!multiPage) {
    // Single page (or none) — render the whole host group flat.
    return group.items.map((it) => <ItemRow key={it.id} {...rowProps(it)} inWebsiteGroup />);
  }
  return (
    <>
      {pages.map((p) => (
        <div key={p.pageUrl}>
          <div className="pocket-page-header">
            <span className="flex-1 truncate" title={p.pageUrl}>{p.title || middleEllipsis(p.pageUrl)}</span>
            <Button variant="ghost" size="sm" onClick={() => openUrl(p.pageUrl)}>Open page</Button>
          </div>
          {p.items.map((it) => <ItemRow key={it.id} {...rowProps(it)} inWebsiteGroup />)}
        </div>
      ))}
      {ungrouped.map((it) => <ItemRow key={it.id} {...rowProps(it)} inWebsiteGroup />)}
    </>
  );
}
