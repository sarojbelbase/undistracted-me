/**
 * Data — Cross-device sync, import, export, and reset.
 *
 * Own tab in the main Settings panel.
 * Groups all data management concerns: sync, backup, restore, reset.
 *
 * Note: the GitHub account connection (connect/disconnect) lives in the
 * Accounts tab; this tab only surfaces sync status and actions.
 */

import React, { useState, useEffect } from 'react';
import { Upload, Download, ArrowCounterclockwise, InfoCircle, ArrowRepeat, ArrowClockwise, BoxArrowUpRight, CheckCircleFill } from 'react-bootstrap-icons';
import { Divider } from '../ui/Divider';
import { ConfirmButton } from '../ui/ConfirmButton';
import { SyncStatusBadge } from '../ui/SyncStatusBadge';
import { isConnected, getGistUrl } from '../../utilities/githubAuth';
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

export const Data = ({ onNavigateToAccounts }) => {
  const [importOk, setImportOk] = useState(false);
  const [importError, setImportError] = useState(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  // ── Sync state ─────────────────────────────────────────────────────
  const [githubConnected, setGithubConnected] = useState(() => isConnected());
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const [gistUrl, setGistUrl] = useState(null);

  useEffect(() => {
    if (githubConnected) {
      getGistUrl().then((u) => setGistUrl(u));
    } else {
      setGistUrl(null);
    }
  }, [githubConnected]);

  const handleSyncNow = async () => {
    if (syncing) return;
    setSyncing(true);
    setJustSynced(false);
    try {
      await syncEngine.forceSync();
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 2500);
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

      {/* ── Cross-Device Sync ──────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <SectionLabel>Cross-Device Sync</SectionLabel>
          <p style={{ fontSize: 10.5, color: 'var(--w-ink-5)', marginTop: -4, lineHeight: '1.4' }}>
            Mirror settings, widgets, and events across your devices
          </p>
        </div>

        {githubConnected ? (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 10,
            padding: '12px 14px', borderRadius: 12,
            background: 'var(--panel-bg)',
            border: '1px solid var(--card-border)',
          }}>
            {/* Status + config link */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div role="status" aria-live="polite">
                <SyncStatusBadge />
              </div>
              {gistUrl && (
                <a
                  href={gistUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10.5px] font-semibold transition-opacity hover:opacity-70"
                  style={{ color: 'var(--w-ink-4)', textDecoration: 'none', flexShrink: 0 }}
                >
                  Go to config
                  <BoxArrowUpRight size={10} className="shrink-0" />
                </a>
              )}
            </div>

            {/* Sync now — primary action */}
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={syncing}
              className="flex items-center justify-center gap-1.5 text-[11.5px] font-semibold transition-opacity cursor-pointer disabled:cursor-not-allowed"
              style={{
                borderRadius: 8, padding: '8px 0', border: 'none',
                background: 'var(--w-accent)', color: 'var(--w-accent-fg)',
              }}
            >
              {syncing
                ? <ArrowRepeat size={12} className="animate-spin shrink-0" />
                : justSynced
                  ? <CheckCircleFill size={12} className="shrink-0" />
                  : <ArrowClockwise size={12} className="shrink-0" />}
              {syncing ? 'Syncing…' : justSynced ? 'Synced' : 'Sync now'}
            </button>

            <p style={{ fontSize: 10, color: 'var(--w-ink-5)', lineHeight: 1.4, margin: 0, textAlign: 'center' }}>
              Auto-syncs once a day — or tap Sync now.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 12,
            background: 'var(--panel-bg)',
            border: '1px solid var(--card-border)',
          }}>
            <InfoCircle size={13} style={{ color: 'var(--w-ink-4)', flexShrink: 0 }} />
            <p style={{ fontSize: 10.5, color: 'var(--w-ink-4)', lineHeight: 1.45, margin: 0, flex: 1 }}>
              Sign in with GitHub in the Accounts tab to sync across devices.
            </p>
            <button
              type="button"
              onClick={onNavigateToAccounts}
              className="shrink-0 text-[11px] font-semibold transition-opacity hover:opacity-75 cursor-pointer"
              style={{ color: 'var(--w-accent)', background: 'none', border: 'none', padding: 0 }}
            >
              Open Accounts
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
