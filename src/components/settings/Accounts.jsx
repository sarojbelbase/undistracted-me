/**
 * Accounts — Inline Google + Spotify account management.
 * Self-contained: no AccountsDialog dependency.
 * Canvas mode: uses var(--card-*) / var(--w-*) CSS tokens only.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AccountCard } from '../ui/AccountCard';
import { useGoogleAccountStore } from '../../store/useGoogleAccountStore';
import { GoogleIcon, SpotifyIcon } from '../../assets/brand/icons';
import {
  SPOTIFY_CLIENT_ID,
  connectSpotify,
  disconnectSpotify,
  isSpotifyConnected,
  fetchAndCacheProfile as fetchSpotifyProfile,
  getSpotifyProfile,
} from '../../widgets/media/utils';
import { friendlyError } from '../../utilities/index';

// Event key shared with media/Widget.jsx for Spotify connect/disconnect sync.
const SPOTIFY_ACCOUNT_CHANGED = 'spotify_account_changed';

const GOOGLE_SCOPES = ['Calendar events', 'Contact birthdays', 'Task management'];
const SPOTIFY_SCOPES = ['Playback control', 'Currently playing', 'Skip & pause'];

// ─── Spotify tier label ───────────────────────────────────────────────────────

const spotifySubtitle = (profile) => {
  if (!profile) return null;
  const tier = profile.product;
  if (tier === 'premium') return 'Spotify Premium';
  if (tier === 'free' || tier === 'open') return 'Spotify Free';
  return profile.name ?? null;
};

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
      globalThis.dispatchEvent(new CustomEvent(SPOTIFY_ACCOUNT_CHANGED, { detail: { connected: true, profile: p } }));
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setConnecting(false);
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    disconnectSpotify();
    setConnected(false);
    setProfile(null);
    globalThis.dispatchEvent(new CustomEvent(SPOTIFY_ACCOUNT_CHANGED, { detail: { connected: false, profile: null } }));
  }, []);

  if (!SPOTIFY_CLIENT_ID) return null;

  // Normalise profile: Spotify uses `avatar`, AccountCard expects `picture`
  const normalisedProfile = profile ? { ...profile, picture: profile.avatar ?? null } : null;

  return (
    <AccountCard
      icon={<SpotifyIcon size={18} />}
      serviceName="Spotify"
      scopes={SPOTIFY_SCOPES}
      connected={connected}
      connecting={connecting}
      error={error}
      profile={normalisedProfile}
      profileSubtitle={spotifySubtitle(profile)}
      connectLabel="Connect Spotify"
      onConnect={handleConnect}
      onDisconnect={handleDisconnect}
    />
  );
};

// ─── Main export ──────────────────────────────────────────────────────────────

export const Accounts = () => {
  const { connected, connecting, disconnecting, error, profile, connect, disconnect } = useGoogleAccountStore();

  return (
    <div className="flex flex-col gap-6">

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
          icon={<GoogleIcon size={18} />}
          serviceName="Google"
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
  );
};

