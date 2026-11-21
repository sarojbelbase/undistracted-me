import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { WalletFill, PencilFill, Trash3Fill, ThreeDots, PlusLg } from 'react-bootstrap-icons';
import { ExpandedShell } from '../../components/ui/expanded/ExpandedShell';
import { SearchToolbar } from '../../components/ui/expanded/SearchToolbar';
import { RailItem } from '../../components/ui/expanded/RailItem';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { IconButton } from '../../components/ui/IconButton';
import { ActionMenu } from '../../components/ui/ActionMenu';
import { formatAmount } from '../../data/currencies';
import { DEFAULT_CATEGORIES, getCategoryInfo } from './useExpenses';
import { formatDate, getPeriodBounds, getPeriodLabel, dailyTotals, monthlyTotals } from './dates';
import { EMPTY_STATES } from '../../constants/emptyStates';
import { Sparkline } from '../../components/ui/Sparkline';

const PAGE_SIZE = 50;

/**
 * ExpenseExpandedView: the full expense library, rendered in the shared
 * ExpandedShell. Left rail: "All" + the expense categories (counts per
 * category). Main pane: search + add, a spending graph for the current period
 * (filtered by the selected category), and the full expense list in the
 * same row format as the Recent Expenses view (category tile · note · amount ·
 * edit / delete), grouped by date.
 */
