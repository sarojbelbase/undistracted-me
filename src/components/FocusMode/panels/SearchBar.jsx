// ─── Focus Mode Search Bar ────────────────────────────────────────────────────
//
// Pill-shaped search bar with engine picker and autocomplete suggestions.
// Search history stored in localStorage (not in exportable settings).
// Only rendered inside FocusMode — lives at panels/ per convention.


import React, { useState, useRef, useEffect, useCallback } from 'react';

import { getHistory, pushHistory, fetchSuggestionsAsync, searchOpenTabs, switchToTab, searchDriveFilesAsync } from '../hooks';
import { getTokens, FM_CARD_BLUR } from '../theme';
import { TooltipBtn } from '../../ui/TooltipBtn';
import { useSettingsStore } from '../../../store';
import { useGoogleAccountStore } from '../../../store/useGoogleAccountStore';

// ── Search engine definitions ──────────────────────────────────────────────────

export const ENGINES = [
  { id: 'google', label: 'Google', url: 'https://www.google.com/search?q=', suggest: 'https://suggestqueries.google.com/complete/search?client=chrome&q=' },
  { id: 'ddg', label: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=', suggest: 'https://ac.duckduckgo.com/ac/?q=' },
  { id: 'youtube', label: 'YouTube', url: 'https://www.youtube.com/results?search_query=', suggest: 'https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=' },
  { id: 'perplexity', label: 'Perplexity', url: 'https://www.perplexity.ai/search?q=', suggest: null },
];

// ── Local-storage history ──────────────────────────────────────────────────────

export const HISTORY_KEY = 'fm_search_history';
export const MAX_HISTORY = 12;

// ── Engine Icon ────────────────────────────────────────────────────────────────
const EngineIcon = ({ id, size = 14 }) => {
  const icons = {
    google: <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>,
    ddg: <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="#DE5833" /><text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="700" fill="white">D</text></svg>,
    youtube: <svg width={size} height={size} viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#FF0000" /><polygon points="9.5,7.5 18,12 9.5,16.5" fill="white" /></svg>,
    perplexity: <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="6" fill="#20B2AA" /><line x1="12" y1="5" x2="12" y2="19" stroke="white" strokeWidth="1.8" strokeLinecap="round" /><line x1="5" y1="12" x2="19" y2="12" stroke="white" strokeWidth="1.8" strokeLinecap="round" /><line x1="7.2" y1="7.2" x2="16.8" y2="16.8" stroke="white" strokeWidth="1.5" strokeLinecap="round" /><line x1="16.8" y1="7.2" x2="7.2" y2="16.8" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></svg>,
  };
  return icons[id] || null;
};

// ── Sub-components ─────────────────────────────────────────────────────────────
const SearchIcon = ({ stroke }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2.2" strokeLinecap="round">
    <circle cx="11" cy="11" r="7" />
    <line x1="16.5" y1="16.5" x2="22" y2="22" />
  </svg>
);

const ClockIcon = ({ color }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="9" />
    <polyline points="12,7 12,12 15,14" />
  </svg>
);

const CheckIcon = ({ stroke }) => (
  <svg style={{ marginLeft: 'auto' }} width="11" height="11" viewBox="0 0 12 12" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round">
    <polyline points="2,6 5,9 10,3" />
  </svg>
);
const TabIcon = ({ color }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <polyline points="2,11 8,11 9,7 15,7 16,11 22,11" />
  </svg>
);

const GlobeIcon = ({ color }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3c-3 4-3 14 0 18M12 3c3 4 3 14 0 18M3 12h18" />
  </svg>
);

const DriveIcon = ({ mimeType, size = 13 }) => {
  const s = { flexShrink: 0 };
  if (mimeType === 'application/vnd.google-apps.document')
    return <svg width={size} height={size} viewBox="0 0 24 24" style={s}><rect x="3" y="1" width="15" height="20" rx="2" fill="#4285F4" /><rect x="6" y="8" width="9" height="1.5" rx="0.75" fill="white" opacity="0.9" /><rect x="6" y="11.5" width="9" height="1.5" rx="0.75" fill="white" opacity="0.9" /><rect x="6" y="15" width="6" height="1.5" rx="0.75" fill="white" opacity="0.9" /></svg>;
  if (mimeType === 'application/vnd.google-apps.spreadsheet')
    return <svg width={size} height={size} viewBox="0 0 24 24" style={s}><rect x="3" y="1" width="15" height="20" rx="2" fill="#0F9D58" /><line x1="11" y1="1" x2="11" y2="21" stroke="white" strokeWidth="1.5" opacity="0.9" /><line x1="3" y1="9" x2="18" y2="9" stroke="white" strokeWidth="1.5" opacity="0.9" /><line x1="3" y1="15" x2="18" y2="15" stroke="white" strokeWidth="1.5" opacity="0.9" /></svg>;
  if (mimeType === 'application/vnd.google-apps.presentation')
    return <svg width={size} height={size} viewBox="0 0 24 24" style={s}><rect x="1" y="4" width="22" height="14" rx="2" fill="#F4B400" /><rect x="9" y="18" width="6" height="3" fill="#F4B400" /></svg>;
  if (mimeType === 'application/vnd.google-apps.folder')
    return <svg width={size} height={size} viewBox="0 0 24 24" style={s}><path d="M2 6a2 2 0 012-2h4l2 2h10a2 2 0 012 2v9a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" fill="#9e9e9e" /></svg>;
  if (mimeType === 'application/pdf')
    return <svg width={size} height={size} viewBox="0 0 24 24" style={s}><rect x="3" y="1" width="15" height="20" rx="2" fill="#EA4335" /><text x="5.5" y="14" fontSize="5.5" fontWeight="800" fill="white">PDF</text></svg>;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={s}><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9l-7-7z" fill="currentColor" opacity="0.45" /><path d="M13 2v7h7" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>;
};

/** Returns a navigable URL if the query looks like a hostname/URL, else null. */
function detectUrl(q) {
  const s = q.trim();
  if (!s || s.includes(' ')) return null;
  if (/^https?:\/\//i.test(s)) return s;
  // hostname.tld or hostname.tld/path — at least one dot, no spaces
  if (/^[a-zA-Z0-9]([a-zA-Z0-9-]*\.)+[a-zA-Z]{2,}/.test(s)) return `https://${s}`;
  return null;
}

/** Gets hostname safely (never throws). */
function siteHostname(url) {
  try { return new URL(url).hostname; } catch { return ''; }
}

/** Display label for a top-site: page title (truncated) or cleaned hostname. Never shows raw URL. */
function getDisplayTitle(site) {
  if (site.title?.trim()) {
    const t = site.title.trim();
    return t.length > 18 ? t.slice(0, 16) + '\u2026' : t;
  }
  return siteHostname(site.url).replace(/^www\./, '') || '';
}

// ── Engine Picker ──────────────────────────────────────────────────────────────
const EnginePicker = ({ engineId, onSelect, t }) => (
  <div
    style={{
      position: 'absolute',
      top: 'calc(100% + 8px)',
      left: 0,
      zIndex: 60,
      background: t.dropBg,
      border: `1px solid ${t.dropBorder}`,
      borderRadius: 14,
      backdropFilter: FM_CARD_BLUR,
      WebkitBackdropFilter: FM_CARD_BLUR,
      boxShadow: t.dropShadow,
      padding: 6,
      minWidth: 168,
      animation: 'fmDropIn 0.16s cubic-bezier(0.16,1,0.3,1) both',
    }}
  >
    {ENGINES.map(e => {
      const isActive = e.id === engineId;
      return (
        <button
          key={e.id}
          onClick={() => onSelect(e.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '7px 12px', borderRadius: 9,
            border: 'none', cursor: 'pointer',
            background: isActive ? t.selectedBg : 'transparent',
            transition: 'background 0.12s ease',
          }}
          onMouseEnter={ev => { if (!isActive) ev.currentTarget.style.background = t.hoverBg; }}
          onMouseLeave={ev => { if (!isActive) ev.currentTarget.style.background = 'transparent'; }}
        >
          <EngineIcon id={e.id} size={14} />
          <span style={{
            fontSize: '0.8rem',
            fontFamily: "'Google Sans', ui-sans-serif, sans-serif",
            fontWeight: isActive ? 600 : 400,
            color: isActive ? t.selectedText : t.suggText,
          }}>{e.label}</span>
          {isActive && <CheckIcon stroke={t.label} />}
        </button>
      );
    })}
  </div>
);

// ── Suggestions Dropdown ───────────────────────────────────────────────────────
const PILL_TINTS = {
  'Switch': { bg: 'rgba(96,165,250,0.18)', border: 'rgba(96,165,250,0.30)', text: 'rgba(147,197,253,0.95)' },
  'Drive': { bg: 'rgba(74,222,128,0.15)', border: 'rgba(74,222,128,0.28)', text: 'rgba(134,239,172,0.95)' },
  'Visit': { bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.28)', text: 'rgba(253,224,71,0.95)' },
  'Go to': { bg: 'rgba(255,255,255,0.09)', border: 'rgba(255,255,255,0.16)', text: 'rgba(255,255,255,0.65)' },
};

const Pill = ({ label }) => {
  const tint = PILL_TINTS[label] ?? PILL_TINTS['Go to'];
  return (
    <span style={{
      fontSize: '0.6rem', fontWeight: 400, letterSpacing: '0.04em',
      color: tint.text, background: tint.bg,
      border: `0.5px solid ${tint.border}`,
      borderRadius: 999, padding: '2px 6px',
      flexShrink: 0, whiteSpace: 'nowrap',
    }}>{label}</span>
  );
};
const SuggestionsDropdown = ({ urlTarget, goToUrl, urlOffset, suggestions, driveResults, tabResults, topSites, activeSugg, isHistory, onSelect, onDriveSelect, onTabSelect, onTopSiteSelect, onHover, t }) => {
  // When query is empty, top sites precede history in the index order
  const topSiteOffset = topSites?.length || 0;
  const tabStart = urlOffset + topSiteOffset;
  const driveStart = tabStart + tabResults.length;
  const suggStart = driveStart + driveResults.length;

  const rowStyle = (active) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', padding: '7px 12px', borderRadius: 10,
    border: 'none', cursor: 'pointer',
    background: active ? t.activeBg : 'transparent',
    transition: 'background 0.1s ease', textAlign: 'left',
  });
  const textStyle = { fontSize: '0.84rem', fontFamily: "'Google Sans', ui-sans-serif, sans-serif", color: t.suggText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 400, flex: 1 };

  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        left: 0, right: 0,
        zIndex: 60,
        background: t.dropBg,
        border: `1px solid ${t.dropBorder}`,
        borderRadius: 16,
        backdropFilter: FM_CARD_BLUR,
        WebkitBackdropFilter: FM_CARD_BLUR,
        boxShadow: t.dropShadow,
        padding: 6,
        animation: 'fmDropIn 0.16s cubic-bezier(0.16,1,0.3,1) both',
      }}
    >
      {/* Navigate to URL */}
      {urlTarget && (
        <button
          onMouseDown={e => { e.preventDefault(); goToUrl(urlTarget); }}
          style={rowStyle(activeSugg === 0)}
          onMouseEnter={() => onHover(0)}
          onMouseLeave={() => onHover(-1)}
        >
          <GlobeIcon color={t.label} />
          <span style={textStyle}>{urlTarget}</span>
          <Pill label="Go to" />
        </button>
      )}

      {/* Open tabs */}
      {tabResults.map((tab, k) => (
        <button
          key={tab.id}
          onMouseDown={e => { e.preventDefault(); onTabSelect(tab); }}
          style={rowStyle(activeSugg === tabStart + k)}
          onMouseEnter={() => onHover(tabStart + k)}
          onMouseLeave={() => onHover(-1)}
        >
          {tab.favIconUrl
            ? <img src={tab.favIconUrl} alt="" width={13} height={13} style={{ borderRadius: 2, flexShrink: 0 }} onError={e => { e.currentTarget.style.display = 'none'; }} />
            : <TabIcon color={t.label} />}
          <span style={textStyle}>{tab.title || tab.url}</span>
          <Pill label="Switch" />
        </button>
      ))}

      {/* Google Drive results */}
      {driveResults.map((file, j) => (
        <button
          key={file.id}
          onMouseDown={e => { e.preventDefault(); onDriveSelect(file); }}
          style={rowStyle(activeSugg === driveStart + j)}
          onMouseEnter={() => onHover(driveStart + j)}
          onMouseLeave={() => onHover(-1)}
        >
          <DriveIcon mimeType={file.mimeType} size={13} />
          <span style={textStyle}>{file.name}</span>
          <Pill label="Drive" />
        </button>
      ))}

      {/* Top sites — shown instantly when query matches */}
      {topSites?.map((site, k) => (
        <button
          key={site.url}
          onMouseDown={e => { e.preventDefault(); onTopSiteSelect(site); }}
          style={rowStyle(activeSugg === urlOffset + k)}
          onMouseEnter={() => onHover(urlOffset + k)}
          onMouseLeave={() => onHover(-1)}
        >
          <img
            src={`https://www.google.com/s2/favicons?domain=${siteHostname(site.url)}&sz=32`}
            alt=""
            width={13} height={13}
            style={{ borderRadius: 3, flexShrink: 0 }}
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
          <span style={textStyle}>{getDisplayTitle(site)}</span>
          <Pill label="Visit" />
        </button>
      ))}

      {/* History / autocomplete suggestions */}
      {suggestions.map((s, i) => (
        <button
          key={s}
          onMouseDown={e => { e.preventDefault(); onSelect(s); }}
          style={rowStyle(activeSugg === suggStart + i)}
          onMouseEnter={() => onHover(suggStart + i)}
          onMouseLeave={() => onHover(-1)}
        >
          {isHistory ? <ClockIcon color={t.label} /> : <SearchIcon stroke={t.label} />}
          <span style={{ ...textStyle, flex: 'unset' }}>{s}</span>
        </button>
      ))}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
