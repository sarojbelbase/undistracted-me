// ─── Center zone ──────────────────────────────────────────────────────────────
//
// Renders the clock, greeting text, and optional search bar.
// Clock + greeting are pushed to upper-center; search bar floats below.
// Owns its own clock-tick subscription; receives only `centerOnDark` from the
// parent (background-dependent, cannot be self-determined here).

import { useState, useEffect, useCallback } from 'react';
import { getTimeParts } from '../../../widgets/clock/utils';
import { onClockTick } from '../../../utilities/sharedClock';
import { useSettingsStore } from '../../../store';
import { Clock } from '../panels/Clock';
import { SearchBar } from '../panels/SearchBar';
import { ZONES } from '../config';

const CENTER = ZONES.center.items;

// Renderers defined outside the component to avoid lint "component inside component" warning.
// Each factory receives the current render context and returns a keyed JSX node (or null).
const renderClock = (parts, clockOnDark, showSearch) => (
  <div key="clock" className="select-none pointer-events-none" style={{ display: 'flex', justifyContent: 'center' }}>
    <Clock parts={parts} centerOnDark={clockOnDark} compact={showSearch} />
  </div>
);

const renderSearchBar = (searchOnDark, showSearch) => showSearch ? (
  <div key="searchBar" className="pointer-events-auto">
    <SearchBar centerOnDark={searchOnDark} />
  </div>
) : null;

export const CenterZone = ({ clockOnDark = true, searchOnDark = true, greetOnDark = true }) => {
  const clockFormat = useSettingsStore(s => s.clockFormat) || '24h';
  const focusSearchBar = useSettingsStore(s => s.focusSearchBar ?? true);
  const [parts, setParts] = useState(() => getTimeParts(clockFormat));
  const update = useCallback(() => setParts(getTimeParts(clockFormat)), [clockFormat]);
  useEffect(() => onClockTick(update), [update]);

  const showSearch = CENTER.searchBar.enable && focusSearchBar;

  const ITEM_RENDERERS = {
    clock: () => renderClock(parts, clockOnDark, showSearch),
    searchBar: () => renderSearchBar(searchOnDark, showSearch),
  };

  const orderedItems = Object.entries(CENTER)
    .filter(([, cfg]) => cfg.enable)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([key]) => ITEM_RENDERERS[key]?.())
    .filter(Boolean);

  return (
    <>
      {/* ── Main column: clock + optional search bar ────────────────── */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ zIndex: 25, pointerEvents: 'none' }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 'min(600px, 90vw)',
            padding: '0 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(14px, 2vh, 22px)',
          }}
        >
          {orderedItems}
        </div>
      </div>
    </>
  );
};
