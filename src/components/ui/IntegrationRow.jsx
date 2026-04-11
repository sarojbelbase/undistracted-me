import { ArrowRepeat, PersonDash, LockFill } from 'react-bootstrap-icons';

/**
 * IntegrationRow — reusable OAuth-style service connection block.
 *
 * Props:
 *  icon          ReactNode   — small icon next to section label
 *  label         string      — service name (e.g. "Google Calendar")
 *  connected     boolean
 *  loading       boolean     — disables/spins buttons
 *  profile       { name, email?, picture?, avatarColor?, avatarFgColor?, initials? } | null
 *  syncedAtLabel string|null — e.g. "just now"
 *  description   string|null — purpose blurb shown when not connected
 *  privacyLabel  string|null — privacy guarantee shown as a lock badge (e.g. "Stored locally only")
 *  connectLabel  string      — connect button text (default "Connect")
 *  onConnect     () => void
 *  onSync        () => void | null  — omit to hide the Sync button
 *  onDisconnect  () => void
 */
export const IntegrationRow = ({
  icon,
  label,
  connected,
  loading = false,
  profile = null,
  syncedAtLabel = null,
  connectLabel = 'Connect',
  description = null,
  privacyLabel = null,
  onConnect,
  onSync,
  onDisconnect,
}) => {
  return (
    <div className="flex flex-col gap-3">

      {/* ── Section label row: icon + label left · synced-at right ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {icon && <span style={{ color: 'var(--w-ink-5)' }}>{icon}</span>}
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--w-ink-5)' }}>
            {label}
          </span>
        </div>
        {connected && syncedAtLabel && (
          <span className="text-[11px] font-medium" style={{ color: 'var(--w-ink-5)' }}>
            {syncedAtLabel}
          </span>
        )}
      </div>

      {connected ? (
        <div className="flex flex-col gap-2.5">

          {/* ── Profile row (flat, no card, no competing badge) ── */}
          {profile && (
            <div className="flex items-center gap-2.5">
              {/* Avatar */}
              {profile.picture ? (
                <img
                  src={profile.picture}
                  alt=""
                  className="w-9 h-9 rounded-full shrink-0 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                  style={{
                    backgroundColor: profile.avatarColor ?? 'var(--w-accent)',
                    color: profile.avatarFgColor ?? 'var(--w-accent-fg)',
                  }}
                >
                  {(profile.initials ?? profile.name?.[0] ?? '?').toUpperCase()}
                </div>
              )}

              {/* Name / email — full width, no clipping from badges */}
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-semibold truncate" style={{ color: 'var(--w-ink-1)' }}>
                  {profile.name}
                </span>
                {profile.email && (
                  <span className="text-[11px] truncate" style={{ color: 'var(--w-ink-4)' }}>
                    {profile.email}
                  </span>
                )}
              </div>

              {/* Synced badge — right of avatar row, only when no email to clip */}
              <div
                className="flex items-center gap-1 shrink-0 px-2 py-0.5 rounded-full"
                style={{
                  background: 'color-mix(in srgb, var(--w-success) 12%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--w-success) 25%, transparent)',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--w-success)' }} />
                <span className="text-[10px] font-semibold" style={{ color: 'var(--w-success)' }}>Synced</span>
              </div>
            </div>
          )}

          {/* ── Action buttons ── */}
          <div className="flex gap-2">
            {onSync && (
              <button
                onClick={onSync}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-semibold transition-opacity hover:opacity-75 cursor-pointer"
                style={{
                  background: 'color-mix(in srgb, var(--w-accent) 10%, transparent)',
                  color: 'var(--w-accent)',
                  opacity: loading ? 0.5 : 1,
                }}
              >
                <ArrowRepeat size={12} className={loading ? 'animate-spin' : ''} />
                Sync now
              </button>
            )}
            <button
              onClick={onDisconnect}
              className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-semibold transition-opacity hover:opacity-75 cursor-pointer"
              style={{
                background: 'color-mix(in srgb, var(--w-accent) 10%, transparent)',
                color: 'var(--w-accent)',
              }}
            >
              <PersonDash size={12} />
              Disconnect
            </button>
          </div>

        </div>
      ) : (
        /* ── Not connected ── */
        <div className="flex flex-col gap-2.5">
          {description && (
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--w-ink-4)' }}>
              {description}
            </p>
          )}
          <button
            onClick={onConnect}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 h-8 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 cursor-pointer"
            style={{
              background: 'color-mix(in srgb, var(--w-accent) 10%, transparent)',
              color: 'var(--w-accent)',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading && <ArrowRepeat size={11} className="animate-spin" />}
            {loading ? 'Connecting…' : connectLabel}
          </button>
          {privacyLabel && (
            <div className="flex items-center justify-center gap-1">
              <LockFill size={8} style={{ color: 'var(--w-ink-6)', flexShrink: 0 }} />
              <span className="text-[10px]" style={{ color: 'var(--w-ink-6)' }}>{privacyLabel}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
