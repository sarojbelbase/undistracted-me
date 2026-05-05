/**
 * Settings — tabbed settings modal for Canvas mode.
 *
 * Tabs: Appearance · General · Background · Accounts
 *
 * Props:
 *   onClose            () => void
 *   initialTab         'appearance' | 'general' | 'background' | 'accounts'
 *   onPreviewLookAway  () => void   — closes modal + shows look-away overlay
 */


import React, { useState } from 'react';
import { XLg } from 'react-bootstrap-icons';
import { Modal } from './ui/Modal';
import { Appearance } from './settings/Appearance';
import { General } from './settings/General';
import { Background } from './settings/Background';
import { Accounts } from './settings/Accounts';
import { CANVAS_DIVIDER } from '../theme/canvas';

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  {
    id: 'appearance',
    label: 'Appearance',
    icon: (active) => (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="3" stroke={active ? 'var(--w-accent)' : 'var(--w-ink-3)'} strokeWidth="2" />
        <path
          d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
          stroke={active ? 'var(--w-accent)' : 'var(--w-ink-3)'} strokeWidth="1.8" strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'general',
    label: 'General',
    icon: (active) => (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"
          stroke={active ? 'var(--w-accent)' : 'var(--w-ink-3)'} strokeWidth="1.8"
        />
        <path
          d="M19.43 12.98c.04-.32.07-.65.07-.98s-.03-.66-.07-.98l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.37 7.37 0 0 0-1.67-.97l-.38-2.65A.49.49 0 0 0 14 2h-4a.49.49 0 0 0-.49.42l-.38 2.65c-.61.25-1.17.58-1.67.97l-2.49-1a.49.49 0 0 0-.61.22l-2 3.46a.49.49 0 0 0 .12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46c.13.22.39.3.61.22l2.49-1c.5.39 1.06.72 1.67.97l.38 2.65c.06.27.3.42.49.42h4c.24 0 .44-.17.49-.42l.38-2.65c.61-.25 1.17-.58 1.67-.97l2.49 1c.22.08.48 0 .61-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.11-1.65z"
          stroke={active ? 'var(--w-accent)' : 'var(--w-ink-3)'} strokeWidth="1.6"
        />
      </svg>
    ),
  },
  {
    id: 'background',
    label: 'Background',
    icon: (active) => (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="18" height="14" rx="2" stroke={active ? 'var(--w-accent)' : 'var(--w-ink-3)'} strokeWidth="1.8" />
        <circle cx="8.5" cy="8.5" r="1.5" stroke={active ? 'var(--w-accent)' : 'var(--w-ink-3)'} strokeWidth="1.5" />
        <path d="M3 16l5-4 4 3 3-2 6 4" stroke={active ? 'var(--w-accent)' : 'var(--w-ink-3)'} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="8" y1="21" x2="16" y2="21" stroke={active ? 'var(--w-accent)' : 'var(--w-ink-3)'} strokeWidth="1.7" strokeLinecap="round" />
        <line x1="12" y1="17" x2="12" y2="21" stroke={active ? 'var(--w-accent)' : 'var(--w-ink-3)'} strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'accounts',
    label: 'Accounts',
    icon: (active) => (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="8" r="4" stroke={active ? 'var(--w-accent)' : 'var(--w-ink-3)'} strokeWidth="1.8" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={active ? 'var(--w-accent)' : 'var(--w-ink-3)'} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
];

// ─── Tab bar ──────────────────────────────────────────────────────────────────

const TabBar = ({ active, onChange }) => (
  <div
    role="tablist"
    aria-label="Settings sections"
    style={{
      display: 'flex',
      gap: 2,
      padding: '0 10px',
      background: 'transparent',
      borderBottom: `1px solid ${CANVAS_DIVIDER}`,
    }}
  >
    {TABS.map(tab => {
      const isActive = tab.id === active;
      return (
        <button
          key={tab.id}
          role="tab"
          type="button"
          aria-selected={isActive}
          aria-controls={`settings-panel-${tab.id}`}
          onClick={() => onChange(tab.id)}
          style={{
            flex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            padding: '10px 4px 9px',
            borderRadius: 0, border: 'none', cursor: 'pointer',
            fontSize: 11,
            fontWeight: isActive ? 700 : 500,
            color: isActive ? 'var(--w-accent)' : 'var(--w-ink-3)',
            background: 'transparent',
            borderBottom: isActive ? `2px solid var(--w-accent)` : '2px solid transparent',
            marginBottom: -1,
            transition: 'all 0.15s ease',
            outline: 'none',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--w-ink-1)'; }}
          onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--w-ink-3)'; }}
        >
          {tab.icon(isActive)}
          <span>{tab.label}</span>
        </button>
      );
    })}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

export const Settings = ({
  onClose,
  initialTab = 'appearance',
  onPreviewLookAway,
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <Modal
      onClose={onClose}
      ariaLabel="Canvas settings"
      style={{ width: 460 }}
    >
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '16px 16px 14px',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: 'color-mix(in srgb, var(--w-accent) 12%, transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z"
              fill="var(--w-accent)"
            />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--w-ink-1)', lineHeight: '1.2' }}>
            Settings
          </div>
          <div style={{ fontSize: 11, color: 'var(--w-ink-4)', marginTop: 2 }}>
            Customize your canvas experience
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close settings"
          style={{
            flexShrink: 0, width: 26, height: 26,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--panel-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '50%', cursor: 'pointer',
            color: 'var(--w-ink-3)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--card-bg)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--panel-bg)'; }}
        >
          <XLg size={10} />
        </button>
      </div>

      {/* ── Tab bar ── */}
      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* ── Tab content ── */}
      <div
        id={`settings-panel-${activeTab}`}
        role="tabpanel"
        aria-label={TABS.find(t => t.id === activeTab)?.label}
        style={{ padding: '18px 20px 22px', overflowY: 'auto', height: 360 }}
      >
        {activeTab === 'appearance' && <Appearance />}
        {activeTab === 'general' && <General onPreviewLookAway={onPreviewLookAway} />}
        {activeTab === 'background' && <Background />}
        {activeTab === 'accounts' && <Accounts />}
      </div>
    </Modal>
  );
};
