import { useCallback, useEffect, useState } from 'react';
import { loadPinned, savePinned } from './utils';

/**
 * Identity field per pin type: event pins key off `eventId`, custom pins off
 * `id`. (Matches resolveEventTarget / resolveCustomTarget in ./utils.)
 */
const pinMatches = (pinned, entry) =>
  pinned?.type === entry.type &&
  (entry.type === 'event' ? pinned.eventId === entry.eventId : pinned.id === entry.id);

/**
 * useCountdownPin(countdownId): single owner of the "pinned target" state shared
 * by the Countdown face and the Events widgets. Reading/writing the pinned
 * target was duplicated across four widgets, and the countdown's auto-clear only
 * updated local state without broadcasting, leaving Events widgets with a stale
 * pin. This hook centralises it and fixes that drift.
 *
 * - `pinned`: the current pinned target ({ type, eventId } | { type, id }) or null.
 * - `setPin(next)`: set + persist + broadcast in one call (used by auto-clear).
 * - `togglePin(entry)`: pin to `entry` or clear it if already pinned.
 *
 * Pass the id of the target countdown widget (Events widgets pass the resolved
 * `findCountdownId`, the Countdown widget passes its own `id`). A null id means
 * "no countdown exists", so `pinned` stays null and pinning is a no-op.
 */
export function useCountdownPin(countdownId) {
  const [pinned, setPinned] = useState(() => (countdownId ? loadPinned(countdownId) : null));

  // Re-read when the countdown id changes, and on cross-widget pin broadcasts.
  useEffect(() => {
    if (!countdownId) {
      setPinned(null);
      return;
    }
    setPinned(loadPinned(countdownId));
    const handler = () => setPinned(loadPinned(countdownId));
    globalThis.addEventListener('countdown_pinned_changed', handler);
    return () => globalThis.removeEventListener('countdown_pinned_changed', handler);
  }, [countdownId]);

  const setPin = useCallback(
    (next) => {
      if (!countdownId) return;
      setPinned(next);
      savePinned(countdownId, next);
      globalThis.dispatchEvent(new Event('countdown_pinned_changed'));
    },
    [countdownId],
  );

  const togglePin = useCallback(
    (entry) => {
      if (!countdownId) return;
      setPin(pinMatches(pinned, entry) ? null : entry);
    },
    [countdownId, pinned, setPin],
  );

  return { pinned, setPin, togglePin };
}
