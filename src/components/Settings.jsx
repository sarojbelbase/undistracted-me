/**
 * Settings — tabbed settings modal for Canvas mode.
 *
 * Tabs: Appearance · General · Background · Accounts · Data
 *
 * Props:
 *   onClose            () => void
 *   initialTab         'appearance' | 'general' | 'background' | 'accounts'
 *   onPreviewLookAway  () => void   — closes modal + shows look-away overlay
 */


import React, { useState } from 'react';
import { XLg, CloudArrowUpFill } from 'react-bootstrap-icons';
import { Modal } from './ui/Modal';
import { Appearance } from './settings/Appearance';
import { General } from './settings/General';
import { Background } from './settings/Background';
import { Accounts } from './settings/Accounts';
import { Data } from './settings/Data';
import { CANVAS_DIVIDER } from '../theme/canvas';
import { AppearanceIcon } from '../assets/svg/AppearanceIcon';
import { GearCogIcon } from '../assets/svg/GearCogIcon';
import { BackgroundSceneIcon } from '../assets/svg/BackgroundSceneIcon';
import { AccountPersonIcon } from '../assets/svg/AccountPersonIcon';
import { GearFillIcon } from '../assets/svg/GearFillIcon';

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  {
    id: 'appearance',
    label: 'Appearance',
    icon: (active) => <AppearanceIcon color={active ? 'var(--w-accent)' : 'var(--w-ink-3)'} />,
  },
  {
    id: 'general',
    label: 'General',
    icon: (active) => <GearCogIcon color={active ? 'var(--w-accent)' : 'var(--w-ink-3)'} />,
  },
  {
    id: 'background',
    label: 'Background',
    icon: (active) => <BackgroundSceneIcon color={active ? 'var(--w-accent)' : 'var(--w-ink-3)'} />,
  },
  {
    id: 'accounts',
    label: 'Accounts',
    icon: (active) => <AccountPersonIcon color={active ? 'var(--w-accent)' : 'var(--w-ink-3)'} />,
  },
  {
    id: 'data',
    label: 'Data',
    icon: (active) => <CloudArrowUpFill size={13} color={active ? 'var(--w-accent)' : 'var(--w-ink-3)'} />,
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
            fontWeight: isActive ? 700 : 600,
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
          <GearFillIcon size={18} color="var(--w-accent)" />
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
        {activeTab === 'data' && <Data />}
      </div>
    </Modal>
  );
};
