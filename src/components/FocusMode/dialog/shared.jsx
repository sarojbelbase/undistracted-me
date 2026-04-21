/**
 * Shared primitives for Focus Mode dialogs (Tasks, SearchBar, etc.)
 *
 * All colors come from theme.jsx (the dark glass source of truth).
 * Never hardcode colors here — import FM_* constants from '../theme'.
 */

import React from 'react';
import { XLg } from 'react-bootstrap-icons';
import { useGoogleAccountStore } from '../../../store/useGoogleAccountStore';
import {
  FOCUS_THEME, DIALOG_STYLE, SECTION_BORDER, SECTION_CARD_STYLE,
  FM_SURFACE, FM_SURFACE_2, FM_BORDER, FM_DIVIDER,
  FM_INK_1, FM_INK_2, FM_INK_3, FM_INK_4,
  FM_TOGGLE_THUMB, FM_TOGGLE_SHADOW, FM_TOGGLE_OFF_BG,
  FM_CLOSE_BG, FM_CLOSE_BG_HOVER, FM_CLOSE_BORDER, FM_CLOSE_COLOR,
  FM_SUCCESS, FM_SUCCESS_DOT, FM_SYNC_BG, FM_SYNC_BORDER,
} from '../theme';

// Re-export the dialog surface tokens so dialog files can import from one place
export { DIALOG_STYLE, SECTION_BORDER, SECTION_CARD_STYLE };

// ─── Icons ────────────────────────────────────────────────────────────────────

export const IconGoogle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export const IconSpinner = () => (
  <svg
    width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"
    style={{ animation: 'tdSpin 0.75s linear infinite', flexShrink: 0 }}
  >
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2.2" strokeOpacity="0.25" />
    <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

// ─── Close button ─────────────────────────────────────────────────────────────

export const CloseButton = ({ onClose }) => (
  <button
    type="button"
    onClick={onClose}
    aria-label="Close"
    style={{
      flexShrink: 0,
      width: 26, height: 26,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: FM_CLOSE_BG,
      border: `1px solid ${FM_CLOSE_BORDER}`,
      borderRadius: '50%',
      cursor: 'pointer',
      color: FM_CLOSE_COLOR,
      transition: 'background 0.15s',
    }}
    onMouseEnter={e => { e.currentTarget.style.background = FM_CLOSE_BG_HOVER; }}
    onMouseLeave={e => { e.currentTarget.style.background = FM_CLOSE_BG; }}
  >
    <XLg size={10} />
  </button>
);

// ─── Dialog header ────────────────────────────────────────────────────────────

export const DialogHeader = ({ icon, title, subtitle, onClose }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '16px 18px',
    borderBottom: `1px solid ${FM_DIVIDER}`,
  }}>
    {icon && (
      <div style={{
        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
        background: FM_SURFACE,
        border: `1px solid ${FM_BORDER}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
    )}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 14.5, fontWeight: 700, color: FM_INK_1, lineHeight: '1.2' }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: 11.5, color: FM_INK_3, marginTop: 2 }}>
          {subtitle}
        </div>
      )}
    </div>
    <CloseButton onClose={onClose} />
  </div>
);

// ─── Section label ────────────────────────────────────────────────────────────

export const SectionLabel = ({ children }) => (
  <div style={{
    fontSize: 10, fontWeight: 700,
    letterSpacing: '0.09em', textTransform: 'uppercase',
    color: FM_INK_3,
    marginBottom: 8,
  }}>
    {children}
  </div>
);

// ─── Toggle switch ────────────────────────────────────────────────────────────

export const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    style={{
      flexShrink: 0,
      width: 34, height: 19, borderRadius: 10,
      background: checked ? 'var(--w-accent)' : FM_TOGGLE_OFF_BG,
      border: 'none', cursor: 'pointer', padding: 2,
      transition: 'background 0.18s ease',
    }}
  >
    <div style={{
      width: 15, height: 15, borderRadius: '50%',
      background: FM_TOGGLE_THUMB,
      boxShadow: FM_TOGGLE_SHADOW,
      transition: 'transform 0.18s ease',
      transform: checked ? 'translateX(15px)' : 'translateX(0)',
    }} />
  </button>
);

// ─── Toggle row ───────────────────────────────────────────────────────────────

export const ToggleRow = ({ label, description, checked, onChange, borderTop = false }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    padding: '11px 14px',
    borderTop: borderTop ? SECTION_BORDER : 'none',
  }}>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: FM_INK_1, lineHeight: '1.3' }}>
        {label}
      </div>
      {description && (
        <div style={{ fontSize: 11.5, color: FM_INK_3, marginTop: 2, lineHeight: '1.4' }}>
          {description}
        </div>
      )}
    </div>
    <Toggle checked={checked} onChange={onChange} />
  </div>
);

// ─── Profile avatar ───────────────────────────────────────────────────────────

export const ProfileAvatar = ({ picture, name, size = 44 }) => {
  const initials = name
    ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      overflow: 'hidden', flexShrink: 0,
      background: 'color-mix(in srgb, var(--w-accent) 22%, transparent)',
      border: '2px solid color-mix(in srgb, var(--w-accent) 30%, transparent)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {picture
        ? <img src={picture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: size * 0.33, fontWeight: 700, color: 'var(--w-accent)', letterSpacing: '-0.01em' }}>{initials}</span>
      }
    </div>
  );
};

// ─── Sync badge ───────────────────────────────────────────────────────────────

const SyncBadge = () => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '3px 8px', borderRadius: 20, flexShrink: 0,
    background: FM_SYNC_BG,
    border: `1px solid ${FM_SYNC_BORDER}`,
  }}>
    <div style={{ width: 5, height: 5, borderRadius: '50%', background: FM_SUCCESS_DOT }} />
    <span style={{ fontSize: 10.5, fontWeight: 600, color: FM_SUCCESS }}>Synced</span>
  </div>
);

// ─── Google Account section ───────────────────────────────────────────────────
//
// Shows profile card when connected+profile known, simple "connected" badge
// when connected but no profile yet, and sign-in CTA when disconnected.
// Used by both TasksDialog and SearchBarDialog.

export const AccountSection = ({ serviceName = 'Google' }) => {
  const { connected, profile } = useGoogleAccountStore();

  if (connected && profile) {
    return (
      <div style={{ ...SECTION_CARD_STYLE, padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ProfileAvatar picture={profile.picture} name={profile.name} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13.5, fontWeight: 600, color: FM_INK_1,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {profile.name ?? 'Google Account'}
            </div>
            {profile.email && (
              <div style={{
                fontSize: 11.5, color: FM_INK_3, marginTop: 2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {profile.email}
              </div>
            )}
          </div>
          <SyncBadge />
        </div>
      </div>
    );
  }

  if (connected) {
    return (
      <div style={{
        ...SECTION_CARD_STYLE,
        padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: FM_SUCCESS_DOT, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: FM_INK_1 }}>
          {serviceName} connected
        </span>
      </div>
    );
  }

  return (
    <div style={{ ...SECTION_CARD_STYLE, padding: '14px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: FM_INK_4, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 500, color: FM_INK_1 }}>Not connected</span>
      </div>
      <p style={{ fontSize: 12, color: FM_INK_3, lineHeight: '1.55', margin: 0 }}>
        Open <strong style={{ color: FM_INK_2 }}>Settings › Accounts</strong> to connect your Google account and enable {serviceName}.
      </p>
    </div>
  );
};
