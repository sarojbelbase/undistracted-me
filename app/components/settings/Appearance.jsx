/**
 * Appearance — Theme, Accent colour, and Widget Style settings.
 * Canvas mode: uses var(--card-*) / var(--w-*) CSS tokens only.
 */

import { SunFill, MoonFill, CircleHalf, CheckLg } from 'react-bootstrap-icons';
import { useSettingsStore } from '../../store';
import { ACCENT_COLORS } from '../../theme';
import { CARD_STYLES } from '../../constants/cardStyles';
import { APP_SETTINGS_DEFAULTS } from '../../constants/defaults';
import { TooltipBtn } from '../ui/TooltipBtn';
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

const Segment = ({ children, style = {} }) => (
  <div style={{
    display: 'flex', gap: 3, padding: 3,
    borderRadius: 11,
    background: 'var(--panel-bg)',
    border: '1px solid var(--card-border)',
    ...style,
  }}>
    {children}
  </div>
);

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
    { id: 'solid', label: 'Solid', hint: 'Accent tint' },
    { id: 'orb', label: 'Motion', hint: 'Animated orb' },
    { id: 'photo', label: 'Photos', hint: 'Curated gallery' },
    { id: 'custom', label: 'Custom URL', hint: 'Your image' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Widget Style ── */}
      <div>
        <SectionLabel>Widget Style</SectionLabel>
        <Segment>
          {CARD_STYLES.map(({ id, label, hint }) => {
            const selected = cardStyle === id;
            return (
              <button
                key={id}
                onClick={() => setCardStyle(id)}
                style={{
                  flex: 1,
                  display: 'flex', flexDirection: 'column', gap: 2,
                  padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  textAlign: 'left', transition: 'all 0.15s ease',
                  background: selected ? 'var(--w-accent)' : 'transparent',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, lineHeight: '1.3', color: selected ? 'var(--w-accent-fg)' : 'var(--w-ink-2)' }}>
                  {label}
                </span>
                <span style={{
                  fontSize: 10, lineHeight: '1.3',
                  color: selected ? 'color-mix(in srgb, var(--w-accent-fg) 65%, transparent)' : 'var(--w-ink-5)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {hint}
                </span>
              </button>
            );
          })}
        </Segment>
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

      {/* ── Background ── */}
      <div>
        <SectionLabel>Background</SectionLabel>
        <Segment>
          {backgroundOptions.map(({ id, label, hint }) => {
            const selected = bgType === id;
            return (
              <button
                key={id}
                onClick={() => setType(id)}
                style={{
                  flex: 1,
                  display: 'flex', flexDirection: 'column', gap: 2,
                  padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  textAlign: 'left', transition: 'all 0.15s ease',
                  background: selected ? 'var(--w-accent)' : 'transparent',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, lineHeight: '1.3', color: selected ? 'var(--w-accent-fg)' : 'var(--w-ink-2)' }}>
                  {label}
                </span>
                <span style={{
                  fontSize: 10, lineHeight: '1.3',
                  color: selected ? 'color-mix(in srgb, var(--w-accent-fg) 65%, transparent)' : 'var(--w-ink-5)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {hint}
                </span>
              </button>
            );
          })}
        </Segment>
        {(bgType === 'photo' || bgType === 'custom') && (
          <div style={{ marginTop: 12 }}>
            <CanvasBackgroundPicker type={bgType} value={canvasBg} onChange={setCanvasBg} />
          </div>
        )}
      </div>

      {/* ── Theme ── */}
      <div>
        <SectionLabel>Theme</SectionLabel>
        <Segment>
          {[
            { id: 'light', label: 'Light', icon: <SunFill size={11} /> },
            { id: 'auto', label: 'Auto', icon: <CircleHalf size={11} /> },
            { id: 'dark', label: 'Dark', icon: <MoonFill size={11} /> },
          ].map(({ id, label, icon }) => {
            const selected = mode === id;
            return (
              <TooltipBtn
                key={id}
                tooltip={id === 'auto' ? 'Follows sunrise & sunset at your location' : undefined}
                aria-label={label}
                onClick={() => setMode(id)}
                style={{
                  flex: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, transition: 'all 0.15s ease',
                  background: selected ? 'var(--w-accent)' : 'transparent',
                  color: selected ? 'var(--w-accent-fg)' : 'var(--w-ink-3)',
                }}
              >
                {icon}{label}
              </TooltipBtn>
            );
          })}
        </Segment>
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
                  width: 26, height: 26, borderRadius: '50%', border: 'none', padding: 0,
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

    </div>
  );
};
