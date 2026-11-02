/**
 * Accounts — Inline Google + Spotify account management.
 * Self-contained: no AccountsDialog dependency.
 * Canvas mode: uses var(--card-*) / var(--w-*) CSS tokens only.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ExclamationTriangleFill } from 'react-bootstrap-icons';
import { AccountCard } from '../ui/AccountCard';
import { useGoogleAccountStore } from '../../store/useGoogleAccountStore';
import { useSettingsStore } from '../../store';
import { GoogleIcon, SpotifyIcon, GitHubIcon } from '../../assets/brand/icons';
import {
  SPOTIFY_CLIENT_ID,
  connectSpotify,
  disconnectSpotify,
  isSpotifyConnected,
  fetchAndCacheProfile as fetchSpotifyProfile,
  getSpotifyProfile,
} from '../../widgets/media/utils';
import { connect, disconnect, isConnected, getProfile } from '../../utilities/githubAuth';
import syncEngine from '../../utilities/syncEngine';
import { friendlyError } from '../../utilities/index';
import { SyncHelpDialog } from '../ui/SyncHelpDialog';

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

// ─── GitHub (cross-device sync) section ─────────────────────────────────────

const GITHUB_SCOPES = ['Private gist', 'Sync across devices'];

const GitHubSection = () => {
  const [connected, setConnected] = useState(() => isConnected());
  const [profile, setProfile] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [deviceCode, setDeviceCode] = useState(null);
  const [syncError, setSyncError] = useState(() => syncEngine.getSyncStatus().lastError);
  const [showHelp, setShowHelp] = useState(false);
  const setSyncEnabled = useSettingsStore((s) => s.setSyncEnabled);

  useEffect(() => {
    if (connected) getProfile().then((p) => { if (p) setProfile(p); });
  }, [connected]);

  // Track the latest sync error so we can surface "what's next" guidance.
  useEffect(() => {
    const refresh = () => setSyncError(syncEngine.getSyncStatus().lastError);
    return syncEngine.onSyncChange(refresh);
  }, []);

  const handleConnect = useCallback(async () => {
    setError(null);
    setConnecting(true);
    setDeviceCode(null);
    try {
      const p = await connect({ onCode: setDeviceCode });
      setProfile(p);
      setConnected(true);
      setSyncEnabled(true);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setConnecting(false);
      setDeviceCode(null);
    }
  }, [setSyncEnabled]);

  const handleDisconnect = useCallback(async () => {
    await disconnect();
    setConnected(false);
    setProfile(null);
    setSyncEnabled(false);
    setSyncError(null);
  }, [setSyncEnabled]);

  const [copied, setCopied] = useState(false);

  const copyCode = useCallback(async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — user can type the code manually */
    }
  }, []);

  const openDevicePage = useCallback((url) => {
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) { // eslint-disable-line no-undef
      chrome.tabs.create({ url }); // eslint-disable-line no-undef
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  const handleReconnect = useCallback(() => {
    setShowHelp(false);
    handleDisconnect().then(() => handleConnect());
  }, [handleDisconnect, handleConnect]);

  const handleOpenSettings = useCallback(() => {
    openDevicePage('https://github.com/settings/developers');
  }, [openDevicePage]);

  const normalisedProfile = profile
    ? { name: profile.name || profile.login, picture: profile.avatar }
    : null;

  return (
    <div className="flex flex-col gap-3">
      <AccountCard
        icon={<GitHubIcon size={18} />}
        serviceName="GitHub"
        scopes={GITHUB_SCOPES}
        connected={connected}
        connecting={connecting}
        error={error}
        profile={normalisedProfile}
        profileSubtitle={profile ? `@${profile.login}` : null}
        connectLabel="Connect with GitHub"
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />

      {/* Pair-code reminder — stays visible until the connection completes */}
      {deviceCode && (
        <div
          className="flex flex-col gap-3 rounded-xl px-4 py-3"
          style={{
            background: 'color-mix(in srgb, var(--w-accent) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--w-accent) 22%, transparent)',
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
              <span className="text-[10.5px]" style={{ color: 'var(--w-ink-3)' }}>
                Copy this code, then open GitHub to finish connecting
              </span>
              <span
                className="text-[24px] font-extrabold tracking-[0.2em] leading-tight"
                style={{ color: 'var(--w-accent)', fontFamily: 'ui-monospace, monospace' }}
              >
                {deviceCode.userCode}
              </span>
            </div>
            <button
              type="button"
              onClick={() => copyCode(deviceCode.userCode)}
              className="shrink-0 rounded-lg px-3 py-2 text-[11px] font-semibold transition-opacity hover:opacity-90 cursor-pointer"
              style={{ background: 'var(--w-accent)', color: 'var(--w-accent-fg)', border: 'none' }}
            >
              {copied ? 'Copied!' : 'Copy code'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => openDevicePage(deviceCode.verificationUri)}
            className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-semibold transition-opacity hover:opacity-90 cursor-pointer"
            style={{
              background: 'transparent',
              border: '1px solid color-mix(in srgb, var(--w-accent) 40%, transparent)',
              color: 'var(--w-accent)',
            }}
          >
            Open github.com/login/device
          </button>
        </div>
      )}

      {/* Sync error → "what's next" guidance */}
      {connected && syncError && (
        <div
          className="flex items-center gap-2.5 rounded-xl px-3.5 py-3"
          style={{
            background: 'color-mix(in srgb, var(--w-danger, #ef4444) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--w-danger, #ef4444) 22%, transparent)',
          }}
        >
          <ExclamationTriangleFill
            size={14}
            style={{ color: 'var(--w-danger, #ef4444)', flexShrink: 0 }}
          />
          <span className="text-[11.5px] leading-snug flex-1" style={{ color: 'var(--w-ink-3)' }}>
            Sync needs a quick fix to start saving your settings.
          </span>
          <button
            type="button"
            onClick={() => setShowHelp(true)}
            className="shrink-0 text-[11.5px] font-semibold transition-opacity hover:opacity-75 cursor-pointer"
            style={{ color: 'var(--w-accent)', background: 'none', border: 'none', padding: 0 }}
          >
            What&rsquo;s next?
          </button>
        </div>
      )}

      {/* "What to do next" help dialog */}
      {showHelp && (
        <SyncHelpDialog
          onClose={() => setShowHelp(false)}
          onReconnect={handleReconnect}
          onOpenSettings={handleOpenSettings}
          reason={syncError}
        />
      )}
    </div>
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
          <div className="flex-1 h-px" style={{ background: 'var(--w-divider)' }} />
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
          <div className="flex-1 h-px" style={{ background: 'var(--w-divider)' }} />
        </div>
        <SpotifySection />
      </div>

      {/* ── Sync (GitHub) ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-bold tracking-widest uppercase"
            style={{ color: 'var(--w-ink-4)' }}
          >
            Sync
          </span>
          <div className="flex-1 h-px" style={{ background: 'var(--w-divider)' }} />
        </div>
        <GitHubSection />
      </div>

      {/* ── Footer ── */}
      <div
        className="flex items-center justify-center pt-1"
        style={{ borderTop: '1px solid var(--w-divider)' }}
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

