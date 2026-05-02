import React, { useState, useEffect, useRef } from 'react';
import { BaseWidget } from '../BaseWidget';
import { BaseSettingsModal } from '../BaseSettingsModal';
import { useWidgetSettings } from '../useWidgetSettings';
import { SettingsInput } from '../../components/ui/SettingsInput';
import { Popup } from '../../components/ui/Popup';
import { TooltipBtn } from '../../components/ui/TooltipBtn';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { RefreshIcon } from '../../components/ui/RefreshIcon';
import { FaviconIcon } from '../../components/ui/FaviconIcon';
import { getDefaultName, faviconCache, getHostname } from '../../utilities/favicon';

const normalizeUrl = (url) => (url.startsWith('http') ? url : `https://${url}`);

const ICON_MODE_OPTIONS = [
  { label: 'Favicon', value: 'favicon' },
  { label: 'Letter', value: 'letter' },
];

// Settings panel rendered inside BaseSettingsModal
const BookmarkSettings = ({ url, name, iconMode: initialIconMode = 'favicon', onSave }) => {
  const stripProtocol = (u) => (u || '').replace(/^https?:\/\//, '');
  const isEditing = Boolean(url && url !== 'https://');

  const [path, setPath] = useState(() => stripProtocol(url));
  const [localName, setLocalName] = useState(name || '');
  const [iconMode, setIconMode] = useState(initialIconMode);
  const [previewKey, setPreviewKey] = useState(0);

  const fullUrl = path.trim() ? `https://${path.trim()}` : '';
  const derivedName = path.trim() ? getDefaultName(fullUrl) : '';
  const previewHostname = fullUrl ? getHostname(fullUrl) : '';

  const handleBlur = () => {
    if (!localName.trim() && path.trim()) {
      try { setLocalName(getDefaultName(fullUrl)); } catch { }
    }
  };

  const handleRefresh = () => {
    if (previewHostname) faviconCache.delete(previewHostname);
    setPreviewKey(k => k + 1);
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
      {/* Live icon preview */}
      {fullUrl && (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ backgroundColor: 'var(--panel-bg)' }}>
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--panel-bg)' }}
          >
            <FaviconIcon
              key={`preview-${fullUrl}-${iconMode}-${previewKey}`}
              url={fullUrl}
              size={36}
              iconMode={iconMode}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate" style={{ color: 'var(--w-ink-2)' }}>
              {localName || derivedName || previewHostname}
            </div>
            <div className="text-xs truncate" style={{ color: 'var(--w-ink-5)' }}>{previewHostname}</div>
          </div>
          <TooltipBtn
            type="button"
            onClick={handleRefresh}
            className="p-1.5 rounded-lg transition-opacity hover:opacity-70 active:opacity-40 shrink-0"
            style={{ color: 'var(--w-ink-4)' }}
            tooltip="Refresh icon"
          >
            <RefreshIcon />
          </TooltipBtn>
        </div>
      )}

      {/* Icon style */}
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
          name="bm-url"
          autoFocus
          prefix="https://"
          value={path}
          onChange={e => setPath(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="buymemomo.com/sarojbelbase"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="bm-name" className="w-label">Name</label>
        <SettingsInput
          id="bm-name"
          name="bm-name"
          placeholder={derivedName || 'Buy Me Momo'}
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
        {isEditing ? 'Update Bookmark' : 'Add Bookmark'}
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
      // Use accent CSS variable — set as string so BaseWidget inlines it.
      // The letter colour uses var(--w-accent-fg) which is guaranteed to contrast.
      setBgColor('var(--w-accent)');
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
        settingsTitle={hasUrl ? 'Update Bookmark' : 'Add Bookmark'}
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
            <FaviconIcon
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
        <BaseSettingsModal title={hasUrl ? 'Update Bookmark' : 'Add Bookmark'} onClose={() => setShowSettings(false)}>
          <div className="px-4 pb-4">
            <BookmarkSettings url={url} name={name} iconMode={iconMode} onSave={handleSave} />
          </div>
        </BaseSettingsModal>
      )}
    </>
  );
};
