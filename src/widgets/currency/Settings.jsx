/**
 * Currency widget — Settings panel.
 *
 * Sections:
 *  1. Currencies — checkbox list of ALL_CURRENCIES; enforces minimum 1 selected.
 *  2. Precious Metals — toggle for Gold, toggle for Silver.
 *
 * Props:
 *  currencies  – string[]  currently selected ISO codes
 *  showGold    – boolean
 *  showSilver  – boolean
 *  onChange    – (key, value) => void  (useWidgetSettings updater)
 *  onClose     – () => void  (unused here but injected by BaseWidget)
 */

import React from 'react';
import { ALL_CURRENCIES, CURRENCY_LABELS } from './utils';

// Reusable tick icon (white check on filled background)
const Tick = () => (
  <svg
    width="9"
    height="9"
    viewBox="0 0 12 12"
    fill="none"
    stroke="white"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="2,6 5,9 10,3" />
  </svg>
);

// Reusable checkbox pill
const CheckRow = ({ checked, disabled, label, sublabel, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="flex items-center gap-2.5 w-full px-2 py-2 rounded-xl text-left transition-opacity hover:opacity-80 disabled:opacity-30"
    style={
      checked
        ? { background: 'color-mix(in srgb, var(--w-accent) 10%, transparent)' }
        : undefined
    }
  >
    {/* Checkbox square */}
    <span
      className="w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors"
      style={{
        border: `1.5px solid ${checked ? 'var(--w-accent)' : 'var(--w-ink-5)'}`,
        background: checked ? 'var(--w-accent)' : 'transparent',
      }}
    >
      {checked && <Tick />}
    </span>

    {/* Label */}
    <span
      className="text-sm font-semibold shrink-0"
      style={{ color: checked ? 'var(--w-accent)' : 'var(--w-ink-1)' }}
    >
      {label}
    </span>

    {/* Sub-label */}
    {sublabel && (
      <span
        className="text-xs truncate"
        style={{ color: checked ? 'var(--w-accent)' : 'var(--w-ink-5)', opacity: 0.8 }}
      >
        {sublabel}
      </span>
    )}
  </button>
);

export const Settings = ({ currencies = [], showGold = true, showSilver = true, onChange }) => {
  // ── Currency toggles ──────────────────────────────────────────────────────
  const toggleCurrency = (iso) => {
    if (currencies.includes(iso)) {
      // Enforce minimum 1 selected
      if (currencies.length <= 1) return;
      onChange('currencies', currencies.filter((c) => c !== iso));
    } else {
      onChange('currencies', [...currencies, iso]);
    }
  };

  return (
    <>
      {/* ── Currencies section ── */}
      <div className="pb-1.5">
        <span className="w-label">Currencies</span>
      </div>

      <div className="flex flex-col -mx-1 pb-4">
        {ALL_CURRENCIES.map((iso) => {
          const isSelected = currencies.includes(iso);
          const isDisabled = isSelected && currencies.length <= 1;
          return (
            <CheckRow
              key={iso}
              checked={isSelected}
              disabled={isDisabled}
              label={iso}
              sublabel={CURRENCY_LABELS[iso]}
              onClick={() => toggleCurrency(iso)}
            />
          );
        })}
      </div>

      {/* ── Precious Metals section ── */}
      <div
        className="pb-1.5 pt-3"
        style={{ borderTop: '1px solid var(--w-border)' }}
      >
        <span className="w-label">Precious Metals</span>
      </div>

      <div className="flex flex-col -mx-1">
        <CheckRow
          checked={showGold}
          disabled={false}
          label="Gold"
          sublabel="NPR / tola"
          onClick={() => onChange('showGold', !showGold)}
        />
        <CheckRow
          checked={showSilver}
          disabled={false}
          label="Silver"
          sublabel="NPR / tola"
          onClick={() => onChange('showSilver', !showSilver)}
        />
      </div>
    </>
  );
};