export function ExpenseExpandedView({
  expenses,
  currency,
  timeRange,
  onClose,
  onAdd,
  onEdit,
  onDelete,
}) {
  const [filter, setFilter] = useState(null); // category id | null ("All")
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const searchRef = useRef(null);

  // Debounce search (120 ms).
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 120);
    return () => clearTimeout(t);
  }, [query]);

  const total = expenses.length;

  // Count of expenses per category (for the rail).
  const countByCat = useMemo(() => {
    const m = new Map();
    for (const e of expenses) m.set(e.category, (m.get(e.category) || 0) + 1);
    return m;
  }, [expenses]);

  // Category + search filter, newest-first (expenses are already newest-first).
  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return expenses.filter((e) => {
      if (filter && e.category !== filter) return false;
      if (q) {
        const info = getCategoryInfo(e.category);
        const hay = `${info.label} ${e.note || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [expenses, filter, debouncedQuery]);

  const searching = debouncedQuery.trim().length > 0;
  const paged = filtered.slice(0, visible);
  const hasMore = filtered.length > visible;

  const title = searching
    ? 'Search results'
    : filter
      ? getCategoryInfo(filter).label
      : 'All expenses';
  const countText = searching ? `${filtered.length} results` : `${filtered.length}`;

  // The graph reflects the category filter (not search): "all" by default,
  // narrowed to the selected category.
  const graphExpenses = useMemo(
    () => (filter ? expenses.filter((e) => e.category === filter) : expenses),
    [expenses, filter],
  );

  const pickFilter = (id) => {
    setFilter(id);
    setVisible(PAGE_SIZE);
  };
  const clearSearch = () => {
    setQuery('');
    setDebouncedQuery('');
  };

  const renderEmpty = () => {
    if (total === 0) {
      return (
        <EmptyState
          icon={<WalletFill size={22} />}
          title={EMPTY_STATES.expense.empty.title}
          text={EMPTY_STATES.expense.empty.text}
          action={
            <Button variant="primary" size="sm" onClick={onAdd}>
              Add expense
            </Button>
          }
        />
      );
    }
    if (searching) {
      return (
        <EmptyState
          title={`No results for “${debouncedQuery}”.`}
          text=""
          action={
            <Button variant="ghost" size="sm" onClick={clearSearch}>
              Clear search
            </Button>
          }
        />
      );
    }
    return (
      <EmptyState
        icon={<WalletFill size={22} />}
        title={`No ${getCategoryInfo(filter).label} expenses.`}
        text="Try another category or add a new expense."
      />
    );
  };

  const rail = (
    <nav className="pocket-rail pocket-rail--expense" aria-label="Expense categories">
      <RailItem active={!filter} onClick={() => pickFilter(null)} label="All" count={total} />
      {DEFAULT_CATEGORIES.map((c) => (
        <RailItem
          key={c.id}
          active={filter === c.id}
          onClick={() => pickFilter(c.id)}
          icon={<c.Icon size={13} />}
          label={c.label}
          count={countByCat.get(c.id) || 0}
        />
      ))}
    </nav>
  );

  const toolbar = (
    <SearchToolbar
      query={query}
      onQueryChange={setQuery}
      onClear={clearSearch}
      onAdd={onAdd}
      title={title}
      count={countText}
      placeholder="Search expenses"
      searchRef={searchRef}
      addLabel="Add"
      addIcon={<PlusLg size={13} />}
    />
  );

  const subheader = total > 0 ? (
    <ExpenseGraphCard expenses={graphExpenses} currency={currency} timeRange={timeRange} />
  ) : null;

  return (
    <ExpandedShell
      ariaLabel="Expenses"
      icon={<WalletFill size={16} />}
      title="Expenses"
      count={total}
      onClose={onClose}
      searchRef={searchRef}
      libraryLabel="Categories"
      rail={rail}
      toolbar={toolbar}
      subheader={subheader}
    >
      {paged.length === 0 ? (
        renderEmpty()
      ) : (
        <>
          <ExpenseList expenses={paged} onEdit={onEdit} onDelete={onDelete} />
          {hasMore && (
            <div className="pocket-load-more">
              <Button variant="ghost" size="sm" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </ExpandedShell>
  );
}

/**
 * ExpenseGraphCard: the pinned spending graph for the current period
 * (week/month/year), drawn from the category-filtered expense set.
 */
function ExpenseGraphCard({ expenses, currency, timeRange }) {
  const period = useMemo(() => getPeriodBounds(timeRange, 0), [timeRange]);
  const periodLabel = getPeriodLabel(timeRange, 0);

  const filtered = useMemo(
    () => expenses.filter((e) => e.createdAt >= period.start.getTime() && e.createdAt <= period.end.getTime()),
    [expenses, period],
  );

  const data = useMemo(
    () => (timeRange === 'year'
      ? monthlyTotals(filtered, period.start, period.end)
      : dailyTotals(filtered, period.start, period.end)),
    [filtered, timeRange, period],
  );

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="exp-expanded__graph">
      <div className="rounded-xl px-4 pt-3.5 pb-3 exp-modal__chart-card">
        <div className="flex items-center justify-between mb-1.5">
          <span className="exp-modal__chart-label">{periodLabel}</span>
        </div>
        <div className="flex items-center justify-center">
          <Sparkline data={data} />
        </div>
        <p className="text-center text-[10px] font-semibold mt-1 exp-modal__period-total">
          {formatAmount(total, currency)} this {timeRange}
        </p>
      </div>
    </div>
  );
}

/**
 * ExpenseActions: pocket-style primary "Edit" + "More actions" menu (Remove),
 * revealed on hover / keyboard focus via `.row-actions`, kept visible while the
 * menu is open via `.row-actions--active`.
 */
function ExpenseActions({ onEdit, onDelete }) {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const moreRef = useRef(null);

  const openMenu = (e) => {
    e.stopPropagation();
    moreRef.current = e.currentTarget;
    const r = e.currentTarget.getBoundingClientRect();
    setMenuAnchor({ left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height });
  };

  const menuItems = [
    { label: 'Remove', icon: <Trash3Fill size={13} />, danger: true, onSelect: onDelete },
  ];

  return (
    <div
      className={`row-actions flex items-center gap-0.5 shrink-0 ${menuAnchor ? 'row-actions--active' : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      <IconButton
        label="Edit expense"
        size="sm"
        onClick={(e) => { e.stopPropagation(); onEdit(); }}
      >
        <PencilFill size={13} />
      </IconButton>
      <IconButton
        label="More actions"
        size="sm"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={openMenu}
      >
        <ThreeDots size={14} />
      </IconButton>
      {menuAnchor && (
        <ActionMenu anchor={menuAnchor} triggerRef={moreRef} items={menuItems} onClose={() => setMenuAnchor(null)} />
      )}
    </div>
  );
}

/**
 * ExpenseList: the expense rows in the Recent Expenses format, grouped by a
 * quiet date divider (Today / Yesterday / weekday, date).
 */
function ExpenseList({ expenses, onEdit, onDelete }) {
  let lastDate = null;
  return (
    <div className="pocket-expanded__list">
      {expenses.map((exp) => {
        const thisDate = formatDate(exp.createdAt);
        const showDateDivider = thisDate !== lastDate;
        lastDate = thisDate;
        const info = getCategoryInfo(exp.category);

        return (
          <Fragment key={exp.id}>
            {showDateDivider && (
              <div className="exp-modal__date-divider">
                <span className="exp-modal__date-text">{thisDate}</span>
              </div>
            )}
            <div className="um-list-row group flex items-center gap-2.5 px-3 py-2.5">
              <div className="exp-modal__cat-circle">
                {info?.Icon ? <info.Icon size={12} /> : <WalletFill size={12} />}
              </div>
              <div className="exp-modal__row-info">
                <span className="exp-modal__row-cat">{info?.label || 'Expense'}</span>
                {exp.note && <span className="exp-modal__row-note">{exp.note}</span>}
              </div>
              <span className="exp-modal__row-amount">
                {formatAmount(exp.amount, exp.currency)}
              </span>
              <ExpenseActions onEdit={() => onEdit(exp)} onDelete={() => onDelete(exp.id)} />
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
