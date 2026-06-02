// ─── Focus Mode Search Bar ────────────────────────────────────────────────────
//
// Pill-shaped search bar with engine picker and autocomplete suggestions.
// Search history stored in localStorage (not in exportable settings).
// Only rendered inside FocusMode — lives at panels/ per convention.


import React, { useState, useRef, useEffect, useCallback } from 'react';

import { getHistory, switchToTab } from '../hooks';
import { getTokens, FM_CARD_BLUR } from '../theme';
import { TooltipBtn } from '../../ui/TooltipBtn';
import { useSettingsStore } from '../../../store';
import { EngineIcon } from '../../../utilities/searchEngines';
import { useSearchCore } from '../../Search';
import { Search } from 'react-bootstrap-icons';
import { GlobeIcon } from '../../../assets/svg/GlobeIcon';
import { BrowserTabIcon as TabIcon } from '../../../assets/svg/BrowserTabIcon';
import { ClockIcon } from '../../../assets/svg/ClockIcon';

// ── Local-storage history ──────────────────────────────────────────────────────

export const HISTORY_KEY = 'fm_search_history';
export const MAX_HISTORY = 12;

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

// ── Suggestions Dropdown ───────────────────────────────────────────────────────
const PILL_TINTS = {
  'Switch': { bg: 'rgba(96,165,250,0.18)', border: 'rgba(96,165,250,0.30)', text: 'rgba(147,197,253,0.95)' },
  'Visit': { bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.28)', text: 'rgba(253,224,71,0.95)' },
  'Go to': { bg: 'rgba(255,255,255,0.09)', border: 'rgba(255,255,255,0.16)', text: 'rgba(255,255,255,0.65)' },
};

const Pill = ({ label }) => {
  const tint = PILL_TINTS[label] ?? PILL_TINTS['Go to'];
  return (
    <span style={{
      fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.04em',
      color: tint.text, background: tint.bg,
      border: `0.5px solid ${tint.border}`,
      borderRadius: 999, padding: '2px 6px',
      flexShrink: 0, whiteSpace: 'nowrap',
    }}>{label}</span>
  );
};
const SuggestionsDropdown = ({ urlTarget, goToUrl, urlOffset, suggestions, tabResults, topSites, activeSugg, isHistory, onSelect, onTabSelect, onTopSiteSelect, onHover, t }) => {
  // When query is empty, top sites precede history in the index order
  const topSiteOffset = topSites?.length || 0;
  const tabStart = urlOffset + topSiteOffset;
  const suggStart = tabStart + tabResults.length;

  const rowStyle = (active) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', padding: '7px 12px', borderRadius: 10,
    border: 'none', cursor: 'pointer',
    background: active ? t.activeBg : 'transparent',
    transition: 'background 0.1s ease', textAlign: 'left',
  });
  const textStyle = { fontSize: '0.84rem', fontFamily: "'Google Sans', ui-sans-serif, sans-serif", color: t.suggText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, flex: 1 };

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
          <GlobeIcon size={13} color={t.label} />
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
            : <TabIcon size={13} color={t.label} />}
          <span style={textStyle}>{tab.title || tab.url}</span>
          <Pill label="Switch" />
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
          {isHistory ? <ClockIcon size={12} color={t.label} /> : <Search size={14} style={{ color: t.label }} />}
          <span style={{ ...textStyle, flex: 'unset' }}>{s}</span>
        </button>
      ))}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
