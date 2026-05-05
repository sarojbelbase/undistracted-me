/**
 * General — Launch mode and Look Away settings.
 * Canvas mode: uses var(--card-*) / var(--w-*) CSS tokens only.
 */

import React from 'react';
import { useSettingsStore } from '../../store';
import { CANVAS_DIVIDER } from '../../theme/canvas';

const SectionLabel = ({ children }) => (
  <p style={{
    fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
    textTransform: 'uppercase', color: 'var(--w-ink-3)', marginBottom: 8,
  }}>
    {children}
  </p>
);

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    style={{
      flexShrink: 0,
      width: 36, height: 20, borderRadius: 10, padding: 2,
      border: 'none', cursor: 'pointer',
      background: checked ? 'var(--w-accent)' : 'var(--w-ink-6)',
      transition: 'background 0.18s ease',
    }}
  >
    <div style={{
      width: 16, height: 16, borderRadius: '50%',
      background: '#fff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      transition: 'transform 0.18s ease',
      transform: checked ? 'translateX(16px)' : 'translateX(0)',
    }} />
  </button>
);

export const General = ({ onPreviewLookAway }) => {
  const {
    defaultView, setDefaultView,
    lookAwayEnabled, setLookAwayEnabled,
    lookAwayInterval, setLookAwayInterval,
    lookAwayNotify, setLookAwayNotify,
  } = useSettingsStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Launch Mode ── */}
      <div>
        <SectionLabel>Launch Mode</SectionLabel>
        {(() => {
          const modes = [
            { id: 'canvas', label: 'Canvas', hint: 'Widgets & content on every new tab' },
            { id: 'focus', label: 'Focus', hint: 'Distraction-free sessions' },
          ];
          const activeHint = modes.find(m => m.id === defaultView)?.hint;
          return (
            <>
              <div style={{
                display: 'flex', gap: 3, padding: 3, borderRadius: 11,
                background: 'var(--panel-bg)', border: '1px solid var(--card-border)',
              }}>
                {modes.map(({ id, label }) => {
                  const selected = defaultView === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setDefaultView(id)}
                      style={{
                        flex: 1, padding: '7px 0', borderRadius: 8,
                        border: 'none', cursor: 'pointer',
                        fontSize: 12, fontWeight: 600, transition: 'all 0.15s ease',
                        background: selected ? 'var(--w-accent)' : 'transparent',
                        color: selected ? 'var(--w-accent-fg)' : 'var(--w-ink-3)',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {activeHint && (
                <p style={{ fontSize: 10.5, color: 'var(--w-ink-5)', marginTop: 6, lineHeight: '1.4' }}>
                  {activeHint}
                </p>
              )}
            </>
          );
        })()}
      </div>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: CANVAS_DIVIDER }} />

      {/* ── Look Away ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <SectionLabel>Look Away</SectionLabel>
            <p style={{ fontSize: 10.5, color: 'var(--w-ink-5)', marginTop: -4, lineHeight: '1.4' }}>
              Reminds you to rest your eyes regularly
            </p>
          </div>
          <Toggle checked={lookAwayEnabled} onChange={setLookAwayEnabled} />
        </div>

        {/* Expanded controls */}
        {lookAwayEnabled && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 10,
            padding: 12, borderRadius: 12,
            background: 'var(--panel-bg)',
            border: '1px solid var(--card-border)',
          }}>
            {/* Interval */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--w-ink-3)' }}>Remind every</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {[20, 30, 60].map((mins) => {
                  const selected = lookAwayInterval === mins;
                  return (
                    <button
                      key={mins}
                      onClick={() => setLookAwayInterval(mins)}
                      style={{
                        padding: '4px 10px', borderRadius: 8, cursor: 'pointer',
                        fontSize: 11, fontWeight: 600, transition: 'all 0.15s ease',
                        border: selected ? 'none' : '1px solid var(--card-border)',
                        background: selected ? 'var(--w-accent)' : 'transparent',
                        color: selected ? 'var(--w-accent-fg)' : 'var(--w-ink-4)',
                      }}
                    >
                      {mins === 60 ? '1 hr' : `${mins}m`}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ height: 1, background: CANVAS_DIVIDER }} />

            {/* Notification + Preview */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--w-ink-3)' }}>Notification</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {onPreviewLookAway && (
                  <button
                    type="button"
                    onClick={onPreviewLookAway}
                    style={{
                      fontSize: 11, fontWeight: 600, background: 'none', border: 'none',
                      cursor: 'pointer', color: 'var(--w-accent)', padding: 0,
                      transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                  >
                    Preview
                  </button>
                )}
                <Toggle checked={lookAwayNotify} onChange={setLookAwayNotify} />
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
