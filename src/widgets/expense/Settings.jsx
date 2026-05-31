import React, { useCallback, useRef, useState } from 'react';
import { Download, Upload, InfoCircle, Trash3Fill, FileEarmarkText } from 'react-bootstrap-icons';
import { useWidgetSettings } from '../useWidgetSettings';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { ConfirmButton } from '../../components/ui/ConfirmButton';
import { SettingsInput } from '../../components/ui/SettingsInput';
import { CURRENCIES } from '../../data/currencies';

const EXPENSE_PREFIX = 'expense_data_';

const RANGE_OPTIONS = [
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
];

function budgetKeyForRange(range) {
  if (range === 'month') return 'monthBudget';
  if (range === 'year') return 'yearBudget';
  return 'weekBudget';
}

function budgetLabelForRange(range) {
  if (range === 'month') return 'Monthly';
  if (range === 'year') return 'Yearly';
  return 'Weekly';
}

export const ExpenseSettings = ({ id, onClose }) => {
  const [settings, updateSetting] = useWidgetSettings(id, {
    currency: 'USD',
    weekStartsOn: 'monday',
    timeRange: 'week',
    weekBudget: '',
    monthBudget: '',
    yearBudget: '',
  });

  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const currency = settings.currency ?? 'USD';
  const timeRange = settings.timeRange ?? 'week';

  const budgetValue = settings[budgetKeyForRange(timeRange)] ?? '';

  const setCurrency = useCallback((c) => updateSetting('currency', c), [updateSetting]);
  const setTimeRange = useCallback((v) => updateSetting('timeRange', v), [updateSetting]);
  const setBudget = useCallback((v) => {
    updateSetting(budgetKeyForRange(timeRange), v);
  }, [updateSetting, timeRange]);

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

  const importRef = useRef(null);

  const handleImportCSV = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result;
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) return; // need header + data
        const header = lines[0].toLowerCase();
        if (!header.includes('date') || !header.includes('amount')) return;
        const newEntries = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',');
          if (cols.length < 4) continue;
          const dateStr = cols[0]?.trim();
          const amount = parseFloat(cols[1]?.trim());
          const currencyCode = cols[2]?.trim() || currency;
          const category = cols[3]?.trim() || 'other';
          const note = (cols[4] || '').trim().replace(/^"|"$/g, '');
          if (!dateStr || isNaN(amount) || amount <= 0) continue;
          const createdAt = new Date(dateStr).getTime();
          if (isNaN(createdAt)) continue;
          newEntries.push({
            id: `exp_${createdAt}_${Math.random().toString(36).slice(2, 8)}`,
            amount, currency: currencyCode, category, note, createdAt,
          });
        }
        if (newEntries.length > 0) {
          localStorage.setItem(EXPENSE_PREFIX + id, JSON.stringify(newEntries.slice(0, 500)));
          window.location.reload();
        }
      } catch { /* ignore */ }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset so same file can be re-imported
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
      window.location.reload();
    }
    catch { /* ignore */ }
  };

  return (
    <div className="flex flex-col gap-4 p-1">

      {/* ── Currency ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <span className="w-label">Currency</span>
        <select
          id="exp-currency"
          className="exp-settings__select"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} ({c.symbol} {c.code})
            </option>
          ))}
        </select>
      </div>

      {/* ── Time Range ────────────────────────────────────────────────── */}
      <SegmentedControl
        label="Tracking Period"
        options={RANGE_OPTIONS}
        value={timeRange}
        onChange={setTimeRange}
      />

      {/* ── Budget ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <span className="w-label">
          Budget ({budgetLabelForRange(timeRange)})
        </span>
        <SettingsInput
          type="number"
          min="0"
          step="0.01"
          placeholder="No limit"
          value={budgetValue}
          onChange={(e) => setBudget(e.target.value)}
          wrapperStyle={{ height: 36 }}
        />
      </div>

      {/* ── Data ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="w-label">Data</span>
          <span
            className="relative exp-disclaimer-tip"
            style={{ display: 'inline-flex' }}
            onMouseEnter={() => setShowDisclaimer(true)}
            onMouseLeave={() => setShowDisclaimer(false)}
          >
            <span className="cursor-pointer rounded-full flex items-center justify-center transition-colors exp-disclaimer__trigger">
              <InfoCircle size={13} />
            </span>
            {showDisclaimer && (
              <div className="absolute right-0 top-full mt-1.5 w-52 rounded-lg px-3 py-2 text-[10px] font-medium leading-relaxed shadow-lg z-20 exp-disclaimer-tip exp-disclaimer__tooltip">
                Importing a CSV will replace all existing expenses. Export first to keep a backup.
              </div>
            )}
          </span>
        </div>

        {/* Import / Export row */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => importRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg font-semibold text-[12px] cursor-pointer transition-opacity exp-data__import-btn"
          >
            <Upload size={12} />
            Import CSV
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg font-semibold text-[12px] cursor-pointer transition-all exp-data__export-btn"
          >
            <Download size={12} />
            Export CSV
          </button>
        </div>

        {/* Guidance callout */}
        <div className="rounded-lg px-3 py-2.5 flex items-start gap-2 exp-data__callout">
          <InfoCircle size={13} className="exp-data__callout-icon" />
          <p className="text-[10px] font-medium leading-relaxed exp-data__callout-text">
            Import from other budget trackers, digital wallets or banking apps. Download a sample CSV from below to see the expected format.
          </p>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-center rounded-lg px-4 py-2 gap-4 exp-data__footer">
          <button
            type="button"
            onClick={handleSampleCSV}
            className="flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer transition-opacity exp-data__sample-btn"
          >
            <FileEarmarkText size={11} />
            Sample CSV
          </button>
          <span className="text-[11px] font-medium exp-data__pipe">|</span>
          <ConfirmButton onConfirm={handleClearAll} label="Clear all expenses" danger className="text-[11px] font-semibold">
            <Trash3Fill size={10} />
            Clear All
          </ConfirmButton>
        </div>

        <input
          ref={importRef}
          type="file"
          accept=".csv"
          onChange={handleImportCSV}
          className="exp-data__file-input"
        />
      </div>
    </div>
  );
};
