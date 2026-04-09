import { SunFill, MoonFill, CheckLg, CircleHalf } from 'react-bootstrap-icons';
import { ACCENT_COLORS } from '../theme';
import { CARD_STYLES } from '../constants/cardStyles';
import { useSettingsStore } from '../store';

const CoffeeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 8h1a4 4 0 0 1 0 8h-1" />
    <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
    <line x1="6" y1="2" x2="6" y2="4" />
    <line x1="10" y1="2" x2="10" y2="4" />
    <line x1="14" y1="2" x2="14" y2="4" />
  </svg>
);

export const Settings = ({ closeSettings, onPreviewLookAway, onOpenBgPicker }) => {
  const {
    accent, setAccent,
    mode, setMode,
    defaultView, setDefaultView,
    lookAwayEnabled, setLookAwayEnabled,
    lookAwayInterval, setLookAwayInterval,
    lookAwayNotify, setLookAwayNotify,
    canvasBg,
    cardStyle, setCardStyle,
  } = useSettingsStore();

  const SectionLabel = ({ children }) => (
    <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--w-ink-3)' }}>
      {children}
    </p>
  );

  const Divider = () => (
    <div style={{ height: '1px', backgroundColor: 'var(--w-border)' }} />
  );

  return (
    <div
      className="absolute top-12 right-0 z-50 rounded-2xl shadow-xl p-5 w-72 flex flex-col gap-4 animate-fade-in"
      style={{
        background: 'var(--card-bg)',
        backdropFilter: 'var(--card-blur)',
        WebkitBackdropFilter: 'var(--card-blur)',
        border: '1px solid var(--card-border)',
        boxShadow: 'var(--card-shadow)',
      }}
      onMouseDown={e => e.stopPropagation()}
    >
      {/* ── VIEW ── */}
      <div className="flex flex-col gap-3">
        {/* Launch Mode */}
        <div>
          <SectionLabel>Launch Mode</SectionLabel>
          <div className="flex gap-1.5">
            {[{ id: 'canvas', label: 'Canvas' }, { id: 'focus', label: 'Focus' }].map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setDefaultView(id)}
                className="flex-1 flex items-center justify-center py-1.5 rounded-lg text-xs font-medium transition-all"
                style={defaultView === id
                  ? { backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)' }
                  : { backgroundColor: 'var(--card-bg)', backdropFilter: 'var(--card-blur)', color: 'var(--w-ink-3)', border: '1px solid var(--card-border)' }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Appearance */}
        <div>
          <SectionLabel>Appearance</SectionLabel>
          <div className="flex gap-1.5">
            {[
              { id: 'light', icon: <SunFill size={11} /> },
              { id: 'auto', icon: <CircleHalf size={11} /> },
              { id: 'dark', icon: <MoonFill size={11} /> },
            ].map(({ id, icon }) => (
              <button
                key={id}
                onClick={() => setMode(id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={mode === id
                  ? { backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)' }
                  : { backgroundColor: 'var(--card-bg)', backdropFilter: 'var(--card-blur)', color: 'var(--w-ink-3)', border: '1px solid var(--card-border)' }}
                title={id === 'auto' ? 'Auto — follows sunrise & sunset' : id.charAt(0).toUpperCase() + id.slice(1)}
              >
                {icon}{id.charAt(0).toUpperCase() + id.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Accent */}
        <div>
          <SectionLabel>
            Accent — <span style={{ color: 'var(--w-accent)', textTransform: 'none', fontWeight: 600, letterSpacing: 0 }}>{accent}</span>
          </SectionLabel>
          <div className="flex flex-wrap gap-2">
            {ACCENT_COLORS.map(color => {
              const locked = color.name === 'Default' && (mode === 'dark' || mode === 'auto');
              return (
                <button
                  key={color.name}
                  title={locked ? 'Not available in dark mode' : color.name}
                  onClick={() => !locked && setAccent(color.name)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-transform"
                  style={{
                    backgroundColor: color.hex,
                    outline: accent === color.name ? `2.5px solid ${color.hex}` : 'none',
                    outlineOffset: '3px',
                    opacity: locked ? 0.4 : 1,
                    cursor: locked ? 'not-allowed' : 'pointer',
                  }}
                >
                  {accent === color.name && <CheckLg size={10} style={{ color: color.fg }} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <Divider />

      {/* ── BACKGROUND ── */}
      <div>
        <SectionLabel>Canvas Background</SectionLabel>
        <button
          onClick={() => onOpenBgPicker?.()}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-opacity hover:opacity-80 cursor-pointer focus:outline-none"
          style={{
            background: 'var(--card-bg)',
            backdropFilter: 'var(--card-blur)',
            WebkitBackdropFilter: 'var(--card-blur)',
            border: '1px solid var(--card-border)',
            color: 'var(--w-ink-2)',
          }}
        >
          <span>
            {{ solid: 'Solid Color', orb: 'Color Motion', curated: 'Curated Photos', custom: 'Custom URL' }[canvasBg?.type || 'orb'] ?? 'Color Motion'}
          </span>
          <span style={{ color: 'var(--w-ink-4)' }}>Change ›</span>
        </button>
      </div>

      {/* ── WIDGET STYLE ── */}
      <div>
        <SectionLabel>Widget Style</SectionLabel>
        <div className="grid grid-cols-2 gap-1.5">
          {CARD_STYLES.map(({ id, label, hint }) => (
            <button
              key={id}
              onClick={() => setCardStyle(id)}
              className="flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl text-left transition-all focus:outline-none cursor-pointer"
              style={cardStyle === id
                ? { background: 'color-mix(in srgb, var(--w-accent) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--w-accent) 35%, transparent)', color: 'var(--w-accent)' }
                : { background: 'var(--card-bg)', backdropFilter: 'var(--card-blur)', border: '1px solid var(--card-border)', color: 'var(--w-ink-2)' }}
            >
              <span className="text-xs font-semibold">{label}</span>
              <span className="text-[10px] leading-snug" style={{ color: cardStyle === id ? 'color-mix(in srgb, var(--w-accent) 80%, transparent)' : 'var(--w-ink-4)' }}>{hint}</span>
            </button>
          ))}
        </div>
      </div>

      <Divider />

      {/* ── LOOK AWAY ── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <SectionLabel>
            <span className="flex items-center gap-1.5"><CoffeeIcon />Look Away</span>
          </SectionLabel>
          <div className="flex items-center gap-1.5">
            {/* Preview button — always shown when handler provided */}
            {onPreviewLookAway && (
              <button
                onClick={onPreviewLookAway}
                className="px-2.5 py-0.5 rounded-full text-xs font-medium transition-all"
                style={{ backgroundColor: 'var(--card-bg)', backdropFilter: 'var(--card-blur)', color: 'var(--w-ink-2)', border: '1px solid var(--card-border)' }}
              >
                Preview
              </button>
            )}
            {/* On/Off toggle — always shown */}
            <button
              onClick={() => setLookAwayEnabled(!lookAwayEnabled)}
              className="px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all"
              style={lookAwayEnabled
                ? { backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)' }
                : { backgroundColor: 'var(--card-bg)', backdropFilter: 'var(--card-blur)', color: 'var(--w-ink-3)', border: '1px solid var(--card-border)' }}
            >
              {lookAwayEnabled ? 'On' : 'Off'}
            </button>
          </div>
        </div>
        {lookAwayEnabled && (
          <div className="flex flex-col gap-1.5 mt-2">
            <span className="text-[11px] text-center font-medium" style={{ color: 'var(--w-ink-3)' }}>Remind every</span>
            <div className="flex justify-center gap-2">
              {[20, 30, 60].map((mins) => {
                const selected = lookAwayInterval === mins;
                return (
                  <button
                    key={mins}
                    onClick={() => setLookAwayInterval(mins)}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer"
                    style={selected ? {
                      background: 'color-mix(in srgb, var(--w-accent) 14%, transparent)',
                      color: 'var(--w-accent)',
                      border: '1px solid color-mix(in srgb, var(--w-accent) 30%, transparent)',
                    } : {
                      backgroundColor: 'var(--card-bg)',
                      backdropFilter: 'var(--card-blur)',
                      color: 'var(--w-ink-3)',
                      border: '1px solid var(--card-border)',
                    }}
                  >
                    {mins === 60 ? '1 hr' : `${mins} min`}
                  </button>
                );
              })}
            </div>
            {/* Notification toggle */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-medium" style={{ color: 'var(--w-ink-3)' }}>Show notification</span>
              <button
                onClick={() => setLookAwayNotify(!lookAwayNotify)}
                className="px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all cursor-pointer"
                style={lookAwayNotify
                  ? { backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)' }
                  : { backgroundColor: 'var(--card-bg)', backdropFilter: 'var(--card-blur)', color: 'var(--w-ink-3)', border: '1px solid var(--card-border)' }}
              >
                {lookAwayNotify ? 'On' : 'Off'}
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
