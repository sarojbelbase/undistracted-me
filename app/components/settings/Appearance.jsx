/**
 * Appearance — Theme, Accent colour, and Widget Style settings.
 * Canvas mode: uses var(--card-*) / var(--w-*) CSS tokens only.
 *
 * All multi-option selectors use the shared <SegmentedControl> component
 * (the `.um-seg` raised-pill style used app-wide, e.g. Pocket "Group by").
 */

import { CheckLg } from 'react-bootstrap-icons';
import { useSettingsStore } from '../../store';
import { ACCENT_COLORS } from '../../theme';
import { CARD_STYLES } from '../../constants/cardStyles';
import { APP_SETTINGS_DEFAULTS } from '../../constants/defaults';
import { TooltipBtn } from '../ui/TooltipBtn';
import { SegmentedControl } from '../ui/SegmentedControl';
import { useAutoTheme } from '../../hooks/useAutoTheme';
import { CanvasBackgroundPicker } from './CanvasBackgroundPicker';
import { Toggle } from '../ui/Toggle';

const SectionLabel = ({ children }) => (
  <p style={{
    fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
    textTransform: 'uppercase', color: 'var(--w-ink-3)', marginBottom: 8,
  }}>
    {children}
  </p>
);

// Muted one-line caption that explains what a setting does (WCAG: not the only
// source of meaning — the control's own label already says what it is).
const Hint = ({ children }) => (
  <p style={{ fontSize: 11, lineHeight: 1.45, color: 'var(--w-ink-5)', marginTop: 6 }}>
    {children}
  </p>
);

const THEME_OPTIONS = [
  { label: 'Light', value: 'light' },
  { label: 'Auto', value: 'auto' },
  { label: 'Dark', value: 'dark' },
];

export const Appearance = () => {
  // Narrow selectors — avoid re-rendering the whole panel on any single change.
  const mode = useSettingsStore((s) => s.mode);
  const setMode = useSettingsStore((s) => s.setMode);
  const accent = useSettingsStore((s) => s.accent);
  const setAccent = useSettingsStore((s) => s.setAccent);
  const cardStyle = useSettingsStore((s) => s.cardStyle);
  const setCardStyle = useSettingsStore((s) => s.setCardStyle);
  const canvasBg = useSettingsStore((s) => s.canvasBg);
  const setCanvasBg = useSettingsStore((s) => s.setCanvasBg);
  const widgetDim = useSettingsStore((s) => s.widgetDim);
  const setWidgetDim = useSettingsStore((s) => s.setWidgetDim);

  // Canonical auto-mode resolution — resolves 'auto' to the effective light/dark
  // so the accent swatches use the correct tone even during the day. Reads only
  // (`apply: false`); App.jsx is the single place that applies the theme.
  const effectiveMode = useAutoTheme(mode, accent, cardStyle, { apply: false });

  const bgType = canvasBg?.type ?? APP_SETTINGS_DEFAULTS.canvasBg.type;

  // Preserve the full canvasBg shape (url/photoId/color/orbId) across mode
  // switches so a chosen photo or custom URL survives a temporary flip to
  // Solid/Motion and back.
  const setType = (type) =>
    setCanvasBg({ ...(canvasBg ?? APP_SETTINGS_DEFAULTS.canvasBg), type });

  const backgroundOptions = [
    { id: 'solid', label: 'Solid' },
    { id: 'orb', label: 'Motion' },
    { id: 'photo', label: 'Photos' },
    { id: 'custom', label: 'Custom URL' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Theme ── */}
      <div>
        <SectionLabel>Theme</SectionLabel>
        <SegmentedControl
          ariaLabel="Theme"
          options={THEME_OPTIONS}
          value={mode}
          onChange={setMode}
        />
        <Hint>How bright the dashboard is. Auto follows sunrise and sunset, flipping to dark at night.</Hint>
      </div>

      {/* ── Widget Style ── */}
      <div>
        <SectionLabel>Widget Style</SectionLabel>
        <SegmentedControl
          ariaLabel="Widget Style"
          options={CARD_STYLES.map(({ id, label }) => ({ label, value: id }))}
          value={cardStyle}
          onChange={setCardStyle}
        />
        <Hint>How every widget card looks — Paper is warm and textured, Glass is frosted and translucent, Comic is bold and playful.</Hint>
      </div>

      {/* ── Widget Focus ── */}
      <div>
        <SectionLabel>Widget Focus</SectionLabel>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          padding: '10px 12px', borderRadius: 11,
          background: 'var(--panel-bg)',
          border: '1px solid var(--card-border)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 600, lineHeight: '1.3', color: 'var(--w-ink-2)' }}>
              Dim widgets
            </span>
            <span style={{ fontSize: 10, lineHeight: '1.4', color: 'var(--w-ink-5)' }}>
              Fade into the background until you hover over them
            </span>
          </div>
          <Toggle checked={widgetDim} onChange={setWidgetDim} ariaLabel="Dim widgets" />
        </div>
      </div>

      {/* ── Accent ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <SectionLabel>Accent</SectionLabel>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--w-accent)', marginBottom: 8 }}>{accent}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ACCENT_COLORS.map(color => {
            const isDarkMode = effectiveMode === 'dark';
            const swatchHex = isDarkMode ? (color.darkHex ?? color.hex) : color.hex;
            const selected = accent === color.name;
            return (
              <TooltipBtn
                key={color.name}
                tooltip={color.name}
                onClick={() => setAccent(color.name)}
                style={{
                  width: 27, height: 27, borderRadius: '50%', border: 'none', padding: 0,
                  backgroundColor: swatchHex,
                  boxShadow: selected ? 'inset 0 0 0 99px rgba(0,0,0,0.22)' : 'none',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              >
                {selected && <CheckLg size={12} style={{ color: isDarkMode ? (color.darkFg ?? color.fg) : color.fg }} />}
              </TooltipBtn>
            );
          })}
        </div>
      </div>

      {/* ── Background ── */}
      <div>
        <SectionLabel>Background</SectionLabel>
        <SegmentedControl
          ariaLabel="Background"
          options={backgroundOptions.map(({ id, label }) => ({ label, value: id }))}
          value={bgType}
          onChange={setType}
        />
        <Hint>What fills the canvas behind your widgets — a flat colour, slow ambient motion, or a photo or custom image.</Hint>
        {(bgType === 'photo' || bgType === 'custom') && (
          <div style={{ marginTop: 12 }}>
            <CanvasBackgroundPicker type={bgType} value={canvasBg} onChange={setCanvasBg} />
          </div>
        )}
      </div>

    </div>
  );
};
