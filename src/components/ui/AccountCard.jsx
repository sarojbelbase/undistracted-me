import React from 'react';
import { ArrowRepeat } from 'react-bootstrap-icons';

const CardAction = ({ connected, connecting, disconnecting, connectLabel, onConnect, onDisconnect }) => {
  if (connected) {
    return (
      <button
        onClick={onDisconnect}
        disabled={disconnecting}
        className="self-end flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-80 cursor-pointer disabled:cursor-not-allowed"
        style={{
          background: 'color-mix(in srgb, var(--w-danger, #ef4444) 10%, transparent)',
          color: 'var(--w-danger, #ef4444)',
          border: '1px solid color-mix(in srgb, var(--w-danger, #ef4444) 20%, transparent)',
          opacity: disconnecting ? 0.65 : 1,
        }}
      >
        {disconnecting && <ArrowRepeat size={10} className="animate-spin" />}
        {disconnecting ? 'Disconnecting…' : 'Disconnect'}
      </button>
    );
  }
  return (
    <button
      onClick={onConnect}
      disabled={connecting}
      className="w-full flex items-center justify-center gap-2 h-9 rounded-xl text-[12px] font-semibold transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed"
      style={{
        background: 'var(--w-accent)',
        color: 'var(--w-accent-fg)',
        opacity: connecting ? 0.7 : 1,
      }}
    >
      {connecting && <ArrowRepeat size={12} className="animate-spin shrink-0" />}
      {connecting ? 'Connecting…' : connectLabel}
    </button>
  );
};

/**
 * AccountCard — compact account connection tile used in AccountsDialog.
 *
 * Props:
 *  icon         ReactNode  — service logo / icon
 *  serviceName  string     — e.g. "Google", "Spotify"
 *  description  string     — shown when not connected
 *  scopes       string[]   — what this account accesses
 *  connected    boolean
 *  connecting   boolean
 *  disconnecting boolean
 *  error        string|null
 *  profile      { name, email?, picture? } | null
 *  connectLabel string     — button label when not connected
 *  onConnect    () => void
 *  onDisconnect () => void
 */
export const AccountCard = ({
  icon,
  serviceName,
  description,
  scopes = [],
  connected,
  connecting = false,
  disconnecting = false,
  error = null,
  profile = null,
  connectLabel = 'Connect',
  onConnect,
  onDisconnect,
}) => {
  return (
    <div
      className="flex flex-col rounded-xl overflow-hidden"
      style={{ background: 'var(--panel-bg)', border: '1px solid var(--card-border)' }}
    >
      {/* ── Top row: icon + name + profile snippet + status ── */}
      <div className="flex items-center gap-2.5 px-3.5 py-3">
        {/* Service icon */}
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)' }}
        >
          {icon}
        </div>

        {/* Name + profile email when connected */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold leading-tight" style={{ color: 'var(--w-ink-1)' }}>
              {serviceName}
            </span>
            {connected && profile?.name && (
              <span className="text-[11px] truncate" style={{ color: 'var(--w-ink-4)', maxWidth: 140 }}>
                {profile.name}
              </span>
            )}
          </div>
          {connected && profile?.email && (
            <span className="text-[10.5px] truncate mt-0.5" style={{ color: 'var(--w-ink-5)' }}>
              {profile.email}
            </span>
          )}
        </div>

        {/* Avatar or status badge */}
        {connected && profile?.picture ? (
          <img
            src={profile.picture}
            alt=""
            className="w-7 h-7 rounded-full shrink-0 object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: connected ? 'var(--w-success)' : 'var(--w-ink-6)' }}
            />
            <span
              className="text-[10.5px] font-medium"
              style={{ color: connected ? 'var(--w-success)' : 'var(--w-ink-5)' }}
            >
              {connected ? 'Connected' : 'Not connected'}
            </span>
          </div>
        )}
      </div>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', marginInline: 14 }} />

      {/* ── Bottom section: description/scopes + action ── */}
      <div className="flex flex-col gap-2 px-3.5 py-3">
        {/* Not connected: description */}
        {!connected && description && (
          <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--w-ink-3)' }}>
            {description}
          </p>
        )}

        {/* Scopes */}
        {scopes.length > 0 && (
          <ul className="flex flex-col gap-1 m-0 p-0 list-none">
            {scopes.map(scope => (
              <li key={scope} className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--w-ink-4)' }}>
                <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: 'var(--w-ink-6)' }} />
                {scope}
              </li>
            ))}
          </ul>
        )}

        {/* Error */}
        {error && (
          <p className="text-[11px] leading-snug" style={{ color: 'var(--w-danger)' }}>
            {error}
          </p>
        )}

        {/* Action */}
        <CardAction
          connected={connected}
          connecting={connecting}
          disconnecting={disconnecting}
          connectLabel={connectLabel}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
        />
      </div>
    </div>
  );
};
