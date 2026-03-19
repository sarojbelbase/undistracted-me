import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { EyeFill, EyeSlashFill, ArrowsFullscreen, FullscreenExit } from 'react-bootstrap-icons';
import { BaseWidget } from '../BaseWidget';
import { useWidgetSettings } from '../useWidgetSettings';
import { ACCENT_COLORS } from '../../theme';

const PALETTE = ACCENT_COLORS.filter(c => c.name !== 'Default');

export const Widget = ({ id: widgetId, onRemove }) => {
  const [settings, updateSetting] = useWidgetSettings(widgetId || 'notes', { text: '', bgColor: null });
  const { text, bgColor } = settings;
  const [isHidden, setIsHidden] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const isDark = document.documentElement.getAttribute('data-mode') === 'dark';
  const textColor = bgColor ? (isDark ? '#1c1c1e' : '#ffffff') : 'var(--w-ink-1)';
  const ringColor = isDark ? '#1c1c1e' : '#ffffff';
  const btnBg = bgColor ? 'rgba(0,0,0,0.15)' : 'var(--w-surface-2)';
  const btnColor = bgColor ? ringColor : 'var(--w-ink-4)';

  const settingsContent = (
    <div className="flex flex-col gap-2">
      <span className="text-xs" style={{ color: 'var(--w-ink-4)' }}>Note color</span>
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => updateSetting('bgColor', null)}
          title="Default"
          className="w-5 h-5 rounded-full border-2 transition-all"
          style={{
            backgroundColor: 'transparent',
            borderColor: !bgColor ? 'var(--w-ink-1)' : 'var(--w-border)',
          }}
        />
        {PALETTE.map(c => (
          <button
            key={c.name}
            onClick={() => updateSetting('bgColor', c.hex)}
            title={c.name}
            className="w-5 h-5 rounded-full transition-all"
            style={{
              backgroundColor: c.hex,
              outline: bgColor === c.hex ? `2px solid ${ringColor}` : 'none',
              outlineOffset: '2px',
            }}
          />
        ))}
      </div>
    </div>
  );

  return (
    <>
      <BaseWidget
        className="p-3 flex flex-col"
        cardStyle={bgColor ? { backgroundColor: bgColor } : {}}
        settingsContent={settingsContent}
        onRemove={onRemove}
      >
        <textarea
          value={text}
          onChange={e => updateSetting('text', e.target.value)}
          placeholder="New note..."
          spellCheck={false}
          className="flex-1 w-full resize-none bg-transparent outline-none text-sm leading-relaxed transition-[filter]"
          style={{
            color: textColor,
            filter: isHidden ? 'blur(8px)' : 'none',
            userSelect: isHidden ? 'none' : 'auto',
          }}
        />

        {/* Hover action buttons */}
        <div className="flex items-center justify-end gap-1 mt-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsHidden(h => !h)}
            onMouseDown={e => e.stopPropagation()}
            aria-label={isHidden ? 'Show note' : 'Hide note'}
            className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: btnBg, color: btnColor }}
          >
            {isHidden ? <EyeSlashFill size={11} aria-hidden="true" /> : <EyeFill size={11} aria-hidden="true" />}
          </button>
          <button
            onClick={() => setIsExpanded(true)}
            onMouseDown={e => e.stopPropagation()}
            aria-label="Expand note"
            className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: btnBg, color: btnColor }}
          >
            <ArrowsFullscreen size={10} />
          </button>
        </div>
      </BaseWidget>

      {isExpanded && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="rounded-2xl shadow-2xl p-5 w-[600px] h-[420px] flex flex-col animate-fade-in"
            style={{ backgroundColor: bgColor || 'var(--w-surface)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3 shrink-0">
              <span className="text-xs font-semibold tracking-wide uppercase opacity-50" style={{ color: textColor }}>Note</span>
              <button
                onClick={() => setIsExpanded(false)}
                aria-label="Close expanded note"
                className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                style={{ backgroundColor: btnBg, color: btnColor }}
              >
                <FullscreenExit size={12} aria-hidden="true" />
              </button>
            </div>
            <textarea
              autoFocus
              value={text}
              onChange={e => updateSetting('text', e.target.value)}
              placeholder="New note..."
              spellCheck={false}
              className="flex-1 w-full resize-none bg-transparent outline-none text-sm leading-relaxed"
              style={{ color: textColor }}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
