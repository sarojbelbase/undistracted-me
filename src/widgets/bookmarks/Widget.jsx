import React, { useState, useEffect, useRef } from 'react';
import { BaseWidget } from '../BaseWidget';
import { BaseSettingsModal } from '../BaseSettingsModal';
import { useWidgetSettings } from '../useWidgetSettings';
import { SettingsInput } from '../../components/ui/SettingsInput';
import { Popup } from '../../components/ui/Popup';

const normalizeUrl = (url) => (url.startsWith('http') ? url : `https://${url}`);

const getHostname = (url) => {
  try { return new URL(normalizeUrl(url)).hostname; } catch { return url; }
};

const getDefaultName = (url) => getHostname(url).replace(/^www\./, '');

// Strip one subdomain level for favicon fallback
const parentDomain = (hostname) => {
  const parts = hostname.split('.');
  return parts.length > 2 ? parts.slice(1).join('.') : null;
};

const gstaticFavicon = (origin) =>
  `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE&url=${encodeURIComponent(origin)}&size=64`;

const buildSources = (url) => {
  const hostname = getHostname(url);
  const origin = `https://${hostname}/`;
  const parent = parentDomain(hostname);
  const sources = [];
  if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
    sources.push(`chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(url)}&size=64`);
  }
  sources.push(gstaticFavicon(origin));
  if (parent) sources.push(gstaticFavicon(`https://${parent}/`));
  sources.push('');
  return sources;
};

// Large favicon with cascade fallback — same strategy as Quick Access
// key={url} on the usage site forces a full remount on URL change so idx
// starts at 0 immediately rather than after a useEffect cycle.
const FaviconHero = ({ url, size = 40 }) => {
  const [idx, setIdx] = useState(0);
  const sources = React.useMemo(() => buildSources(url), [url]);
  const letter = getDefaultName(url).charAt(0).toUpperCase();

  const src = sources[idx];

  if (src === '') {
    return (
      <span
        className="font-bold select-none"
        style={{ fontSize: Math.round(size * 0.5) + 'px', color: 'var(--w-ink-2)', lineHeight: 1 }}
      >
        {letter}
      </span>
    );
  }

  return (
    <img
      key={src}
      src={src}
      alt=""
      width={size}
      height={size}
      className="rounded-lg object-contain"
      onError={() => setIdx(i => i + 1)}
    />
  );
};

// Settings panel rendered inside BaseSettingsModal
const BookmarkSettings = ({ url, name, onSave }) => {
  // Keep only the part after the protocol for the display input
  const stripProtocol = (u) => (u || '').replace(/^https?:\/\//, '');

  const [path, setPath] = useState(() => stripProtocol(url));
  const [localName, setLocalName] = useState(name || '');

  const fullUrl = path.trim() ? `https://${path.trim()}` : '';

  const handleBlur = () => {
    if (!localName.trim() && path.trim()) {
      try { setLocalName(getDefaultName(fullUrl)); } catch { }
    }
  };

  const canSave = Boolean(path.trim());

  const handleSave = () => {
    if (!canSave) return;
    const u = normalizeUrl(fullUrl);
    const n = localName.trim() || getDefaultName(u);
    onSave(u, n);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="w-label">URL</label>
        <SettingsInput
          autoFocus
          prefix="https://"
          value={path}
          onChange={e => setPath(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="facebook.com"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="w-label">Name</label>
        <SettingsInput
          placeholder={path.trim() ? getDefaultName(fullUrl) : 'Facebook'}
          value={localName}
          onChange={e => setLocalName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
        />
      </div>
      <button
        onClick={handleSave}
        disabled={!canSave}
        className="w-full px-4 py-2 text-xs rounded-xl font-semibold transition-opacity disabled:opacity-40 hover:opacity-90"
        style={{ backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}
      >
        Save
      </button>
    </div>
  );
};

export const Widget = ({ id, onRemove }) => {
  const [settings, updateSetting] = useWidgetSettings(id, { url: '', name: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const linkRef = useRef(null);
  const { url, name } = settings;

  const hasUrl = Boolean(url && url !== 'https://');
  const displayName = name || (hasUrl ? getDefaultName(url) : 'Bookmark');
  const hostname = hasUrl ? getHostname(url) : '';

  const handleSave = (u, n) => {
    updateSetting('url', u);
    updateSetting('name', n);
    setShowSettings(false);
  };

  // Both the ⋯ menu and the + button open identical BaseSettingsModal
  const settingsContent = (onClose) => (
    <BookmarkSettings url={url} name={name} onSave={(u, n) => { handleSave(u, n); onClose(); }} />
  );

  return (
    <>
      <BaseWidget
        settingsContent={settingsContent}
        settingsTitle="Bookmark"
        onRemove={onRemove}
      >
        {!hasUrl ? (
          // Empty state — + button, opens same central modal
          <button
            onClick={() => setShowSettings(true)}
            onMouseDown={e => e.stopPropagation()}
            aria-label="Add bookmark"
            className="flex-1 self-stretch flex items-center justify-center transition-opacity hover:opacity-70 active:opacity-40"
            style={{ color: 'var(--w-ink-4)' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="7" y="1" width="2" height="14" rx="1" />
              <rect x="1" y="7" width="14" height="2" rx="1" />
            </svg>
          </button>
        ) : (
          <a
            ref={linkRef}
            href={url}
            target="_blank"
            rel="noreferrer"
            aria-label={displayName}
            className="flex-1 self-stretch flex items-center justify-center outline-none transition-opacity hover:opacity-80 active:opacity-60"
            onMouseDown={e => e.stopPropagation()}
            onMouseEnter={() => {
              if (!linkRef.current) return;
              const r = linkRef.current.getBoundingClientRect();
              setAnchor({ left: r.left, top: r.top, bottom: r.bottom, width: r.width, height: r.height });
            }}
            onMouseLeave={() => setAnchor(null)}
          >
            <FaviconHero key={url} url={url} size={40} />
          </a>
        )}

        {/* Hover popup — portalled via Popup, so it escapes overflow:hidden */}
        {anchor && (
          <Popup anchor={anchor} className="px-3 py-2.5 gap-1 max-w-[200px]">
            <span className="text-xs font-semibold leading-snug" style={{ color: 'var(--w-ink-1)' }}>
              {displayName}
            </span>
            <span className="text-[10px] leading-snug" style={{ color: 'var(--w-ink-5)' }}>
              {hostname}
            </span>
          </Popup>
        )}
      </BaseWidget>

      {/* + button opens the same modal as ⋯ → Settings */}
      {showSettings && (
        <BaseSettingsModal title="Bookmark" onClose={() => setShowSettings(false)}>
          <div className="px-4 pb-4">
            <BookmarkSettings url={url} name={name} onSave={handleSave} />
          </div>
        </BaseSettingsModal>
      )}
    </>
  );
};
