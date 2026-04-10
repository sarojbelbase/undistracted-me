import { SunFill, MoonFill, CheckLg, CircleHalf } from 'react-bootstrap-icons';
import { ACCENT_COLORS } from '../theme';
import { CARD_STYLES } from '../constants/cardStyles';
import { useSettingsStore } from '../store';

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
          {(() => {
            const modes = [
              { id: 'canvas', label: 'Canvas', hint: 'Widgets & content on every new tab' },
              { id: 'focus', label: 'Focus', hint: 'Distraction-free sessions' },
            ];
            const activeHint = modes.find(m => m.id === defaultView)?.hint;
            return (
              <>
                <div className="flex gap-1 p-1 rounded-xl overflow-hidden" style={{ background: 'var(--w-surface-2)', border: '1px solid var(--w-border)' }}>
                  {modes.map(({ id, label }) => {
                    const selected = defaultView === id;
                    return (
                      <button
                        key={id}
                        onClick={() => setDefaultView(id)}
                        className="flex-1 flex items-center justify-center py-1.5 rounded-lg text-xs font-semibold transition-all focus:outline-none cursor-pointer"
                        style={selected
                          ? { background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }
                          : { background: 'transparent', color: 'var(--w-ink-3)' }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                {activeHint && (
                  <p className="text-[10px] mt-1.5 leading-tight" style={{ color: 'var(--w-ink-5)' }}>{activeHint}</p>
                )}
              </>
            );
          })()}
        </div>

        {/* Appearance */}
        <div>
          <SectionLabel>Appearance</SectionLabel>
          <div className="flex gap-1 p-1 rounded-xl overflow-hidden" style={{ background: 'var(--w-surface-2)', border: '1px solid var(--w-border)' }}>
            {[
              { id: 'light', label: 'Light', icon: <SunFill size={11} /> },
              { id: 'auto', label: 'Auto', icon: <CircleHalf size={11} /> },
              { id: 'dark', label: 'Dark', icon: <MoonFill size={11} /> },
            ].map(({ id, label, icon }) => {
              const selected = mode === id;
              return (
                <button
                  key={id}
                  onClick={() => setMode(id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all focus:outline-none cursor-pointer"
                  style={selected
                    ? { background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }
                    : { background: 'transparent', color: 'var(--w-ink-3)' }}
                  title={id === 'auto' ? 'Auto — follows sunrise & sunset' : label}
                >
                  {icon}{label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Accent */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--w-ink-3)' }}>Accent</p>
            <span className="text-[11px] font-semibold" style={{ color: 'var(--w-accent)' }}>{accent}</span>
          </div>
          <div className="grid grid-cols-6 gap-y-2.5" style={{ justifyItems: 'center' }}>
            {ACCENT_COLORS.map(color => {
              const locked = color.name === 'Default' && (mode === 'dark' || mode === 'auto');
              const selected = accent === color.name;
              return (
                <button
                  key={color.name}
                  title={locked ? 'Not available in dark mode' : color.name}
                  onClick={() => !locked && setAccent(color.name)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all focus:outline-none cursor-pointer"
                  style={{
                    backgroundColor: color.hex,
                    outline: selected ? `2.5px solid ${color.hex}` : 'none',
                    outlineOffset: selected ? '2.5px' : '0',
                    transform: selected ? 'scale(1.14)' : 'scale(1)',
                    opacity: locked ? 0.35 : 1,
                    cursor: locked ? 'not-allowed' : 'pointer',
                  }}
                >
                  {selected && <CheckLg size={10} style={{ color: color.fg }} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <Divider />

      {/* ── WIDGET STYLE ── */}
      <div>
        <SectionLabel>Widget Style</SectionLabel>
        {/* Segmented control — one pill slides, clear active state */}
        <div
          className="flex gap-1 p-1 rounded-xl overflow-hidden"
          style={{ background: 'var(--w-surface-2)', border: '1px solid var(--w-border)' }}
        >
          {CARD_STYLES.map(({ id, label, hint }) => {
            const selected = cardStyle === id;
            return (
              <button
                key={id}
                onClick={() => setCardStyle(id)}
                className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all focus:outline-none cursor-pointer"
                style={selected
                  ? { background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }
                  : { background: 'transparent', color: 'var(--w-ink-3)' }}
              >
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className="text-xs font-semibold leading-tight">{label}</span>
                  <span className="text-[10px] leading-tight truncate" style={{ color: selected ? 'rgba(255,255,255,0.65)' : 'var(--w-ink-5)' }}>{hint}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── BACKGROUND ── */}
      <div>
        <SectionLabel>Canvas Background</SectionLabel>
        <button
          onClick={() => onOpenBgPicker?.()}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80 cursor-pointer focus:outline-none"
          style={{
            background: 'var(--w-surface-2)',
            border: '1px solid var(--w-border)',
            color: 'var(--w-ink-2)',
          }}
        >
          <span>
            {{ solid: 'Solid Color', orb: 'Color Motion', curated: 'Curated Photos', custom: 'Custom URL', default: 'Photo' }[canvasBg?.type] ?? 'Solid Color'}
          </span>
          <span style={{ color: 'var(--w-ink-4)' }}>Change ›</span>
        </button>
      </div>

      <Divider />

      {/* ── LOOK AWAY ── */}
      <div className="flex flex-col gap-3">
        {/* Header row: label + toggle */}
        <div className="flex items-center justify-between">
          <div>
            <SectionLabel>Look Away</SectionLabel>
            <p className="text-[10px] leading-tight -mt-1.5" style={{ color: 'var(--w-ink-5)' }}>
              Remind you to rest your eyes
            </p>
          </div>
          <button
            onClick={() => setLookAwayEnabled(!lookAwayEnabled)}
            className="relative flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none"
            style={{
              width: 36, height: 20,
              backgroundColor: lookAwayEnabled ? 'var(--w-accent)' : 'var(--w-border)',
            }}
            aria-label={lookAwayEnabled ? 'Disable Look Away' : 'Enable Look Away'}
          >
            <span
              className="absolute top-0.5 rounded-full transition-transform duration-200"
              style={{
                width: 16, height: 16,
                background: '#fff',
                left: lookAwayEnabled ? 18 : 2,
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
            />
          </button>
        </div>

        {/* Expanded controls — only when enabled */}
        {lookAwayEnabled && (
          <div
            className="flex flex-col gap-2.5 rounded-xl p-3"
            style={{ background: 'var(--w-surface-2)', border: '1px solid var(--w-border)' }}
          >
            {/* Interval */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold" style={{ color: 'var(--w-ink-3)' }}>Remind every</span>
              <div className="flex gap-1.5">
                {[20, 30, 60].map((mins) => {
                  const selected = lookAwayInterval === mins;
                  return (
                    <button
                      key={mins}
                      onClick={() => setLookAwayInterval(mins)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                      style={selected ? {
                        background: 'var(--w-accent)',
                        color: 'var(--w-accent-fg)',
                      } : {
                        background: 'transparent',
                        color: 'var(--w-ink-4)',
                        border: '1px solid var(--w-border)',
                      }}
                    >
                      {mins === 60 ? '1 hr' : `${mins}m`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'var(--w-border)' }} />

            {/* Notification + Preview */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold" style={{ color: 'var(--w-ink-3)' }}>Notification</span>
              <div className="flex items-center gap-2">
                {onPreviewLookAway && (
                  <button
                    onClick={onPreviewLookAway}
                    className="text-[11px] font-semibold transition-opacity hover:opacity-70 cursor-pointer"
                    style={{ color: 'var(--w-accent)' }}
                  >
                    Preview
                  </button>
                )}
                <button
                  onClick={() => setLookAwayNotify(!lookAwayNotify)}
                  className="relative flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none"
                  style={{
                    width: 30, height: 16,
                    backgroundColor: lookAwayNotify ? 'var(--w-accent)' : 'var(--w-border)',
                  }}
                  aria-label={lookAwayNotify ? 'Disable notification' : 'Enable notification'}
                >
                  <span
                    className="absolute top-0.5 rounded-full transition-transform duration-200"
                    style={{
                      width: 12, height: 12,
                      background: '#fff',
                      left: lookAwayNotify ? 16 : 2,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                    }}
                  />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
