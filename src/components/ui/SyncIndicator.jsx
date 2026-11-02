/**
 * SyncIndicator — a compact sync-status button for the top control cluster.
 *
 * Reflects cross-device sync state as a cloud icon:
 *   - grey   — not connected (or unavailable in web mode)
 *   - accent — connected and syncing
 *
 * Hover shows a tooltip with the last-synced time. Clicking opens Settings → Data.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { CloudArrowUpFill } from 'react-bootstrap-icons';
import syncEngine from '../../utilities/syncEngine';
import { isConnected } from '../../utilities/githubAuth';
import { TooltipBtn } from './TooltipBtn';

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
  return `${Math.floor(hours / 24)}d ago`;
};

export const SyncIndicator = ({ isDark, onClick }) => {
  const [status, setStatus] = useState(() => syncEngine.getSyncStatus());
  const [connected, setConnected] = useState(() => isConnected());

  const refresh = useCallback(() => {
    setStatus(syncEngine.getSyncStatus());
    setConnected(isConnected());
  }, []);

  useEffect(() => {
    refresh();
    const unsub = syncEngine.onSyncChange(refresh);
    const interval = setInterval(refresh, 30000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [refresh]);

  const hoverBg = isDark ? 'hover:bg-white/10' : 'hover:bg-black/10';
  const iconColor = connected ? 'var(--w-accent)' : 'var(--w-ink-5)';

  let tooltip;
  if (!status.available) tooltip = 'Sync unavailable in web mode';
  else if (!connected) tooltip = 'Not connected — click to set up sync';
  else if (status.lastSyncAt) tooltip = `Synced ${timeAgo(status.lastSyncAt)} — click to open sync`;
  else tooltip = 'Connected — click to open sync';

  return (
    <TooltipBtn
      tooltip={tooltip}
      aria-label="Sync status"
      className={`relative group p-2.5 rounded-full transition-all duration-200 focus:outline-none cursor-pointer ${hoverBg}`}
      onClick={onClick}
    >
      <CloudArrowUpFill size={16} style={{ color: iconColor }} />
    </TooltipBtn>
  );
};

export default SyncIndicator;
