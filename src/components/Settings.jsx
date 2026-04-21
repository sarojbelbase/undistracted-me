import React, { useState, useEffect } from 'react';
import { SunFill, MoonFill, CheckLg, CircleHalf } from 'react-bootstrap-icons';
import { ACCENT_COLORS } from '../theme';
import { CARD_STYLES } from '../constants/cardStyles';
import { useSettingsStore } from '../store';
import { TooltipBtn } from './ui/TooltipBtn';
import { CANVAS_DIVIDER } from '../theme/canvas';
import { AccountsDialog, SPOTIFY_ACCOUNT_CHANGED } from './ui/AccountsDialog';
import { useGoogleAccountStore } from '../store/useGoogleAccountStore';
import { isSpotifyConnected } from '../widgets/spotify/utils';

const SectionLabel = ({ children }) => (
  <p className="text-[10px] font-bold mb-2" style={{ color: 'var(--w-ink-3)' }}>
    {children}
  </p>
);

const Divider = () => (
  <div style={{ height: '1px', backgroundColor: CANVAS_DIVIDER }} />
);

export const Settings = ({ closeSettings, onPreviewLookAway, onOpenBgPicker }) => {
  const [showAccounts, setShowAccounts] = useState(false);
  const googleConnected = useGoogleAccountStore(s => s.connected);
  const [spotifyConnected, setSpotifyConnected] = useState(() => isSpotifyConnected());
  useEffect(() => {
    const handler = (e) => setSpotifyConnected(e.detail?.connected ?? false);
    window.addEventListener(SPOTIFY_ACCOUNT_CHANGED, handler);
    return () => window.removeEventListener(SPOTIFY_ACCOUNT_CHANGED, handler);
  }, []);
  const {
    accent, setAccent,
    mode, setMode,
    defaultView, setDefaultView,
    lookAwayEnabled, setLookAwayEnabled,
    lookAwayInterval, setLookAwayInterval,
    lookAwayNotify, setLookAwayNotify,
    canvasBg,
    cardStyle, setCardStyle,
  } = useSettingsStore();

  return (
    <dialog
      open
      aria-label="Settings"
      tabIndex={-1}
      className="absolute top-12 right-0 z-50 rounded-2xl shadow-xl p-5 w-72 flex flex-col gap-4 animate-fade-in m-0 max-w-none border-0"
      style={{
        background: 'var(--card-bg)',
        backdropFilter: 'var(--card-blur)',
        WebkitBackdropFilter: 'var(--card-blur)',
        border: '1px solid var(--card-border)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      {/* ── Caret arrow pointing up to the gear button ── */}
      {/* Clip container: only reveals the top triangle of the rotated square */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -10,
          right: 8,
          width: 20,
          height: 10,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 3,
            left: 3,
            width: 14,
            height: 14,
            background: 'var(--card-bg)',
            backdropFilter: 'var(--card-blur)',
            WebkitBackdropFilter: 'var(--card-blur)',
            border: '1px solid var(--card-border)',
            transform: 'rotate(45deg)',
            transformOrigin: 'center',
          }}
        />
      </div>

      {/* ── VIEW ── */}
      <div className="flex flex-col gap-3">
        {/* Launch Mode */}
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
                <div className="flex gap-1 p-1 rounded-xl overflow-hidden" style={{ background: 'var(--panel-bg)', border: '1px solid var(--card-border)' }}>
                  {modes.map(({ id, label }) => {
                    const selected = defaultView === id;
                    return (
                      <button
                        key={id}
                        onClick={() => setDefaultView(id)}
                        className="flex-1 flex items-center justify-center py-1.5 rounded-lg text-xs font-semibold transition-all focus:outline-none cursor-pointer"
                        style={selected
                          ? { background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }
                          : { background: 'transparent', color: 'var(--w-ink-3)' }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                {activeHint && (
                  <p className="text-[10px] mt-1.5 leading-tight" style={{ color: 'var(--w-ink-5)' }}>{activeHint}</p>
                )}
              </>
            );
          })()}
        </div>

        {/* Appearance */}
        <div>
          <SectionLabel>Appearance</SectionLabel>
          <div className="flex gap-1 p-1 rounded-xl overflow-hidden" style={{ background: 'var(--panel-bg)', border: '1px solid var(--card-border)' }}>
            {[
              { id: 'light', label: 'Light', icon: <SunFill size={11} /> },
              { id: 'auto', label: 'Auto', icon: <CircleHalf size={11} /> },
              { id: 'dark', label: 'Dark', icon: <MoonFill size={11} /> },
            ].map(({ id, label, icon }) => {
              const selected = mode === id;
              return (
                <TooltipBtn
                  key={id}
                  tooltip={id === 'auto' ? 'Auto — follows sunrise & sunset' : undefined}
                  onClick={() => setMode(id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all focus:outline-none cursor-pointer"
                  style={selected
                    ? { background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }
                    : { background: 'transparent', color: 'var(--w-ink-3)' }}
                >
                  {icon}{label}
                </TooltipBtn>
              );
            })}
          </div>
        </div>

        {/* Accent */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[10px] font-bold" style={{ color: 'var(--w-ink-3)' }}>Accent</p>
            <span className="text-[11px] font-semibold" style={{ color: 'var(--w-accent)' }}>{accent}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ACCENT_COLORS.map(color => {
              const locked = color.name === 'Default' && (mode === 'dark' || mode === 'auto');
              const selected = accent === color.name;
              return (
                <TooltipBtn
                  key={color.name}
                  tooltip={locked ? 'Not available in dark mode' : color.name}
                  onClick={() => !locked && setAccent(color.name)}
                  className="w-6 h-6 rounded-full flex items-center justify-center transition-all focus:outline-none"
                  style={{
                    backgroundColor: color.hex,
                    boxShadow: selected ? 'inset 0 0 0 99px rgba(0,0,0,0.22)' : 'none',
                    opacity: locked ? 0.3 : 1,
                    cursor: locked ? 'not-allowed' : 'pointer',
                  }}
                >
                  {selected && <CheckLg size={12} style={{ color: color.fg }} />}
                </TooltipBtn>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── WIDGET STYLE ── */}
      <div>
        <SectionLabel>Widget Style</SectionLabel>
        {/* Segmented control — one pill slides, clear active state */}
        <div
          className="flex gap-1 p-1 rounded-xl overflow-hidden"
          style={{ background: 'var(--panel-bg)', border: '1px solid var(--card-border)' }}
        >
          {CARD_STYLES.map(({ id, label, hint }) => {
            const selected = cardStyle === id;
            return (
              <button
                key={id}
                onClick={() => setCardStyle(id)}
                className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all focus:outline-none cursor-pointer"
                style={selected
                  ? { background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }
                  : { background: 'transparent', color: 'var(--w-ink-3)' }}
              >
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className="text-xs font-semibold leading-tight">{label}</span>
                  <span className="text-[10px] leading-tight truncate" style={{ color: selected ? 'color-mix(in srgb, var(--w-accent-fg) 65%, transparent)' : 'var(--w-ink-5)' }}>{hint}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── BACKGROUND ── */}
      <div>
        <SectionLabel>Canvas Background</SectionLabel>
        <button
          onClick={() => onOpenBgPicker?.()}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80 cursor-pointer focus:outline-none"
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--card-border)',
            color: 'var(--w-ink-2)',
          }}
        >
          <span>
            {{ solid: 'Solid Color', orb: 'Color Motion', curated: 'Curated Photos', custom: 'Custom URL', default: 'Photo' }[canvasBg?.type] ?? 'Solid Color'}
          </span>
          <span style={{ color: 'var(--w-ink-4)' }}>Change ›</span>
        </button>
      </div>

      {/* ── ACCOUNTS ── */}
      <div>
        <SectionLabel>Accounts</SectionLabel>
        <button
          onClick={() => setShowAccounts(true)}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80 cursor-pointer focus:outline-none"
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--card-border)',
            color: 'var(--w-ink-2)',
          }}
        >
          <span>{(googleConnected || spotifyConnected) ? 'Connected' : 'Not connected'}</span>
          <span style={{ color: 'var(--w-ink-4)' }}>
            {(googleConnected || spotifyConnected) ? 'Manage \u203a' : 'Set up \u203a'}
          </span>
        </button>
      </div>

      <Divider />

      {/* ── LOOK AWAY ── */}
      <div className="flex flex-col gap-3">
        {/* Header row: label + toggle */}
        <div className="flex items-center justify-between">
          <div>
            <SectionLabel>Look Away</SectionLabel>
            <p className="text-[10px] leading-tight -mt-1.5" style={{ color: 'var(--w-ink-5)' }}>
              Remind you to rest your eyes
            </p>
          </div>
          <button
            onClick={() => setLookAwayEnabled(!lookAwayEnabled)}
            className="relative shrink-0 rounded-full transition-colors duration-200 focus:outline-none"
            style={{
              width: 36, height: 20,
              backgroundColor: lookAwayEnabled ? 'var(--w-accent)' : 'var(--w-ink-6)',
            }}
            aria-label={lookAwayEnabled ? 'Disable Look Away' : 'Enable Look Away'}
          >
            <span
              className="absolute top-0.5 rounded-full transition-transform duration-200"
              style={{
                width: 16, height: 16,
                background: '#fff',
                left: lookAwayEnabled ? 18 : 2,
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
            />
          </button>
        </div>

        {/* Expanded controls — only when enabled */}
        {lookAwayEnabled && (
          <div
            className="flex flex-col gap-2.5 rounded-xl p-3"
            style={{ background: 'var(--panel-bg)', border: '1px solid var(--card-border)' }}
          >
            {/* Interval */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold" style={{ color: 'var(--w-ink-3)' }}>Remind every</span>
              <div className="flex gap-1.5">
                {[20, 30, 60].map((mins) => {
                  const selected = lookAwayInterval === mins;
                  return (
                    <button
                      key={mins}
                      onClick={() => setLookAwayInterval(mins)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                      style={selected ? {
                        background: 'var(--w-accent)',
                        color: 'var(--w-accent-fg)',
                      } : {
                        background: 'transparent',
                        color: 'var(--w-ink-4)',
                        border: '1px solid var(--card-border)',
                      }}
                    >
                      {mins === 60 ? '1 hr' : `${mins}m`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(0,0,0,0.08)' }} />

            {/* Notification + Preview */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold" style={{ color: 'var(--w-ink-3)' }}>Notification</span>
              <div className="flex items-center gap-2">
                {onPreviewLookAway && (
                  <button
                    onClick={onPreviewLookAway}
                    className="text-[11px] font-semibold transition-opacity hover:opacity-70 cursor-pointer"
                    style={{ color: 'var(--w-accent)' }}
                  >
                    Preview
                  </button>
                )}
                <button
                  onClick={() => setLookAwayNotify(!lookAwayNotify)}
                  className="relative shrink-0 rounded-full transition-colors duration-200 focus:outline-none"
                  style={{
                    width: 30, height: 16,
                    backgroundColor: lookAwayNotify ? 'var(--w-accent)' : 'var(--w-ink-6)',
                  }}
                  aria-label={lookAwayNotify ? 'Disable notification' : 'Enable notification'}
                >
                  <span
                    className="absolute top-0.5 rounded-full transition-transform duration-200"
                    style={{
                      width: 12, height: 12,
                      background: '#fff',
                      left: lookAwayNotify ? 16 : 2,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                    }}
                  />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showAccounts && (
        <AccountsDialog onClose={() => setShowAccounts(false)} />
      )}

    </dialog>
  );
};
