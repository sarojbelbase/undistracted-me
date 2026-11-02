/**
 * SyncStatusBadge — small indicator showing cross-device sync status.
 *
 * Displays:
 *   - "Synced just now" / "Synced Xm ago" when sync is active
 *   - "Not connected" when GitHub isn't linked
 *   - "Sync paused" when disabled
 *   - "Sync unavailable" in web mode (no extension APIs)
 *
 * Used in the General settings panel and optionally in the app header.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRepeat, CheckCircleFill } from 'react-bootstrap-icons';
import syncEngine from '../../utilities/syncEngine';
import { isConnected } from '../../utilities/githubAuth';
import { useSettingsStore } from '../../store';

/** Human-readable relative time string (e.g. "just now", "2m ago"). */
const timeAgo = (timestamp) => {
  if (!timestamp) return 'never';
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const SyncStatusBadge = ({ compact = false }) => {
  const syncEnabled = useSettingsStore((s) => s.syncEnabled);
  const [status, setStatus] = useState(() => syncEngine.getSyncStatus());
  const [connected, setConnected] = useState(() => isConnected());

  const refresh = useCallback(() => {
    setStatus(syncEngine.getSyncStatus());
    setConnected(isConnected());
  }, []);

  useEffect(() => {
    refresh();
    const unsub = syncEngine.onSyncChange(() => refresh());
    // Poll every 30s for the "Xm ago" text
    const interval = setInterval(refresh, 30000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [refresh]);

  // ── Not available (web mode) ──────────────────────────────────────────
  if (!status.available) {
    if (compact) return null;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: 'var(--w-ink-5)' }}>
        <ArrowRepeat size={12} />
        <span>Sync unavailable</span>
      </div>
    );
  }

  // ── Not connected to GitHub ───────────────────────────────────────────
  if (!connected) {
    if (compact) return null;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: 'var(--w-ink-5)' }}>
        <ArrowRepeat size={12} />
        <span>Not connected</span>
      </div>
    );
  }

  // ── Disabled ──────────────────────────────────────────────────────────
  if (!syncEnabled) {
    if (compact) return null;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: 'var(--w-ink-5)' }}>
        <ArrowRepeat size={12} />
        <span>Sync paused</span>
      </div>
    );
  }

  // ── Active ────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: 'var(--w-ink-4)' }}>
      <CheckCircleFill size={11} style={{ color: 'var(--w-accent)' }} />
      <span>Synced {timeAgo(status.lastSyncAt)}</span>
    </div>
  );
};

export default SyncStatusBadge;