export const SearchBar = ({ centerOnDark = true }) => {
  const focusSearchTopSites = useSettingsStore(s => s.focusSearchTopSites ?? true);
  const focusSearchWeb = useSettingsStore(s => s.focusSearchWeb ?? true);

  const [activeSugg, setActiveSugg] = useState(-1);
  const [hoverIdx, setHoverIdx] = useState(-1);
  const [arrowed, setArrowed] = useState(false);
  const [focused, setFocused] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const [topSites, setTopSites] = useState([]);

  const { query, setQuery, engineId, engine, handleCycleEngine, suggestions, setSuggestions, tabResults, urlTarget, navigate, search, skipNextFetch } = useSearchCore({ withHistory: true, fetchSuggestions: focusSearchWeb, debounceMs: 220 });

  // Reset navigation state on every query change
  useEffect(() => { setArrowed(false); setHoverIdx(-1); }, [query]);

  const inputRef = useRef(null);
  const wrapRef = useRef(null);
  const originalQueryRef = useRef('');  // user's typed query before arrow-nav

  const t = getTokens(centerOnDark);

  // ── Top sites (fetched once when enabled) ────────────────────────────────────
  useEffect(() => {
    if (!focusSearchTopSites) { setTopSites([]); return; }
    const api = globalThis.chrome?.topSites;
    if (!api) return;
    api.get(sites => setTopSites(sites?.slice(0, 8) || []));
  }, [focusSearchTopSites]);

  // ── Close on outside click ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Cmd+K → focus this search bar when in Focus Mode ────────────────────────
  useEffect(() => {
    const handler = () => {
      inputRef.current?.focus();
      setFocused(true);
      setSuggestions(getHistory().slice(0, 6));
    };
    globalThis.addEventListener('um:focus_search_bar', handler);
    return () => globalThis.removeEventListener('um:focus_search_bar', handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigate directly to a URL ───────────────────────────────────────────────
  const goToUrl = useCallback((url) => {
    setBouncing(true);
    setTimeout(() => setBouncing(false), 420);
    navigate(url);
    originalQueryRef.current = '';
    setFocused(false); setActiveSugg(-1); setArrowed(false);
  }, [navigate]);

  // ── Submit search ────────────────────────────────────────────────────────────
  const submit = useCallback((q) => {
    if (!q && !query.trim()) return;
    setBouncing(true);
    setTimeout(() => setBouncing(false), 420);
    search(q);
    originalQueryRef.current = '';
    setFocused(false);
    setActiveSugg(-1);
    setArrowed(false);
  }, [query, search]);

  // ── Keyboard nav ─────────────────────────────────────────────────────────────
  // Index order: [url?][matchedTopSites][tabs][suggestions]
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
  const suggStart = tabStart + tabResults.length;
  // totalItems used for arrow nav bounds

  const handleArrowDown = (e) => {
    e.preventDefault();
    setArrowed(true);
    const total = suggStart + suggestions.length;
    const next = Math.min(activeSugg + 1, total - 1);
    if (activeSugg === -1) originalQueryRef.current = query;
    setActiveSugg(next);
    // Only fill input for suggestion items
    if (next >= suggStart) {
      skipNextFetch();
      setQuery(suggestions[next - suggStart] ?? originalQueryRef.current);
    }
  };

  const handleArrowUp = (e) => {
    e.preventDefault();
    setArrowed(true);
    const next = Math.max(activeSugg - 1, -1);
    setActiveSugg(next);
    if (next >= suggStart) {
      skipNextFetch();
      setQuery(suggestions[next - suggStart]);
    } else if (next === -1) {
      skipNextFetch();
      setQuery(originalQueryRef.current);
    }
  };

  const handleEnter = (e) => {
    e.preventDefault();
    if (!arrowed) { submit(); return; }
    if (activeSugg === -1) { submit(); return; }
    if (urlTarget && activeSugg === 0) {
      goToUrl(urlTarget);
    } else if (isHistory && activeSugg >= urlOffset && activeSugg < tabStart) {
      const site = topSites[activeSugg - urlOffset];
      if (site) { window.open(site.url, '_blank', 'noopener'); setFocused(false); setActiveSugg(-1); }
    } else if (activeSugg >= tabStart && activeSugg < suggStart) {
      switchToTab(tabResults[activeSugg - tabStart]);
      setFocused(false); setActiveSugg(-1);
    } else if (activeSugg >= suggStart) {
      submit(suggestions[activeSugg - suggStart]);
    }
  };

  const handleEscape = () => {
    skipNextFetch();
    setQuery(originalQueryRef.current);
    setActiveSugg(-1);
    setArrowed(false);
    setFocused(false);
    inputRef.current?.blur();
    setSuggestions([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') { e.preventDefault(); handleCycleEngine(); return; }
    if (e.key === 'ArrowDown') { handleArrowDown(e); return; }
    if (e.key === 'ArrowUp') { handleArrowUp(e); return; }
    if (e.key === 'Enter') { handleEnter(e); return; }
    if (e.key === 'Escape') handleEscape();
  };

  const showDropdown = focused && (
    suggestions.length > 0 || tabResults.length > 0 || urlTarget ||
    matchedTopSites.length > 0
  );

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
        {/* Engine icon — click or Tab to cycle */}
        <TooltipBtn
          onClick={handleCycleEngine}
          tooltip={`${engine.label} — Tab to switch`}
          style={{
            display: 'flex', alignItems: 'center',
            padding: '0 4px 0 14px', height: '100%',
            background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
            opacity: 0.9, transition: 'opacity 0.15s ease',
          }}
        >
          <EngineIcon id={engineId} size={15} />
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
          onChange={e => { originalQueryRef.current = e.target.value; setQuery(e.target.value); }}
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
          <Search size={14} style={{ color: t.iconStroke }} />
        </button>
      </div>

      {/* ── Suggestions dropdown ── */}
      {showDropdown && (urlTarget || suggestions.length > 0 || tabResults.length > 0 || matchedTopSites.length > 0) && (
        <SuggestionsDropdown
          urlTarget={urlTarget}
          goToUrl={goToUrl}
          urlOffset={urlOffset}
          suggestions={suggestions}
          tabResults={tabResults}
          topSites={matchedTopSites}
          activeSugg={arrowed ? activeSugg : hoverIdx}
          isHistory={isHistory}
          onSelect={submit}
          onTabSelect={(tab) => { switchToTab(tab); setFocused(false); setActiveSugg(-1); setArrowed(false); }}
          onTopSiteSelect={(site) => { window.open(site.url, '_blank', 'noopener'); setFocused(false); setActiveSugg(-1); setArrowed(false); }}
          onHover={setHoverIdx}
          t={t}
        />
      )}
    </div>
  );
};
