/**
 * General — Launch mode and Look Away settings.
 * Canvas mode: uses var(--card-*) / var(--w-*) CSS tokens only.
 */

import { useSettingsStore } from '../../store';
import { useUIStore } from '../../store/useUIStore';
import { Divider } from '../ui/Divider';
import { Button } from '../ui/Button';
import { NOTIFICATION_TYPES } from '../../constants/notifications';
import { CalendarEvent, HourglassSplit, AlarmFill, Eye, Gift } from 'react-bootstrap-icons';
import { BlockedSites } from './BlockedSites';
import { Toggle } from '../../components/ui/Toggle';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { useState, useRef, useEffect } from 'react';

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
  // Narrow selectors — avoid re-rendering the whole panel on any single change.
  const defaultView = useSettingsStore((s) => s.defaultView);
  const setDefaultView = useSettingsStore((s) => s.setDefaultView);
  const lookAwayEnabled = useSettingsStore((s) => s.lookAwayEnabled);
  const setLookAwayEnabled = useSettingsStore((s) => s.setLookAwayEnabled);
  const lookAwayInterval = useSettingsStore((s) => s.lookAwayInterval);
  const setLookAwayInterval = useSettingsStore((s) => s.setLookAwayInterval);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);
  const notificationTypes = useSettingsStore((s) => s.notificationTypes);
  const setNotificationType = useSettingsStore((s) => s.setNotificationType);

  // Two-step confirm for the destructive "Reset layout" action: first click arms
  // it, second click executes; auto-disarms after 3s.
  const [confirmReset, setConfirmReset] = useState(false);
  const confirmTimerRef = useRef(null);
  // Clear the auto-disarm timer if the panel unmounts while "Confirm reset" shows.
  useEffect(() => () => clearTimeout(confirmTimerRef.current), []);
  const handleResetLayout = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      confirmTimerRef.current = setTimeout(() => setConfirmReset(false), 3000);
      return;
    }
    clearTimeout(confirmTimerRef.current);
    setConfirmReset(false);
    useUIStore.getState().requestLayoutReset();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Launch Mode ── */}
      <div>
        <SectionLabel>Launch Mode</SectionLabel>
        <SegmentedControl
          ariaLabel="Launch Mode"
          options={[
            { value: 'canvas', label: 'Canvas' },
            { value: 'note', label: 'Note' },
            { value: 'focus', label: 'Focus' },
          ]}
          value={defaultView}
          onChange={setDefaultView}
        />
        {(() => {
          const hints = {
            canvas: 'Widgets & content on every new tab',
            note: 'A distraction-free note on every new tab',
            focus: 'Distraction-free sessions',
          };
          const activeHint = hints[defaultView];
          return activeHint ? (
            <p style={{ fontSize: 10.5, color: 'var(--w-ink-5)', marginTop: 6, lineHeight: '1.4' }}>
              {activeHint}
            </p>
          ) : null;
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
          <Toggle checked={lookAwayEnabled} onChange={setLookAwayEnabled} ariaLabel="Look Away" />
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
              <SegmentedControl
                ariaLabel="Remind every"
                inline
                size="sm"
                options={[
                  { value: '20', label: '20m' },
                  { value: '30', label: '30m' },
                  { value: '60', label: '1 hr' },
                ]}
                value={String(lookAwayInterval)}
                onChange={(v) => setLookAwayInterval(Number(v))}
              />
            </div>

            <Divider />

            {/* Preview */}
            {onPreviewLookAway && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--w-ink-3)' }}>Preview</span>
                <Button variant="ghost" size="sm" onClick={onPreviewLookAway}>
                  Preview
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Blocked Sites ── */}
      <BlockedSites />

      {/* ── Separator ── */}
      <Divider />

      {/* ── Reset Layout ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <SectionLabel>Reset Layout</SectionLabel>
          <p style={{ fontSize: 10.5, color: 'var(--w-ink-5)', marginTop: -4, lineHeight: '1.4' }}>
            Restore widgets to their default positions &amp; sizes
          </p>
        </div>
        <Button
          variant={confirmReset ? 'danger' : 'secondary'}
          size="sm"
          onClick={handleResetLayout}
        >
          {confirmReset ? 'Confirm reset' : 'Reset'}
        </Button>
      </div>

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
          <Toggle checked={notificationsEnabled} onChange={setNotificationsEnabled} ariaLabel="Notifications" />
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
                    borderBottom: isLast ? 'none' : '1.5px solid var(--w-divider)',
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
                    ariaLabel={label}
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
