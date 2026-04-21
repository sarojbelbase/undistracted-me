import { LockFill } from 'react-bootstrap-icons';
import { useShallow } from 'zustand/react/shallow';
import { useGoogleAccountStore } from '../../store/useGoogleAccountStore';

// When connected with a profile: description (if any) above the avatar row.
// When connected without a profile: description + "Connected" indicator.
// When not connected: description flows directly into the CTA as one sentence.
const AccountInfoSlot = ({ connected, profile, description }) => {
  if (connected && profile) {
    return (
      <div className="flex flex-col gap-2">
        {description && (
          <p className="text-[11px] leading-snug m-0" style={{ color: 'var(--w-ink-5)' }}>
            {description}
          </p>
        )}
        <div className="flex items-center gap-2">
          {profile.picture ? (
            <img
              src={profile.picture}
              alt=""
              className="w-5 h-5 rounded-full shrink-0 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold"
              style={{
                background: 'color-mix(in srgb, var(--w-accent) 18%, transparent)',
                color: 'var(--w-accent)',
              }}
            >
              {(profile.name?.[0] ?? '?').toUpperCase()}
            </div>
          )}
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="text-[11px] font-medium truncate" style={{ color: 'var(--w-ink-2)' }}>
              {profile.name}
            </span>
            {profile.email && (
              <span className="text-[10px] truncate" style={{ color: 'var(--w-ink-5)' }}>
                {profile.email}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (connected) {
    return (
      <div className="flex flex-col gap-2">
        {description && (
          <p className="text-[11px] leading-snug m-0" style={{ color: 'var(--w-ink-5)' }}>
            {description}
          </p>
        )}
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--w-success)' }} />
          <span className="text-[11px] font-medium" style={{ color: 'var(--w-ink-3)' }}>
            Connected
          </span>
        </div>
      </div>
    );
  }

  // Not connected — verb-first CTA row, path as secondary supporting detail
  return (
    <div className="flex flex-col gap-2">
      {description && (
        <p className="text-[11px] leading-snug m-0" style={{ color: 'var(--w-ink-5)' }}>
          {description}
        </p>
      )}
      <div
        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2"
        style={{ background: 'rgba(0,0,0,0.04)' }}
      >
        <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" style={{ color: 'var(--w-ink-5)', flexShrink: 0 }}>
          <path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z" />
        </svg>
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-[11px] font-semibold" style={{ color: 'var(--w-ink-2)' }}>
            Connect your account
          </span>
          <span className="text-[10px]" style={{ color: 'var(--w-ink-5)' }}>
            Settings › Accounts
          </span>
        </div>
        <svg width="9" height="9" viewBox="0 0 16 16" fill="currentColor" style={{ color: 'var(--w-ink-6)', flexShrink: 0 }}>
          <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z" />
        </svg>
      </div>
    </div>
  );
};

/**
 * IntegrationRow — flat account-status row for widget settings panels.
 *
 * Props:
 *  icon          ReactNode   — service icon (renders with its own colour; not overridden here)
 *  label         string      — e.g. "Google Calendar"
 *  description   string|null — data-access summary; merged into the CTA when disconnected
 *  privacyLabel  string|null — e.g. "Nothing stored on servers"
 *  syncedAtLabel string|null — overrides "Connected" status text (e.g. "Synced 2 min ago")
 *  connected     boolean     — override for non-Google integrations (defaults to Google store)
 *  profile       object|null — override for non-Google integrations
 */
export const IntegrationRow = ({
  icon,
  label,
  description = null,
  privacyLabel = null,
  syncedAtLabel = null,
  connected: connectedProp,
  profile: profileProp,
}) => {
  const google = useGoogleAccountStore(useShallow(s => ({ connected: s.connected, profile: s.profile })));
  const connected = connectedProp === undefined ? google.connected : connectedProp;
  const profile = profileProp === undefined ? google.profile : profileProp;

  return (
    <div className="flex flex-col gap-3">
      {/* ── Header: service icon + label + status ── */}
      <div className="flex items-center gap-2">
        {icon && <span className="shrink-0">{icon}</span>}
        <span className="text-[12px] font-semibold flex-1" style={{ color: 'var(--w-ink-2)' }}>
          {label}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: connected ? 'var(--w-success)' : 'var(--w-ink-6)' }}
          />
          <span
            className="text-[10.5px] font-medium"
            style={{ color: connected ? 'var(--w-success)' : 'var(--w-ink-5)' }}
          >
            {connected ? (syncedAtLabel ?? 'Connected') : 'Not connected'}
          </span>
        </div>
      </div>

      {/* ── Account body: profile info, or CTA with embedded description ── */}
      <AccountInfoSlot connected={connected} profile={profile} description={description} />

      {/* ── Privacy footer ── */}
      {privacyLabel && (
        <div className="flex items-center gap-1.5">
          <LockFill size={8} style={{ color: 'var(--w-ink-6)', flexShrink: 0 }} />
          <span className="text-[10px] flex-1" style={{ color: 'var(--w-ink-5)' }}>{privacyLabel}</span>
          <a
            href="https://undistractedme.sarojbelbase.com.np/pp-and-tos"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] shrink-0 transition-opacity hover:opacity-75"
            style={{ color: 'var(--w-ink-4)', textDecoration: 'none' }}
          >
            Privacy Policy
          </a>
        </div>
      )}
    </div>
  );
};
