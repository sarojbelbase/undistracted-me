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
import { GearFillIcon } from '../../assets/svg/GearFillIcon';
import { Search as SearchIcon } from 'react-bootstrap-icons';
import { TasksCheckboxIcon } from '../../assets/svg/TasksCheckboxIcon';
import { PanelsLayoutIcon } from '../../assets/svg/PanelsLayoutIcon';
import { BackgroundSceneIcon } from '../../assets/svg/BackgroundSceneIcon';

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  {
    id: 'general',
    label: 'General',
    icon: (active) => <GearFillIcon color={active ? 'var(--w-accent)' : FM_ICON_STROKE} />,
  },
  {
    id: 'search',
    label: 'Search',
    icon: (active) => <SearchIcon size={14} style={{ color: active ? 'var(--w-accent)' : FM_ICON_STROKE }} />,
  },
  {
    id: 'tasks',
    label: 'Tasks',
    icon: (active) => <TasksCheckboxIcon color={active ? 'var(--w-accent)' : FM_ICON_STROKE} />,
  },
  {
    id: 'panels',
    label: 'Panels',
    icon: (active) => <PanelsLayoutIcon color={active ? 'var(--w-accent)' : FM_ICON_STROKE} mutedColor={active ? 'var(--w-accent)' : FM_ICON_STROKE_MUTED} />,
  },
  {
    id: 'background',
    label: 'Background',
    icon: (active) => <BackgroundSceneIcon color={active ? 'var(--w-accent)' : FM_ICON_STROKE} />,
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
          <GearFillIcon size={18} color="var(--w-accent)" />
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

