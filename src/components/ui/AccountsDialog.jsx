import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from './Modal';
import { AccountCard } from './AccountCard';
import { useGoogleAccountStore } from '../../store/useGoogleAccountStore';
import {
  SPOTIFY_CLIENT_ID,
  connectSpotify,
  disconnectSpotify,
  isSpotifyConnected,
  fetchAndCacheProfile as fetchSpotifyProfile,
  getSpotifyProfile,
} from '../../widgets/spotify/utils';

// ─── Google icon ──────────────────────────────────────────────────────────────

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20H24v8h11.3c-1.1 5.4-5.9 9-11.3 9-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9L37.4 9.4C33.8 6.1 29.1 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-8 20-20 0-1.3-.1-2.7-.4-4z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c3 0 5.7 1.1 7.8 2.9L37.4 9.4C33.8 6.1 29.1 4 24 4c-7.9 0-14.8 4.3-18.7 10.7z" />
    <path fill="#4CAF50" d="M24 44c5 0 9.6-1.9 13-5l-6-5.2C29.2 35.6 26.7 36 24 36c-5.3 0-10.1-3.5-11.3-8.8l-6.5 5C9.2 39.6 16 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.5 2.4-1.8 4.5-3.6 6l6 5.2C41 35.5 44 30.1 44 24c0-1.3-.1-2.7-.4-4z" />
  </svg>
);

// ─── Spotify icon ─────────────────────────────────────────────────────────────

const SpotifyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#1DB954" aria-hidden="true">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
  </svg>
);

// ─── Google scopes ────────────────────────────────────────────────────────────

const GOOGLE_SCOPES = ['Calendar events', 'Contact birthdays', 'Drive file search', 'Task management'];
const GOOGLE_DESCRIPTION =
  'One sign-in powers all Google-connected widgets. Enables upcoming events, contact birthdays, Drive search, and your task list — across every tab you open.';

/** Custom event for Spotify connection changes — widgets listen to keep their state in sync. */
export const SPOTIFY_ACCOUNT_CHANGED = 'spotify_account_changed';

// ─── Spotify section ──────────────────────────────────────────────────────────

const SpotifySection = () => {
  const [connected, setConnected] = useState(() => isSpotifyConnected());
  const [profile, setProfile] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (connected) getSpotifyProfile().then(p => { if (p) setProfile(p); });
  }, [connected]);

  const handleConnect = useCallback(async () => {
    if (!SPOTIFY_CLIENT_ID) {
      setError('Spotify client ID not configured.');
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      await connectSpotify();
      const p = await fetchSpotifyProfile();
      setConnected(true);
      if (p) setProfile(p);
      window.dispatchEvent(new CustomEvent(SPOTIFY_ACCOUNT_CHANGED, { detail: { connected: true, profile: p } }));
    } catch (err) {
      setError(err.message || 'Could not connect. Try again.');
    } finally {
      setConnecting(false);
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    disconnectSpotify();
    setConnected(false);
    setProfile(null);
    window.dispatchEvent(new CustomEvent(SPOTIFY_ACCOUNT_CHANGED, { detail: { connected: false, profile: null } }));
  }, []);

  if (!SPOTIFY_CLIENT_ID) return null;

  return (
    <AccountCard
      icon={<SpotifyIcon />}
      serviceName="Spotify"
      description="Playback controls and now-playing info directly on your canvas and in Focus Mode."
      scopes={['Playback control', 'Currently playing', 'Skip & pause']}
      connected={connected}
      connecting={connecting}
      error={error}
      profile={profile}
      connectLabel="Connect Spotify"
      onConnect={handleConnect}
      onDisconnect={handleDisconnect}
    />
  );
};

// ─── Dialog ───────────────────────────────────────────────────────────────────

export const AccountsDialog = ({ onClose }) => {
  const { connected, connecting, disconnecting, error, profile, connect, disconnect } = useGoogleAccountStore();

  return (
    <Modal
      title="Connected Accounts"
      onClose={onClose}
      className="w-[90vw] max-w-[500px]"
      maxHeight="85vh"
    >
      <div className="flex flex-col gap-6 py-2">

        {/* ── Google Workspace ── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-bold tracking-widest uppercase"
              style={{ color: 'var(--w-ink-4)' }}
            >
              Google Workspace
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(0,0,0,0.08)' }} />
          </div>
          <AccountCard
            icon={<GoogleIcon />}
            serviceName="Google"
            description={GOOGLE_DESCRIPTION}
            scopes={GOOGLE_SCOPES}
            connected={connected}
            connecting={connecting}
            disconnecting={disconnecting}
            error={error}
            profile={profile}
            connectLabel="Connect with Google"
            onConnect={connect}
            onDisconnect={disconnect}
          />
        </div>

        {/* ── Media ── */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-bold tracking-widest uppercase"
              style={{ color: 'var(--w-ink-4)' }}
            >
              Media
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(0,0,0,0.08)' }} />
          </div>
          <SpotifySection />
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center justify-center pt-1"
          style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}
        >
          <a
            href="https://undistractedme.sarojbelbase.com.np/pp-and-tos"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] transition-opacity hover:opacity-75"
            style={{ color: 'var(--w-ink-4)', textDecoration: 'none' }}
          >
            Privacy Policy &amp; Terms of Service
          </a>
        </div>

      </div>
    </Modal>
  );
};
