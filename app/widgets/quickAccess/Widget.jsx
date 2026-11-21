import { useState, useEffect, useCallback } from "react";
import { BaseWidget } from "../BaseWidget";
import { Grid3x3GapFill, BookmarkStarFill, BookmarkCheckFill, SlashCircleFill, EyeSlashFill } from "react-bootstrap-icons";
import { FaviconIcon } from "../../components/ui/FaviconIcon";
import { faviconCache, getHostname } from "../../utilities/favicon";
import { shorthandFromUrl, getTopSites } from "../../utilities/index";
import { EmptyState } from "../../components/ui/EmptyState";
import { EMPTY_STATES } from "../../constants/emptyStates";
import { ActionMenu } from "../../components/ui/ActionMenu";
import { snackbar, SnackbarHost } from "../../components/ui/Snackbar";
import { blockSite } from "../../utilities/siteBlocker";
import { addBookmark as addSharedBookmark, loadBookmarks } from "../../data/sharedBookmarks";
import { useWidgetInstancesStore } from "../../store/useWidgetInstancesStore";
import { BaseSettingsModal } from "../BaseSettingsModal";
import { BookmarkSettings } from "../bookmark/Settings";
import { getHiddenTopSites, hideTopSite } from "./hiddenSites";

const MAX_TILES = 5;

// Block durations mirror the popup's timer picker. `-1` means forever.
const BLOCK_PRESETS = [
  { label: "30 minutes", mins: 30 },
  { label: "1 hour", mins: 60 },
  { label: "2 hours", mins: 120 },
  { label: "4 hours", mins: 240 },
  { label: "8 hours", mins: 480 },
  { label: "Forever", mins: -1 },
];

// Named group/tile: hover scoped to individual tile only
const Tile = ({ href, url, onContextMenu }) => {
  const [palette, setPalette] = useState(null);
  const [loading, setLoading] = useState(() => !faviconCache.has(getHostname(url)));
  const onSettled = useCallback(() => setLoading(false), []);

  // Dominant colour from the favicon palette: used for a smooth 2px border
  // that curves cleanly around the rounded corners. Multi-side colours look
  // great in theory but CSS borders meet at sharp miter joints on rounded
  // containers, creating harsh seams. A single softened colour stays smooth.
  const borderStyle = palette
    ? { border: `1.5px solid color-mix(in srgb, ${palette[0]} 50%, transparent)` }
    : {};

  // Background tint from the most dominant colour
  const bgStyle = palette
    ? { backgroundColor: `color-mix(in srgb, ${palette[0]} 16%, transparent)` }
    : {};

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="qa-tile"
      onContextMenu={onContextMenu}
    >
      <div
        className={`qa-tile__icon-wrap${loading ? ' qa-tile__icon-wrap--loading' : ''}`}
        style={
          palette
            ? { ...bgStyle, ...borderStyle }
            : palette === null && !loading
              ? {
                backgroundColor: 'var(--panel-bg)',
                border: '1px solid var(--card-border)',
              }
              : undefined
        }
      >
        <FaviconIcon url={url} size={22} onColor={setPalette} onSettled={onSettled} />
      </div>
      <span className="qa-tile__label">
        {shorthandFromUrl(url)}
      </span>
    </a>
  );
};

