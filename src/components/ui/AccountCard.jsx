import React from 'react';
import { ArrowRepeat } from 'react-bootstrap-icons';

// ─── Scope pills ──────────────────────────────────────────────────────────────

const ScopePill = ({ label }) => (
  <span
    className="flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-full shrink-0"
    style={{ background: 'rgba(0,0,0,0.06)', color: 'var(--w-ink-3)' }}
  >
    <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: 'var(--w-ink-5)' }} />
    {label}
  </span>
);

/**
 * AccountCard — account connection card for the Accounts dialog.
 *
 * Connected state: avatar + service badge overlay → name → subtitle (email / tier) → Disconnect link
 * Not connected state: service icon → name → status → scope pills → connect CTA
 *
 * Props:
 *  icon            ReactNode          — service logo (full-colour, includes own bg if applicable)
 *  serviceName     string
 *  scopes          string[]           — capability bullets shown when not connected
 *  connected       boolean
 *  connecting      boolean
 *  disconnecting   boolean
 *  error           string|null
 *  profile         { name, email?, picture?, avatar?, product? } | null
 *  profileSubtitle string|null        — explicit subtitle; falls back to profile.email
 *  connectLabel    string
 *  onConnect       () => void
 *  onDisconnect    () => void
 */
export const AccountCard = ({
  icon,
  serviceName,
  scopes = [],
  connected,
  connecting = false,
  disconnecting = false,
  error = null,
  profile = null,
  profileSubtitle = null,
  connectLabel = 'Connect',
  onConnect,
  onDisconnect,
}) => {
  const avatarSrc = profile?.picture ?? profile?.avatar ?? null;
  const subtitle = profileSubtitle ?? profile?.email ?? null;

  // ── Connected ────────────────────────────────────────────────────────────────
  if (connected) {
    return (
      <div
        className="flex items-center gap-3 px-4 py-3.5 rounded-xl"
        style={{ background: 'var(--panel-bg)', border: '1px solid var(--card-border)' }}
      >
        {/* Avatar with service-icon badge */}
        <div className="relative shrink-0">
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={profile?.name ?? serviceName}
              className="w-9 h-9 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold select-none"
              style={{
                background: 'color-mix(in srgb, var(--w-accent) 14%, transparent)',
                color: 'var(--w-accent)',
              }}
            >
              {(profile?.name?.[0] ?? serviceName[0]).toUpperCase()}
            </div>
          )}
          {/* Small service logo badge overlaid at bottom-right */}
          <div
            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center overflow-hidden"
            style={{
              background: 'var(--card-bg, #fff)',
              boxShadow: '0 0 0 1.5px var(--card-border)',
            }}
          >
            <span style={{ display: 'flex', transform: 'scale(0.72)', transformOrigin: 'center', lineHeight: 0 }}>
              {icon}
            </span>
          </div>
        </div>

        {/* Name + subtitle */}
        <div className="flex flex-col min-w-0 flex-1">
          <span
            className="text-[13px] font-semibold leading-tight truncate"
            style={{ color: 'var(--w-ink-1)' }}
          >
            {profile?.name ?? serviceName}
          </span>
          {subtitle && (
            <span className="text-[11px] truncate mt-0.5" style={{ color: 'var(--w-ink-4)' }}>
              {subtitle}
            </span>
          )}
        </div>

        {/* Disconnect — unobtrusive text link */}
        <button
          type="button"
          onClick={onDisconnect}
          disabled={disconnecting}
          className="shrink-0 flex items-center gap-1.5 text-[11px] font-semibold transition-opacity hover:opacity-70 cursor-pointer disabled:cursor-not-allowed"
          style={{ color: 'var(--w-danger, #ef4444)', background: 'none', border: 'none', padding: 0 }}
        >
          {disconnecting
            ? <><ArrowRepeat size={11} className="animate-spin" /> Disconnecting…</>
            : 'Disconnect'}
        </button>
      </div>
    );
  }

  // ── Not connected ────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col gap-3 px-4 py-3.5 rounded-xl"
      style={{ background: 'var(--panel-bg)', border: '1px solid var(--card-border)' }}
    >
      {/* Header: icon + name + "not connected" dot */}
      <div className="flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
          style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)' }}
        >
          {icon}
        </div>
        <span className="text-[13px] font-semibold flex-1" style={{ color: 'var(--w-ink-1)' }}>
          {serviceName}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--w-ink-6)' }} />
          <span className="text-[10.5px]" style={{ color: 'var(--w-ink-5)' }}>Not connected</span>
        </div>
      </div>

      {/* Scope pills — horizontal wrapping row */}
      {scopes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {scopes.map(scope => <ScopePill key={scope} label={scope} />)}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-[11px] leading-snug m-0" style={{ color: 'var(--w-danger)' }}>
          {error}
        </p>
      )}

      {/* Connect CTA */}
      <button
        type="button"
        onClick={onConnect}
        disabled={connecting}
        className="w-full h-9 flex items-center justify-center gap-2 rounded-xl text-[12px] font-semibold transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed"
        style={{
          background: 'var(--w-accent)',
          color: 'var(--w-accent-fg)',
          border: 'none',
          opacity: connecting ? 0.7 : 1,
        }}
      >
        {connecting && <ArrowRepeat size={12} className="animate-spin shrink-0" />}
        {connecting ? 'Connecting…' : connectLabel}
      </button>
    </div>
  );
};


