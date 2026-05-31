import React, { useState, useRef, useCallback, useLayoutEffect, useEffect, useMemo } from 'react';
import { WalletFill, PlusLg, ListUl, CashStack, CheckCircleFill } from 'react-bootstrap-icons';
import { BaseWidget } from '../BaseWidget';
import { useWidgetSettings } from '../useWidgetSettings';
import { useExpenses, DEFAULT_EXPENSE_SETTINGS, RANGE_CONFIG } from './useExpenses';
import { formatAmount, getCurrencySymbol } from '../../data/currencies';
import { ExpenseSettings } from './Settings';
import { RecentExpensesModal } from './RecentExpensesModal';
import { AddExpenseModal } from './AddExpenseModal';
import { Popup } from '../../components/ui/Popup';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Budget value from settings for the given time range (falls back to empty string). */
function budgetFromSettings(settings, timeRange) {
  const key = RANGE_CONFIG[timeRange]?.budgetKey ?? 'weekBudget';
  return settings[key] ?? '';
}

// ─── Dynamic font fitting ────────────────────────────────────────────────────

let _fitCanvas = null;
function fitText(text, maxWidth, maxSize, minSize) {
  if (!_fitCanvas) _fitCanvas = document.createElement('canvas');
  const ctx = _fitCanvas.getContext('2d');
  let size = maxSize;
  while (size > minSize) {
    ctx.font = `700 ${size}px "Google Sans"`;
    if (ctx.measureText(text).width <= maxWidth * 0.95) break;
    size -= 1;
  }
  return size;
}

// ─── Main Widget ─────────────────────────────────────────────────────────────

