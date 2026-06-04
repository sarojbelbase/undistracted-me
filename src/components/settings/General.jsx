/**
 * General — Launch mode and Look Away settings.
 * Canvas mode: uses var(--card-*) / var(--w-*) CSS tokens only.
 */

import React from 'react';
import { useSettingsStore } from '../../store';
import { Divider } from '../ui/Divider';
import { NOTIFICATION_TYPES } from '../../constants/notifications';
import { CalendarEvent, HourglassSplit, AlarmFill, Eye, Gift } from 'react-bootstrap-icons';
import { BlockedSites } from './BlockedSites';
import { Toggle } from '../../components/ui/Toggle';

const SectionLabel = ({ children }) => (
  <p style={{
    fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
    textTransform: 'uppercase', color: 'var(--w-ink-3)', marginBottom: 8,
  }}>
    {children}
  </p>
);

const NOTIF_ICONS = {
  events: <CalendarEvent size={13} />,
  occasion: <Gift size={13} />,
  countdown: <HourglassSplit size={13} />,
  pomodoro: <AlarmFill size={13} />,
  lookaway: <Eye size={13} />,
};

export const General = ({ onPreviewLookAway }) => {
  const {
    defaultView, setDefaultView,
    lookAwayEnabled, setLookAwayEnabled,
    lookAwayInterval, setLookAwayInterval,
    notificationsEnabled, setNotificationsEnabled,
    notificationTypes, setNotificationType,
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

      {/* ── Separator ── */}
      <Divider />

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

            <Divider />

            {/* Preview */}
            {onPreviewLookAway && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--w-ink-3)' }}>Preview</span>
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
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Blocked Sites ── */}
      <BlockedSites />

      {/* ── Separator ── */}
      <Divider />

      {/* ── Notifications ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <SectionLabel>Notifications</SectionLabel>
            <p style={{ fontSize: 10.5, color: 'var(--w-ink-5)', marginTop: -4, lineHeight: '1.4' }}>
              Browser alerts from the extension
            </p>
          </div>
          <Toggle checked={notificationsEnabled} onChange={setNotificationsEnabled} />
        </div>

        {notificationsEnabled && (
          <div style={{
            display: 'flex', flexDirection: 'column',
            borderRadius: 12,
            border: '1px solid var(--card-border)',
            overflow: 'hidden',
          }}>
            {NOTIFICATION_TYPES.map(({ id, label, description }, i) => {
              const active = notificationTypes?.[id] !== false;
              const isLast = i === NOTIFICATION_TYPES.length - 1;
              return (
                <div
                  key={id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px',
                    background: 'var(--panel-bg)',
                    borderBottom: isLast ? 'none' : '1.5px solid rgba(0,0,0,0.1)',
                    transition: 'background 0.14s',
                  }}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: active
                      ? 'color-mix(in srgb, var(--w-accent) 12%, transparent)'
                      : 'rgba(0,0,0,0.04)',
                    color: active ? 'var(--w-accent)' : 'var(--w-ink-5)',
                    transition: 'background 0.2s, color 0.2s',
                  }}>
                    {NOTIF_ICONS[id]}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: 11.5, fontWeight: 600, lineHeight: 1.2,
                      color: active ? 'var(--w-ink-2)' : 'var(--w-ink-4)',
                      transition: 'color 0.2s',
                    }}>
                      {label}
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--w-ink-5)', marginTop: 1, lineHeight: 1.3 }}>
                      {description}
                    </p>
                  </div>

                  <Toggle
                    checked={active}
                    onChange={(v) => setNotificationType(id, v)}
                  />
                </div>
              );
            })}
          </div>
        )}

        {!notificationsEnabled && (
          <p style={{ fontSize: 10.5, color: 'var(--w-ink-5)', lineHeight: '1.5', textAlign: 'center' }}>
            Enable notifications above to choose which alerts you want to receive.
          </p>
        )}
      </div>

    </div>
  );
};
