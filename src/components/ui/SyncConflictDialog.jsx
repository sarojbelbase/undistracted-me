/**
 * SyncConflictDialog — resolve a cross-device sync divergence.
 *
 * Shown when both this device and the cloud have changed since the last sync
 * (or when a first-connect device already has data on both sides), so the user
 * can explicitly choose the direction instead of silently clobbering one side.
 *
 * Options:
 *   - Pull  (cloud → this device)  — remote wins
 *   - Push  (this device → cloud)  — local wins
 *   - Merge (both, newer edits win)— only offered when the devices share a base
 *     (a true first-connect can't safely merge, so it's hidden then).
 */

import React from 'react';
import { ArrowRepeat, Download, Upload, XLg, ExclamationTriangleFill } from 'react-bootstrap-icons';
import { Modal } from './Modal';
import { GitHubIcon } from '../../assets/brand/icons';

const fmtTime = (ts) => {
  if (!ts) return null;
  try {
    return new Date(ts).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
};

const DeviceRow = ({ label, name, os, detail }) => (
  <div
    className="flex items-center gap-3 rounded-xl px-3.5 py-3"
    style={{
      background: 'var(--panel-bg)',
      border: '1px solid var(--card-border)',
    }}
  >
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
      style={{
        background: 'color-mix(in srgb, var(--w-accent) 12%, transparent)',
        color: 'var(--w-accent)',
      }}
    >
      <GitHubIcon size={16} />
    </div>
    <div className="flex-1 min-w-0">
      <span className="block text-[12.5px] font-semibold leading-tight" style={{ color: 'var(--w-ink-1)' }}>
        {name}
        {os && os !== name ? <span style={{ color: 'var(--w-ink-4)', fontWeight: 500 }}> · {os}</span> : null}
      </span>
      <span className="block text-[11px] leading-snug mt-0.5" style={{ color: 'var(--w-ink-4)' }}>
        {label}
      </span>
    </div>
    {detail && (
      <span className="shrink-0 text-[10.5px] font-medium" style={{ color: 'var(--w-ink-4)' }}>
        {detail}
      </span>
    )}
  </div>
);

const ActionButton = ({ icon, title, subtitle, tone = 'accent', onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-all hover:opacity-90 active:scale-[0.99] cursor-pointer"
    style={{
      background:
        tone === 'accent'
          ? 'var(--w-accent)'
          : tone === 'danger'
            ? 'color-mix(in srgb, var(--w-danger, #ef4444) 88%, transparent)'
            : 'var(--panel-bg)',
      border: tone === 'neutral' ? '1px solid var(--card-border)' : 'none',
      color: tone === 'neutral' ? 'var(--w-ink-1)' : 'var(--w-accent-fg)',
    }}
  >
    <span className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg"
      style={{
        background: tone === 'neutral' ? 'color-mix(in srgb, var(--w-accent) 12%, transparent)' : 'rgba(255,255,255,0.16)',
        color: tone === 'neutral' ? 'var(--w-accent)' : 'inherit',
      }}
    >
      {icon}
    </span>
    <span className="flex-1 min-w-0">
      <span className="block text-[12.5px] font-semibold leading-tight">{title}</span>
      <span className="block text-[11px] leading-snug mt-0.5" style={{ opacity: 0.82 }}>
        {subtitle}
      </span>
    </span>
  </button>
);

export const SyncConflictDialog = ({ preview, onClose, onResolve }) => {
  if (!preview) return null;
  const { firstSync, localDevice, remoteDevice, remoteUpdatedAt } = preview;
  const remoteName = remoteDevice?.name || 'Another device';
  const remoteOs = remoteDevice?.os;
  const remoteWhen = fmtTime(remoteUpdatedAt);

  return (
    <Modal onClose={onClose} ariaLabel="Resolve sync conflict" className="w-[26rem] max-w-[92vw]" style={{ width: 420, maxWidth: '92vw' }}>
      <div className="flex flex-col" style={{ maxHeight: '85vh' }}>
        {/* ── Header ── */}
        <div
          className="flex items-start gap-3 px-5 pt-5 pb-4 shrink-0"
          style={{ borderBottom: '1px solid var(--w-divider)' }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'color-mix(in srgb, var(--w-accent) 12%, transparent)',
              color: 'var(--w-accent)',
            }}
          >
            <ArrowRepeat size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[15px] font-bold leading-tight" style={{ color: 'var(--w-ink-1)' }}>
              {firstSync ? 'Choose a starting point' : 'Devices have different data'}
            </span>
            <p className="text-[12px] mt-1 leading-snug" style={{ color: 'var(--w-ink-4)' }}>
              {firstSync
                ? 'Both this device and the cloud already have data. Choose which one to keep.'
                : 'This device and the cloud both changed since the last sync. Choose a direction.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-6 h-6 flex items-center justify-center rounded-full transition-colors btn-close cursor-pointer shrink-0"
            style={{ color: 'var(--w-ink-3)' }}
          >
            <XLg size={12} aria-hidden="true" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
          <DeviceRow
            label="This device — has unsynced changes"
            name={localDevice?.name || 'This device'}
            os={localDevice?.os}
          />
          <DeviceRow
            label="Cloud — will be overwritten or downloaded"
            name={remoteName}
            os={remoteOs}
            detail={remoteWhen ? `updated ${remoteWhen}` : null}
          />

          {!firstSync && (
            <div
              className="flex items-start gap-2 rounded-xl px-3 py-2.5"
              style={{
                background: 'color-mix(in srgb, var(--w-accent) 7%, transparent)',
                border: '1px solid color-mix(in srgb, var(--w-accent) 18%, transparent)',
              }}
            >
              <ExclamationTriangleFill size={13} style={{ color: 'var(--w-accent)', flexShrink: 0, marginTop: 1 }} />
              <span className="text-[11px] leading-snug" style={{ color: 'var(--w-ink-3)' }}>
                Pull or Push replaces one side entirely. Merge keeps both, keeping the newer edit when the same thing was changed.
              </span>
            </div>
          )}

          <div className="flex flex-col gap-2 mt-1">
            <ActionButton
              icon={<Download size={15} />}
              title="Pull from cloud"
              subtitle="Download the cloud to this device"
              onClick={() => onResolve('pull')}
            />
            <ActionButton
              icon={<Upload size={15} />}
              title="Push to cloud"
              subtitle="Upload this device to the cloud"
              tone="danger"
              onClick={() => onResolve('push')}
            />
            {!firstSync && (
              <ActionButton
                icon={<ArrowRepeat size={15} />}
                title="Merge both"
                subtitle="Combine changes, newer edits win"
                tone="neutral"
                onClick={() => onResolve('merge')}
              />
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SyncConflictDialog;
