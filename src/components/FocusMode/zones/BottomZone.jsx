// ─── Bottom zone ──────────────────────────────────────────────────────────────
//
// Renders the greeting text pinned to the bottom of Focus Mode.

import { useState, useEffect, useCallback } from 'react';
import { getTimeParts } from '../../../widgets/clock/utils';
import { onClockTick } from '../../../utilities/sharedClock';
import { Greetings } from '../panels/Greetings';
import { ZONES } from '../config';

export const BottomZone = ({ greetOnDark = true }) => {
  const [parts, setParts] = useState(() => getTimeParts('24h'));
  const update = useCallback(() => setParts(getTimeParts('24h')), []);
  useEffect(() => onClockTick(update), [update]);

  if (!ZONES.bottom.items.greeting.enable) return null;

  return (
    <div
      className="fm-bottom-zone absolute pointer-events-none select-none"
      style={{
        bottom: 'clamp(2rem, 4.5vh, 4rem)',
        left: 0,
        right: 0,
        zIndex: 20,
        textAlign: 'center',
      }}
    >
      <Greetings parts={parts} centerOnDark={greetOnDark} compact={false} />
    </div>
  );
};

