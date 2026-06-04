/**
 * Notifications — per-type notification toggles.
 *
 * Canvas mode settings panel. Rendered inside the Settings modal's
 * Notifications tab.
 */

import React from 'react';
import { useSettingsStore } from '../../store';
import { NOTIFICATION_TYPES } from '../../constants/notifications';
import { CalendarEvent, HourglassSplit, AlarmFill, Eye, Gift } from 'react-bootstrap-icons';
import { Toggle } from '../../components/ui/Toggle';

// Icon map for each notification type
const NOTIF_ICONS = {
  events: <CalendarEvent size={13} />,
  occasion: <Gift size={13} />,
  countdown: <HourglassSplit size={13} />,
  pomodoro: <AlarmFill size={13} />,
  lookaway: <Eye size={13} />,
};

const SectionLabel = ({ children }) => (
  <p style={{
    fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
    textTransform: 'uppercase', color: 'var(--w-ink-3)', marginBottom: 8,
  }}>
    {children}
  </p>
);

export const Notifications = () => {
  const {
    notificationsEnabled, setNotificationsEnabled,
    notificationTypes, setNotificationType,
  } = useSettingsStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Header row ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <SectionLabel>Notifications</SectionLabel>
          <p style={{ fontSize: 10.5, color: 'var(--w-ink-5)', marginTop: -4, lineHeight: '1.4' }}>
            Browser alerts from the extension
          </p>
        </div>
        <Toggle checked={notificationsEnabled} onChange={setNotificationsEnabled} />
      </div>

      {/* ── Per-type rows ── */}
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
                {/* Icon badge */}
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

                {/* Label + description */}
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

                {/* Toggle */}
                <Toggle
                  checked={active}
                  onChange={(v) => setNotificationType(id, v)}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* ── Disabled state hint ── */}
      {!notificationsEnabled && (
        <p style={{ fontSize: 10.5, color: 'var(--w-ink-5)', lineHeight: '1.5', textAlign: 'center' }}>
          Enable notifications above to choose which alerts you want to receive.
        </p>
      )}
    </div>
  );
};
