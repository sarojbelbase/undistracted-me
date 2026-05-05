/**
 * FocusModeSettings — unified tabbed settings dialog for Focus Mode.
 *
 * Tabs: General · Search · Tasks · Panels · Background.
 *
 * Props:
 *   onClose     () => void
 *   initialTab  'general' | 'search' | 'tasks' | 'panels' | 'background'
 *   bgSource    string   — current bg source, passed through to BackgroundTab
 *   bgCustomUrl string|null
 *   bgPhotoUrl  string|null
 *   onBgApply   (type, opts) => void
 *   onBgRotate  () => void
 */

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { General } from './settings/General';
import { Search } from './settings/Search';
import { Tasks } from './settings/Tasks';
import { Panels } from './settings/Panels';
import { Background } from './settings/Background';
import {
  DIALOG_STYLE,
  FM_INK_1, FM_INK_3,
  FM_DIVIDER,
  FM_ICON_STROKE, FM_ICON_STROKE_MUTED,
} from './theme';
import { CloseButton } from './dialog/shared';

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  {
    id: 'general',
    label: 'General',
    icon: (active) => (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z"
          fill={active ? 'var(--w-accent)' : FM_ICON_STROKE}
        />
      </svg>
    ),
  },
  {
    id: 'search',
    label: 'Search',
    icon: (active) => (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="7" stroke={active ? 'var(--w-accent)' : FM_ICON_STROKE} strokeWidth="2" />
        <line x1="16" y1="16" x2="21" y2="21" stroke={active ? 'var(--w-accent)' : FM_ICON_STROKE} strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: (active) => (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9 12l2 2 4-4" stroke={active ? 'var(--w-accent)' : FM_ICON_STROKE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="3" y="3" width="18" height="18" rx="3" stroke={active ? 'var(--w-accent)' : FM_ICON_STROKE} strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    id: 'panels',
    label: 'Panels',
    icon: (active) => (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="2" y="3" width="9" height="18" rx="2" stroke={active ? 'var(--w-accent)' : FM_ICON_STROKE} strokeWidth="1.8" />
        <rect x="13" y="3" width="9" height="8" rx="2" stroke={active ? 'var(--w-accent)' : FM_ICON_STROKE} strokeWidth="1.8" />
        <rect x="13" y="13" width="9" height="8" rx="2" stroke={active ? 'var(--w-accent)' : FM_ICON_STROKE_MUTED} strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: 'background',
    label: 'Background',
    icon: (active) => (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="18" height="14" rx="2" stroke={active ? 'var(--w-accent)' : FM_ICON_STROKE} strokeWidth="1.8" />
        <circle cx="8.5" cy="8.5" r="1.5" stroke={active ? 'var(--w-accent)' : FM_ICON_STROKE} strokeWidth="1.5" />
        <path d="M3 16l5-4 4 3 3-2 6 4" stroke={active ? 'var(--w-accent)' : FM_ICON_STROKE} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
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
      borderBottom: `1px solid ${FM_DIVIDER}`,
    }}
  >
    {TABS.map(tab => {
      const isActive = tab.id === active;
      return (
        <button
          key={tab.id}
          role="tab"
          aria-selected={isActive}
          aria-controls={`fm-settings-panel-${tab.id}`}
          type="button"
          onClick={() => onChange(tab.id)}
          style={{
            flex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            padding: '10px 6px 9px',
            borderRadius: 0,
            border: 'none',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: isActive ? 700 : 500,
            color: isActive ? 'var(--w-accent)' : FM_INK_3,
            background: 'transparent',
            borderBottom: isActive ? '2px solid var(--w-accent)' : '2px solid transparent',
            marginBottom: -1,
            transition: 'all 0.15s ease',
            outline: 'none',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = FM_INK_1; }}
          onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = FM_INK_3; }}
        >
          {tab.icon(isActive)}
          <span>{tab.label}</span>
        </button>
      );
    })}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

export const FocusModeSettings = ({
  onClose,
  initialTab = 'general',
  bgSource = 'default',
  bgCustomUrl = null,
  bgPhotoUrl = null,
  onBgApply,
  onBgRotate,
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <Modal
      onClose={onClose}
      ariaLabel="Focus Mode settings"
      style={{ width: 480, display: 'flex', flexDirection: 'column', maxHeight: '82vh', ...DIALOG_STYLE }}
    >
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '16px 16px 14px',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: 'color-mix(in srgb, var(--w-accent) 15%, transparent)',
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
          <div style={{ fontSize: 14, fontWeight: 700, color: FM_INK_1, lineHeight: '1.2' }}>
            Focus Mode Settings
          </div>
          <div style={{ fontSize: 11, color: FM_INK_3, marginTop: 2 }}>
            Customize your focus experience
          </div>
        </div>
        <CloseButton onClose={onClose} />
      </div>

      {/* ── Tab bar ── */}
      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* ── Tab content ── */}
      <div
        id={`fm-settings-panel-${activeTab}`}
        role="tabpanel"
        aria-label={TABS.find(t => t.id === activeTab)?.label}
        style={{ padding: '16px 18px 20px', overflowY: 'auto', flex: 1, minHeight: 0 }}
      >
        {activeTab === 'general' && <General />}
        {activeTab === 'search' && <Search />}
        {activeTab === 'tasks' && <Tasks />}
        {activeTab === 'panels' && <Panels />}
        {activeTab === 'background' && (
          <Background
            initialSource={bgSource}
            initialCustomUrl={bgCustomUrl}
            initialPhotoUrl={bgPhotoUrl}
            onApply={onBgApply}
            onRotatePhoto={onBgRotate}
          />
        )}
      </div>
    </Modal>
  );
};

