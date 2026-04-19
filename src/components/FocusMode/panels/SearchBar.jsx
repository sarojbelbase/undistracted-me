// ─── Focus Mode Search Bar ────────────────────────────────────────────────────
//
// Pill-shaped search bar with engine picker and autocomplete suggestions.
// Search history stored in localStorage (not in exportable settings).
// Only rendered inside FocusMode — lives at panels/ per convention.


import React, { useState, useRef, useEffect, useCallback } from 'react';

import { getHistory, pushHistory, fetchSuggestionsAsync, searchOpenTabs, switchToTab } from '../hooks';
import { getTokens } from '../theme';
import { TooltipBtn } from '../../ui/TooltipBtn';

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
      backdropFilter: 'blur(28px) saturate(180%)',
      WebkitBackdropFilter: 'blur(28px) saturate(180%)',
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
const SuggestionsDropdown = ({ suggestions, tabResults, activeSugg, isHistory, onSelect, onTabSelect, onHover, t }) => (
  <div
    style={{
      position: 'absolute',
      top: 'calc(100% + 8px)',
      left: 0, right: 0,
      zIndex: 60,
      background: t.dropBg,
      border: `1px solid ${t.dropBorder}`,
      borderRadius: 16,
      backdropFilter: 'blur(28px) saturate(180%)',
      WebkitBackdropFilter: 'blur(28px) saturate(180%)',
      boxShadow: t.dropShadow,
      padding: 6,
      animation: 'fmDropIn 0.16s cubic-bezier(0.16,1,0.3,1) both',
    }}
  >
    {isHistory && suggestions.length > 0 && (
      <p style={{
        fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.07em',
        textTransform: 'uppercase', color: t.label, padding: '4px 12px 2px',
      }}>Recent</p>
    )}
    {suggestions.map((s, i) => (
      <button
        key={s}
        onMouseDown={e => { e.preventDefault(); onSelect(s); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          width: '100%', padding: '7px 12px', borderRadius: 10,
          border: 'none', cursor: 'pointer',
          background: activeSugg === i ? t.activeBg : 'transparent',
          transition: 'background 0.1s ease', textAlign: 'left',
        }}
        onMouseEnter={() => onHover(i)}
        onMouseLeave={() => onHover(-1)}
      >
        {isHistory ? <ClockIcon color={t.label} /> : <SearchIcon stroke={t.label} />}
        <span style={{
          fontSize: '0.84rem',
          fontFamily: "'Google Sans', ui-sans-serif, sans-serif",
          color: t.suggText,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontWeight: 400,
        }}>{s}</span>
      </button>
    ))}
    {tabResults.length > 0 && (
      <>
        {suggestions.length > 0 && (
          <div style={{ height: 1, background: t.divider, margin: '4px 8px' }} />
        )}
        <p style={{
          fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.07em',
          textTransform: 'uppercase', color: t.label, padding: '4px 12px 2px',
        }}>Open Tabs</p>
        {tabResults.map((tab, j) => {
          const idx = suggestions.length + j;
          return (
            <button
              key={tab.id}
              onMouseDown={e => { e.preventDefault(); onTabSelect(tab); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '7px 12px', borderRadius: 10,
                border: 'none', cursor: 'pointer',
                background: activeSugg === idx ? t.activeBg : 'transparent',
                transition: 'background 0.1s ease', textAlign: 'left',
              }}
              onMouseEnter={() => onHover(idx)}
              onMouseLeave={() => onHover(-1)}
            >
              {tab.favIconUrl
                ? <img src={tab.favIconUrl} alt="" width={13} height={13} style={{ borderRadius: 2, flexShrink: 0 }} onError={e => { e.currentTarget.style.display = 'none'; }} />
                : <TabIcon color={t.label} />}
              <span style={{
                fontSize: '0.84rem',
                fontFamily: "'Google Sans', ui-sans-serif, sans-serif",
                color: t.suggText,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontWeight: 400, flex: 1,
              }}>{tab.title || tab.url}</span>
              <span style={{ fontSize: '0.7rem', color: t.label, flexShrink: 0, fontFamily: "'Google Sans', sans-serif" }}>Switch</span>
            </button>
          );
        })}
      </>
    )}
  </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────
export const SearchBar = ({ centerOnDark = true }) => {
  const [query, setQuery] = useState('');
  const [engineId, setEngineId] = useState(() => localStorage.getItem('fm_search_engine') || 'google');
  const [suggestions, setSuggestions] = useState([]);
  const [activeSugg, setActiveSugg] = useState(-1);
  const [showPicker, setShowPicker] = useState(false);
  const [focused, setFocused] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const [tabResults, setTabResults] = useState([]);

  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const debounceRef = useRef(null);
  const originalQueryRef = useRef('');  // user's typed query before arrow-nav
  const isNavRef = useRef(false); // true when query change came from arrow nav

  const engine = ENGINES.find(e => e.id === engineId) || ENGINES[0];
  const t = getTokens(centerOnDark);

  // ── Suggestions + tab search ─────────────────────────────────────────────────
  useEffect(() => {
    if (isNavRef.current) { isNavRef.current = false; return; }
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setSuggestions(getHistory().slice(0, 6));
      setTabResults([]);
      setActiveSugg(-1);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const [suggs, tabs] = await Promise.all([
        fetchSuggestionsAsync(engine, query),
        searchOpenTabs(query),
      ]);
      setSuggestions(suggs);
      setTabResults(tabs);
      setActiveSugg(-1);
    }, 220);
    return () => clearTimeout(debounceRef.current);
  }, [query, engineId]);

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

  // ── Submit ───────────────────────────────────────────────────────────────────
  const submit = useCallback((q) => {
    const term = (q || query).trim();
    if (!term) return;
    pushHistory(term);
    // Bounce feedback
    setBouncing(true);
    setTimeout(() => setBouncing(false), 420);
    window.open(`${engine.url}${encodeURIComponent(term)}`, '_blank', 'noopener');
    setQuery('');
    originalQueryRef.current = '';
    setSuggestions([]);
    setFocused(false);
    setActiveSugg(-1);
  }, [query, engine]);

  // ── Keyboard nav — Google-style for suggestions; Enter on tabs switches ───────
  const handleArrowDown = (e) => {
    e.preventDefault();
    const totalItems = suggestions.length + tabResults.length;
    const next = Math.min(activeSugg + 1, totalItems - 1);
    if (activeSugg === -1) originalQueryRef.current = query;
    setActiveSugg(next);
    if (next < suggestions.length) {
      isNavRef.current = true;
      setQuery(suggestions[next] ?? originalQueryRef.current);
    }
  };

  const handleArrowUp = (e) => {
    e.preventDefault();
    const next = Math.max(activeSugg - 1, -1);
    setActiveSugg(next);
    if (next >= 0 && next < suggestions.length) {
      isNavRef.current = true;
      setQuery(suggestions[next]);
    } else if (next === -1) {
      isNavRef.current = true;
      setQuery(originalQueryRef.current);
    }
  };

  const handleEnter = (e) => {
    e.preventDefault();
    const isTabItem = activeSugg >= suggestions.length && activeSugg >= 0;
    if (isTabItem) {
      switchToTab(tabResults[activeSugg - suggestions.length]);
      setFocused(false);
    } else {
      const selected = activeSugg >= 0 && activeSugg < suggestions.length ? suggestions[activeSugg] : undefined;
      submit(selected);
    }
  };

  const handleEscape = () => {
    isNavRef.current = true;
    setQuery(originalQueryRef.current);
    setActiveSugg(-1);
    setFocused(false);
    inputRef.current?.blur();
    setSuggestions([]);
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

  const showDropdown = focused && (suggestions.length > 0 || tabResults.length > 0 || !query.trim());
  const isHistory = !query.trim();

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%', zIndex: 30 }}>
      {/* ── Pill input ── */}
      <div
        style={{
          display: 'flex', alignItems: 'center', height: 46, borderRadius: 999,
          background: focused ? t.pillBgFocused : t.pillBg,
          border: `1px solid ${focused ? t.pillBorderFoc : t.pillBorder}`,
          backdropFilter: 'blur(24px) saturate(160%)',
          WebkitBackdropFilter: 'blur(24px) saturate(160%)',
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
          onFocus={() => { setFocused(true); if (!query.trim()) setSuggestions(getHistory().slice(0, 6)); }}
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
        <style>{`.fm-searchinput::placeholder { color: ${t.placeholder}; }`}</style>

        {/* Search submit button */}
        <button
          onClick={() => submit()}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, marginRight: 4, borderRadius: 999,
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
      {showDropdown && !showPicker && (suggestions.length > 0 || tabResults.length > 0) && (
        <SuggestionsDropdown
          suggestions={suggestions}
          tabResults={tabResults}
          activeSugg={activeSugg}
          isHistory={isHistory}
          onSelect={submit}
          onTabSelect={(tab) => { switchToTab(tab); setFocused(false); setActiveSugg(-1); }}
          onHover={setActiveSugg}
          t={t}
        />
      )}
    </div>
  );
};
