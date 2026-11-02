/**
 * SyncHelpDialog — a "what to do next" dialog for GitHub sync setup problems.
 *
 * Shown when cross-device sync connects to GitHub but can't create/read the
 * private gist (e.g. the "gist" OAuth scope wasn't granted → HTTP 403).
 *
 * Design follows UI/UX best practices:
 *   - Clear, numbered next steps (Error Recovery: never leave an error without
 *     a recovery path).
 *   - The "what happened" note is announced (role="alert").
 *   - One primary action (Reconnect) + a secondary help link + an escape hatch
 *     ("Not now") so the user is never trapped.
 *   - Full-size touch targets (≥ 40px), SVG icons, semantic color tokens.
 */

import React from 'react';
import {
  ArrowRepeat,
  BoxArrowUpRight,
  GearFill,
  CheckCircleFill,
  ExclamationTriangleFill,
  XLg,
} from 'react-bootstrap-icons';
import { Modal } from './Modal';
import { GitHubIcon } from '../../assets/brand/icons';

/** Map a raw sync error to a short, human-readable explanation. */
function friendlyReason(reason) {
  if (!reason) return null;
  if (/not accessible by integration/i.test(reason)) {
    return "You connected a GitHub App instead of an OAuth App. GitHub Apps can\u2019t grant the \u201Cgist\u201D permission \u2014 recreate it as an OAuth App and reconnect.";
  }
  if (/not accessible by oauth|forbidden|403/i.test(reason)) {
    return "GitHub didn't grant the \u201Cgist\u201D permission, so we can't create your private sync file.";
  }
  if (/bad credentials|unauthorized|401|expired|revoked/i.test(reason)) {
    return 'Your GitHub connection has expired and needs to be refreshed.';
  }
  if (/rate limit|429|secondary/i.test(reason)) {
    return 'GitHub temporarily rate-limited the request. Try again in a few minutes.';
  }
  return reason;
}

const STEPS = [
  {
    icon: <GearFill size={14} />,
    title: 'Create an OAuth App, not a GitHub App',
    body: 'GitHub Apps can\u2019t grant the \u201Cgist\u201D permission. In developer settings, create an OAuth App instead and enable Device Flow.',
  },
  {
    icon: <ArrowRepeat size={14} />,
    title: 'Reconnect & approve \u201Cgist\u201D',
    body: 'Tap Reconnect GitHub below. On GitHub\u2019s approval page, tick gist and approve. We only read and write your own gists \u2014 never your code or repositories.',
  },
  {
    icon: <CheckCircleFill size={14} />,
    title: 'Confirm the permission text',
    body: 'The approval page should say \u201CRead and write your gists.\u201D If it doesn\u2019t, re-create the app and reconnect.',
  },
];

export const SyncHelpDialog = ({ onClose, onReconnect, onOpenSettings, reason }) => {
  const summary = friendlyReason(reason);

  return (
    <Modal
      onClose={onClose}
      ariaLabel="Fix GitHub sync"
      className="w-[26rem] max-w-[92vw]"
      style={{ width: 420, maxWidth: '92vw' }}
    >
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
            <GitHubIcon size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[15px] font-bold leading-tight" style={{ color: 'var(--w-ink-1)' }}>
              Finish setting up GitHub sync
            </span>
            <p className="text-[12px] mt-1 leading-snug" style={{ color: 'var(--w-ink-4)' }}>
              Almost done — your account is linked, but sync needs one more permission.
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
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col">
          {summary && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl px-3.5 py-3 mb-4"
              style={{
                background: 'color-mix(in srgb, var(--w-accent) 8%, transparent)',
                border: '1px solid color-mix(in srgb, var(--w-accent) 20%, transparent)',
              }}
            >
              <ExclamationTriangleFill
                size={14}
                style={{ color: 'var(--w-accent)', flexShrink: 0, marginTop: 1 }}
              />
              <span className="text-[11.5px] leading-snug" style={{ color: 'var(--w-ink-3)' }}>
                {summary}
              </span>
            </div>
          )}

          {STEPS.map((step, i) => (
            <div key={step.title} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}
                >
                  <span className="text-[12px] font-bold leading-none">{i + 1}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="w-px flex-1 my-1" style={{ background: 'var(--w-divider)' }} />
                )}
              </div>
              <div className="flex flex-col gap-1 pb-4 min-w-0">
                <span
                  className="text-[13px] font-semibold leading-tight flex items-center gap-1.5"
                  style={{ color: 'var(--w-ink-1)' }}
                >
                  <span style={{ color: 'var(--w-accent)', display: 'inline-flex' }}>{step.icon}</span>
                  {step.title}
                </span>
                <p className="text-[11.5px] leading-snug" style={{ color: 'var(--w-ink-4)' }}>
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Footer actions ── */}
        <div
          className="flex flex-col gap-2 px-5 pb-5 pt-3 shrink-0"
          style={{ borderTop: '1px solid var(--w-divider)' }}
        >
          <button
            type="button"
            onClick={onReconnect}
            className="w-full h-10 flex items-center justify-center gap-2 rounded-xl text-[12.5px] font-semibold transition-all hover:opacity-90 active:scale-[0.99] cursor-pointer"
            style={{ background: 'var(--w-accent)', color: 'var(--w-accent-fg)', border: 'none' }}
          >
            <ArrowRepeat size={14} className="shrink-0" />
            Reconnect GitHub
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full h-10 flex items-center justify-center gap-2 rounded-xl text-[12px] font-semibold transition-opacity hover:opacity-85 cursor-pointer"
            style={{ background: 'transparent', border: '1px solid var(--w-divider)', color: 'var(--w-ink-2)' }}
          >
            Open developer settings
            <BoxArrowUpRight size={12} className="shrink-0" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full h-9 flex items-center justify-center rounded-xl text-[11.5px] font-semibold transition-opacity hover:opacity-75 cursor-pointer"
            style={{ background: 'none', border: 'none', color: 'var(--w-ink-4)' }}
          >
            Not now
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SyncHelpDialog;