export const Widget = ({ id, onRemove }) => {
  const [topSites, setTopSites] = useState([]);
  const [menu, setMenu] = useState(null); // { site, anchor }
  const [bookmarkSite, setBookmarkSite] = useState(null); // site being bookmarked

  useEffect(() => {
    let cancelled = false;
    getTopSites().then((sites) => {
      if (cancelled) return;
      const hidden = new Set(getHiddenTopSites());
      setTopSites(sites.filter((s) => !hidden.has(s.url)).slice(0, MAX_TILES));
    });
    return () => { cancelled = true; };
  }, []);

  const isUnsupported = typeof chrome === 'undefined' && typeof globalThis.browser === 'undefined';

  if (isUnsupported || !topSites.length) {
    const copy = isUnsupported ? EMPTY_STATES.quickAccess.unsupported : EMPTY_STATES.quickAccess.empty;
    return (
      <BaseWidget className="justify-center items-center" onRemove={onRemove}>
        <EmptyState icon={<Grid3x3GapFill size={18} />} size="sm" title={copy.title} text={copy.text} />
      </BaseWidget>
    );
  }

  const openMenu = (site, e) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({
      site,
      anchor: {
        left: e.clientX,
        top: e.clientY,
        right: e.clientX,
        bottom: e.clientY,
        width: 0,
        height: 0,
      },
    });
  };

  // Always add a fresh bookmark widget, never reuse an existing one.
  const createBookmarkWidget = () => {
    useWidgetInstancesStore.getState().addInstance("bookmark");
    // addInstance appends synchronously; the new widget is the last entry.
    const instances = useWidgetInstancesStore.getState().instances;
    return instances[instances.length - 1].id;
  };

  const handleBookmarkSave = (u, n, mode) => {
    const bookmarkId = createBookmarkWidget();
    const store = useWidgetInstancesStore.getState();
    store.updateWidgetSetting(bookmarkId, "url", u);
    store.updateWidgetSetting(bookmarkId, "name", n);
    store.updateWidgetSetting(bookmarkId, "iconMode", mode ?? "favicon");
    addSharedBookmark({ url: u, title: n, iconMode: mode ?? "favicon" });
    setBookmarkSite(null);
    snackbar("Saved to bookmark.");
  };

  const handleBlock = async (site, mins) => {
    await blockSite(site.url, mins);
    snackbar("Site blocked.");
  };

  const handleHide = (site) => {
    hideTopSite(site.url);
    // Refill the tile gap from the remaining top sites (filter hides this url).
    getTopSites().then((sites) => {
      const hidden = new Set(getHiddenTopSites());
      setTopSites(sites.filter((s) => !hidden.has(s.url)).slice(0, MAX_TILES));
    });
    snackbar("Hidden from Top Sites.");
  };

  const isBookmarked = menu
    ? loadBookmarks().some((b) => b.url === menu.site.url)
    : false;

  const menuItems = menu
    ? [
        {
          label: isBookmarked ? "Already bookmarked" : "Save to bookmark",
          icon: isBookmarked ? <BookmarkCheckFill size={14} /> : <BookmarkStarFill size={14} />,
          disabled: isBookmarked,
          onSelect: () => setBookmarkSite(menu.site),
        },
        {
          label: "Block this site",
          icon: <SlashCircleFill size={14} />,
          submenu: BLOCK_PRESETS.map((p) => ({
            label: p.label,
            onSelect: () => handleBlock(menu.site, p.mins),
          })),
        },
        { divider: true },
        {
          label: "Don't show this site",
          icon: <EyeSlashFill size={14} />,
          onSelect: () => handleHide(menu.site),
        },
      ]
    : [];

  return (
    <>
      <BaseWidget className="justify-center" onRemove={onRemove}>
        <div className="flex-1 flex items-center px-3">
          <div className="grid gap-1 w-full" style={{ gridTemplateColumns: `repeat(${MAX_TILES}, 1fr)` }}>
            {topSites.map(site => (
              <Tile
                key={site.url}
                href={site.url}
                url={site.url}
                onContextMenu={(e) => openMenu(site, e)}
              />
            ))}
          </div>
        </div>
      </BaseWidget>

      {menu && (
        <ActionMenu
          anchor={menu.anchor}
          items={menuItems}
          onClose={() => setMenu(null)}
        />
      )}

      {bookmarkSite && (
        <BaseSettingsModal
          title="Save to Bookmark"
          onClose={() => setBookmarkSite(null)}
        >
          <div className="px-4 pb-4">
            <BookmarkSettings
              url={bookmarkSite.url}
              name={bookmarkSite.title || ""}
              iconMode="favicon"
              submitLabel="Save to Bookmark"
              onSave={handleBookmarkSave}
            />
          </div>
        </BaseSettingsModal>
      )}

      <SnackbarHost />
    </>
  );
};
