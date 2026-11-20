import { useState, useEffect, useRef } from 'react';
import { XLg, Search } from 'react-bootstrap-icons';
import { fetchCompanies, searchInternational, displaySymbol, INTL_PREFIX } from './utils';
import { Input } from '../../components/ui/Input';
import { TooltipBtn } from '../../components/ui/TooltipBtn';

/**
 * Skeleton rows that mirror the real company row shape (bold symbol on the
 * left, truncated company name on the right) shown while a symbol list is
 * in flight — replacing the previous plain "Loading…" text.
 */
const CompanyListSkeleton = () => (
  <div aria-hidden="true">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 w-full px-4 py-2.5">
        <span className="w-14 shrink-0">
          <span
            className="block h-2.5 w-8 rounded-full animate-pulse"
            style={{ background: 'color-mix(in srgb, var(--w-ink-1) 14%, transparent)' }}
          />
        </span>
        <span className="flex-1">
          <span
            className="block h-2.5 w-3/5 rounded-full animate-pulse"
            style={{ background: 'color-mix(in srgb, var(--w-ink-1) 10%, transparent)' }}
          />
        </span>
      </div>
    ))}
  </div>
);

const MARKET_TABS = [
  { id: 'nepse', label: 'NEPSE' },
  { id: 'intl', label: 'International' },
];

/**
 * Stock selector content — rendered inside BaseSettingsModal.
 * Supports selecting up to 3 symbols, mixing NEPSE tickers and international
 * tickers (the latter stored with an `INTL:` prefix).
 * onClose is injected by BaseWidget when settingsContent is a function.
 */
export const Settings = ({ symbols = [], onChange, onClose }) => {
  const [market, setMarket] = useState('nepse');
  const [companies, setCompanies] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [intlResults, setIntlResults] = useState(null);
  const [intlLoading, setIntlLoading] = useState(false);
  const [intlError, setIntlError] = useState(null);
  const inputRef = useRef(null);
  const loadedRef = useRef(false);

  // Load NEPSE companies once, lazily.
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);
    fetchCompanies()
      .then(setCompanies)
      .catch(() => setError('Could not load stock symbols. Check your connection.'))
      .finally(() => setLoading(false));
  }, []);

  // Debounced international search — runs when the International tab is active
  // and the query is non-empty. A `cancelled` flag drops stale/out-of-order
  // results and prevents setState after unmount.
  useEffect(() => {
    if (market !== 'intl') return;
    const q = query.trim();
    if (!q) {
      setIntlResults(null);
      setIntlError(null);
      setIntlLoading(false);
      return;
    }
    setIntlLoading(true);
    setIntlError(null);
    let cancelled = false;
    const t = setTimeout(() => {
      searchInternational(q)
        .then((r) => { if (!cancelled) setIntlResults(r); })
        .catch(() => { if (!cancelled) setIntlError('Could not search international stocks.'); })
        .finally(() => { if (!cancelled) setIntlLoading(false); });
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [market, query]);

  // Auto-focus the search input when the modal opens
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  // ── Rows for the active market ──────────────────────────────────────────────
  // International rows carry their full storage symbol (`INTL:AAPL`), NEPSE
  // rows stay bare (`NABIL`). Both render via displaySymbol().
  const intlRows = (intlResults ?? []).map((r) => ({
    symbol: `${INTL_PREFIX}${r.symbol}`,
    name: r.name,
    exchange: r.exchange,
  }));
  const nepseTop = companies ? companies.slice(0, 20) : [];
  const rows = market === 'intl' ? intlRows : nepseTop;

  const filtered = market === 'intl'
    ? rows
    : companies && query.trim()
      ? companies
        .filter((c) => {
          const q = query.toLowerCase();
          return c.symbol.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
        })
        .slice(0, 20)
      : rows;

  const listLoading = market === 'intl' ? intlLoading : loading;
  const listError = market === 'intl' ? intlError : error;

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
      {/* Market tabs */}
      <div
        className="flex gap-1 p-0.5 rounded-lg mb-3"
        style={{ background: 'color-mix(in srgb, var(--w-ink-1) 6%, transparent)' }}
        role="tablist"
        aria-label="Stock market"
      >
        {MARKET_TABS.map((t) => {
          const active = market === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMarket(t.id)}
              className="flex-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer"
              style={
                active
                  ? { background: 'color-mix(in srgb, var(--w-accent) 14%, transparent)', color: 'var(--w-accent)' }
                  : { color: 'var(--w-ink-4)' }
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>

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
              {displaySymbol(sym)}
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
        <Input pill
          ref={inputRef}
          id="stock-search"
          name="stock-search"
          type="text"
          placeholder={market === 'intl' ? 'Search international stocks…' : 'Search symbol or name…'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          icon={<Search size={13} />}
        />
      </div>

      {/* List — bleeds to modal edges so buttons span full width */}
      <div className="pb-1 -mx-4">
        {listLoading && <CompanyListSkeleton />}
        {listError && (
          <p className="text-xs px-4 py-2" style={{ color: 'var(--w-danger)' }} aria-live="polite" role="alert">{listError}</p>
        )}
        {!listLoading && !listError && market === 'intl' && !query.trim() && (
          <p className="text-xs px-4 py-2" style={{ color: 'var(--w-ink-4)' }}>
            Search by company name or ticker (e.g. “Apple”, “TSLA”).
          </p>
        )}
        {!listLoading && !listError && query.trim() && filtered.length === 0 && (
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
              <span className="text-xs font-bold w-14 shrink-0">{displaySymbol(c.symbol)}</span>
              <span className="text-xs truncate flex-1" style={{ color: isSelected ? 'var(--w-accent)' : 'var(--w-ink-4)' }}>
                {c.name}
              </span>
              {c.exchange && (
                <span className="text-[9px] shrink-0" style={{ color: 'var(--w-ink-5)' }}>{c.exchange}</span>
              )}
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
