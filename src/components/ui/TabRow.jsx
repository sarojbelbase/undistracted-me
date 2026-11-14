import {
  CANVAS_TAB_BG_DARK,
  CANVAS_TAB_BORDER_DARK,
  CANVAS_TAB_INACTIVE_DARK,
  CANVAS_TAB_HINT_DARK,
} from '../../theme/canvas';

/**
 * TabRow — segmented tab selector with optional hint text per item.
 *
 * When any tab has a `hint`, renders a rich two-line layout (label + hint).
 * Without hints, renders a compact single-line pill row.
 *
 * Props:
 *   tabs    – Array of { id: string, label: string, hint?: string }
 *   value   – Currently selected id
 *   onChange – (id: string) => void
 */
export const TabRow = ({ tabs, value, onChange, dark = false }) => {
  const hasHints = tabs.some(t => t.hint);
  return (
    <div
      className="flex gap-1 p-1 rounded-xl"
      style={dark
        ? { background: CANVAS_TAB_BG_DARK, border: `1px solid ${CANVAS_TAB_BORDER_DARK}` }
        : { background: 'var(--panel-bg)', border: '1px solid var(--card-border)' }}
    >
      {tabs.map(({ id, label, hint }) => {
        const selected = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`flex-1 transition-all focus:outline-none cursor-pointer rounded-lg ${hasHints
              ? 'flex items-start gap-2 px-3 py-2 text-left'
              : 'flex items-center justify-center py-1.5 text-xs font-semibold'
              }`}
            style={selected
              ? { background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }
              : { background: 'transparent', color: dark ? CANVAS_TAB_INACTIVE_DARK : 'var(--w-ink-3)' }}
          >
            {hasHints ? (
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className="text-xs font-semibold leading-tight">{label}</span>
                {hint && (
                  <span
                    className="text-[10px] leading-tight"
                    style={{
                      color: (() => {
                        if (selected) return 'color-mix(in srgb, var(--w-accent-fg) 65%, transparent)';
                        return dark ? CANVAS_TAB_HINT_DARK : 'var(--w-ink-5)';
                      })(),
                    }}
                  >
                    {hint}
                  </span>
                )}
              </div>
            ) : label}
          </button>
        );
      })}
    </div>
  );
};
