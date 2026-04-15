import React, { useState, useEffect, useMemo } from 'react';
import {
  buildFaviconSources,
  extractColorFromUrl,
  faviconCache,
  cacheFavicon,
  getHostname,
  getDefaultName,
} from '../../utilities/favicon';

/**
 * Unified favicon component used by bookmarks and quickAccess widgets.
 *
 * Props:
 *   url        {string}   — full or protocol-relative URL
 *   size       {number}   — pixel dimension for the image (default 40)
 *   onColor    {fn}       — called with dominant brand color extracted from the image
 *   onSettled  {fn}       — called when image loads OR falls back to letter (quickAccess shimmer)
 *   iconMode   {string}   — 'favicon' (default) | 'letter' (bookmarks letter mode)
 */
export const FaviconIcon = ({ url, size = 40, onColor, onSettled, iconMode = 'favicon' }) => {
  const hostname = getHostname(url);
  const [idx, setIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const sources = useMemo(() => buildFaviconSources(url, size), [url, size]);
  const letter = getDefaultName(url).charAt(0).toUpperCase();

  useEffect(() => { setIdx(0); setLoaded(false); }, [url]);

  // Letter mode — no network fetch; design-system accent colour.
  if (iconMode === 'letter') {
    return (
      <span
        className="font-black select-none"
        style={{
          fontSize: Math.round(size * 0.58) + 'px',
          color: 'var(--w-accent-fg)',
          lineHeight: 1,
          letterSpacing: '-0.02em',
          textShadow: '0 1px 4px rgba(0,0,0,0.18)',
        }}
      >
        {letter}
      </span>
    );
  }

  const src = sources[idx];

  // Letter fallback — all network sources exhausted.
  if (src === '') {
    return <LetterFallback hostname={hostname} letter={letter} size={size} onSettled={onSettled} />;
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {!loaded && (
        <div
          className="absolute inset-0 rounded-lg animate-pulse"
          style={{ backgroundColor: 'var(--panel-bg)' }}
        />
      )}
      <img
        key={src}
        src={src}
        alt=""
        style={{ width: size, height: size, opacity: loaded ? 1 : 0, transition: 'opacity 0.15s' }}
        className="rounded-lg object-contain"
        onLoad={(e) => {
          setLoaded(true);
          cacheFavicon(hostname, src);
          onSettled?.();
          if (onColor) extractColorFromUrl(e.currentTarget.src, onColor);
        }}
        onError={() => setIdx((i) => i + 1)}
      />
    </div>
  );
};

// Separated so the useEffect for onSettled fires correctly without inline render side-effects.
const LetterFallback = ({ hostname, letter, size, onSettled }) => {
  useEffect(() => {
    if (!faviconCache.has(hostname)) cacheFavicon(hostname, '');
    onSettled?.();
  }, [hostname, onSettled]);

  return (
    <span
      className="font-bold select-none"
      style={{ fontSize: Math.round(size * 0.5) + 'px', color: 'var(--w-ink-2)', lineHeight: 1 }}
    >
      {letter}
    </span>
  );
};
