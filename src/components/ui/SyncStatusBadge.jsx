/**
 * SyncStatusBadge — small indicator showing cross-device sync status.
 *
 * Displays:
 *   - "Synced just now" / "Synced Xm ago" when sync is active
 *   - "Sync paused" when disabled
 *   - "Sync unavailable" in web mode (no chrome.storage.sync)
 *   - Quota warning when chrome.storage.sync is full
 *
 * Used in the General settings panel and optionally in the app header.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRepeat, CheckCircleFill, ExclamationTriangleFill } from 'react-bootstrap-icons';
import syncEngine from '../../utilities/syncEngine';
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
  const [quota, setQuota] = useState({ totalBytes: 0, percentUsed: 0, maxBytes: 90000 });

  const refresh = useCallback(() => {
    setStatus(syncEngine.getSyncStatus());
    // Fetch quota info asynchronously
    syncEngine.getQuotaInfo().then(setQuota).catch(() => { });
  }, []);

  useEffect(() => {
    refresh();
    const unsub = syncEngine.onSyncChange(() => refresh());
    // Poll every 30s for "Xm ago" text and quota updates
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
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 10.5, color: 'var(--w-ink-5)',
      }}>
        <ArrowRepeat size={12} />
        <span>Sync unavailable</span>
      </div>
    );
  }

  // ── Disabled ──────────────────────────────────────────────────────────
  if (!syncEnabled) {
    if (compact) return null;
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 10.5, color: 'var(--w-ink-5)',
      }}>
        <ArrowRepeat size={12} />
        <span>Sync paused</span>
      </div>
    );
  }

  // ── Quota warning ─────────────────────────────────────────────────────
  if (status.quotaWarning) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 10.5, color: '#f59e0b',
      }}>
        <ExclamationTriangleFill size={12} />
        <span>Sync storage full</span>
      </div>
    );
  }

  // ── Active ────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 10.5, color: 'var(--w-ink-4)',
      }}>
        <CheckCircleFill size={11} style={{ color: 'var(--w-accent)' }} />
        <span>Synced {timeAgo(status.lastSyncAt)}</span>
        {quota.percentUsed > 0 && (
          <span style={{ color: 'var(--w-ink-5)', marginLeft: 2 }}>
            · {quota.percentUsed}% used
          </span>
        )}
      </div>
      {/* Quota bar — only shown when >20% used */}
      {quota.percentUsed > 20 && (
        <div style={{
          width: '100%', height: 3, borderRadius: 2,
          background: 'var(--w-ink-6)',
          overflow: 'hidden',
        }}>
          <div style={{
            width: Math.min(quota.percentUsed, 100) + '%',
            height: '100%', borderRadius: 2,
            background: quota.percentUsed > 80
              ? '#f59e0b'
              : 'var(--w-accent)',
            transition: 'width 0.5s ease',
          }} />
        </div>
      )}
    </div>
  );
};

export default SyncStatusBadge;
