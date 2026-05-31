import React, { useState, useMemo, useCallback } from 'react';
import { XLg, WalletFill, Trash3Fill, ChevronDown, ChevronRight, ChevronLeft } from 'react-bootstrap-icons';
import { Modal } from '../../components/ui/Modal';
import { ConfirmButton } from '../../components/ui/ConfirmButton';
import { formatAmount } from '../../data/currencies';
import { getCategoryInfo, getCatColor } from './useExpenses';
import { MONTHS, formatDate, getPeriodBounds, getPeriodLabel } from './dates';

// ─── Sparkline data helpers ──────────────────────────────────────────────────

function dailyTotals(expenses, start, end) {
  const map = {};
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = cursor.toDateString();
    map[key] = 0;
    cursor.setDate(cursor.getDate() + 1);
  }
  expenses.forEach((e) => {
    if (e.createdAt >= start.getTime() && e.createdAt <= end.getTime()) {
      const key = new Date(e.createdAt).toDateString();
      if (key in map) map[key] += e.amount;
    }
  });
  return Object.entries(map).map(([k, v]) => ({
    date: new Date(k),
    value: v,
  }));
}

function monthlyTotals(expenses, start, end) {
  const map = {};
  for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
    const mStart = y === start.getFullYear() ? start.getMonth() : 0;
    const mEnd = y === end.getFullYear() ? end.getMonth() : 11;
    for (let m = mStart; m <= mEnd; m++) {
      const key = `${y}-${String(m + 1).padStart(2, '0')}`;
      map[key] = 0;
    }
  }
  expenses.forEach((e) => {
    const d = new Date(e.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (key in map) map[key] += e.amount;
  });
  return Object.entries(map).map(([k, v]) => {
    const [y, m] = k.split('-').map(Number);
    return { date: new Date(y, m - 1, 15), value: v, label: MONTHS[m - 1] };
  });
}

// ─── Smooth Sparkline (monotone cubic interpolation) ─────────────────────────

/**
 * Monotone cubic interpolation (Steffen / d3 curveMonotoneX style).
 * Produces a smooth, natural curve through the data points — just like
 * Wallet, Spendee, and other top-tier expense apps.
 */
function monotoneX(points) {
  const n = points.length;
  if (n < 2) return points;

  // Compute slopes (secants)
  const dx = [], dy = [], s = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = points[i + 1].x - points[i].x;
    dy[i] = points[i + 1].y - points[i].y;
    s[i] = dx[i] === 0 ? 0 : dy[i] / dx[i];
  }

  // Compute first derivatives (m) using Steffen monotonicity-preserving method
  const m = [];
  m[0] = s[0];
  m[n - 1] = s[n - 2];

  for (let i = 1; i < n - 1; i++) {
    const prev = s[i - 1];
    const curr = s[i];
    if (prev * curr <= 0) {
      m[i] = 0; // sign change → flat
    } else {
      const p = (prev * dx[i] + curr * dx[i - 1]) / (dx[i - 1] + dx[i]);
      // Steffen: preserve monotonicity
      const theta = Math.min(Math.max(Math.abs(curr / prev), Math.abs(prev / curr)), 3);
      m[i] = Math.sign(curr) * Math.min(Math.abs(p), theta * Math.min(Math.abs(prev), Math.abs(curr)));
    }
  }

  // Build cubic bezier segments
  const segments = [];
  for (let i = 0; i < n - 1; i++) {
    const x0 = points[i].x, y0 = points[i].y;
    const x1 = points[i + 1].x, y1 = points[i + 1].y;
    const dx1 = dx[i];
    const cp1x = x0 + dx1 / 3;
    const cp1y = y0 + m[i] * dx1 / 3;
    const cp2x = x1 - dx1 / 3;
    const cp2y = y1 - m[i + 1] * dx1 / 3;
    segments.push({ x0, y0, x1, y1, cp1x, cp1y, cp2x, cp2y });
  }
  return segments;
}

