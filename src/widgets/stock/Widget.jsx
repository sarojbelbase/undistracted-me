import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BaseWidget } from '../BaseWidget';
import { useWidgetSettings } from '../useWidgetSettings';
import { StockSettings } from './Settings';
import { fetchChart, buildSparklinePaths, priceStats, fmtPrice, fmtOHL, humanizeAge } from './utils';

const DIR_COLOR = {
  up: '#22c55e',
  down: '#ef4444',
  flat: 'var(--w-ink-4)',
};

// Sparkline — bleeds edge-to-edge at the bottom of the card.
// When `dead` is true it renders a flat baseline along the bottom edge.
const Sparkline = ({ prices, dir, dead = false }) => {
  const svgRef = useRef(null);
  const [vw, setVw] = useState(200);
  const VH = 56;
  const color = dead ? 'var(--w-ink-5)' : DIR_COLOR[dir];

  useEffect(() => {
    if (!svgRef.current) return;
    const obs = new ResizeObserver(([entry]) => {
      setVw(entry.contentRect.width || 200);
    });
    obs.observe(svgRef.current);
    return () => obs.disconnect();
  }, []);

  // When dead: flat line sitting at the bottom, area is just a sliver
  const baseY = VH - 1;
  const deadLine = `M0,${baseY} L${vw},${baseY}`;
  const deadArea = `${deadLine} L${vw},${VH} L0,${VH} Z`;

  const { line, area } = dead ? { line: deadLine, area: deadArea } : buildSparklinePaths(prices, vw, VH);
  const gradId = `sg-${dead ? 'dead' : dir}`;

  return (
    <svg
      ref={svgRef}
      width="100%"
      height={VH}
      viewBox={`0 0 ${vw} ${VH}`}
      preserveAspectRatio="none"
      overflow="visible"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={dead ? 0.06 : 0.25} />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {area && <path d={area} fill={`url(#${gradId})`} />}
      {line && (
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={dead ? 1 : 1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={dead ? '3 4' : undefined}
          opacity={dead ? 0.35 : 1}
        />
      )}
    </svg>
  );
};

// Compact row used in list view (2–3 symbols) — 2-line layout so symbol never truncates
const StockRow = ({ sym, data, isLast }) => {
  const inkMuted = 'var(--w-ink-5)';
  const isDead = !data;
  const stats = data ? priceStats(data) : null;
  const color = stats ? DIR_COLOR[stats.dir] : inkMuted;

  return (
    <div
      className="flex items-center justify-between px-3 py-2 gap-2"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--w-border)' }}
    >
      {/* Left: symbol on top, price below */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <span
          className="text-[10px] font-bold uppercase tracking-widest leading-none truncate"
          style={{ color: isDead ? inkMuted : 'var(--w-accent)', letterSpacing: '0.08em' }}
        >
          {sym}
        </span>
        <span
          className="tabular-nums text-sm font-semibold leading-none"
          style={{ color: isDead ? inkMuted : 'var(--w-ink-1)' }}
        >
          {data ? fmtPrice(data.ltp) : '—'}
        </span>
      </div>

      {/* Right: direction arrow + percentage */}
      <div
        className="flex items-center gap-0.5 shrink-0"
        style={{ color: isDead ? inkMuted : color }}
      >
        <svg width="7" height="7" viewBox="0 0 8 8" fill="currentColor" style={{ opacity: isDead ? 0.3 : 1 }}>
          {!isDead && stats?.dir === 'up'
            ? <polygon points="4,0 8,8 0,8" />
            : !isDead && stats?.dir === 'down'
              ? <polygon points="0,0 8,0 4,8" />
              : <rect x="0" y="3" width="8" height="2" rx="1" />
          }
        </svg>
        <span className="text-[11px] font-semibold tabular-nums">
          {isDead ? '—' : `${stats?.pct > 0 ? '+' : ''}${stats?.pct.toFixed(2)}%`}
        </span>
      </div>
    </div>
  );
};

export const Widget = ({ id: widgetId, onRemove }) => {
  const [settings, updateSetting] = useWidgetSettings(widgetId || 'stock', { symbols: ['GBIME'] });
  const { symbols = [] } = settings;

  const [chartMap, setChartMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState(null);
  const [ageLabel, setAgeLabel] = useState('');

  // Keep age label fresh every 30s
  useEffect(() => {
    if (!refreshedAt) return;
    setAgeLabel(humanizeAge(refreshedAt));
    const id = setInterval(() => setAgeLabel(humanizeAge(refreshedAt)), 30_000);
    return () => clearInterval(id);
  }, [refreshedAt]);

  const cardRef = useRef(null);
  const [cardWidth, setCardWidth] = useState(200);

  useEffect(() => {
    if (!cardRef.current) return;
    const obs = new ResizeObserver(([entry]) => setCardWidth(entry.contentRect.width || 200));
    obs.observe(cardRef.current);
    return () => obs.disconnect();
  }, []);

  const load = useCallback(async () => {
    if (!symbols.length) return;
    setLoading(true);
    try {
      const results = await Promise.all(symbols.map(sym => fetchChart(sym).catch(() => null)));
      const newMap = {};
      symbols.forEach((sym, i) => { newMap[sym] = results[i]; });
      setChartMap(newMap);
      setRefreshedAt(Date.now());
    } finally {
      setLoading(false);
    }
  }, [symbols]);

  useEffect(() => { load(); }, [load]);

  const isSingle = symbols.length <= 1;
  const primarySym = symbols[0];
  const chart = isSingle ? (chartMap[primarySym] ?? null) : null;
  const stats = chart ? priceStats(chart) : null;
  const isDead = loading || !primarySym || (isSingle && !chart);
  const color = stats ? DIR_COLOR[stats.dir] : 'var(--w-ink-3)';
  const narrow = cardWidth < 155;
  const inkMuted = 'var(--w-ink-5)';

  // Scale price font down for large numbers so they never clip
  const digits = chart ? Math.floor(chart.ltp).toString().length : 3;
  const priceSize = digits >= 6 ? '1.05rem'
    : digits >= 5 ? '1.2rem'
      : narrow ? '1.35rem'
        : 'clamp(1.35rem, 3.5vw, 1.85rem)';

  const ohlSize = '0.65rem';

  const settingsContent = (onClose) => (
    <StockSettings symbols={symbols} onChange={updateSetting} onClose={onClose} />
  );

  // Refresh button + age label — always inline for minimal vertical footprint
  const RefreshBtn = (
    <div className="flex items-center gap-1.5">
      {ageLabel && (
        <span className="text-[10px]" style={{ color: 'var(--w-ink-5)' }}>{ageLabel}</span>
      )}
      <button
        onClick={load}
        disabled={loading}
        aria-label={ageLabel ? `Refresh (last updated ${ageLabel})` : 'Refresh'}
        className={`flex items-center justify-center rounded-full transition-opacity hover:opacity-70 active:opacity-40 ${loading ? 'animate-spin' : ''}`}
        style={{ color: inkMuted }}
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M13.5 8a5.5 5.5 0 1 1-1.07-3.3" />
          <polyline points="12 2 13.5 4.7 10.8 5.5" />
        </svg>
      </button>
    </div>
  );

  // ── List view (2–3 symbols) ──────────────────────────────────────────────────
  if (!isSingle) {
    return (
      <BaseWidget
        ref={cardRef}
        className="flex flex-col overflow-hidden"
        settingsContent={settingsContent}
        settingsTitle="Settings"
        onRemove={onRemove}
      >
        <div className="flex items-center justify-between px-3 pt-2 pb-1 shrink-0">
          <span className="text-xs font-semibold" style={{ color: 'var(--w-ink-3)' }}>{symbols.length >= 2 ? 'Watchlist' : 'Stock'}</span>
          {RefreshBtn}
        </div>
        <div className="flex flex-col flex-1">
          {symbols.map((sym, i) => (
            <StockRow
              key={sym}
              sym={sym}
              data={loading ? null : chartMap[sym]}
              isLast={i === symbols.length - 1}
            />
          ))}
        </div>
      </BaseWidget>
    );
  }

  // ── Single-stock view (sparkline graph) ──────────────────────────────────────
  return (
    <BaseWidget
      ref={cardRef}
      className="flex flex-col overflow-hidden"
      settingsContent={settingsContent}
      settingsTitle="Settings"
      onRemove={onRemove}
    >
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1 shrink-0">
        <span
          className="text-xs font-bold tracking-widest uppercase"
          style={{ color: isDead ? inkMuted : 'var(--w-ink-1)', letterSpacing: '0.12em' }}
        >
          {primarySym || '—'}
        </span>
        {RefreshBtn}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col flex-1 px-3 pb-0">
        {/* Price */}
        <div className="flex items-baseline gap-2 mt-0.5">
          <span
            className="font-semibold leading-none tabular-nums transition-colors duration-300"
            style={{
              fontSize: priceSize,
              color: isDead ? inkMuted : 'var(--w-ink-1)',
            }}
          >
            {chart ? fmtPrice(chart.ltp) : '—'}
          </span>
        </div>

        {/* Change row */}
        <div className="flex items-center gap-1.5 mt-1" style={{ color: isDead ? inkMuted : color, transition: 'color 0.3s' }}>
          <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" style={{ opacity: isDead ? 0.3 : 1 }}>
            {!isDead && stats?.dir === 'up'
              ? <polygon points="4,0 8,8 0,8" />
              : !isDead && stats?.dir === 'down'
                ? <polygon points="0,0 8,0 4,8" />
                : <rect x="0" y="3" width="8" height="2" rx="1" />
            }
          </svg>
          <span className="text-xs font-semibold tabular-nums">
            {isDead ? '0.00' : `${stats?.change > 0 ? '+' : ''}${fmtPrice(stats?.change)}`}
          </span>
          <span className="text-[10px] font-medium tabular-nums" style={{ opacity: isDead ? 0.4 : 0.8 }}>
            ({isDead ? '0.00%' : `${stats?.pct > 0 ? '+' : ''}${stats?.pct.toFixed(2)}%`})
          </span>
        </div>

        {/* O / H / L — always visible in single-stock view */}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 mt-1.5">
          {[
            { label: 'O', val: chart?.open },
            { label: 'H', val: chart?.high },
            { label: 'L', val: chart?.low },
          ].map(({ label, val }) => (
            <div key={label} className="flex items-baseline gap-1">
              <span className="font-medium shrink-0" style={{ fontSize: ohlSize, color: inkMuted }}>{label}</span>
              <span className="tabular-nums shrink-0 transition-colors duration-300" style={{ fontSize: ohlSize, color: isDead ? inkMuted : 'var(--w-ink-3)' }}>
                {val != null ? fmtOHL(val) : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sparkline — always rendered, dead state when no data ── */}
      <div className="shrink-0 mt-auto" style={{ lineHeight: 0 }}>
        <Sparkline prices={chart?.prices ?? []} dir={stats?.dir ?? 'flat'} dead={isDead} />
      </div>
    </BaseWidget>
  );
};

