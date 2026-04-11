import React, { useState, useEffect, useCallback } from "react";
import { BaseWidget } from "../BaseWidget";
import { extractColorFromUrl, getDefaultName, buildFaviconSources, cacheFavicon, faviconCache, getHostname } from "../bookmarks/utils";

const cleanTitle = (raw, url) => {
  if (!raw) return getDefaultName(url);
  const t = raw
    .replaceAll(/\(\d+\)\s*/g, "")
    .replace(/\s*[-|]\s+.+/, "")
    .trim();
  return t || getDefaultName(url);
};

const Favicon = ({ url, onColor, onSettled }) => {
  const hostname = getHostname(url);
  const [idx, setIdx] = useState(0);
  const sources = React.useMemo(() => buildFaviconSources(url, 128), [url]);
  const letter = getDefaultName(url).charAt(0).toUpperCase();

  useEffect(() => { setIdx(0); }, [url]);

  const src = sources[idx];
  const isLetter = src === '';

  useEffect(() => {
    if (isLetter) {
      if (!faviconCache.has(hostname)) cacheFavicon(hostname, '');
      onSettled?.();
    }
  }, [isLetter, hostname, onSettled]);

  if (src === "") {
    return (
      <span className="text-xs font-bold select-none" style={{ color: "var(--w-ink-3)" }}>
        {letter}
      </span>
    );
  }

  return (
    <img
      key={src}
      src={src}
      alt=""
      width={22}
      height={22}
      className="rounded-sm object-contain"
      onLoad={(e) => {
        cacheFavicon(hostname, src);
        onSettled?.();
        extractColorFromUrl(e.currentTarget.src, onColor);
      }}
      onError={() => setIdx((i) => i + 1)}
    />
  );
};

// Named group/tile — hover scoped to individual tile only
const Tile = ({ href, url, title }) => {
  const [color, setColor] = useState(null);
  const [loading, setLoading] = useState(() => !faviconCache.has(getHostname(url)));
  const onSettled = useCallback(() => setLoading(false), []);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex flex-col items-center gap-1 group/tile outline-none min-w-0"
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 group-hover/tile:scale-110 group-active/tile:scale-95${loading ? ' animate-pulse' : ''}`}
        style={color ? {
          backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`,
          border: `1px solid color-mix(in srgb, ${color} 38%, transparent)`,
        } : {
          backgroundColor: loading ? 'var(--w-surface-3)' : 'var(--panel-bg)',
          border: loading ? '1px solid transparent' : '1px solid var(--card-border)',
        }}
      >
        <Favicon url={url} onColor={setColor} onSettled={onSettled} />
      </div>
      <span
        className="w-full text-center truncate px-0.5"
        style={{ fontSize: "9px", lineHeight: "1.2", color: "var(--w-ink-4)", fontWeight: 500 }}
      >
        {title}
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

  if (!topSites.length) return null;

  return (
    <BaseWidget className="justify-center" onRemove={onRemove}>
      <div className="flex-1 flex items-center px-3">
        <div className="grid grid-cols-6 w-full gap-1">
          {topSites.map(site => (
            <Tile
              key={site.url}
              href={site.url}
              url={site.url}
              title={cleanTitle(site.title, site.url)}
            />
          ))}
        </div>
      </div>
    </BaseWidget>
  );
};
