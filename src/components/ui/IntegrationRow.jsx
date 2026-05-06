import { LockFill } from 'react-bootstrap-icons';
import { useShallow } from 'zustand/react/shallow';
import { useGoogleAccountStore } from '../../store/useGoogleAccountStore';
import { useUIStore } from '../../store/useUIStore';
import { GearFillIcon } from '../../assets/svg/GearFillIcon';
import { ChevronRightIcon } from '../../assets/svg/ChevronRightIcon';

// One pill container for both states — same shape, same padding, different content.
const AccountInfoSlot = ({ connected, profile, profileSubtitle, connectLabel, onConnect }) => {
  if (connected && profile) {
    const subtitle = profileSubtitle ?? profile.email ?? null;
    return (
      <div
        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2"
        style={{ background: 'rgba(0,0,0,0.04)' }}
      >
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
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-[11px] font-semibold truncate" style={{ color: 'var(--w-ink-2)' }}>
            {profile.name}
          </span>
          {subtitle && (
            <span className="text-[10px] truncate" style={{ color: 'var(--w-ink-5)' }}>
              {subtitle}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (connected) {
    return (
      <div
        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2"
        style={{ background: 'rgba(0,0,0,0.04)' }}
      >
        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--w-success)' }} />
        <span className="text-[11px] font-medium flex-1" style={{ color: 'var(--w-ink-3)' }}>
          Connected
        </span>
      </div>
    );
  }

  // Not connected — pill shows connect label + Settings path
  return (
    <button
      type="button"
      onClick={onConnect}
      className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-opacity hover:opacity-80 active:opacity-60 cursor-pointer text-left"
      style={{ background: 'rgba(0,0,0,0.04)' }}
    >
      <GearFillIcon size={11} color="var(--w-ink-5)" />
      <div className="flex flex-col flex-1 min-w-0">
        <span className="text-[11px] font-semibold" style={{ color: 'var(--w-ink-2)' }}>
          {connectLabel}
        </span>
        <span className="text-[10px]" style={{ color: 'var(--w-ink-5)' }}>
          Settings › Accounts
        </span>
      </div>
      <ChevronRightIcon size={9} color="var(--w-ink-6)" />
    </button>
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
  profileSubtitle = null,
  onConnect: onConnectProp,
}) => {
  const google = useGoogleAccountStore(useShallow(s => ({ connected: s.connected, profile: s.profile })));
  const openAccountsDialog = useUIStore(s => s.openAccountsDialog);
  const connected = connectedProp === undefined ? google.connected : connectedProp;
  const profile = profileProp === undefined ? google.profile : profileProp;
  const onConnect = onConnectProp ?? openAccountsDialog;

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

      {/* ── Description — shown when not connected, outside the pill ── */}
      {!connected && description && (
        <p className="text-[11px] leading-snug m-0" style={{ color: 'var(--w-ink-4)' }}>
          {description}
        </p>
      )}

      {/* ── Account body: profile info or connect CTA ── */}
      <AccountInfoSlot
        connected={connected}
        profile={profile}
        profileSubtitle={profileSubtitle}
        connectLabel={`Connect to ${label}`}
        onConnect={onConnect}
      />

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
