/**
 * Data — Cross-device sync, import, export, and reset.
 *
 * Own tab in the main Settings panel.
 * Groups all data management concerns: sync, backup, restore, reset.
 */

import React, { useState, useEffect } from 'react';
import { Upload, Download, ArrowCounterclockwise, InfoCircle, ArrowRepeat, ArrowClockwise, BoxArrowUpRight } from 'react-bootstrap-icons';
import { useSettingsStore } from '../../store';
import { Divider } from '../ui/Divider';
import { ConfirmButton } from '../ui/ConfirmButton';
import { SyncStatusBadge } from '../ui/SyncStatusBadge';
import { GitHubIcon } from '../../assets/brand/icons';
import { connect, disconnect, isConnected, getProfile, getGistUrl } from '../../utilities/githubAuth';
import { friendlyError } from '../../utilities/index';
import syncEngine from '../../utilities/syncEngine';
import { exportSettings, importFromFile, resetSettings } from '../../widgets/settingsIO';

const SectionLabel = ({ children }) => (
  <p style={{
    fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
    textTransform: 'uppercase', color: 'var(--w-ink-3)', marginBottom: 8,
  }}>
    {children}
  </p>
);

export const Data = () => {
  const { syncEnabled, setSyncEnabled } = useSettingsStore();
  const [importOk, setImportOk] = useState(false);
  const [importError, setImportError] = useState(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  // ── GitHub sync state ──────────────────────────────────────────────
  const [githubConnected, setGithubConnected] = useState(() => isConnected());
  const [githubProfile, setGithubProfile] = useState(null);
  const [githubConnecting, setGithubConnecting] = useState(false);
  const [githubError, setGithubError] = useState(null);
  const [deviceCode, setDeviceCode] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [gistUrl, setGistUrl] = useState(null);

  useEffect(() => {
    if (githubConnected) {
      getProfile().then((p) => { if (p) setGithubProfile(p); });
      getGistUrl().then((u) => setGistUrl(u));
    } else {
      setGistUrl(null);
    }
  }, [githubConnected]);

  const handleGithubConnect = async () => {
    setGithubError(null);
    setGithubConnecting(true);
    setDeviceCode(null);
    try {
      const profile = await connect({ onCode: setDeviceCode });
      setGithubProfile(profile);
      setGithubConnected(true);
      setSyncEnabled(true);
    } catch (err) {
      setGithubError(friendlyError(err));
    } finally {
      setGithubConnecting(false);
      setDeviceCode(null);
    }
  };

  const handleGithubDisconnect = async () => {
    await disconnect();
    setGithubConnected(false);
    setGithubProfile(null);
    setSyncEnabled(false);
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await syncEngine.forceSync();
    } catch {
      /* best-effort — engine logs failures */
    } finally {
      setSyncing(false);
    }
  };

  const handleImport = () => {
    setImportError(null);
    setImportOk(false);
    importFromFile((err) => {
      if (err) {
        setImportError(String(err));
        setTimeout(() => setImportError(null), 4000);
      } else {
        setImportOk(true);
        setTimeout(() => setImportOk(false), 2500);
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Cross-Device Sync (GitHub gist) ─────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <SectionLabel>Cross-Device Sync</SectionLabel>
          <p style={{ fontSize: 10.5, color: 'var(--w-ink-5)', marginTop: -4, lineHeight: '1.4' }}>
            Mirror settings, widgets, and events across your devices via a private GitHub gist
          </p>
        </div>

        {githubConnected ? (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 10,
            padding: '10px 12px', borderRadius: 12,
            background: 'var(--panel-bg)',
            border: '1px solid var(--card-border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden shrink-0"
                style={{
                  background: 'color-mix(in srgb, var(--w-accent) 14%, transparent)',
                  color: 'var(--w-accent)',
                }}
              >
                {githubProfile?.avatar ? (
                  <img
                    src={githubProfile.avatar}
                    alt={githubProfile.login}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-sm font-bold select-none">
                    {(githubProfile?.name?.[0] ?? 'G').toUpperCase()}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                <span className="text-[13px] font-semibold leading-tight truncate" style={{ color: 'var(--w-ink-1)' }}>
                  {githubProfile ? `Signed in as @${githubProfile.login}` : 'Connected to GitHub'}
                </span>
                <span className="text-[11px] truncate mt-0.5" style={{ color: 'var(--w-ink-4)' }}>
                  {syncEnabled ? <SyncStatusBadge /> : 'Sync paused'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleGithubDisconnect}
                className="shrink-0 flex items-center gap-1.5 text-[11px] font-semibold transition-opacity hover:opacity-70 cursor-pointer"
                style={{ color: 'var(--w-danger, #ef4444)', background: 'none', border: 'none', padding: 0 }}
              >
                Disconnect
              </button>
            </div>

            {/* Sync actions footer */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              paddingTop: 8, borderTop: '1px solid var(--w-divider)',
            }}>
              <button
                type="button"
                onClick={handleSyncNow}
                disabled={syncing}
                className="flex items-center gap-1.5 text-[11px] font-semibold transition-opacity hover:opacity-75 cursor-pointer disabled:cursor-not-allowed"
                style={{ color: 'var(--w-accent)', background: 'none', border: 'none', padding: 0 }}
              >
                {syncing
                  ? <ArrowRepeat size={11} className="animate-spin shrink-0" />
                  : <ArrowClockwise size={11} className="shrink-0" />}
                {syncing ? 'Syncing…' : 'Sync now'}
              </button>
              {gistUrl && (
                <a
                  href={gistUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-semibold transition-opacity hover:opacity-75"
                  style={{ color: 'var(--w-accent)', textDecoration: 'none' }}
                >
                  Open gist
                  <BoxArrowUpRight size={10} className="shrink-0" />
                </a>
              )}
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 10,
            padding: '10px 12px', borderRadius: 12,
            background: 'var(--panel-bg)',
            border: '1px solid var(--card-border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: 'rgba(0,0,0,0.04)',
                  border: '1px solid var(--w-divider)',
                  color: 'var(--w-ink-1)',
                }}
              >
                <GitHubIcon size={16} />
              </div>
              <span className="text-[13px] font-semibold flex-1" style={{ color: 'var(--w-ink-1)' }}>
                GitHub
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--w-ink-6)' }} />
                <span className="text-[10.5px]" style={{ color: 'var(--w-ink-5)' }}>Not connected</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span
                className="flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-full shrink-0"
                style={{ background: 'rgba(0,0,0,0.06)', color: 'var(--w-ink-3)' }}
              >
                <span className="w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: 'var(--w-ink-5)' }} />
                Private gist
              </span>
            </div>

            {/* Device-code interstitial while the user authorizes */}
            {deviceCode && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 8,
                background: 'color-mix(in srgb, var(--w-accent) 8%, transparent)',
                border: '1px solid color-mix(in srgb, var(--w-accent) 20%, transparent)',
              }}>
                <span className="text-[11px]" style={{ color: 'var(--w-ink-3)' }}>
                  Enter code
                </span>
                <span className="text-[13px] font-bold tracking-wider" style={{ color: 'var(--w-accent)', fontFamily: 'ui-monospace, monospace' }}>
                  {deviceCode.userCode}
                </span>
                <span className="text-[11px] truncate" style={{ color: 'var(--w-ink-4)' }}>
                  at github.com/login/device
                </span>
              </div>
            )}

            {githubError && (
              <p className="text-[11px] leading-snug m-0" style={{ color: 'var(--w-danger)' }} aria-live="polite" role="alert">
                {githubError}
              </p>
            )}

            <button
              type="button"
              onClick={handleGithubConnect}
              disabled={githubConnecting}
              className="w-full h-9 flex items-center justify-center gap-2 rounded-xl text-[12px] font-semibold transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed"
              style={{
                background: 'var(--w-accent)',
                color: 'var(--w-accent-fg)',
                border: 'none',
                opacity: githubConnecting ? 0.7 : 1,
              }}
            >
              {githubConnecting && <ArrowRepeat size={12} className="animate-spin shrink-0" />}
              {githubConnecting ? 'Waiting for authorization…' : 'Connect with GitHub'}
            </button>
          </div>
        )}
      </div>

      {/* ── Separator ── */}
      <Divider />

      {/* ── Import / Export ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <SectionLabel>Backup &amp; Restore</SectionLabel>
            <p style={{ fontSize: 10.5, color: 'var(--w-ink-5)', marginTop: -4, lineHeight: '1.4' }}>
              Export your settings as a backup, or import from a previous export
            </p>
          </div>
          <button
            type="button"
            className="relative"
            onMouseEnter={() => setShowDisclaimer(true)}
            onMouseLeave={() => setShowDisclaimer(false)}
            aria-label="Import info"
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'default',
              display: 'flex', alignItems: 'center', flexShrink: 0, marginTop: 1,
            }}
          >
            <InfoCircle size={13} style={{ color: 'var(--w-ink-4)' }} />
            {showDisclaimer && (
              <div
                style={{
                  position: 'absolute', right: 0, top: '100%', marginTop: 6,
                  width: 220, padding: '8px 12px', borderRadius: 10,
                  fontSize: 10, fontWeight: 500, lineHeight: 1.45,
                  background: 'var(--card-bg)',
                  backdropFilter: 'var(--card-blur)',
                  WebkitBackdropFilter: 'var(--card-blur)',
                  border: '1px solid var(--card-border)',
                  color: 'var(--w-ink-3)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                  zIndex: 20,
                }}
              >
                Importing will replace all current settings, widgets, and data. Export first to keep a backup.
              </div>
            )}
          </button>
        </div>

        {/* Buttons */}
        <div style={{
          display: 'flex', gap: 8,
          padding: 3, borderRadius: 11,
          background: 'var(--panel-bg)',
          border: '1px solid var(--card-border)',
        }}>
          <button
            type="button"
            onClick={exportSettings}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 6, padding: '9px 0', borderRadius: 8,
              border: 'none', cursor: 'pointer',
              fontSize: 11.5, fontWeight: 600,
              background: 'var(--w-accent)',
              color: 'var(--w-accent-fg)',
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            <Download size={12} />
            Export
          </button>
          <button
            type="button"
            onClick={handleImport}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 6, padding: '9px 0', borderRadius: 8,
              border: 'none', cursor: 'pointer',
              fontSize: 11.5, fontWeight: 600,
              background: 'var(--w-accent)',
              color: 'var(--w-accent-fg)',
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            <Upload size={12} />
            Import
          </button>
        </div>

        {importError && (
          <div style={{
            borderRadius: 8, padding: '6px 10px',
            background: 'color-mix(in srgb, var(--w-danger, #ef4444) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--w-danger, #ef4444) 20%, transparent)',
            fontSize: 10, fontWeight: 500, color: 'var(--w-danger, #ef4444)',
            lineHeight: 1.4,
          }}>
            {importError}
          </div>
        )}

        {importOk && (
          <p style={{
            fontSize: 10.5, fontWeight: 500,
            color: 'var(--w-success, #22c55e)',
            textAlign: 'center',
          }}>
            ✓ Settings imported successfully. Reloading...
          </p>
        )}
      </div>

      {/* ── Separator ── */}
      <Divider />

      {/* ── Reset ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div>
          <SectionLabel>Reset</SectionLabel>
          <p style={{ fontSize: 10.5, color: 'var(--w-ink-5)', marginTop: -4, lineHeight: '1.4' }}>
            Clear all settings, widgets, and cached data. This cannot be undone.
          </p>
        </div>

        <div style={{
          display: 'flex', gap: 8,
          padding: 3, borderRadius: 11,
          background: 'var(--panel-bg)',
          border: '1px solid var(--card-border)',
        }}>
          <ConfirmButton
            onConfirm={resetSettings}
            label="Reset all settings"
            danger
            timeout={4000}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 6, padding: '9px 0', borderRadius: 8,
              border: 'none', cursor: 'pointer',
              fontSize: 11.5, fontWeight: 600,
              background: 'color-mix(in srgb, var(--w-danger, #ef4444) 9%, transparent)',
              color: 'var(--w-danger, #ef4444)',
              transition: 'background 0.15s ease',
            }}
          >
            <ArrowCounterclockwise size={12} />
            Reset All Settings
          </ConfirmButton>
        </div>
      </div>

      {/* ── Guidance ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        padding: '8px 12px', borderRadius: 10,
        background: 'var(--panel-bg)',
        border: '1px solid var(--card-border)',
      }}>
        <InfoCircle size={13} style={{ color: 'var(--w-ink-4)', flexShrink: 0, marginTop: 1 }} />
        <p style={{ fontSize: 10, fontWeight: 500, color: 'var(--w-ink-4)', lineHeight: 1.45 }}>
          Your data stays in your browser unless you enable cross-device sync, which stores a copy in your private GitHub gist. Exports are saved as a .json file. Use them to transfer settings between devices or keep a safety backup.
        </p>
      </div>
    </div>
  );
};

