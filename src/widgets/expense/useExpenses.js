import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  CupFill,
  CartFill,
  CarFrontFill,
  BagFill,
  Film,
  HeartPulseFill,
  LightningChargeFill,
  HouseFill,
  GiftFill,
  AirplaneFill,
  BriefcaseFill,
  LaptopFill,
  ShieldFill,
  GridFill,
} from 'react-bootstrap-icons';
import { startOf, startOfDay, endOfDay } from './dates';

const MAX_ENTRIES = 500;
const PREFIX = 'expense_data_';
const LEGACY_PREFIX = 'widgetSettings_';
const MIGRATED_MARKER = 'expense_migrated_';

// One-time migration: move expenses from old widgetSettings_ key to expense_data_
// Also strips expense entries from the old key so clear-all actually works.
function migrateIfNeeded(widgetId) {
  try {
    const newKey = PREFIX + widgetId;
    const oldKey = LEGACY_PREFIX + widgetId;
    const markerKey = MIGRATED_MARKER + widgetId;
    if (localStorage.getItem(markerKey)) return; // already migrated

    // If new key already has data (e.g. from CSV import before first load),
    // preserve it — just mark migration done and clean old key.
    const existingNew = localStorage.getItem(newKey);
    if (existingNew) {
      // Still strip old key so future clears don't resurrect old data
      _stripExpenseEntries(oldKey);
      localStorage.setItem(markerKey, '1');
      return;
    }

    const raw = localStorage.getItem(oldKey);
    if (!raw) {
      localStorage.setItem(markerKey, '1');
      return;
    }

    const p = JSON.parse(raw);
    if (Array.isArray(p)) {
      localStorage.setItem(newKey, JSON.stringify(p));
      localStorage.removeItem(oldKey);
      localStorage.setItem(markerKey, '1');
      return;
    }

    if (typeof p === 'object' && p !== null) {
      const expenseKeys = Object.keys(p).filter(k => /^\d+$/.test(k));
      const entries = expenseKeys.map(k => p[k]).filter(v => v && typeof v === 'object');

      if (entries.length > 0) {
        entries.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        localStorage.setItem(newKey, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
        _stripExpenseEntries(oldKey);
      }

      localStorage.setItem(markerKey, '1');
    }
  } catch { /* ignore */ }
}

// Remove numeric (expense) keys from the old mixed-format key, keep only settings
function _stripExpenseEntries(oldKey) {
  try {
    const raw = localStorage.getItem(oldKey);
    if (!raw) return;
    const p = JSON.parse(raw);
    if (Array.isArray(p)) { localStorage.removeItem(oldKey); return; }
    if (typeof p === 'object' && p !== null) {
      const clean = {};
      for (const k of Object.keys(p)) {
        if (!/^\d+$/.test(k)) clean[k] = p[k];
      }
      localStorage.setItem(oldKey, JSON.stringify(clean));
    }
  } catch { /* ignore */ }
}

const mkId = () => `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const DEFAULT_CATEGORIES = [
  // Essential living
  { id: 'bills', Icon: LightningChargeFill, label: 'Bills & Utilities', description: 'Electricity, water, internet, phone, subscriptions' },
  { id: 'rent', Icon: HouseFill, label: 'Rent', description: 'Monthly rent, housing loan, property tax' },
  { id: 'groceries', Icon: CartFill, label: 'Groceries', description: 'Supermarket, household supplies, pantry' },
  { id: 'health', Icon: HeartPulseFill, label: 'Health', description: 'Doctor, pharmacy, gym, wellness' },
  // Food & lifestyle
  { id: 'food', Icon: CupFill, label: 'Food & Drinks', description: 'Meals, coffee, snacks, dining out' },
  // Shopping
  { id: 'shopping', Icon: BagFill, label: 'Shopping', description: 'Clothes, accessories, retail purchases' },
  { id: 'tech', Icon: LaptopFill, label: 'Gadgets', description: 'Gadgets, accessories, repairs, software' },
  { id: 'gifts', Icon: GiftFill, label: 'Gifts', description: 'Presents, donations, celebrations' },
  // Getting around
  { id: 'transport', Icon: CarFrontFill, label: 'Transport', description: 'Bus, train, fuel, parking, rideshare' },
  { id: 'travel', Icon: AirplaneFill, label: 'Travel', description: 'Flights, hotels, tours, holidays' },
  // Work & protection
  { id: 'work', Icon: BriefcaseFill, label: 'Work/Study', description: 'Office supplies, printing, freelancing costs' },
  { id: 'insurance', Icon: ShieldFill, label: 'Insurance', description: 'Health, car, life, home insurance' },
  // Leisure
  { id: 'entertainment', Icon: Film, label: 'Entertainment', description: 'Movies, games, concerts, hobbies' },
  // Catch-all
  { id: 'other', Icon: GridFill, label: 'Other', description: 'Anything else that doesn\'t fit above' },
];

export function getCategoryInfo(catId) {
  return DEFAULT_CATEGORIES.find((c) => c.id === catId) ?? DEFAULT_CATEGORIES[13];
}

// ─── Category colors (keyed by category id, not index) ──────────────────────

export const CAT_COLORS = {
  bills: { bg: 'hsla(210, 60%, 50%, 0.13)', fg: 'hsla(210, 60%, 48%, 1)' },
  rent: { bg: 'hsla(25, 55%, 50%, 0.13)', fg: 'hsla(25, 55%, 48%, 1)' },
  groceries: { bg: 'hsla(150, 45%, 42%, 0.13)', fg: 'hsla(150, 45%, 40%, 1)' },
  health: { bg: 'hsla(350, 55%, 52%, 0.13)', fg: 'hsla(350, 55%, 50%, 1)' },
  food: { bg: 'hsla(40, 60%, 48%, 0.13)', fg: 'hsla(40, 60%, 46%, 1)' },
  shopping: { bg: 'hsla(300, 35%, 48%, 0.13)', fg: 'hsla(300, 35%, 46%, 1)' },
  tech: { bg: 'hsla(190, 55%, 45%, 0.13)', fg: 'hsla(190, 55%, 43%, 1)' },
  gifts: { bg: 'hsla(330, 50%, 55%, 0.13)', fg: 'hsla(330, 50%, 53%, 1)' },
  transport: { bg: 'hsla(10, 50%, 48%, 0.13)', fg: 'hsla(10, 50%, 46%, 1)' },
  travel: { bg: 'hsla(200, 65%, 50%, 0.13)', fg: 'hsla(200, 65%, 48%, 1)' },
  work: { bg: 'hsla(270, 40%, 48%, 0.13)', fg: 'hsla(270, 40%, 46%, 1)' },
  insurance: { bg: 'hsla(120, 38%, 42%, 0.13)', fg: 'hsla(120, 38%, 40%, 1)' },
  entertainment: { bg: 'hsla(50, 65%, 45%, 0.13)', fg: 'hsla(50, 65%, 43%, 1)' },
  other: { bg: 'hsla(0, 0%, 50%, 0.10)', fg: 'hsla(0, 0%, 42%, 1)' },
};

export function getCatColor(catId) {
  return CAT_COLORS[catId] ?? CAT_COLORS.other;
}

// ─── Shared settings defaults ───────────────────────────────────────────────

export const DEFAULT_EXPENSE_SETTINGS = {
  currency: 'USD',
  weekStartsOn: 'monday',
  timeRange: 'week',
  weekBudget: '',
  monthBudget: '',
  yearBudget: '',
};

export const RANGE_CONFIG = {
  week: { budgetKey: 'weekBudget', label: 'Weekly', periodLabel: 'This week spending' },
  month: { budgetKey: 'monthBudget', label: 'Monthly', periodLabel: 'This month spending' },
  year: { budgetKey: 'yearBudget', label: 'Yearly', periodLabel: 'This year spending' },
};

function load(widgetId) {
  try {
    // Only run migration once — check marker before calling the function
    const markerKey = MIGRATED_MARKER + widgetId;
    if (!localStorage.getItem(markerKey)) {
      migrateIfNeeded(widgetId);
    }
    const raw = localStorage.getItem(PREFIX + widgetId);
    if (!raw) return [];
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch { return []; }
}

function save(widgetId, list) {
  try {
    const t = list.slice(0, MAX_ENTRIES);
    localStorage.setItem(PREFIX + widgetId, JSON.stringify(t));
    return t;
  } catch { return list; }
}

// ─── Summary computation ─────────────────────────────────────────────────────

export function computeSummary(list, range, weekStartsOn) {
  const since = startOf(range, weekStartsOn);
  const filtered = list.filter((e) => e.createdAt >= since);
  const byCat = {};
  filtered.forEach((e) => {
    byCat[e.category] = (byCat[e.category] ?? 0) + e.amount;
  });
  const sorted = Object.entries(byCat)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, total]) => ({ category: cat, total }));
  return {
    total: sorted.reduce((s, c) => s + c.total, 0),
    byCategory: sorted,
    count: filtered.length,
  };
}

// ─── Day comparison ──────────────────────────────────────────────────────────

export function computeDayComparison(list) {
  const todayStart = startOfDay(0);
  const todayEnd = endOfDay(0);
  const yesterdayStart = startOfDay(1);
  const yesterdayEnd = endOfDay(1);

  const todayItems = list.filter((e) => e.createdAt >= todayStart && e.createdAt <= todayEnd);
  const yesterdayItems = list.filter((e) => e.createdAt >= yesterdayStart && e.createdAt <= yesterdayEnd);

  const todayTotal = todayItems.reduce((s, e) => s + e.amount, 0);
  const yesterdayTotal = yesterdayItems.reduce((s, e) => s + e.amount, 0);

  let pctChange = 0;
  if (yesterdayTotal > 0) {
    pctChange = ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;
  } else if (todayTotal > 0) {
    pctChange = 100;
  }

  return {
    today: { total: todayTotal, count: todayItems.length },
    yesterday: { total: yesterdayTotal, count: yesterdayItems.length },
    pctChange,
    maxForBar: Math.max(todayTotal, yesterdayTotal, 1),
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useExpenses(widgetId, currency = 'USD', weekStartsOn = 'monday', timeRange = 'week') {
  const initRef = useRef(undefined);
  if (initRef.current === undefined) initRef.current = load(widgetId);

  const [expenses, setExpenses] = useState(() => initRef.current);

  const summary = useMemo(
    () => computeSummary(expenses, timeRange, weekStartsOn),
    [expenses, timeRange, weekStartsOn],
  );

  const dayComparison = useMemo(
    () => computeDayComparison(expenses),
    [expenses],
  );

  const isEmpty = expenses.length === 0;

  const addExpense = useCallback(
    ({ amount, category, note = '' }) => {
      if (!amount || amount <= 0 || !category) return;
      const entry = {
        id: mkId(),
        amount: Number.parseFloat(amount.toFixed(2)),
        currency,
        category,
        note: (note || '').slice(0, 100),
        createdAt: Date.now(),
      };
      setExpenses((prev) => {
        const next = [entry, ...prev];
        return save(widgetId, next);
      });
    },
    [currency, widgetId],
  );

  const deleteExpense = useCallback(
    (expId) => {
      setExpenses((prev) => {
        const next = prev.filter((e) => e.id !== expId);
        return save(widgetId, next);
      });
    },
    [widgetId],
  );

  const clearAll = useCallback(() => {
    setExpenses([]);
    save(widgetId, []);
  }, [widgetId]);

  // Re-read from localStorage when import/clear fires the custom event
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.widgetId === widgetId) {
        setExpenses(load(widgetId));
      }
    };
    globalThis.addEventListener('expense_data_changed', handler); // NOSONAR
    return () => globalThis.removeEventListener('expense_data_changed', handler); // NOSONAR
  }, [widgetId]);

  return {
    expenses, addExpense, deleteExpense, clearAll,
    summary, dayComparison, isEmpty,
  };
}
