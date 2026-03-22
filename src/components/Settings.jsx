import React from 'react';
import { SunFill, MoonFill, CheckLg, ArrowRepeat, CalendarCheck, Calendar2X } from 'react-bootstrap-icons';
import { LANGUAGES } from '../constants/settings';
import { ACCENT_COLORS } from '../theme';
import { useGoogleCalendar, useGoogleProfile } from '../widgets/useEvents';
import { disconnectCalendar } from '../utilities/googleCalendar';
import { useSettingsStore } from '../store';

export const Settings = ({ closeSettings }) => {
  const {
    language, setLanguage,
    accent, setAccent,
    mode, setMode,
    defaultView, setDefaultView,
  } = useSettingsStore();

  const { connected, loading, refresh } = useGoogleCalendar();
  const profile = useGoogleProfile();

  const handleConnect = () => refresh();

  const handleDisconnect = async () => {
    await disconnectCalendar();
    window.location.reload();
  };

  return (
    <div
      className="absolute top-12 right-0 z-50 rounded-2xl shadow-xl p-4 w-60 flex flex-col gap-4 animate-fade-in"
      style={{ backgroundColor: 'var(--w-surface)', border: '1px solid var(--w-border)' }}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* Launch mode */}
      <div>
        <p className="w-label mb-2">Launch Mode</p>
        <div className="flex gap-1.5">
          {[
            { id: 'canvas', label: 'Canvas' },
            { id: 'focus', label: 'Focus' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setDefaultView(id)}
              className="flex-1 flex items-center justify-center py-1.5 rounded-lg text-xs font-medium transition-all"
              style={defaultView === id
                ? { backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)' }
                : { backgroundColor: 'var(--w-surface-2)', color: 'var(--w-ink-4)', border: '1px solid var(--w-border)' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Appearance */}
      <div>
        <p className="w-label mb-2">Appearance</p>
        <div className="flex gap-1.5">
          {[{ id: 'light', icon: <SunFill size={11} /> }, { id: 'dark', icon: <MoonFill size={11} /> }].map(({ id, icon }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={mode === id
                ? { backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)' }
                : { backgroundColor: 'var(--w-surface-2)', color: 'var(--w-ink-4)', border: '1px solid var(--w-border)' }}
            >
              {icon}
              {id.charAt(0).toUpperCase() + id.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Accent Color */}
      <div>
        <p className="w-label mb-2">
          Accent — <span style={{ color: 'var(--w-accent)', fontWeight: 600 }}>{accent}</span>
        </p>
        <div className="grid grid-cols-6 gap-1.5">
          {ACCENT_COLORS.map(color => {
            const locked = color.name === 'Default' && mode === 'dark';
            return (
              <button
                key={color.name}
                title={locked ? 'Not available in dark mode' : color.name}
                onClick={() => !locked && setAccent(color.name)}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-transform"
                style={{
                  backgroundColor: color.hex,
                  outline: accent === color.name ? `2.5px solid ${color.hex}` : 'none',
                  outlineOffset: '2px',
                  opacity: locked ? 0.4 : 1,
                  cursor: locked ? 'not-allowed' : 'pointer',
                  transform: locked ? 'none' : undefined,
                }}
              >
                {accent === color.name && <CheckLg size={12} style={{ color: color.fg }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Nepali Date */}
      <div>
        <p className="w-label mb-2">Nepali Date</p>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <span className="w-caption font-medium" style={{ color: 'var(--w-ink-4)' }}>Language</span>
            <select
              value={language}
              onChange={e => { setLanguage(e.target.value); closeSettings(); }}
              className="rounded-lg px-2 py-1.5 text-xs outline-none transition-colors"
              style={{ backgroundColor: 'var(--w-surface-2)', color: 'var(--w-ink-1)', border: '1px solid var(--w-border)' }}
            >
              {Object.keys(LANGUAGES).map(k => (
                <option key={k} value={LANGUAGES[k]}>{k}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Google Calendar */}
      <div>
        <p className="w-label mb-2">Google Calendar</p>
        {connected ? (
          <div className="flex flex-col gap-2">
            {profile ? (
              <div className="flex items-center gap-2">
                {profile.picture
                  ? <img src={profile.picture} alt="" className="w-7 h-7 rounded-full shrink-0" referrerPolicy="no-referrer" />
                  : <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style={{ backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}>{profile.name?.[0] || '?'}</div>
                }
                <div className="flex flex-col min-w-0">
                  <span className="w-caption font-semibold truncate" style={{ color: 'var(--w-ink-1)' }}>{profile.name}</span>
                  <span className="w-caption truncate" style={{ color: 'var(--w-ink-4)' }}>{profile.email}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--w-ink-3)' }}>
                <CalendarCheck size={12} style={{ color: 'var(--w-accent)' }} />
                <span>Connected</span>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={refresh}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ backgroundColor: 'var(--w-surface-2)', color: 'var(--w-ink-2)', border: '1px solid var(--w-border)', opacity: loading ? 0.5 : 1 }}
              >
                <ArrowRepeat size={11} className={loading ? 'animate-spin' : ''} />
                Sync
              </button>
              <button
                onClick={handleDisconnect}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{ backgroundColor: 'var(--w-surface-2)', color: 'var(--w-ink-4)', border: '1px solid var(--w-border)' }}
              >
                <Calendar2X size={11} />
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleConnect}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)', opacity: loading ? 0.6 : 1 }}
          >
            <ArrowRepeat size={11} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Connecting…' : 'Sign in with Google'}
          </button>
        )}
      </div>
    </div>
  );
};
