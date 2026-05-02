import { useState, useEffect, useCallback } from 'react';
import { PersonWalking, MoonStarsFill, HeartPulseFill } from 'react-bootstrap-icons';
import { BaseWidget } from '../BaseWidget';
import { useWidgetSettings } from '../useWidgetSettings';
import { useGoogleAccountStore } from '../../store/useGoogleAccountStore';
import { getGoogleAuthToken } from '../../utilities/googleAuth';
import config from './config';
import { Settings } from './Settings';
import {
  fetchSteps, fetchSleep, fetchWorkout,
  formatSteps, formatSleep, formatWorkout,
  readHealthCache, writeHealthCache,
} from './utils';
import { DEFAULT_HEALTH_SETTINGS, METRICS, SHOW_KEYS } from './constants';

// ── Icons per metric ──────────────────────────────────────────────────────────

const ICONS = {
  steps:   (color) => <PersonWalking  size={14} style={{ color, flexShrink: 0 }} />,
  sleep:   (color) => <MoonStarsFill  size={14} style={{ color, flexShrink: 0 }} />,
  workout: (color) => <HeartPulseFill size={14} style={{ color, flexShrink: 0 }} />,
};

const FORMATTERS = {
  steps:   formatSteps,
  sleep:   formatSleep,
  workout: formatWorkout,
};

// ── Skeleton row ──────────────────────────────────────────────────────────────

const SkeletonRow = ({ isLast }) => (
  <div
    className="flex items-center gap-3 px-3 py-2.5 animate-pulse"
    style={{ borderBottom: isLast ? 'none' : '1px solid var(--card-border)' }}
  >
    <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--panel-bg)', flexShrink: 0 }} />
    <div style={{ width: '4.5rem', height: '0.75rem', borderRadius: 4, background: 'var(--panel-bg)' }} />
    <div style={{ flex: 1 }} />
    <div className="flex flex-col items-end gap-1">
      <div style={{ width: '3rem', height: '0.85rem', borderRadius: 4, background: 'var(--panel-bg)' }} />
      <div style={{ width: '2rem', height: '0.6rem', borderRadius: 4, background: 'var(--panel-bg)' }} />
    </div>
  </div>
);

// ── Health metric row ─────────────────────────────────────────────────────────

const HealthRow = ({ metricKey, rawValue, isLast }) => {
  const meta = METRICS.find(m => m.key === metricKey);
  const { value, unit } = (FORMATTERS[metricKey] ?? (() => ({ value: '—', unit: '' })))(rawValue);

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--card-border)' }}
    >
      {/* Tinted icon box */}
      <div
        style={{
          width: 30, height: 30, borderRadius: 8,
          background: meta.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {ICONS[metricKey]?.(meta.color)}
      </div>

      {/* Label */}
      <span
        className="flex-1 text-xs font-medium"
        style={{ color: 'var(--w-ink-4)' }}
      >
        {meta.label}
      </span>

      {/* Value + unit */}
      <div className="flex flex-col items-end shrink-0">
        <span
          className="text-sm font-semibold tabular-nums leading-none"
          style={{ color: 'var(--w-ink-1)' }}
        >
          {value}
        </span>
        <span
          className="text-[10px] leading-snug mt-0.5"
          style={{ color: 'var(--w-ink-5)' }}
        >
          {unit}
        </span>
      </div>
    </div>
  );
};

// ── Not-connected empty state ─────────────────────────────────────────────────

const NotConnectedState = () => (
  <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-4">
    <HeartPulseFill size={20} style={{ color: 'var(--w-ink-4)', opacity: 0.55 }} />
    <p className="w-muted font-semibold" style={{ color: 'var(--w-ink-3)' }}>Google not connected</p>
    <p className="w-caption leading-relaxed">
      Open{' '}
      <span className="font-semibold" style={{ color: 'var(--w-ink-3)' }}>Settings → Accounts</span>
      {' '}to connect.
    </p>
  </div>
);

const NoMetricsState = () => (
  <div className="flex-1 flex flex-col items-center justify-center gap-1 text-center px-4">
    <p className="w-muted" style={{ color: 'var(--w-ink-4)' }}>No metrics enabled</p>
    <p className="w-caption" style={{ color: 'var(--w-ink-5)' }}>Open settings to choose what to show.</p>
  </div>
);

// ── Widget ────────────────────────────────────────────────────────────────────

export const Widget = ({ id = 'health', onRemove }) => {
  const [settings, updateSetting] = useWidgetSettings(id, DEFAULT_HEALTH_SETTINGS);
  const connected = useGoogleAccountStore(s => s.connected);

  const [data, setData] = useState(null);    // { steps, sleep, workout } | null
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Which metrics the user wants to see, in display order
  const visibleMetrics = METRICS.filter(m => settings[SHOW_KEYS[m.key]] !== false);

  const load = useCallback(async () => {
    if (!connected) return;
    const cached = readHealthCache();
    if (cached) { setData(cached); return; }

    setLoading(true);
    setError(null);
    try {
      const token = await getGoogleAuthToken(false);
      const [steps, sleep, workout] = await Promise.all([
        fetchSteps(token).catch(() => null),
        fetchSleep(token).catch(() => null),
        fetchWorkout(token).catch(() => null),
      ]);
      const result = { steps, sleep, workout };
      setData(result);
      writeHealthCache(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [connected]);

  useEffect(() => { load(); }, [load]);

  // Refresh every 30 minutes
  useEffect(() => {
    const id = setInterval(load, 30 * 60_000);
    return () => clearInterval(id);
  }, [load]);

  const settingsContent = () => <Settings id={id} />;

  const showSkeleton = connected && loading && !data;

  return (
    <BaseWidget
      className="flex flex-col overflow-hidden"
      settingsTitle={config.title}
      settingsContent={settingsContent}
      onRemove={onRemove}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 pt-2.5 pb-2 shrink-0"
        style={{ borderBottom: '1px solid var(--card-border)' }}
      >
        <span className="w-label font-semibold" style={{ color: 'var(--w-ink-2)' }}>
          Health
        </span>
        {data && (
          <button
            onClick={load}
            disabled={loading}
            aria-label="Refresh health data"
            className={`flex items-center justify-center rounded-full transition-opacity hover:opacity-70 active:opacity-40 ${loading ? 'animate-spin' : ''}`}
            style={{ color: 'var(--w-ink-5)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M13.5 8a5.5 5.5 0 1 1-1.07-3.3" />
              <polyline points="12 2 13.5 4.7 10.8 5.5" />
            </svg>
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col min-h-0">
        {!connected && <NotConnectedState />}

        {connected && showSkeleton && visibleMetrics.map((m, i) => (
          <SkeletonRow key={m.key} isLast={i === visibleMetrics.length - 1} />
        ))}

        {connected && !showSkeleton && visibleMetrics.length === 0 && <NoMetricsState />}

        {connected && !showSkeleton && visibleMetrics.length > 0 && visibleMetrics.map((m, i) => (
          <HealthRow
            key={m.key}
            metricKey={m.key}
            rawValue={data?.[m.key] ?? null}
            isLast={i === visibleMetrics.length - 1}
          />
        ))}

        {connected && error && !data && (
          <div className="flex-1 flex flex-col items-center justify-center gap-1 px-4 text-center">
            <p className="w-caption" style={{ color: 'var(--w-ink-4)' }}>
              Couldn&apos;t load data — make sure fitness access is granted in Google.
            </p>
          </div>
        )}
      </div>
    </BaseWidget>
  );
};
