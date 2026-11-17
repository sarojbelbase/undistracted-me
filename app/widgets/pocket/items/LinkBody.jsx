import { humanizeAge } from "../../../utilities";
import { middleEllipsis } from "../utils";
import { SiteTile } from "./SiteTile";

/** host + path with a trailing slash stripped, for the link meta line. */
function hostPath(url) {
  try {
    const u = new URL(url);
    let p = u.hostname + u.pathname;
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p;
  } catch {
    return url;
  }
}

/**
 * LinkBody — the link entry design (site tile, one-line title, host+path with
 * middle ellipsis, time). No expand. Row actions live in RowActions.
 */
export function LinkBody({ item, showSiteIcons }) {
  const age = humanizeAge(item.updatedAt) || "";
  const path = hostPath(item.text);
  const title = item.title || item.host || item.text;
  return (
    <div className="flex items-center gap-2.5 flex-1 min-w-0">
      <SiteTile url={item.text} host={item.host || ""} size={28} showFavicon={showSiteIcons} />
      <div className="flex-1 min-w-0">
        <div
          className="w-body font-semibold truncate"
          title={item.text}
          style={{ color: "var(--w-ink-1)" }}
        >
          {title}
        </div>
        <div className="w-caption truncate" title={item.text}>
          {middleEllipsis(path)}
          {age ? ` · ${age}` : ""}
        </div>
      </div>
    </div>
  );
}
