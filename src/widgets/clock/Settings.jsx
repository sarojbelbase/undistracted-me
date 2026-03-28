import { TZ_OPTIONS } from './utils';

export const Settings = ({ format, timezones = [], onChange }) => {
  const setTz = (idx, tz) => {
    const next = [...timezones];
    next[idx] = tz;
    onChange('timezones', next.filter(Boolean));
  };

  const removeTz = (idx) => {
    onChange('timezones', timezones.filter((_, i) => i !== idx));
  };

  const usedTzs = new Set(timezones);

  return (
    <div className="flex flex-col gap-5">

      {/* ── Format — segmented pill control ── */}
      <div className="flex flex-col gap-2.5">
        <span className="w-label">Time Format</span>
        <div
          className="flex rounded-xl p-0.5"
          style={{ backgroundColor: 'var(--w-surface-2)' }}
        >
          {[
            { label: '24h', value: '24h' },
            { label: '12h (AM/PM)', value: '12h' },
          ].map(({ label, value }) => {
            const active = format === value;
            return (
              <button
                key={value}
                onClick={() => onChange('format', value)}
                className="flex-1 rounded-[10px] text-xs font-semibold py-1.5 transition-all cursor-pointer"
                style={{
                  background: active ? 'var(--w-accent)' : 'transparent',
                  color: active ? '#fff' : 'var(--w-ink-3)',
                  border: 'none',
                  outline: 'none',
                  letterSpacing: '0.01em',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Extra Clocks ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="w-label">Extra Clocks</span>
          <span
            className="text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded"
            style={{ color: 'var(--w-accent)', background: 'var(--w-surface-2)' }}
          >
            {timezones.length} / 2
          </span>
        </div>

        {[0, 1].map((idx) => {
          const current = timezones[idx];
          // don't show slot 1 until slot 0 is filled
          if (idx === 1 && !timezones[0]) return null;

          const tzInfo = TZ_OPTIONS.find(o => o.tz === current);

          if (current) {
            return (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl px-3 py-2.5"
                style={{
                  background: 'var(--w-surface-2)',
                  border: '1.5px solid var(--w-accent)',
                }}
              >
                <div className="flex flex-col" style={{ gap: 2 }}>
                  <span className="text-xs font-semibold" style={{ color: 'var(--w-ink-1)' }}>
                    {(tzInfo?.label || current).replace(/\s*\([^)]+\)/, '').trim()}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--w-ink-5)', fontFamily: 'monospace' }}>
                    {current}
                  </span>
                </div>
                <button
                  onClick={() => removeTz(idx)}
                  className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full cursor-pointer transition-opacity hover:opacity-70 ml-3"
                  style={{ background: 'var(--w-accent)', color: '#fff' }}
                  title="Remove"
                >
                  <svg width="7" height="7" viewBox="0 0 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <line x1="1" y1="1" x2="6" y2="6" /><line x1="6" y1="1" x2="1" y2="6" />
                  </svg>
                </button>
              </div>
            );
          }

          // Empty slot — dashed ghost "add" selector
          return (
            <div key={idx}>
              <select
                value=""
                onChange={(e) => e.target.value && setTz(idx, e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl cursor-pointer outline-none"
                style={{
                  background: 'transparent',
                  border: '1.5px dashed var(--w-border)',
                  color: 'var(--w-ink-5)',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                }}
              >
                <option value="">＋ Add a timezone</option>
                {TZ_OPTIONS.filter(({ tz }) => !usedTzs.has(tz)).map(({ tz, label }) => (
                  <option key={tz} value={tz}>{label}</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
};

