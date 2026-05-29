import React, { useState, useEffect, useCallback } from "react";
import { BaseWidget } from "../BaseWidget";
import { FaviconIcon } from "../../components/ui/FaviconIcon";
import { faviconCache, getHostname } from "../../utilities/favicon";
import { shorthandFromUrl } from "../../utilities/index";

// Named group/tile — hover scoped to individual tile only
const Tile = ({ href, url }) => {
  const [color, setColor] = useState(null);
  const [loading, setLoading] = useState(() => !faviconCache.has(getHostname(url)));
  const onSettled = useCallback(() => setLoading(false), []);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="qa-tile"
    >
      <div
        className={`qa-tile__icon-wrap${loading ? ' qa-tile__icon-wrap--loading' : ''}`}
        style={color ? {
          backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`,
          border: `1px solid color-mix(in srgb, ${color} 38%, transparent)`,
        } : color === null && !loading ? {
          backgroundColor: 'var(--panel-bg)',
          border: '1px solid var(--card-border)',
        } : undefined}
      >
        <FaviconIcon url={url} size={22} onColor={setColor} onSettled={onSettled} />
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
      chrome.topSites.get(sites => setTopSites((sites || []).slice(0, 6)));
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
        <div className="grid grid-cols-6 w-full gap-1">
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
