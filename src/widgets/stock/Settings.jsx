import React, { useState, useEffect, useRef } from 'react';
import { fetchCompanies } from './utils';

/**
 * Stock selector content — rendered inside BaseSettingsModal.
 * Supports selecting up to 3 symbols.
 * onClose is injected by BaseWidget when settingsContent is a function.
 */
export const StockSettings = ({ symbols = [], onChange, onClose }) => {
  const [companies, setCompanies] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);
    fetchCompanies()
      .then(setCompanies)
      .catch(() => setError('Could not load companies'))
      .finally(() => setLoading(false));
  }, []);

  // Auto-focus the search input when the modal opens
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  const filtered = companies && query.trim()
    ? companies
      .filter((c) => {
        const q = query.toLowerCase();
        return c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
      })
      .slice(0, 20)
    : companies
      ? companies.slice(0, 20)
      : [];

  const toggle = (sym) => {
    if (symbols.includes(sym)) {
      onChange('symbols', symbols.filter(s => s !== sym));
    } else if (symbols.length < 3) {
      const next = [...symbols, sym];
      onChange('symbols', next);
      if (next.length === 3) onClose?.();
    }
  };

  const remove = (sym) => onChange('symbols', symbols.filter(s => s !== sym));

  return (
    <>
      {/* Section label */}
      <div className="flex items-baseline justify-between pb-2">
        <span className="w-label">Select Stocks</span>
        <span className="text-[10px]" style={{ color: 'var(--w-ink-5)' }}>pick up to 3</span>
      </div>

      {/* Current symbol pills */}
      {symbols.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pb-3">
          {symbols.map(sym => (
            <div
              key={sym}
              className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-xs font-bold"
              style={{ backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}
            >
              {sym}
              <button
                onClick={() => remove(sym)}
                className="w-4 h-4 flex items-center justify-center rounded-full transition-opacity hover:opacity-70 cursor-pointer"
                style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
                title="Remove"
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="1" y1="1" x2="7" y2="7" /><line x1="7" y1="1" x2="1" y2="7" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="pb-3">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search symbol or name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full text-sm px-3 py-2 rounded-xl outline-none"
          style={{
            backgroundColor: 'var(--w-surface-2)',
            border: '1px solid var(--w-border)',
            color: 'var(--w-ink-1)',
          }}
        />
      </div>

      {/* List — bleeds to modal edges so buttons span full width */}
      <div className="pb-1 mx-[-1rem]">
        {loading && (
          <p className="text-xs px-4 py-2" style={{ color: 'var(--w-ink-5)' }}>Loading…</p>
        )}
        {error && (
          <p className="text-xs px-4 py-2" style={{ color: '#ef4444' }}>{error}</p>
        )}
        {!loading && !error && query.trim() && filtered.length === 0 && (
          <p className="text-xs px-4 py-2" style={{ color: 'var(--w-ink-5)' }}>No results</p>
        )}
        {filtered.map((c) => {
          const isSelected = symbols.includes(c.symbol);
          const isDisabled = !isSelected && symbols.length >= 3;
          return (
            <button
              key={c.symbol}
              onClick={() => toggle(c.symbol)}
              disabled={isDisabled}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors hover:opacity-80 disabled:opacity-30"
              style={
                isSelected
                  ? { backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)' }
                  : { color: 'var(--w-ink-1)' }
              }
            >
              <span className="text-xs font-bold w-14 shrink-0">{c.symbol}</span>
              <span className="text-xs truncate flex-1" style={{ opacity: 0.65 }}>{c.name}</span>
              {isSelected && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <polyline points="2,6 5,9 10,3" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
};