export const Widget = ({ id, onRemove }) => {
  const [settings] = useWidgetSettings(id, DEFAULT_EXPENSE_SETTINGS);

  const currency = settings.currency ?? 'USD';
  const weekStartsOn = settings.weekStartsOn ?? 'monday';
  const timeRange = settings.timeRange ?? 'week';

  const budgetValue = budgetFromSettings(settings, timeRange);
  const periodLabel = RANGE_CONFIG[timeRange]?.periodLabel ?? 'This week spending';
  const budget = budgetValue ? Number.parseFloat(budgetValue) : null;

  const {
    expenses, addExpense, deleteExpense,
    summary, isEmpty,
  } = useExpenses(id, currency, weekStartsOn, timeRange);

  const currencySymbol = getCurrencySymbol(currency);

  // ── State ────────────────────────────────────────────────────────────────
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [recentModalOpen, setRecentModalOpen] = useState(false);
  const [tooltip, setTooltip] = useState({ anchor: null, label: '' });

  // Budget math
  const pct = budget && budget > 0 ? Math.round((summary.total / budget) * 100) : 0;
  const overBudget = pct > 100;
  const barWidth = Math.min(pct, 100);
  const leftAmount = budget !== null ? budget - summary.total : null;

  const settingsContent = useMemo(
    () => (onClose) => <ExpenseSettings id={id} onClose={onClose} />,
    [id],
  );

  const handleAdd = useCallback((exp) => {
    addExpense(exp);
  }, [addExpense]);

  // ── Dynamic amount font sizing ──────────────────────────────────────────
  const heroRef = useRef(null);
  const budgetRowRef = useRef(null);
  const [amountFontSize, setAmountFontSize] = useState(null);
  const [budgetFontSize, setBudgetFontSize] = useState(null);
  const [leftFontSize, setLeftFontSize] = useState(null);
  const [budgetFlex, setBudgetFlex] = useState('1 1 0%');
  const [leftFlex, setLeftFlex] = useState('1 1 0%');

  const amountText = isEmpty ? formatAmount(0, currency) : formatAmount(summary.total, currency);
  const budgetText = budget !== null ? formatAmount(budget, currency) : '';
  const leftText = leftAmount !== null ? formatAmount(leftAmount, currency) : '';

  useLayoutEffect(() => {
    const el = heroRef.current;
    if (!el || !amountText) return;
    setAmountFontSize(fitText(amountText, el.getBoundingClientRect().width, 36, 14));
  }, [amountText]);

  useEffect(() => {
    const row = budgetRowRef.current;
    if (!row || !budgetText || !leftText) return;
    const rowW = row.getBoundingClientRect().width;
    // Account for padding (20px) + divider (1px) + divider margins (20px) = 41px
    const availW = rowW - 41;
    // Proportional split based on text length at reference size
    const budgetLen = budgetText.length;
    const leftLen = leftText.length;
    const totalLen = budgetLen + leftLen || 1;
    const budgetW = (budgetLen / totalLen) * availW;
    const leftW = (leftLen / totalLen) * availW;
    setBudgetFontSize(fitText(budgetText, Math.max(budgetW, 30), 13, 8));
    setLeftFontSize(fitText(leftText, Math.max(leftW, 30), 13, 8));
    // Set flex-basis so sides allocate space proportionally
    const budgetPct = Math.round((budgetLen / totalLen) * 100);
    const leftPct = 100 - budgetPct;
    setBudgetFlex(`0 1 ${budgetPct}%`);
    setLeftFlex(`0 1 ${leftPct}%`);
  }, [budgetText, leftText]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <BaseWidget
        className="p-0 flex flex-col !overflow-visible"
        onRemove={onRemove}
        settingsContent={settingsContent}
        settingsTitle="Expense Settings"
      >
        <div className="exp-card">
          {/* ── Recents icon (top-right) ────────────────────────────── */}
          {/* ── Header: icon + title | recents + add ────────────────── */}
          <div className="exp-card__header">
            <div className="exp-card__header-left">
              <WalletFill className="exp-card__header-icon" />
              <span className="exp-card__header-title">Expenses</span>
            </div>
            <div className="exp-card__header-actions">
              <button
                type="button"
                onClick={() => setRecentModalOpen(true)}
                onMouseEnter={(e) => setTooltip({ anchor: e.currentTarget.getBoundingClientRect(), label: 'Recent expenses' })}
                onMouseLeave={() => setTooltip({ anchor: null, label: '' })}
                className="exp-card__action-btn"
                aria-label="Recent expenses"
              >
                <ListUl size={14} />
              </button>
              <button
                type="button"
                onClick={() => setAddModalOpen(true)}
                onMouseEnter={(e) => setTooltip({ anchor: e.currentTarget.getBoundingClientRect(), label: 'Add expense' })}
                onMouseLeave={() => setTooltip({ anchor: null, label: '' })}
                className="exp-card__action-btn exp-card__action-btn--add"
                aria-label="Add expense"
              >
                <PlusLg size={14} />
              </button>
              <Popup anchor={tooltip.anchor} preferAbove className="p-2 gap-1 max-w-40">
                <span style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'var(--w-ink-2)', whiteSpace: 'nowrap' }}>
                  {tooltip.label}
                </span>
              </Popup>
            </div>
          </div>
          {/* ── Hero (amount + period grouped) ─────────────────────── */}
          <div ref={heroRef} className="exp-card__hero">
            <span
              className="exp-card__amount"
              style={amountFontSize ? { fontSize: amountFontSize } : undefined}
            >
              {amountText}
            </span>
            <span className="exp-card__period">{periodLabel}</span>
          </div>

          {/* ── Empty / No-budget prompt ─────────────────────────────── */}
          {budget === null && (
            <div className="exp-card__no-budget">
              <span className="exp-card__no-budget-text">
                {isEmpty
                  ? 'Add your first expense to get started'
                  : 'Set a budget to track your spending'}
              </span>
            </div>
          )}

          {/* ── Progress bar ─────────────────────────────────────────── */}
          {budget !== null && (
            <div className="exp-card__progress">
              <div className="exp-card__progress-track">
                <div
                  className="exp-card__progress-fill"
                  style={{
                    width: `${barWidth}%`,
                    background: overBudget ? 'var(--w-danger)' : 'var(--w-ink-1)',
                  }}
                />
              </div>
              <span
                className="exp-card__progress-pct"
                style={{ color: overBudget ? 'var(--w-danger)' : undefined }}
              >
                {pct}%
              </span>
            </div>
          )}

          {/* ── Budget row ─────────────────────────────────────────── */}
          {budget !== null && (
            <div ref={budgetRowRef} className="exp-card__budget-row">
              <div className="exp-card__budget-side" style={{ flex: budgetFlex }}>
                <span className="exp-card__budget-side-label">
                  <CashStack className="exp-card__budget-icon" />
                  Budget
                </span>
                <span
                  className="exp-card__budget-side-amount"
                  style={budgetFontSize ? { fontSize: budgetFontSize } : undefined}
                >
                  {budgetText}
                </span>
              </div>
              <span className="exp-card__budget-divider" />
              <div className="exp-card__budget-side" style={{ flex: leftFlex }}>
                <span className="exp-card__budget-side-label">
                  <CheckCircleFill className="exp-card__budget-icon" />
                  Left
                </span>
                <span
                  className="exp-card__budget-side-amount"
                  style={{
                    ...(leftFontSize ? { fontSize: leftFontSize } : undefined),
                    ...(overBudget ? { color: 'var(--w-danger)' } : undefined),
                  }}
                >
                  {leftText}
                </span>
              </div>
            </div>
          )}


        </div>
      </BaseWidget>

      {/* ── Add Expense Modal ──────────────────────────────────────────── */}
      {addModalOpen && (
        <AddExpenseModal
          currency={currency}
          currencySymbol={currencySymbol}
          onClose={() => setAddModalOpen(false)}
          onAdd={handleAdd}
        />
      )}

      {/* ── Recent Expenses Modal ──────────────────────────────────────── */}
      {recentModalOpen && (
        <RecentExpensesModal
          expenses={expenses}
          currency={currency}
          budget={budget}
          timeRange={timeRange}
          onClose={() => setRecentModalOpen(false)}
          onDelete={deleteExpense}
        />
      )}
    </>
  );
};