function Sparkline({ data, width = 280, height = 80, accent = 'var(--w-accent)' }) {
  if (!data || data.length < 2) {
    // Single point or empty: tiny dot or nothing
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="flex-shrink-0">
        {data && data.length === 1 && data[0].value > 0 && (
          <circle cx={width / 2} cy={height / 2} r="3" fill={accent} opacity="0.6" />
        )}
      </svg>
    );
  }

  const padX = 2;
  const padTop = 12;
  const padBot = 12;
  const chartW = width - padX * 2;
  const chartH = height - padTop - padBot;

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const vals = data.map(d => d.value);
  const minVal = Math.min(...vals, 0);

  // Build normalized points
  const n = data.length;
  const pts = data.map((d, i) => ({
    x: padX + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW),
    y: padTop + chartH - ((d.value - minVal) / Math.max(maxVal - minVal, 1)) * chartH,
    value: d.value,
    label: d.label,
  }));

  // Ensure at least 2 distinct x positions
  const uniquePts = pts.length > 1 && pts.every(p => p.x === pts[0].x)
    ? [{ x: padX, y: pts[0].y }, { x: padX + chartW, y: pts[pts.length - 1].y }]
    : pts;

  const segments = monotoneX(uniquePts);

  // Build SVG path strings
  let areaD = '';
  let lineD = '';

  if (segments.length === 0 && uniquePts.length >= 2) {
    // Fallback: straight lines
    areaD = `M ${uniquePts[0].x} ${padTop + chartH} L ${uniquePts[0].x} ${uniquePts[0].y}`;
    lineD = `M ${uniquePts[0].x} ${uniquePts[0].y}`;
    for (let i = 1; i < uniquePts.length; i++) {
      areaD += ` L ${uniquePts[i].x} ${uniquePts[i].y}`;
      lineD += ` L ${uniquePts[i].x} ${uniquePts[i].y}`;
    }
    areaD += ` L ${uniquePts[uniquePts.length - 1].x} ${padTop + chartH} Z`;
  } else {
    const first = segments[0];
    areaD = `M ${first.x0} ${padTop + chartH} L ${first.x0} ${first.y0}`;
    lineD = `M ${first.x0} ${first.y0}`;

    for (const seg of segments) {
      areaD += ` C ${seg.cp1x} ${seg.cp1y}, ${seg.cp2x} ${seg.cp2y}, ${seg.x1} ${seg.y1}`;
      lineD += ` C ${seg.cp1x} ${seg.cp1y}, ${seg.cp2x} ${seg.cp2y}, ${seg.x1} ${seg.y1}`;
    }

    const last = segments[segments.length - 1];
    areaD += ` L ${last.x1} ${padTop + chartH} Z`;
  }

  const lastPt = uniquePts[uniquePts.length - 1];
  const gradientId = `spark-grad-${accent.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="flex-shrink-0">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.25" />
          <stop offset="50%" stopColor={accent} stopOpacity="0.08" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Subtle baseline */}
      <line
        x1={padX} y1={padTop + chartH}
        x2={padX + chartW} y2={padTop + chartH}
        stroke="var(--w-ink-5)"
        strokeWidth="0.5"
        opacity="0.35"
      />

      {/* Area fill */}
      <path d={areaD} fill={`url(#${gradientId})`} />

      {/* Line */}
      <path d={lineD} fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />

      {/* Last point dot with glow */}
      <circle cx={lastPt.x} cy={lastPt.y} r="5" fill={accent} opacity="0.2" />
      <circle cx={lastPt.x} cy={lastPt.y} r="3.5" fill={accent} stroke="var(--w-bg, #fff)" strokeWidth="2" />
    </svg>
  );
}

// ─── Main Modal ──────────────────────────────────────────────────────────────