export const SearchBar = ({ centerOnDark = true }) => {
  const focusSearchTopSites = useSettingsStore(s => s.focusSearchTopSites ?? true);
  const focusSearchDrive = useSettingsStore(s => s.focusSearchDrive ?? true);
  const focusSearchWeb = useSettingsStore(s => s.focusSearchWeb ?? true);
  const googleConnected = useGoogleAccountStore(s => s.connected);

  const [query, setQuery] = useState('');
  const [engineId, setEngineId] = useState(() => localStorage.getItem('fm_search_engine') || 'google');
  const [suggestions, setSuggestions] = useState([]);
  const [activeSugg, setActiveSugg] = useState(-1);
  const [showPicker, setShowPicker] = useState(false);
  const [focused, setFocused] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const [tabResults, setTabResults] = useState([]);
  const [driveResults, setDriveResults] = useState([]);
  const [topSites, setTopSites] = useState([]);

  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const debounceRef = useRef(null);
  const originalQueryRef = useRef('');  // user's typed query before arrow-nav
  const isNavRef = useRef(false); // true when query change came from arrow nav

  const engine = ENGINES.find(e => e.id === engineId) || ENGINES[0];
  const t = getTokens(centerOnDark);

  // ── Top sites (fetched once when enabled) ────────────────────────────────────
  useEffect(() => {
    if (!focusSearchTopSites) { setTopSites([]); return; }
    const api = globalThis.chrome?.topSites;
    if (!api) return;
    api.get(sites => setTopSites(sites?.slice(0, 8) || []));
  }, [focusSearchTopSites]);

  // ── Suggestions + tab + Drive search ────────────────────────────────────────
  useEffect(() => {
    if (isNavRef.current) { isNavRef.current = false; return; }
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSuggestions(getHistory().slice(0, 6));
      setTabResults([]);
      setDriveResults([]);
      setActiveSugg(-1);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const [suggs, tabs, drive] = await Promise.all([
        focusSearchWeb ? fetchSuggestionsAsync(engine, query) : Promise.resolve([]),
        searchOpenTabs(query),
        (focusSearchDrive && googleConnected) ? searchDriveFilesAsync(query) : Promise.resolve([]),
      ]);
      setSuggestions(suggs);
      setTabResults(tabs);
      setDriveResults(drive);
      setActiveSugg(-1);
    }, 220);
    return () => clearTimeout(debounceRef.current);
  }, [query, engineId, focusSearchWeb, focusSearchDrive, googleConnected]);

  // ── Clear Drive results when Google disconnects ──────────────────────────────
  useEffect(() => {
    if (!googleConnected) setDriveResults([]);
  }, [googleConnected]);

  // ── Close on outside click ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setFocused(false);
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Navigate directly to a URL ───────────────────────────────────────────────
  const goToUrl = useCallback((url) => {
    setBouncing(true);
    setTimeout(() => setBouncing(false), 420);
    window.open(url, '_blank', 'noopener');
    setQuery(''); originalQueryRef.current = '';
    setSuggestions([]); setDriveResults([]); setTabResults([]);
    setFocused(false); setActiveSugg(-1);
  }, []);

  // ── Submit search ────────────────────────────────────────────────────────────
  const submit = useCallback((q) => {
    const term = (q || query).trim();
    if (!term) return;
    // When no explicit suggestion is selected and term looks like a URL, navigate.
    if (!q) {
      const url = detectUrl(term);
      if (url) { goToUrl(url); return; }
    }
    pushHistory(term);
    setBouncing(true);
    setTimeout(() => setBouncing(false), 420);
    window.open(`${engine.url}${encodeURIComponent(term)}`, '_blank', 'noopener');
    setQuery('');
    originalQueryRef.current = '';
    setSuggestions([]); setDriveResults([]);
    setFocused(false);
    setActiveSugg(-1);
  }, [query, engine, goToUrl]);

  // ── Keyboard nav ─────────────────────────────────────────────────────────────
  // Index order: [url?][matchedTopSites][tabs][drive][suggestions]
  const urlTarget = detectUrl(query);
  const urlOffset = urlTarget ? 1 : 0;
  const isHistory = !query.trim();
  const matchedTopSites = query.trim()
    ? topSites.filter(s => {
      const q = query.toLowerCase();
      return (s.title || '').toLowerCase().includes(q) ||
        siteHostname(s.url).toLowerCase().includes(q);
    }).slice(0, 5)
    : [];
  const topSiteOffset = matchedTopSites.length;
  const tabStart = urlOffset + topSiteOffset;
  const driveStart = tabStart + tabResults.length;
  const suggStart = driveStart + driveResults.length;
  const totalItems = suggStart + suggestions.length;

  const handleArrowDown = (e) => {
    e.preventDefault();
    const next = Math.min(activeSugg + 1, totalItems - 1);
    if (activeSugg === -1) originalQueryRef.current = query;
    setActiveSugg(next);
    // Only fill input for suggestion items (bottom section)
    if (next >= suggStart) {
      isNavRef.current = true;
      setQuery(suggestions[next - suggStart] ?? originalQueryRef.current);
    }
  };

  const handleArrowUp = (e) => {
    e.preventDefault();
    const next = Math.max(activeSugg - 1, -1);
    setActiveSugg(next);
    if (next >= suggStart) {
      isNavRef.current = true;
      setQuery(suggestions[next - suggStart]);
    } else if (next === -1) {
      isNavRef.current = true;
      setQuery(originalQueryRef.current);
    }
  };

  const handleEnter = (e) => {
    e.preventDefault();
    if (activeSugg === -1) {
      // No item highlighted — URL nav takes priority over search
      submit();
      return;
    }
    if (urlTarget && activeSugg === 0) {
      goToUrl(urlTarget);
    } else if (isHistory && activeSugg >= urlOffset && activeSugg < tabStart) {
      const site = topSites[activeSugg - urlOffset];
      if (site) { window.open(site.url, '_blank', 'noopener'); setFocused(false); setActiveSugg(-1); }
    } else if (activeSugg >= tabStart && activeSugg < driveStart) {
      switchToTab(tabResults[activeSugg - tabStart]);
      setFocused(false); setActiveSugg(-1);
    } else if (activeSugg >= driveStart && activeSugg < suggStart) {
      const file = driveResults[activeSugg - driveStart];
      window.open(file.webViewLink, '_blank', 'noopener');
      setFocused(false); setActiveSugg(-1);
    } else if (activeSugg >= suggStart) {
      submit(suggestions[activeSugg - suggStart]);
    }
  };

  const handleEscape = () => {
    isNavRef.current = true;
    setQuery(originalQueryRef.current);
    setActiveSugg(-1);
    setFocused(false);
    inputRef.current?.blur();
    setSuggestions([]);
    setDriveResults([]);
    setTabResults([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { handleArrowDown(e); return; }
    if (e.key === 'ArrowUp') { handleArrowUp(e); return; }
    if (e.key === 'Enter') { handleEnter(e); return; }
    if (e.key === 'Escape') handleEscape();
  };

  const handleEngineSelect = (id) => {
    setEngineId(id);
    localStorage.setItem('fm_search_engine', id);
    setShowPicker(false);
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  const showDropdown = focused && (suggestions.length > 0 || tabResults.length > 0 || driveResults.length > 0 || urlTarget || matchedTopSites.length > 0);

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', zIndex: 30 }}>
      {/* ── Pill input ── */}
      <div
        style={{
          display: 'flex', alignItems: 'center', height: 54, borderRadius: 999,
          background: focused ? t.pillBgFocused : t.pillBg,
          border: `1px solid ${focused ? t.pillBorderFoc : t.pillBorder}`,
          backdropFilter: FM_CARD_BLUR,
          WebkitBackdropFilter: FM_CARD_BLUR,
          boxShadow: focused ? t.shadowFocused : t.shadow,
          transition: 'background 0.2s ease, border-color 0.2s ease, box-shadow 0.25s ease',
          animation: bouncing ? 'fmBounce 0.38s cubic-bezier(0.36,0.07,0.19,0.97) both' : 'none',
        }}
      >
        {/* Engine picker button */}
        <TooltipBtn
          onClick={() => setShowPicker(v => !v)}
          tooltip="Choose search engine"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '0 4px 0 14px', height: '100%',
            background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
          }}
        >
          <EngineIcon id={engineId} size={15} />
          <svg width="8" height="8" viewBox="0 0 8 8" style={{ opacity: 0.4, marginTop: 1 }}>
            <path d="M1 2.5L4 5.5L7 2.5" stroke={t.chevron} strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </svg>
        </TooltipBtn>

        {/* Divider */}
        <div style={{ width: 1, height: 18, background: t.divider, flexShrink: 0, margin: '0 2px 0 8px' }} />

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          id="fm-search"
          name="fm-search"
          value={query}
          data-ui-input
          onChange={e => { originalQueryRef.current = e.target.value; isNavRef.current = false; setQuery(e.target.value); }}
          onFocus={() => {
            setFocused(true);
            if (!query.trim()) setSuggestions(getHistory().slice(0, 6));
          }}
          onKeyDown={handleKeyDown}
          placeholder={`Search with ${engine.label}…`}
          autoComplete="off"
          spellCheck={false}
          className="fm-searchinput"
          style={{
            flex: 1, height: '100%', background: 'none', border: 'none', outline: 'none',
            appearance: 'none', WebkitAppearance: 'none',
            padding: '0 6px', fontSize: '0.9rem',
            fontFamily: "'Google Sans', ui-sans-serif, sans-serif",
            fontWeight: 400, color: t.textColor, caretColor: t.caret,
          }}
        />
        <style>{`.fm-searchinput::placeholder { color: ${t.placeholder}; text-shadow: ${t.placeholderShadow}; }`}</style>

        {/* Search submit button */}
        <button
          onClick={() => submit()}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 38, height: 38, marginRight: 8, borderRadius: 999,
            background: t.btnBg, border: 'none', cursor: 'pointer', flexShrink: 0,
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = t.btnHoverBg; }}
          onMouseLeave={e => { e.currentTarget.style.background = t.btnBg; }}
        >
          <SearchIcon stroke={t.iconStroke} />
        </button>
      </div>

      {/* ── Engine picker dropdown ── */}
      {showPicker && (
        <EnginePicker engineId={engineId} onSelect={handleEngineSelect} t={t} />
      )}

      {/* ── Suggestions dropdown ── */}
      {showDropdown && !showPicker && (urlTarget || suggestions.length > 0 || driveResults.length > 0 || tabResults.length > 0 || matchedTopSites.length > 0) && (
        <SuggestionsDropdown
          urlTarget={urlTarget}
          goToUrl={goToUrl}
          urlOffset={urlOffset}
          suggestions={suggestions}
          driveResults={driveResults}
          tabResults={tabResults}
          topSites={matchedTopSites}
          activeSugg={activeSugg}
          isHistory={isHistory}
          onSelect={submit}
          onDriveSelect={(file) => { window.open(file.webViewLink, '_blank', 'noopener'); setFocused(false); setActiveSugg(-1); }}
          onTabSelect={(tab) => { switchToTab(tab); setFocused(false); setActiveSugg(-1); }}
          onTopSiteSelect={(site) => { window.open(site.url, '_blank', 'noopener'); setFocused(false); setActiveSugg(-1); }}
          onHover={setActiveSugg}
          t={t}
        />
      )}
    </div>
  );
};
