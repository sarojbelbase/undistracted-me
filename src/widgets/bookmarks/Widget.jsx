import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PlusLg, XLg, DashLg, BookmarkFill } from 'react-bootstrap-icons';
import { BaseWidget } from '../BaseWidget';
import { useWidgetSettings } from '../useWidgetSettings';

const normalizeUrl = (url) => (url.startsWith('http') ? url : `https://${url}`);

const getHostname = (url) => {
  try { return new URL(normalizeUrl(url)).hostname; } catch { return url; }
};

const getDefaultName = (url) => getHostname(url).replace(/^www\./, '');

const getFaviconUrl = (url) => {
  const host = getHostname(url);
  return `https://www.google.com/s2/favicons?sz=64&domain=${host}`;
};

const AddModal = ({ onSave, onClose }) => {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);

  const handleUrlBlur = () => {
    if (!nameTouched && url.trim()) setName(getDefaultName(url));
  };

  const handleSave = () => {
    if (!url.trim()) return;
    const finalUrl = normalizeUrl(url.trim());
    onSave({ id: Date.now(), url: finalUrl, name: (name.trim() || getDefaultName(url)), favicon: getFaviconUrl(finalUrl) });
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="rounded-2xl shadow-2xl p-5 w-72 animate-fade-in" style={{ backgroundColor: 'var(--w-surface)', border: '1px solid var(--w-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="w-heading">Add Bookmark</span>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center transition-colors" style={{ backgroundColor: 'var(--w-surface-2)', color: 'var(--w-ink-4)' }}>
            <XLg size={14} />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor="bm-url" className="w-label mb-1 block">URL</label>
            <input
              id="bm-url"
              autoFocus
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onBlur={handleUrlBlur}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none transition-colors"
              style={{ border: '1px solid var(--w-border)', backgroundColor: 'var(--w-surface-2)', color: 'var(--w-ink-1)' }}
            />
          </div>
          <div>
            <label htmlFor="bm-name" className="w-label mb-1 block">Name</label>
            <input
              id="bm-name"
              type="text"
              placeholder="My site"
              value={name}
              onChange={e => { setName(e.target.value); setNameTouched(true); }}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none transition-colors"
              style={{ border: '1px solid var(--w-border)', backgroundColor: 'var(--w-surface-2)', color: 'var(--w-ink-1)' }}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-1.5 text-sm transition-colors" style={{ color: 'var(--w-ink-4)' }}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={!url.trim()}
            className="px-4 py-1.5 text-sm rounded-lg transition-colors disabled:opacity-40"
            style={{ backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}
          >Save</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const Chip = ({ href, favicon, name, onRemove }) => (
  <div
    className="group flex items-center rounded-xl text-xs font-medium transition-all"
    style={{ backgroundColor: 'var(--w-surface-2)', color: 'var(--w-ink-1)', border: '1px solid var(--w-border)' }}
  >
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 pl-3 py-1.5 hover:opacity-80 transition-opacity"
      style={{ color: 'var(--w-ink-1)' }}
    >
      {favicon && (
        <img
          src={favicon}
          alt=""
          className="w-4 h-4 rounded-sm shrink-0"
          onError={e => { e.currentTarget.style.display = 'none'; }}
        />
      )}
      <span className="max-w-25 truncate">{name}</span>
    </a>
    {onRemove ? (
      <button
        onClick={onRemove}
        className="px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center"
        style={{ color: 'var(--w-ink-4)' }}
        title="Remove"
      >
        <DashLg size={14} />
      </button>
    ) : (
      <div className="pr-3" />
    )}
  </div>
);

export const Widget = ({ id, onRemove }) => {
  const [settings, updateSetting] = useWidgetSettings(id, { bookmarks: [] });
  const { bookmarks } = settings;
  const [topSites, setTopSites] = useState([]);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.topSites) {
      chrome.topSites.get(sites => setTopSites((sites || []).slice(0, 8)));
    }
  }, []);

  const addBookmark = (bm) => updateSetting('bookmarks', [...bookmarks, bm]);
  const removeBookmark = (id) => updateSetting('bookmarks', bookmarks.filter(b => b.id !== id));

  const hasTopSites = topSites.length > 0;
  const hasBookmarks = bookmarks.length > 0;

  return (
    <>
      <BaseWidget className="px-4 py-3 flex flex-col gap-2.5" onRemove={onRemove}>

        {/* Most Visited */}
        {hasTopSites && (
          <div>
            <p className="w-label mb-1.5">Most Visited</p>
            <div className="flex flex-wrap gap-1.5">
              {topSites.map(site => (
                <Chip
                  key={site.url}
                  href={site.url}
                  favicon={getFaviconUrl(site.url)}
                  name={site.title || getDefaultName(site.url)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        {hasTopSites && (
          <div className="shrink-0" style={{ height: 1, backgroundColor: 'var(--w-border)' }} />
        )}

        {/* Pinned bookmarks */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-1.5">
            <p className="w-label">Pinned</p>
            <button
              onClick={() => setShowAdd(true)}
              onMouseDown={e => e.stopPropagation()}
              className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
              style={{ backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}
            >
              <PlusLg size={12} />
            </button>
          </div>

          {hasBookmarks ? (
            <div className="flex flex-wrap gap-1.5 overflow-y-auto">
              {bookmarks.map(bm => (
                <Chip
                  key={bm.id}
                  href={bm.url}
                  favicon={bm.favicon}
                  name={bm.name}
                  onRemove={() => removeBookmark(bm.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 py-1">
              <BookmarkFill size={12} className="opacity-20" />
              <span className="w-muted">Hit + to pin a site</span>
            </div>
          )}
        </div>
      </BaseWidget>
      {showAdd && <AddModal onSave={addBookmark} onClose={() => setShowAdd(false)} />}
    </>
  );
};

