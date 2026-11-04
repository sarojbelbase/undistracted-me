import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { EngineIcon } from "../../utilities/searchEngines";
import { switchToTab } from "../FocusMode/hooks";
import { useSearchCore } from "../Search";
import { Search } from "react-bootstrap-icons";
import { GlobeIcon } from "../../assets/svg/GlobeIcon";
import { BrowserTabIcon as TabIcon } from "../../assets/svg/BrowserTabIcon";
import { filterCommands } from "./commands";

// ── Style helpers ────────────────────────────────────────────────────────────────────────────

const kbdStyle = {
  fontSize: 11, color: "var(--w-ink-5)",
  border: "1px solid var(--card-border)", borderRadius: 6,
  padding: "2px 5px", fontFamily: "inherit", lineHeight: "1.4", flexShrink: 0,
};
const pillStyle = {
  fontSize: 10, fontWeight: 600, letterSpacing: "0.03em",
  color: "var(--w-ink-5)", border: "1px solid var(--card-border)",
  borderRadius: 999, padding: "1.5px 6px", flexShrink: 0, whiteSpace: "nowrap",
};
const sectionLabelStyle = {
  padding: "8px 14px 3px", fontSize: 10, fontWeight: 700,
  letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--w-ink-5)",
};
const cmdDescStyle = {
  fontSize: 11, color: "var(--w-ink-4)", flexShrink: 0, maxWidth: 170,
  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
};
const rowBase = (isActive) => ({
  display: "flex", alignItems: "center", gap: 10,
  padding: "7px 10px", margin: "1px 4px", borderRadius: 8,
  cursor: "pointer", border: "none", width: "calc(100% - 8px)", textAlign: "left",
  background: isActive ? "rgba(var(--w-accent-rgb), 0.10)" : "transparent",
  transition: "background 0.1s ease",
});

const ResultRow = ({ isActive, onRun, onHover, children }) => (
  <button role="menuitem" onClick={onRun} onMouseEnter={onHover} style={rowBase(isActive)}>
    {children}
  </button>
);