export const RecentExpensesModal = ({ expenses, currency, budget, timeRange, onClose, onDelete }) => {
  const [periodOffset, setPeriodOffset] = useState(0);
  const [expandedMonths, setExpandedMonths] = useState(() => {
    const now = new Date();
    return new Set([`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`]);
  });

  // ── Period bounds & label ──────────────────────────────────────────────────

  const period = useMemo(
    () => getPeriodBounds(timeRange, periodOffset),
    [timeRange, periodOffset]
  );

  const periodLabel = useMemo(
    () => getPeriodLabel(timeRange, periodOffset),
    [timeRange, periodOffset]
  );

  // ── Filtered expenses (within period) ──────────────────────────────────────

  const filteredExpenses = useMemo(
    () => expenses.filter(e => e.createdAt >= period.start.getTime() && e.createdAt <= period.end.getTime()),
    [expenses, period]
  );

  // ── Sparkline data ─────────────────────────────────────────────────────────

  const sparkData = useMemo(() => {
    if (timeRange === 'year') {
      return monthlyTotals(filteredExpenses, period.start, period.end);
    }
    return dailyTotals(filteredExpenses, period.start, period.end);
  }, [filteredExpenses, timeRange, period]);

  // ── Monthly grouping (year only) ───────────────────────────────────────────

  const monthGroups = useMemo(() => {
    if (timeRange !== 'year') return null;
    const map = {};
    filteredExpenses.forEach((e) => {
      const d = new Date(e.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map[key]) map[key] = { label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, items: [], total: 0 };
      map[key].items.push(e);
      map[key].total += e.amount;
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredExpenses, timeRange]);

  const toggleMonth = useCallback((key) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const canGoNext = periodOffset < 0;
  const hasAny = expenses.length > 0;
  const hasFiltered = filteredExpenses.length > 0;
  const filterTotal = filteredExpenses.reduce((s, e) => s + e.amount, 0);

  return (
    <Modal onClose={onClose} className="w-full max-w-100 max-h-[70vh] flex flex-col" ariaLabel="Recent Expenses">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 shrink-0 exp-modal__header">
        <div>
          <p className="text-[15px] font-semibold exp-modal__title">Recent Expenses</p>
          <p className="text-[11px] font-semibold mt-0.5 exp-modal__subtitle">
            {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer exp-modal__close-btn"
          aria-label="Close"
        >
          <XLg size={13} />
        </button>
      </div>

      {/* Sparkline card with period navigator */}
      {hasAny && budget && (
        <div className="px-6 shrink-0 mt-3">
          <div className="rounded-xl px-4 pt-3.5 pb-3 exp-modal__chart-card">
            {/* Period nav: < | label | > */}
            <div className="flex items-center justify-between mb-1.5">
              <button
                type="button"
                onClick={() => setPeriodOffset(o => o - 1)}
                className="w-6 h-6 rounded-full flex items-center justify-center transition-colors exp-modal__period-arrow"
                aria-label="Previous period"
              >
                <ChevronLeft size={13} />
              </button>
              <span className="exp-modal__chart-label">{periodLabel}</span>
              <button
                type="button"
                onClick={() => setPeriodOffset(o => canGoNext ? o + 1 : o)}
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors exp-modal__period-arrow ${!canGoNext ? 'opacity-30 pointer-events-none' : ''}`}
                aria-label="Next period"
                disabled={!canGoNext}
              >
                <ChevronRight size={13} />
              </button>
            </div>

            {/* Sparkline */}
            <div className="flex items-center justify-center">
              <Sparkline data={sparkData} />
            </div>

            {/* Period total */}
            <p className="text-center text-[10px] font-semibold mt-1 exp-modal__period-total">
              {formatAmount(filterTotal, currency)} this {timeRange === 'week' ? 'week' : timeRange === 'month' ? 'month' : 'year'}
            </p>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="overflow-y-auto flex-1 px-5 py-2 flex flex-col gap-1">
        {!hasAny && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <WalletFill size={28} className="exp-modal__empty-icon" />
            <p className="text-[12px] font-semibold exp-modal__empty-text">
              No expenses yet.<br />Add one below.
            </p>
          </div>
        )}

        {hasAny && !hasFiltered && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="text-[12px] font-semibold exp-modal__empty-text">
              No expenses in this {timeRange === 'week' ? 'week' : timeRange === 'month' ? 'month' : 'year'}.
            </p>
          </div>
        )}

        {/* ── YEAR: month-grouped collapsible sections ─────────────────────── */}
        {timeRange === 'year' && monthGroups && monthGroups.map(([key, month]) => {
          const isOpen = expandedMonths.has(key);
          let lastDate = null;

          return (
            <div key={key}>
              <button
                type="button"
                onClick={() => toggleMonth(key)}
                className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors hover:bg-[color-mix(in_srgb,var(--w-ink-1)_3%,transparent)] cursor-pointer sticky top-0 z-10 exp-modal__month-header"
              >
                <div className="flex items-center gap-2">
                  {isOpen ? <ChevronDown size={12} className="exp-modal__chevron" /> : <ChevronRight size={12} className="exp-modal__chevron" />}
                  <span className="exp-modal__month-label">{month.label}</span>
                  <span className="exp-modal__month-count">{month.items.length}</span>
                </div>
                <span className="exp-modal__month-total">
                  {formatAmount(month.total, currency)}
                </span>
              </button>

              {isOpen && (
                <div className="flex flex-col pb-3">
                  {month.items.map((exp) => {
                    const thisDate = formatDate(exp.createdAt);
                    const showDateDivider = thisDate !== lastDate;
                    lastDate = thisDate;
                    const info = getCategoryInfo(exp.category);
                    const catColor = getCatColor(exp.category);

                    return (
                      <React.Fragment key={exp.id}>
                        {showDateDivider && (
                          <div className="exp-modal__date-divider">
                            <span className="exp-modal__date-text">{thisDate}</span>
                          </div>
                        )}
                        <div className="exp-modal__row group">
                          <div className="exp-modal__cat-circle" style={{ backgroundColor: catColor.bg, color: catColor.fg }}>
                            {info?.Icon ? <info.Icon size={12} /> : <WalletFill size={12} />}
                          </div>
                          <div className="exp-modal__row-info">
                            <span className="exp-modal__row-cat">{info?.label || 'Expense'}</span>
                            {exp.note && <span className="exp-modal__row-note">{exp.note}</span>}
                          </div>
                          <span className="exp-modal__row-amount">
                            {formatAmount(exp.amount, exp.currency)}
                          </span>
                          <ConfirmButton
                            onConfirm={() => onDelete(exp.id)}
                            label="Delete expense"
                            danger
                            className="exp-modal__row-delete"
                          >
                            <Trash3Fill size={11} />
                          </ConfirmButton>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* ── WEEK / MONTH: flat list (no month grouping) ─────────────────── */}
        {(timeRange === 'week' || timeRange === 'month') && hasFiltered && (() => {
          let lastDate = null;
          return filteredExpenses.map((exp) => {
            const thisDate = formatDate(exp.createdAt);
            const showDateDivider = thisDate !== lastDate;
            lastDate = thisDate;
            const info = getCategoryInfo(exp.category);
            const catColor = getCatColor(exp.category);

            return (
              <React.Fragment key={exp.id}>
                {showDateDivider && (
                  <div className="exp-modal__date-divider">
                    <span className="exp-modal__date-text">{thisDate}</span>
                  </div>
                )}
                <div className="exp-modal__row group">
                  <div className="exp-modal__cat-circle" style={{ backgroundColor: catColor.bg, color: catColor.fg }}>
                    {info?.Icon ? <info.Icon size={12} /> : <WalletFill size={12} />}
                  </div>
                  <div className="exp-modal__row-info">
                    <span className="exp-modal__row-cat">{info?.label || 'Expense'}</span>
                    {exp.note && <span className="exp-modal__row-note">{exp.note}</span>}
                  </div>
                  <span className="exp-modal__row-amount">
                    {formatAmount(exp.amount, exp.currency)}
                  </span>
                  <ConfirmButton
                    onConfirm={() => onDelete(exp.id)}
                    label="Delete expense"
                    danger
                    className="exp-modal__row-delete"
                  >
                    <Trash3Fill size={11} />
                  </ConfirmButton>
                </div>
              </React.Fragment>
            );
          });
        })()}
      </div>
    </Modal>
  );
};
