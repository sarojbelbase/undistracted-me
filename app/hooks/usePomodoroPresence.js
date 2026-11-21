import { useEffect, useState } from "react";
import { readPomodoro } from "../widgets/pomodoro/utils";
import { onClockTick } from "../utilities/sharedClock";

/**
 * Tracks a running pomodoro session for ambient display (e.g. the Note Mode
 * top bar). Returns the live session object
 * `{ running, remaining, endTime, total, preset, sessionType, … }` or `null`
 * when no session is running.
 *
 * Reads happen on the shared 1s clock (never a per-component setInterval) and
 * re-render only when the remaining seconds actually change or the session
 * appears/disappears.
 */
export const usePomodoroPresence = () => {
  const [pomodoro, setPomodoro] = useState(() => readPomodoro());

  useEffect(() => {
    const tick = () => {
      setPomodoro((prev) => {
        const next = readPomodoro();
        if (!next && !prev) return prev;
        if (next && prev && next.remaining === prev.remaining) return prev;
        return next;
      });
    };
    return onClockTick(tick);
  }, []);

  return pomodoro;
};
