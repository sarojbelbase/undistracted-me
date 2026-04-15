/**
 * Canonical hook location: src/hooks/useAgeLabel.js
 *
 * Returns a human-readable "X ago" label for a timestamp, refreshed every 30s.
 * See utilities/useAgeLabel.js (re-export stub) for historical context.
 */
import { useState, useEffect } from 'react';
import { humanizeAge } from '../utilities';

export function useAgeLabel(ts) {
  const [label, setLabel] = useState(() => humanizeAge(ts) ?? '');

  useEffect(() => {
    // Only update if ts changed — the lazy useState initializer already set the value.
    setLabel(humanizeAge(ts) ?? '');
    if (!ts) return;
    const tid = setInterval(() => setLabel(humanizeAge(ts) ?? ''), 30_000);
    return () => clearInterval(tid);
  }, [ts]);

  return label;
}
