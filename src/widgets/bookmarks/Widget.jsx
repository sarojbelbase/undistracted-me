import React, { useState, useEffect, useRef } from 'react';
import { BaseWidget } from '../BaseWidget';
import { BaseSettingsModal } from '../BaseSettingsModal';
import { useWidgetSettings } from '../useWidgetSettings';
import { SettingsInput } from '../../components/ui/SettingsInput';
import { Popup } from '../../components/ui/Popup';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { extractColorFromUrl, nameToColor } from './utils';

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
  `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE&url=${encodeURIComponent(origin)}&size=128`;

const buildSources = (url) => {
  const hostname = getHostname(url);
  const origin = `https://${hostname}/`;
  const parent = parentDomain(hostname);
  const sources = [];
  sources.push(gstaticFavicon(origin));
  if (parent) sources.push(gstaticFavicon(`https://${parent}/`));
  if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
    sources.push(`chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(url)}&size=64`);
  }
  sources.push('');
  return sources;
};

// Favicon with cascade fallback. key={url+iconMode} at usage site forces remount on any change.
const FaviconHero = ({ url, size = 40, onColor, iconMode = 'favicon' }) => {
  const [idx, setIdx] = useState(0);
  const sources = React.useMemo(() => buildSources(url), [url]);
  const letter = getDefaultName(url).charAt(0).toUpperCase();

  // Letter mode — no network fetch, no color extraction (Widget handles bg color)
  if (iconMode === 'letter') {
    return (
      <span
        className="font-black select-none"
        style={{
          fontSize: Math.round(size * 0.58) + 'px',
          color: 'rgba(255,255,255,0.92)',
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
      style={{ width: size, height: size }}
      className="rounded-lg object-contain"
      onLoad={(e) => { if (onColor) extractColorFromUrl(e.currentTarget.src, onColor); }}
      onError={() => setIdx(i => i + 1)}
    />
  );
};

const ICON_MODE_OPTIONS = [
  { label: 'Favicon', value: 'favicon' },
  { label: 'Letter', value: 'letter' },
];

// Settings panel rendered inside BaseSettingsModal
const BookmarkSettings = ({ url, name, iconMode: initialIconMode = 'favicon', onSave }) => {
  const stripProtocol = (u) => (u || '').replace(/^https?:\/\//, '');

  const [path, setPath] = useState(() => stripProtocol(url));
  const [localName, setLocalName] = useState(name || '');
  const [iconMode, setIconMode] = useState(initialIconMode);

  const fullUrl = path.trim() ? `https://${path.trim()}` : '';
  const derivedName = path.trim() ? getDefaultName(fullUrl) : '';

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
    onSave(u, n, iconMode);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Icon style — shown first so user decides before typing */}
      <SegmentedControl
        label="Icon style"
        options={ICON_MODE_OPTIONS}
        value={iconMode}
        onChange={setIconMode}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="bm-url" className="w-label">URL</label>
        <SettingsInput
          id="bm-url"
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
        <label htmlFor="bm-name" className="w-label">Name</label>
        <SettingsInput
          id="bm-name"
          placeholder={derivedName || 'Facebook'}
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
  const [settings, updateSetting] = useWidgetSettings(id, { url: '', name: '', iconMode: 'favicon' });
  const [showSettings, setShowSettings] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const [bgColor, setBgColor] = useState(null);
  const linkRef = useRef(null);
  const { url, name, iconMode = 'favicon' } = settings;

  // Reset / recompute background colour whenever url or iconMode changes
  useEffect(() => {
    if (iconMode === 'letter') {
      const label = name || (url ? getDefaultName(url) : '');
      setBgColor(label ? nameToColor(label) : null);
    } else {
      setBgColor(null); // favicon onLoad callback will set it
    }
  }, [url, iconMode, name]);

  const hasUrl = Boolean(url && url !== 'https://');
  const displayName = name || (hasUrl ? getDefaultName(url) : 'Bookmark');

  const handleSave = (u, n, mode) => {
    updateSetting('url', u);
    updateSetting('name', n);
    updateSetting('iconMode', mode ?? iconMode);
    setShowSettings(false);
  };

  // Both the ⋯ menu and the + button open identical BaseSettingsModal
  const settingsContent = (onClose) => (
    <BookmarkSettings
      url={url}
      name={name}
      iconMode={iconMode}
      onSave={(u, n, mode) => { handleSave(u, n, mode); onClose(); }}
    />
  );

  return (
    <>
      <BaseWidget
        settingsContent={settingsContent}
        settingsTitle="Add Bookmark"
        onRemove={onRemove}
        cardStyle={bgColor ? { backgroundColor: bgColor } : {}}
      >
        {hasUrl ? (
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
            <FaviconHero
              key={`${url}-${iconMode}`}
              url={url}
              size={40}
              iconMode={iconMode}
              onColor={iconMode === 'favicon' ? setBgColor : undefined}
            />
          </a>
        ) : (
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
        )}

        {/* Hover popup — portalled via Popup, so it escapes overflow:hidden */}
        {anchor && (
          <Popup anchor={anchor} className="px-3 py-2.5 max-w-50">
            <span className="text-xs font-semibold leading-snug" style={{ color: 'var(--w-ink-1)' }}>
              Go to {displayName}
            </span>
          </Popup>
        )}
      </BaseWidget>

      {/* + button opens the same modal as ⋯ → Settings */}
      {showSettings && (
        <BaseSettingsModal title="Bookmark" onClose={() => setShowSettings(false)}>
          <div className="px-4 pb-4">
            <BookmarkSettings url={url} name={name} iconMode={iconMode} onSave={handleSave} />
          </div>
        </BaseSettingsModal>
      )}
    </>
  );
};
