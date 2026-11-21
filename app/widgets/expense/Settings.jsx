import { useCallback, useState } from 'react';
import { useWidgetSettings } from '../useWidgetSettings';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { DataTransfer } from '../../components/ui/DataTransfer';
import { SettingsField } from '../../components/ui/SettingsSection';
import { CURRENCIES } from '../../data/currencies';
import { DEFAULT_EXPENSE_SETTINGS, RANGE_CONFIG } from './useExpenses';

const EXPENSE_PREFIX = 'expense_data_';
const EXPENSES_CHANGED = 'expense_data_changed';

const RANGE_OPTIONS = [
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
];

/** Parse a single CSV line into columns, honoring double-quoted fields. */
function parseCSVLine(line) {
  const cols = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } // escaped quote
        else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      cols.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  cols.push(cur);
  return cols;
}

export const ExpenseSettings = ({ id, onClose }) => {
  const [settings, updateSetting] = useWidgetSettings(id, DEFAULT_EXPENSE_SETTINGS);

  const [importError, setImportError] = useState(null);

  const currency = settings.currency ?? 'USD';
  const timeRange = settings.timeRange ?? 'week';

  const budgetKey = RANGE_CONFIG[timeRange]?.budgetKey ?? 'weekBudget';
  const budgetValue = settings[budgetKey] ?? '';

  const setCurrency = useCallback((c) => updateSetting('currency', c), [updateSetting]);
  const setTimeRange = useCallback((v) => updateSetting('timeRange', v), [updateSetting]);
  const setBudget = useCallback((v) => {
    updateSetting(budgetKey, v);
  }, [updateSetting, budgetKey]);

  const handleExportCSV = () => {
    try {
      const raw = localStorage.getItem(EXPENSE_PREFIX + id);
      const items = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(items) || !items.length) return;
      const rows = items.map((e) => {
        const d = new Date(e.createdAt).toISOString().slice(0, 10);
        const n = (e.note ?? '').replaceAll('"', '""');
        return `${d},${e.amount},${e.currency},${e.category},"${n}"`;
      });
      const csv = ['Date,Amount,Currency,Category,Note', ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `expenses_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  const handleImportCSV = (file) => {
    if (!file) return;
    file.text().then((text) => {
      try {
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) {
          setImportError('CSV file is empty or missing headers.');
          return;
        }
        const header = lines[0].toLowerCase();
        if (!header.includes('date') || !header.includes('amount')) {
          setImportError('CSV must have Date and Amount columns.');
          return;
        }
        const newEntries = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = parseCSVLine(lines[i]);
          if (cols.length < 4) continue;
          const dateStr = cols[0]?.trim();
          const amount = Number.parseFloat(cols[1]?.trim());
          const currencyCode = cols[2]?.trim() || currency;
          const category = cols[3]?.trim() || 'other';
          const note = (cols[4] || '').trim();
          if (!dateStr || Number.isNaN(amount) || amount <= 0) continue;
          const createdAt = new Date(dateStr).getTime();
          if (Number.isNaN(createdAt)) continue;
          newEntries.push({
            id: `exp_${createdAt}_${Math.random().toString(36).slice(2, 8)}`,
            amount, currency: currencyCode, category, note, createdAt,
          });
        }
        if (newEntries.length > 0) {
          localStorage.setItem(EXPENSE_PREFIX + id, JSON.stringify(newEntries.slice(0, 500)));
          setImportError(null);
          // Dispatch event instead of reloading: useExpenses will pick it up
          try { globalThis.dispatchEvent(new CustomEvent(EXPENSES_CHANGED, { detail: { widgetId: id } })); } catch { /* ignore */ }
        } else {
          setImportError('No valid expense rows found in CSV.');
        }
      } catch {
        setImportError('Failed to parse CSV file.');
      }
    }).catch(() => {
      setImportError('Failed to read CSV file.');
    });
  };

  // Dummy month-wise CSV for testing
  const handleSampleCSV = () => {
    const now = new Date();
    const cur = currency;
    const rows = ['Date,Amount,Currency,Category,Note'];
    const cats = ['food', 'groceries', 'transport', 'bills', 'entertainment', 'shopping', 'health', 'other'];
    for (let m = 5; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day += Math.max(1, Math.floor(Math.random() * 5) + 1)) {
        const dd = new Date(d.getFullYear(), d.getMonth(), day);
        const dateStr = dd.toISOString().slice(0, 10);
        const cat = cats[Math.floor(Math.random() * cats.length)];
        const amt = (Math.random() * 2000 + 50).toFixed(2);
        const notes = ['', 'Lunch', 'Groceries run', 'Bus fare', 'Netflix', 'Coffee', 'Snacks', ''];
        const note = notes[Math.floor(Math.random() * notes.length)];
        rows.push(`${dateStr},${amt},${cur},${cat},"${note}"`);
      }
    }
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `sample_expenses_${cur}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleClearAll = () => {
    try {
      localStorage.removeItem(EXPENSE_PREFIX + id);
      localStorage.removeItem('expense_migrated_' + id);
      try { globalThis.dispatchEvent(new CustomEvent(EXPENSES_CHANGED, { detail: { widgetId: id } })); } catch { /* ignore */ }
    }
    catch { /* ignore */ }
  };

  return (
    <div className="flex flex-col gap-4 p-1">

      {/* ── Currency ──────────────────────────────────────────────────── */}
      <SettingsField label="Currency">
        <Select
          value={currency}
          onChange={setCurrency}
          ariaLabel="Currency"
          options={CURRENCIES.map((c) => ({
            value: c.code,
            label: `${c.name} (${c.symbol} ${c.code})`,
          }))}
        />
      </SettingsField>

      {/* ── Time Range ────────────────────────────────────────────────── */}
      <SegmentedControl
        label="Tracking Period"
        options={RANGE_OPTIONS}
        value={timeRange}
        onChange={setTimeRange}
      />

      {/* ── Budget ────────────────────────────────────────────────────── */}
      <SettingsField label={`Budget (${RANGE_CONFIG[timeRange]?.label ?? 'Weekly'})`}>
        <Input pill
          type="number"
          min="0"
          step="0.01"
          placeholder="No limit"
          value={budgetValue}
          onChange={(e) => setBudget(e.target.value)}
          wrapperStyle={{ height: 36 }}
        />
      </SettingsField>

      {/* ── Data ────────────────────────────────────────────────────── */}
      <DataTransfer
        title="Data"
        infoTooltip="Importing a CSV will replace all existing expenses. Export first to keep a backup."
        importLabel="Import CSV"
        exportLabel="Export CSV"
        accept=".csv"
        onImport={handleImportCSV}
        onExport={handleExportCSV}
        importError={importError}
        note="Import from other budget trackers, digital wallets or banking apps. Download a sample CSV from below to see the expected format."
        sampleLabel="Sample CSV"
        onSample={handleSampleCSV}
        clearLabel="Clear all expenses"
        onClear={handleClearAll}
      />
    </div>
  );
};
