/**
 * Canonical hook location: src/hooks/useAgeLabel.js
 *
 * Returns a human-readable "X ago" label for a timestamp.
 * Uses the shared onClockTick (Web Locks leader-elected) instead of creating
 * a per-instance setInterval, so N widgets = 0 extra timers.
 */
import { useState, useEffect, useRef } from 'react';
import { humanizeAge } from '../utilities';
import { onClockTick } from '../utilities/sharedClock';

export function useAgeLabel(ts) {
  const [label, setLabel] = useState(() => humanizeAge(ts) ?? '');
  const lastLabelRef = useRef(label);

  useEffect(() => {
    setLabel(humanizeAge(ts) ?? '');
    if (!ts) return;
    // onClockTick fires every second — only call humanizeAge when the label
    // actually changed (it only flips every ~30 s), so this is near-zero overhead.
    return onClockTick(() => {
      const next = humanizeAge(ts) ?? '';
      if (next !== lastLabelRef.current) {
        lastLabelRef.current = next;
        setLabel(next);
      }
    });
  }, [ts]);

  return label;
}