const ResultText = ({ isActive, children }) => (
  <span style={{ flex: 1, fontSize: 13, color: isActive ? "var(--w-accent)" : "var(--w-ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
    {children}
  </span>
);

// ── CommandPalette ─────────────────────────────────────────────────────────────────────────────

/**
 * Search overlay — opened by Cmd+K / Ctrl+K via useCommandPalette hook.
 *
 * Supports: URL navigation, open-tab switching, web autocomplete suggestions.
 * Engine: click the icon or press Tab to cycle Google → DDG → YouTube → Perplexity.
 */
export function CommandPalette({ onClose }) {
  const [activeIdx, setActiveIdx] = useState(-1);
  const [arrowed, setArrowed] = useState(false);
  const inputRef = useRef(null);

  const {
    query, setQuery,
    engineId, engine, handleCycleEngine,
    suggestions, tabResults,
    urlTarget, hasQuery,
    navigate, search,
  } = useSearchCore({ debounceMs: 220 });

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setActiveIdx(-1); setArrowed(false); }, [query]);

  // Commands first (default list on empty query), then web results.
  const commandItems = useMemo(() => filterCommands(query), [query]);

  // Flat list for keyboard nav: [commands] [url?] [tabs] [suggestions]
  const flatItems = useMemo(() => {
    const items = [];
    commandItems.forEach(c => items.push({ type: "command", value: c }));
    if (urlTarget) items.push({ type: "url", value: urlTarget });
    tabResults.forEach(t => items.push({ type: "tab", value: t }));
    suggestions.forEach(s => items.push({ type: "sugg", value: s }));
    return items;
  }, [commandItems, urlTarget, tabResults, suggestions]);

  const commandCount = commandItems.length;
  const tabStart = commandCount + (urlTarget ? 1 : 0);
  const suggStart = tabStart + tabResults.length;

  const runItem = useCallback((item) => {
    if (!item) return;
    if (item.type === "command") { item.value.run(); onClose(); }
    else if (item.type === "url") { navigate(item.value); onClose(); }
    else if (item.type === "tab") { switchToTab(item.value); onClose(); }
    else if (item.type === "sugg") { search(item.value); onClose(); }
  }, [navigate, search, onClose]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Tab") { e.preventDefault(); handleCycleEngine(); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setArrowed(true);
      setActiveIdx(i => {
        if (flatItems.length === 0) return -1;
        if (i < 0) return 0;
        if (i >= flatItems.length - 1) return -1;
        return i + 1;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setArrowed(true);
      setActiveIdx(i => {
        if (flatItems.length === 0) return -1;
        if (i < 0) return flatItems.length - 1;
        if (i === 0) return -1;
        return i - 1;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (arrowed && activeIdx >= 0 && flatItems[activeIdx]) {
        runItem(flatItems[activeIdx]);
      } else if (urlTarget) {
        // A URL-looking query should navigate on a bare Enter (omnibox convention).
        navigate(urlTarget); onClose();
      } else if (hasQuery) {
        search(); onClose();
      }
    }
  }, [flatItems, activeIdx, arrowed, runItem, hasQuery, urlTarget, navigate, search, onClose, handleCycleEngine]);

  // Show the results menu when there's a query, or the default command list on empty.
  const showMenu = hasQuery || commandItems.length > 0;

  return (
    <Modal
      onClose={onClose}
      ariaLabel="Search"
      style={{
        width: 540, maxWidth: "calc(100vw - 32px)",
        alignSelf: "flex-start", marginTop: "12vh",
        background: "var(--modal-bg)",
        backdropFilter: "none", WebkitBackdropFilter: "none",
      }}
    >
      {/* ── Input bar ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px",
        borderBottom: showMenu ? "1px solid var(--card-border)" : "none",
        minHeight: 44,
      }}>
        <button
          onClick={handleCycleEngine}
          title={`${engine.label} — Tab to switch engine`}
          aria-label={`Search engine: ${engine.label}. Click or Tab to change.`}
          style={{
            display: "flex", alignItems: "center",
            background: "none", border: "none", cursor: "pointer",
            padding: "2px 4px", borderRadius: 6, flexShrink: 0,
            opacity: 0.85, transition: "opacity 0.15s ease",
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "1"; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "0.85"; }}
        >
          <EngineIcon id={engineId} size={15} />
        </button>

        <div aria-hidden="true" style={{ width: 1, height: 16, background: "var(--card-border)", flexShrink: 0 }} />

        <Input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Search with ${engine.label}…`}
          aria-label="Search the web"
          autoComplete="off"
          spellCheck={false}
        />
        <kbd aria-hidden="true" style={kbdStyle}>esc</kbd>
      </div>

      {/* ── Results (command list on empty query, then web results) ── */}
      {showMenu && (
        <div role="menu" aria-label="Results" style={{ maxHeight: 340, overflowY: "auto", padding: "3px 0 6px" }}>
          {commandItems.length > 0 && (
            <>
              <div aria-hidden="true" style={sectionLabelStyle}>Commands</div>
              {commandItems.map((cmd, k) => {
                const Icon = cmd.icon;
                const label = cmd.getLabel ? cmd.getLabel() : cmd.label;
                return (
                  <ResultRow key={cmd.id} isActive={activeIdx === k} onRun={() => runItem(flatItems[k])} onHover={() => setActiveIdx(k)}>
                    <span style={{ color: activeIdx === k ? "var(--w-accent)" : "var(--w-ink-4)", flexShrink: 0, display: "flex" }}><Icon size={13} /></span>
                    <ResultText isActive={activeIdx === k}>{label}</ResultText>
                    {cmd.description && <span style={cmdDescStyle}>{cmd.description}</span>}
                  </ResultRow>
                );
              })}
            </>
          )}

          {urlTarget && (
            <ResultRow isActive={activeIdx === commandCount} onRun={() => runItem(flatItems[commandCount])} onHover={() => setActiveIdx(commandCount)}>
              <span style={{ color: activeIdx === commandCount ? "var(--w-accent)" : "var(--w-ink-4)", flexShrink: 0, display: "flex" }}><GlobeIcon size={13} /></span>
              <ResultText isActive={activeIdx === commandCount}>{urlTarget}</ResultText>
              <span style={pillStyle}>Go to</span>
            </ResultRow>
          )}

          {tabResults.map((tab, k) => {
            const idx = tabStart + k;
            return (
              <ResultRow key={tab.id} isActive={activeIdx === idx} onRun={() => runItem(flatItems[idx])} onHover={() => setActiveIdx(idx)}>
                {tab.favIconUrl
                  ? <img src={tab.favIconUrl} alt="" width={13} height={13} style={{ borderRadius: 2, flexShrink: 0 }} onError={e => { e.currentTarget.style.display = "none"; }} />
                  : <span style={{ color: "var(--w-ink-4)", flexShrink: 0, display: "flex" }}><TabIcon size={13} /></span>}
                <ResultText isActive={activeIdx === idx}>{tab.title || tab.url}</ResultText>
                <span style={pillStyle}>Switch</span>
              </ResultRow>
            );
          })}

          {suggestions.length > 0 && (
            <>
              <div aria-hidden="true" style={sectionLabelStyle}>Suggestions</div>
              {suggestions.map((s, i) => {
                const idx = suggStart + i;
                return (
                  <ResultRow key={s} isActive={activeIdx === idx} onRun={() => runItem(flatItems[idx])} onHover={() => setActiveIdx(idx)}>
                    <span style={{ color: activeIdx === idx ? "var(--w-accent)" : "var(--w-ink-4)", flexShrink: 0, display: "flex" }}><Search size={13} /></span>
                    <ResultText isActive={activeIdx === idx}>{s}</ResultText>
                  </ResultRow>
                );
              })}
            </>
          )}

          {hasQuery && !urlTarget && tabResults.length === 0 && suggestions.length === 0 && (
            <div style={{ padding: "24px 14px", textAlign: "center", fontSize: 13, color: "var(--w-ink-4)" }}>
              Press Enter to search “{query}”
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
