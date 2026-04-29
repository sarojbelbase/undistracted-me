/**
 * Currency & Gold/Silver Rates Widget
 *
 * Layout:
 *  ┌──────────────────────────────────────┐
 *  │  [$]  Rates              ↻  5m ago  │  ← header
 *  │       in NPR                        │
 *  ├──────────────────────────────────────┤
 *  │  USD                        134.52  │  ← currency row
 *  │  EUR                        145.23  │
 *  │  INR                          1.61  │
 *  │ ──────────────────────────────────  │  ← divider (when metals visible)
 *  │  ● Gold                   1,50,200  │  ← metal row
 *  │    (/tola)                          │
 *  │  ● Silver                   1,850   │
 *  └──────────────────────────────────────┘
 *
 * Data source: NRB forex rates + metals.live spot prices, via Vercel proxy.
 * Refresh interval: 30 min (matches server CDN TTL).
 * NRB rates are published once daily; metals update ~hourly.
 */

import React from "react";
import { CurrencyExchange } from "react-bootstrap-icons";
import { BaseWidget } from "../BaseWidget";
import { useWidgetSettings } from "../useWidgetSettings";
import { useCurrency } from "./useCurrency";
import { Settings } from "./Settings";
import { fmtRate, fmtGold, DEFAULT_CURRENCIES } from "./utils";
import { useAgeLabel } from "../../hooks/useAgeLabel";
import config from "./config";

// ── Default per-instance settings ─────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  currencies: DEFAULT_CURRENCIES, // ['USD', 'EUR', 'INR']
  showGold: true,
  showSilver: true,
};

// ── Skeleton bone ──────────────────────────────────────────────────────────────
const Bone = ({ w, h = "0.75rem" }) => (
  <div
    className="animate-pulse rounded"
    style={{
      width: w,
      height: h,
      backgroundColor: "var(--panel-bg)",
      flexShrink: 0,
    }}
  />
);

const SkeletonRows = ({ count }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="flex items-center justify-between px-3 py-2"
        style={{
          borderBottom: i < count - 1 ? "1px solid var(--card-border)" : "none",
        }}
      >
        <Bone w="2rem" />
        <Bone w="4.5rem" />
      </div>
    ))}
  </>
);

// ── Currency row — mirrors StockRow pattern exactly ────────────────────────────
const CurrencyRow = ({ iso, rate, isLast }) => (
  <div
    className="flex items-center justify-between px-3 py-2 gap-2"
    style={{ borderBottom: isLast ? "none" : "1px solid var(--card-border)" }}
  >
    {/* ISO code — same pattern as stock symbol */}
    <span
      className="text-[10px] font-bold uppercase shrink-0"
      style={{
        color: "var(--w-accent)",
        letterSpacing: "0.08em",
        width: "2rem",
      }}
    >
      {iso}
    </span>

    {/* Rate — right-aligned, tabular */}
    <span
      className="tabular-nums text-sm font-semibold flex-1 text-right leading-none"
      style={{ color: rate != null ? "var(--w-ink-1)" : "var(--w-ink-5)" }}
    >
      {fmtRate(rate)}
    </span>
  </div>
);

