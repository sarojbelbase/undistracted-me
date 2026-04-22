import { useState, useRef, useEffect } from 'react';
import { XLg, Search } from 'react-bootstrap-icons';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { SettingsInput } from '../../components/ui/SettingsInput';
import { TooltipBtn } from '../../components/ui/TooltipBtn';
import { TIMEZONES, TZ_MAP, TZ_REGIONS } from '../../data/timezones';

const FORMAT_OPTIONS = [
  { label: '24h', value: '24h' },
  { label: '12h (AM/PM)', value: '12h' },
];

// ── Offset badge ─────────────────────────────────────────────────────────────
const OffsetBadge = ({ offset }) => (
  <span
    className="shrink-0 tabular-nums text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
    style={{
      background: 'color-mix(in srgb, var(--w-accent) 12%, transparent)',
      color: 'var(--w-accent)',
      letterSpacing: '0.01em',
    }}
  >
    UTC{offset}
  </span>
);

// ── Selected timezone pill ────────────────────────────────────────────────────
const SelectedTz = ({ tzData, onRemove }) => (
  <div
    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
    style={{
      background: 'color-mix(in srgb, var(--w-accent) 6%, var(--panel-bg))',
      border: '1.5px solid color-mix(in srgb, var(--w-accent) 35%, transparent)',
    }}
  >
    <div className="flex flex-col flex-1 min-w-0" style={{ gap: 1 }}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs font-semibold truncate" style={{ color: 'var(--w-ink-1)' }}>
          {tzData.name}
        </span>
        <OffsetBadge offset={tzData.offset} />
      </div>
      <span
        className="text-[10px] truncate"
        style={{ color: 'var(--w-ink-4)', fontFamily: 'monospace', letterSpacing: '0.02em' }}
      >
        {tzData.tz}
      </span>
    </div>
    <TooltipBtn
      onClick={onRemove}
      tooltip="Remove"
      className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full cursor-pointer transition-opacity hover:opacity-70 ml-1"
      style={{ background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}
    >
      <XLg size={7} aria-hidden="true" />
    </TooltipBtn>
  </div>
);

// ── Timezone picker (search + grouped list) ───────────────────────────────────
const TzPicker = ({ usedTzs, onSelect }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const q = query.trim().toLowerCase();

  const filtered = TIMEZONES.filter(({ tz, name, cities }) => {
    if (usedTzs.has(tz)) return false;
    if (!q) return true;
    return (
      name.toLowerCase().includes(q) ||
      tz.toLowerCase().includes(q) ||
      (cities && cities.toLowerCase().includes(q))
    );
  });

  // Group by region when no query; flat list when searching
  const grouped = !q
    ? TZ_REGIONS.map(region => ({
      region,
      items: filtered.filter(t => t.region === region),
    })).filter(g => g.items.length > 0)
    : [{ region: null, items: filtered }];

  return (
    <div className="flex flex-col gap-1.5">
      <SettingsInput
        ref={inputRef}
        icon={<Search size={11} style={{ color: 'var(--w-ink-4)' }} />}
        placeholder="Search city, country, or timezone…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        autoComplete="off"
        style={{ fontSize: '12px' }}
      />

      <div
        className="flex flex-col rounded-xl overflow-y-auto overscroll-contain"
        style={{
          maxHeight: 220,
          background: 'var(--panel-bg)',
          border: '1px solid rgba(0,0,0,0.09)',
        }}
      >
        {grouped.length === 0 && (
          <div
            className="flex items-center justify-center py-6 text-xs"
            style={{ color: 'var(--w-ink-4)' }}
          >
            No timezones found
          </div>
        )}

        {grouped.map(({ region, items }) => (
          <div key={region ?? '__flat'}>
            {region && (
              <div
                className="sticky top-0 z-10 px-3 py-1.5 text-[9.5px] font-bold uppercase"
                style={{
                  color: 'var(--w-ink-5)',
                  background: 'var(--panel-bg)',
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                  letterSpacing: '0.08em',
                }}
              >
                {region}
              </div>
            )}
            {items.map(({ tz, name, offset }) => (
              <button
                key={tz}
                type="button"
                onClick={() => onSelect(tz)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left transition-colors cursor-pointer hover:bg-black/[0.05] active:bg-black/10"
              >
                <span className="text-[11.5px] font-medium truncate" style={{ color: 'var(--w-ink-2)' }}>
                  {name}
                </span>
                <OffsetBadge offset={offset} />
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main Settings export ──────────────────────────────────────────────────────
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
  const openSlot = timezones.length < 2 ? timezones.length : null;

  return (
    <div className="flex flex-col gap-5">

      {/* ── Format ── */}
      <SegmentedControl
        label="Time Format"
        options={FORMAT_OPTIONS}
        value={format}
        onChange={(v) => onChange('format', v)}
      />

      {/* ── Extra Clocks ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="w-label">Extra Clocks</span>
          <div className="flex items-center gap-1">
            {[0, 1].map(i => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full transition-colors duration-200"
                style={{ background: i < timezones.length ? 'var(--w-accent)' : 'var(--card-border)' }}
              />
            ))}
            <span
              className="ml-1.5 text-[10px] font-semibold tabular-nums"
              style={{ color: 'var(--w-ink-4)' }}
            >
              {timezones.length}/2
            </span>
          </div>
        </div>

        {/* Active slots */}
        {timezones.map((tz, idx) => {
          const tzData = TZ_MAP[tz];
          if (!tzData) return null;
          return (
            <SelectedTz
              key={tz}
              tzData={tzData}
              onRemove={() => removeTz(idx)}
            />
          );
        })}

        {/* Picker — open when a slot is free */}
        {openSlot !== null && (
          <TzPicker
            usedTzs={usedTzs}
            onSelect={(tz) => setTz(openSlot, tz)}
          />
        )}

        {/* Full */}
        {openSlot === null && (
          <p className="text-[11px] text-center py-1" style={{ color: 'var(--w-ink-5)' }}>
            Remove a clock to add another
          </p>
        )}
      </div>
    </div>
  );
};

