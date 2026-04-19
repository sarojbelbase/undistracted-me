import { useState, useEffect, useRef } from 'react';
import { XLg, Search } from 'react-bootstrap-icons';
import { fetchCompanies } from './utils';
import { SettingsInput } from '../../components/ui/SettingsInput';
import { TooltipBtn } from '../../components/ui/TooltipBtn';

/**
 * Stock selector content — rendered inside BaseSettingsModal.
 * Supports selecting up to 3 symbols.
 * onClose is injected by BaseWidget when settingsContent is a function.
 */
export const Settings = ({ symbols = [], onChange, onClose }) => {
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

  const top20 = companies ? companies.slice(0, 20) : [];
  const filtered = companies && query.trim()
    ? companies
      .filter((c) => {
        const q = query.toLowerCase();
        return c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
      })
      .slice(0, 20)
    : top20;

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
        <span className="text-[10px]" style={{ color: 'var(--w-ink-4)' }}>pick up to 3</span>
      </div>

      {/* Current symbol pills */}
      {symbols.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pb-3">
          {symbols.map(sym => (
            <div
              key={sym}
              className="flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg text-[10px] font-semibold"
              style={{ background: 'color-mix(in srgb, var(--w-accent) 8%, transparent)', color: 'var(--w-accent)' }}
            >
              {sym}
              <TooltipBtn
                onClick={() => remove(sym)}
                className="w-4 h-4 flex items-center justify-center rounded-full transition-opacity hover:opacity-70 cursor-pointer"
                style={{ color: 'inherit' }}
                tooltip="Remove"
              >
                <XLg size={8} aria-hidden="true" />
              </TooltipBtn>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="pb-3">
        <SettingsInput
          ref={inputRef}
          type="text"
          placeholder="Search symbol or name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          icon={<Search size={13} />}
        />
      </div>

      {/* List — bleeds to modal edges so buttons span full width */}
      <div className="pb-1 -mx-4">
        {loading && (
          <p className="text-xs px-4 py-2" style={{ color: 'var(--w-ink-4)' }}>Loading…</p>
        )}
        {error && (
          <p className="text-xs px-4 py-2" style={{ color: 'var(--w-danger)' }}>{error}</p>
        )}
        {!loading && !error && query.trim() && filtered.length === 0 && (
          <p className="text-xs px-4 py-2" style={{ color: 'var(--w-ink-4)' }}>No results</p>
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
                  ? { background: 'color-mix(in srgb, var(--w-accent) 10%, transparent)', color: 'var(--w-accent)' }
                  : { color: 'var(--w-ink-1)' }
              }
            >
              <span className="text-xs font-bold w-14 shrink-0">{c.symbol}</span>
              <span className="text-xs truncate flex-1" style={{ color: isSelected ? 'var(--w-accent)' : 'var(--w-ink-4)' }}>{c.name}</span>
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