// ── Metal row — colored dot + label left, rate + /tola right ──────────────────
const MetalRow = ({ label, nprPerTola, isLast }) => {
  const dotColor = label === "Gold" ? "#f59e0b" : "#94a3b8";
  return (
    <div
      className="flex items-center justify-between px-3 py-2 gap-2"
      style={{ borderBottom: isLast ? "none" : "1px solid var(--card-border)" }}
    >
      {/* Colored dot + label */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className="rounded-sm shrink-0"
          style={{
            width: 7,
            height: 7,
            backgroundColor: dotColor,
            display: "inline-block",
          }}
          aria-hidden="true"
        />
        <span
          className="text-[10px] font-bold uppercase"
          style={{ color: "var(--w-ink-3)", letterSpacing: "0.06em" }}
        >
          {label}
        </span>
      </div>

      {/* Rate + /tola unit */}
      <div className="flex items-baseline gap-1">
        <span
          className="tabular-nums text-sm font-semibold leading-none"
          style={{
            color: nprPerTola != null ? "var(--w-ink-1)" : "var(--w-ink-5)",
          }}
        >
          {fmtGold(nprPerTola)}
        </span>
        <span
          className="w-caption"
          style={{ color: "var(--w-ink-5)", fontSize: "0.625rem" }}
        >
          /tola
        </span>
      </div>
    </div>
  );
};

// ── Section divider ────────────────────────────────────────────────────────────
const Divider = () => (
  <div
    className="mx-3"
    style={{ height: "1px", backgroundColor: "var(--card-border)" }}
  />
);

// ── Error state — icon + w-muted + button pattern ─────────────────────────────
const ErrorState = ({ onRetry }) => (
  <div className="flex-1 flex flex-col items-center justify-center gap-2 px-3 py-4 text-center">
    <CurrencyExchange
      size={20}
      style={{ color: "var(--w-ink-5)", opacity: 0.5 }}
      aria-hidden="true"
    />
    <p className="w-muted font-semibold">Rates unavailable</p>
    <button
      onClick={onRetry}
      onMouseDown={(e) => e.stopPropagation()}
      className="w-caption font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
      style={{
        background: "var(--w-surface-2)",
        color: "var(--w-ink-3)",
        border: "1px solid var(--card-border)",
      }}
    >
      Try again
    </button>
  </div>
);

// ── Widget ─────────────────────────────────────────────────────────────────────
export const Widget = ({ id, onRemove }) => {
  const [settings, updateSetting] = useWidgetSettings(id, DEFAULT_SETTINGS);
  const {
    currencies = DEFAULT_CURRENCIES,
    showGold = true,
    showSilver = true,
  } = settings;

  const { rates, gold, silver, loading, error, refreshedAt, refresh } =
    useCurrency();
  const ageLabel = useAgeLabel(refreshedAt);

  const showMetalSection = showGold || showSilver;
  const hasCurrencies = currencies.length > 0;

  const settingsContent = (onClose) => (
    <Settings
      currencies={currencies}
      showGold={showGold}
      showSilver={showSilver}
      onChange={updateSetting}
      onClose={onClose}
    />
  );

  return (
    <BaseWidget
      className="flex flex-col overflow-hidden"
      settingsContent={settingsContent}
      settingsTitle={config.title}
      onRemove={onRemove}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-2 shrink-0">
        {/* Left: icon + "Rates" title + "in NPR" subtitle */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <CurrencyExchange
              size={12}
              style={{ color: "var(--w-ink-4)", flexShrink: 0 }}
              aria-hidden="true"
            />
            <span
              className="text-xs font-semibold"
              style={{ color: "var(--w-ink-3)" }}
            >
              Rates
            </span>
          </div>
          <span className="w-caption" style={{ color: "var(--w-ink-5)" }}>
            in NPR
          </span>
        </div>

        {/* Right: age label + inline refresh button (stock widget pattern) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {ageLabel && (
            <span
              className="text-[10px] tabular-nums"
              style={{ color: "var(--w-ink-5)" }}
            >
              {ageLabel}
            </span>
          )}
          <button
            onClick={refresh}
            disabled={loading}
            aria-label={
              ageLabel
                ? `Refresh rates (last updated ${ageLabel})`
                : "Refresh rates"
            }
            className={`flex items-center justify-center rounded-full transition-opacity hover:opacity-70 active:opacity-40 ${loading ? "animate-spin" : ""}`}
            style={{ color: "var(--w-ink-5)" }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M13.5 8a5.5 5.5 0 1 1-1.07-3.3" />
              <polyline points="12 2 13.5 4.7 10.8 5.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      {error && !rates ? (
        // Full error state (no stale data to show)
        <ErrorState onRetry={refresh} />
      ) : loading && !rates ? (
        // Initial loading — no cache hit; show skeletons
        <div className="flex flex-col flex-1">
          <SkeletonRows count={currencies.length || 3} />
          {showMetalSection && (
            <>
              <Divider />
              <SkeletonRows count={(showGold ? 1 : 0) + (showSilver ? 1 : 0)} />
            </>
          )}
        </div>
      ) : (
        // Data available (fresh or stale)
        <div className="flex flex-col flex-1">
          {/* Currency rows */}
          {hasCurrencies && (
            <div className="flex flex-col">
              {currencies.map((iso, i) => (
                <CurrencyRow
                  key={iso}
                  iso={iso}
                  rate={rates?.[iso] ?? null}
                  isLast={i === currencies.length - 1}
                />
              ))}
            </div>
          )}

          {/* Metal section */}
          {showMetalSection && (
            <>
              {hasCurrencies && <Divider />}
              <div className="flex flex-col">
                {showGold && (
                  <MetalRow
                    label="Gold"
                    nprPerTola={gold?.nprPerTola ?? null}
                    isLast={!showSilver}
                  />
                )}
                {showSilver && (
                  <MetalRow
                    label="Silver"
                    nprPerTola={silver?.nprPerTola ?? null}
                    isLast
                  />
                )}
              </div>
            </>
          )}
        </div>
      )}
    </BaseWidget>
  );
};
