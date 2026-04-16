// ─── Center zone ──────────────────────────────────────────────────────────────
//
// Renders the large clock and greeting text.
// Owns its own clock-tick subscription; receives only `centerOnDark` from the
// parent (background-dependent, cannot be self-determined here).

import { useState, useEffect, useCallback } from 'react';
import { getTimeParts } from '../../../widgets/clock/utils';
import { onClockTick } from '../../../utilities/sharedClock';
import { useSettingsStore } from '../../../store';
import { Clock } from '../panels/Clock';
import { Greetings } from '../panels/Greetings';
import { ZONES } from '../config';

const CENTER = ZONES.center.items;

export const CenterZone = ({ centerOnDark }) => {
  const clockFormat = useSettingsStore(s => s.clockFormat) || '24h';
  const [parts, setParts] = useState(() => getTimeParts(clockFormat));
  const update = useCallback(() => setParts(getTimeParts(clockFormat)), [clockFormat]);
  useEffect(() => onClockTick(update), [update]);

  return (
    <>
      {CENTER.clock.enable && (
        <Clock parts={parts} centerOnDark={centerOnDark} />
      )}
      {CENTER.greeting.enable && (
        <Greetings parts={parts} centerOnDark={centerOnDark} />
      )}
    </>
  );
};
