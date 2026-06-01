import React, { useCallback, useMemo } from 'react';
import { ClockHistory } from 'react-bootstrap-icons';
import { useWidgetSettings } from '../useWidgetSettings';
import { PillButton } from '../../components/ui/PillButton';
import { Toggle } from '../../components/ui/Toggle';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { BREAK_OPTIONS, DEFAULT_SETTINGS } from './constants';
import { loadHistory, getStreak, getTodayMinutes, getWeeklyStats } from './utils';

// ─── Weekly bar chart ─────────────────────────────────────────────────────

const WeeklyChart = ({ stats }) => {
  const maxMin = Math.max(...stats.map((s) => s.minutes), 1);
  return (
    <div className="pom-stats-chart">
      {stats.map((s) => (
        <div key={s.day} className="pom-stats-chart__col">
          <span className="pom-stats-chart__value">
            {s.minutes > 0 ? `${s.minutes}m` : ''}
          </span>
          <div className="pom-stats-chart__bar-wrap">
            <div
              className="pom-stats-chart__bar"
              style={{ height: `${(s.minutes / maxMin) * 100}%` }}
            />
          </div>
          <span className="pom-stats-chart__day">{s.day}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Settings component ──────────────────────────────────────────────────

export const PomodoroSettings = ({ id }) => {
  const [settings, updateSetting] = useWidgetSettings(id, DEFAULT_SETTINGS);

  const soundEnabled = settings.soundEnabled ?? DEFAULT_SETTINGS.soundEnabled;
  const autoBreak = settings.autoBreak ?? DEFAULT_SETTINGS.autoBreak;
  const breakDuration = settings.breakDuration ?? DEFAULT_SETTINGS.breakDuration;
  const rainSound = settings.rainSound ?? DEFAULT_SETTINGS.rainSound;

  const toggleSound = useCallback(() => updateSetting('soundEnabled', !soundEnabled), [updateSetting, soundEnabled]);
  const toggleAutoBreak = useCallback(() => updateSetting('autoBreak', !autoBreak), [updateSetting, autoBreak]);
  const toggleRain = useCallback(() => updateSetting('rainSound', !rainSound), [updateSetting, rainSound]);
  const setBreakDuration = useCallback((val) => updateSetting('breakDuration', val), [updateSetting]);

  // ── Stats ────────────────────────────────────────────────────────────
  const history = useMemo(() => loadHistory(), []);
  const streak = useMemo(() => getStreak(history), [history]);
  const todayMin = useMemo(() => getTodayMinutes(history), [history]);
  const weeklyStats = useMemo(() => getWeeklyStats(history), [history]);
  const sessionCount = history.filter((s) => s.type === 'focus').length;

  return (
    <div className="flex flex-col gap-4 p-1">

      {/* ── Timer ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2.5">
        <span className="w-label">Timer</span>

        {/* End-of-session chime */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <span className="w-body" style={{ color: 'var(--w-ink-2)', fontWeight: 600 }}>End-of-session chime</span>
            <p style={{ fontSize: '10.5px', color: 'var(--w-ink-5)', marginTop: 1, lineHeight: 1.4 }}>
              Plays a notification sound when the timer completes
            </p>
          </div>
          <Toggle checked={soundEnabled} onChange={toggleSound} />
        </div>

        {/* Rain sounds */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <span className="w-body" style={{ color: 'var(--w-ink-2)', fontWeight: 600 }}>Ambient rain</span>
            <p style={{ fontSize: '10.5px', color: 'var(--w-ink-5)', marginTop: 1, lineHeight: 1.4 }}>
              Looping rain audio to help you focus
            </p>
          </div>
          <Toggle checked={rainSound} onChange={toggleRain} />
        </div>
      </div>

      {/* ── Divider ────────────────────────────────────────────────── */}
      <div style={{ height: 1, background: 'rgba(0,0,0,0.1)' }} />

      {/* ── Breaks ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2.5">
        <span className="w-label">Breaks</span>

        {/* Auto-break toggle */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <span className="w-body" style={{ color: 'var(--w-ink-2)', fontWeight: 600 }}>Auto-start break after session</span>
            <p style={{ fontSize: '10.5px', color: 'var(--w-ink-5)', marginTop: 1, lineHeight: 1.4 }}>
              Automatically begins a break timer when focus ends
            </p>
          </div>
          <Toggle checked={autoBreak} onChange={toggleAutoBreak} />
        </div>

        {/* Break duration */}
        <div className="flex flex-col gap-1.5">
          <span
            className="w-body"
            style={{
              color: 'var(--w-ink-3)',
              opacity: autoBreak ? 1 : 0.35,
              fontSize: '0.6875rem',
            }}
          >
            Break duration
          </span>
          <div style={{ opacity: autoBreak ? 1 : 0.35, pointerEvents: autoBreak ? 'auto' : 'none', transition: 'opacity 0.2s ease' }}>
            <SegmentedControl
              options={BREAK_OPTIONS.map((o) => ({ label: o.label, value: o.mins }))}
              value={breakDuration}
              onChange={setBreakDuration}
            />
          </div>
        </div>
      </div>

      {/* ── Divider ────────────────────────────────────────────────── */}
      <div style={{ height: 1, background: 'rgba(0,0,0,0.1)' }} />

      {/* ── Stats ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <span className="w-label">Stats</span>

        {/* Stat chips — evenly spaced grid */}
        <div className="pom-stats-grid">
          <div className="pom-stat-chip">
            <span className="pom-stat-chip__value">{sessionCount}</span>
            <span className="pom-stat-chip__label">Sessions</span>
          </div>
          <div className="pom-stat-chip">
            <span className="pom-stat-chip__value">{streak}d</span>
            <span className="pom-stat-chip__label">Streak</span>
          </div>
          <div className="pom-stat-chip">
            <span className="pom-stat-chip__value">{Math.round(todayMin)}m</span>
            <span className="pom-stat-chip__label">Today</span>
          </div>
        </div>

        {/* Weekly bar chart */}
        {sessionCount > 0 && (
          <div className="mt-1">
            <p
              style={{
                fontSize: '0.625rem',
                fontWeight: 600,
                color: 'var(--w-ink-4)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              This week
            </p>
            <WeeklyChart stats={weeklyStats} />
          </div>
        )}

        {/* History note */}
        <div className="flex items-start gap-1.5">
          <ClockHistory size={11} style={{ color: 'var(--w-ink-4)', marginTop: 1, flexShrink: 0 }} />
          <p style={{ fontSize: '0.625rem', color: 'var(--w-ink-4)', lineHeight: 1.4 }}>
            {sessionCount > 0
              ? `Last ${Math.min(sessionCount, 500)} sessions saved locally.`
              : 'Complete a focus session to see stats here.'}
          </p>
        </div>
      </div>
    </div>
  );
};
