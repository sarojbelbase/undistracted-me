import React, { useState, useEffect, useCallback } from "react";
import { BaseWidget } from "../BaseWidget";
import { FaviconIcon } from "../../components/ui/FaviconIcon";
import { faviconCache, getHostname } from "../../utilities/favicon";
import { shorthandFromUrl } from "../../utilities/index";

const MAX_TILES = 5;

// Named group/tile — hover scoped to individual tile only
const Tile = ({ href, url }) => {
  const [palette, setPalette] = useState(null);
  const [loading, setLoading] = useState(() => !faviconCache.has(getHostname(url)));
  const onSettled = useCallback(() => setLoading(false), []);

  // Dominant colour from the favicon palette — used for a smooth 2px border
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

  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.topSites) {
      chrome.topSites.get(sites => setTopSites((sites || []).slice(0, MAX_TILES)));
    }
  }, []);

  const isUnsupported = typeof chrome === 'undefined' || !chrome.topSites;

  if (isUnsupported || !topSites.length) {
    return (
      <BaseWidget className="justify-center items-center" onRemove={onRemove}>
        <span style={{ fontSize: '11px', color: 'var(--w-ink-5)' }}>
          {isUnsupported ? 'Not supported outside the extension' : 'No top sites available'}
        </span>
      </BaseWidget>
    );
  }

  return (
    <BaseWidget className="justify-center" onRemove={onRemove}>
      <div className="flex-1 flex items-center px-3">
        <div className="grid gap-1 w-full" style={{ gridTemplateColumns: `repeat(${MAX_TILES}, 1fr)` }}>
          {topSites.map(site => (
            <Tile
              key={site.url}
              href={site.url}
              url={site.url}
            />
          ))}
        </div>
      </div>
    </BaseWidget>
  );
};
