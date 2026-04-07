import React, { useState, useEffect } from "react";
import { BaseWidget } from "../BaseWidget";
import { extractColorFromUrl } from "../bookmarks/utils";

const getHostname = (url) => {
  try { return new URL(url).hostname; } catch { return url; }
};

const getDefaultName = (url) => getHostname(url).replace(/^www\./, "");

// Strip one subdomain level: meals.maitriservices.com → maitriservices.com
// Returns null when already a bare domain (nothing to strip).
const parentDomain = (hostname) => {
  const parts = hostname.split(".");
  return parts.length > 2 ? parts.slice(1).join(".") : null;
};

const gstaticFavicon = (origin) =>
  `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE&url=${encodeURIComponent(origin)}&size=64`;

/**
 * Build the ordered fallback chain for a site URL:
 *  1. chrome-extension://{id}/_favicon/ — Chrome's own favicon DB (real extension only)
 *  2. gstatic with the exact origin       — works for well-known sites
 *  3. gstatic with parent domain          — covers subdomains (meals.example.com → example.com)
 *  4. "" sentinel                         — triggers letter fallback in Favicon
 *
 * Diagnostic test confirmed:
 *   meals.maitriservices.com → gstatic 404, but maitriservices.com → gstatic 200 ✅
 */
const buildSources = (url) => {
  const hostname = getHostname(url);
  const origin = `https://${hostname}/`;
  const parent = parentDomain(hostname);
  const sources = [];
  // gstatic first: fetches real web favicons without needing site history
  sources.push(gstaticFavicon(origin));
  if (parent) sources.push(gstaticFavicon(`https://${parent}/`));
  if (typeof chrome !== "undefined" && chrome.runtime?.id) {
    sources.push(
      `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(url)}&size=128`
    );
  }
  sources.push("");  // sentinel → letter
  return sources;
};

const cleanTitle = (raw, url) => {
  if (!raw) return getDefaultName(url);
  const t = raw
    .replaceAll(/\(\d+\)\s*/g, "")
    .replace(/\s*[-|]\s+.+/, "")
    .trim();
  return t || getDefaultName(url);
};

const Favicon = ({ url, onColor }) => {
  const [idx, setIdx] = useState(0);
  const sources = React.useMemo(() => buildSources(url), [url]);
  const letter = getDefaultName(url).charAt(0).toUpperCase();

  useEffect(() => { setIdx(0); }, [url]);

  const src = sources[idx];

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
      crossOrigin="anonymous"
      className="rounded-sm object-contain"
      onLoad={(e) => extractColorFromUrl(e.currentTarget.src, onColor)}
      onError={() => setIdx((i) => i + 1)}
    />
  );
};

// Named group/tile — hover scoped to individual tile only
const Tile = ({ href, url, title }) => {
  const [color, setColor] = useState(null);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex flex-col items-center gap-1 group/tile outline-none min-w-0"
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 group-hover/tile:scale-110 group-active/tile:scale-95"
        style={color ? {
          backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`,
          border: `1px solid color-mix(in srgb, ${color} 38%, transparent)`,
        } : {
          backgroundColor: 'var(--w-surface-2)',
          border: '1px solid var(--w-border)',
        }}
      >
        <Favicon url={url} onColor={setColor} />
      </div>
      <span
        className="w-full text-center truncate px-0.5"
        style={{ fontSize: "9px", lineHeight: "1.2", color: "var(--w-ink-5)", fontWeight: 500 }}
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
