import React, { forwardRef, Suspense, lazy } from 'react';
import { Grid3x3GapFill, GearFill, Grid1x2Fill } from 'react-bootstrap-icons';
import { SearchIcon } from '../../assets/svg/SearchIcon';
import { TooltipBtn } from './TooltipBtn';
import { CANVAS_ICON_COLOR, CANVAS_ICON_ACTIVE, CANVAS_DIVIDER, CANVAS_DIVIDER_DARK } from '../../theme/canvas';
import { useUIStore } from '../../store/useUIStore';
import { cmdKey } from '../../hooks/useCommandPalette';

// Settings is only ever rendered from within the cluster — lazy-load it here.
const settingsImport = () => import('../Settings').then(m => ({ default: m.Settings }));
const Settings = lazy(settingsImport);
// Kick off the settings chunk on hover of the gear button (before the click).
const preloadSettings = () => settingsImport();

/**
 * Top-right control cluster: Widgets | Arrange | Settings pill.
 * Also renders the Settings panel inline when open.
 *
 * Accepts a forwarded ref so the caller (useSettingsPanel) can detect
 * outside-clicks against the entire container — buttons + open panel.
 */
export const ControlCluster = forwardRef(function ControlCluster(
  {
    isDark,
    arrangeMode,
    toggleArrangeMode,
    showSettings,
    toggleSettings,
    closeSettings,
    settingsInitialTab = 'appearance',
    onOpenCatalog,
    onPreloadCatalog,
    onPreviewLookAway,
  },
  ref,
) {
  const hoverBg = isDark ? 'hover:bg-white/10' : 'hover:bg-black/10';
  const iconColor = CANVAS_ICON_COLOR(isDark);
  const gearColor = (() => {
    if (!showSettings) return iconColor;
    return CANVAS_ICON_ACTIVE(isDark);
  })();
  const openCommandPalette = useUIStore((s) => s.openCommandPalette);

  return (
    <div ref={ref} className="absolute top-5 right-5 z-50">
      <div
        className="flex items-center rounded-full"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          backdropFilter: 'var(--card-blur)',
          WebkitBackdropFilter: 'var(--card-blur)',
          boxShadow: 'var(--card-shadow)',
        }}
      >

        {/* Search / Command Palette */}
        <TooltipBtn
          tooltip={`Search (${cmdKey})`}
          className={`relative group p-2.5 rounded-full transition-all duration-200 focus:outline-none cursor-pointer ${hoverBg}`}
          onClick={openCommandPalette}
        >
          <SearchIcon size={16} color={iconColor} />
        </TooltipBtn>

        <ClusterDivider isDark={isDark} />

        {/* Arrange */}
        <TooltipBtn
          tooltip={arrangeMode ? 'Done (Esc)' : 'Arrange'}
          className={`relative group p-2.5 rounded-full transition-all duration-200 focus:outline-none cursor-pointer ${arrangeMode ? '' : hoverBg}`}
          data-arrange-toggle
          onClick={toggleArrangeMode}
          style={arrangeMode ? { background: 'var(--w-accent)', borderRadius: '9999px' } : {}}
        >
          <Grid1x2Fill
            size={16}
            style={{ color: arrangeMode ? 'var(--w-accent-fg)' : iconColor }}
          />
        </TooltipBtn>

        <ClusterDivider isDark={isDark} />

        {/* Widgets */}
        <TooltipBtn
          tooltip="Widgets"
          className={`relative group p-2.5 rounded-full transition-all duration-200 focus:outline-none cursor-pointer ${hoverBg}`}
          onClick={onOpenCatalog}
          onMouseEnter={onPreloadCatalog}
        >
          <Grid3x3GapFill size={16} style={{ color: iconColor }} />
        </TooltipBtn>

        <ClusterDivider isDark={isDark} />

        {/* Settings */}
        <TooltipBtn
          tooltip="Settings"
          className={`relative group p-2.5 rounded-full transition-all duration-200 focus:outline-none cursor-pointer ${hoverBg}`}
          onClick={toggleSettings}
          onMouseEnter={preloadSettings}
        >
          <GearFill
            size={16}
            className="transition-transform duration-300 group-hover:rotate-90"
            style={{ color: gearColor }}
          />
        </TooltipBtn>
      </div>

      {showSettings && (
        <Suspense fallback={null}>
          <Settings
            onClose={closeSettings}
            initialTab={settingsInitialTab}
            onPreviewLookAway={onPreviewLookAway}
          />
        </Suspense>
      )}
    </div>
  );
});

// ── Private sub-components ─────────────────────────────────────────────────────

const ClusterDivider = ({ isDark }) => (
  <div
    className="w-px h-3.5 shrink-0"
    style={{ background: isDark ? CANVAS_DIVIDER_DARK : CANVAS_DIVIDER }}
  />
);
