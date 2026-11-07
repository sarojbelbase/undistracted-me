/**
 * useHolidays — Nepali + international holidays for the calendar widget.
 *
 * Fetches the committed `holidays.json` from the app's own origin (updated
 * weekly by a GitHub Actions workflow), caches the payload in the shared DataHub
 * (stamped with `updatedAt`), and re-fetches only when the entry is older than
 * 24h.  Returns two lookups so the calendar can style Nepali and international
 * holidays differently:
 *   {
 *     dates:      Set<'YYYY-MM-DD'>            — Nepali holiday dates
 *     names:      Map<'YYYY-MM-DD' → string[]> — Nepali names per date
 *     intlDates:  Set<'YYYY-MM-DD'>            — international holiday dates
 *     intlNames:  Map<'YYYY-MM-DD' → string[]> — international names per date
 *   }
 *
 * Falls back to empty lookups on any error so the calendar still renders.
 */
import { useEffect, useMemo } from "react";
import { HOLIDAYS_URL } from "../constants/urls";
import { useDataHub } from "./useDataHub";

const TTL_MS = 24 * 60 * 60 * 1000;

const empty = () => ({
  dates: new Set(),
  names: new Map(),
  intlDates: new Set(),
  intlNames: new Map(),
});

const toLookup = (data) => {
  const out = empty();
  for (const h of data?.holidays ?? []) {
    if (!h?.date || !h.name) continue;
    const intl = h.kind === "international";
    const dates = intl ? out.intlDates : out.dates;
    const names = intl ? out.intlNames : out.names;
    dates.add(h.date);
    const prev = names.get(h.date);
    if (prev) prev.push(h.name);
    else names.set(h.date, [h.name]);
  }
  return out;
};

export function useHolidays() {
  const { data, updatedAt, hydrated, write } = useDataHub("holidays");

  // Fetch only when the hub is hydrated and the entry is missing or stale
  // (> 24h). There is no polling interval — the timestamp decides.
  useEffect(() => {
    if (!hydrated) return;
    const hasData = data && Array.isArray(data.holidays);
    const stale = updatedAt == null || Date.now() - updatedAt >= TTL_MS;
    if (hasData && !stale) return;

    let cancelled = false;
    fetch(HOLIDAYS_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json) => {
        if (cancelled || !Array.isArray(json?.holidays)) return;
        write(json);
      })
      .catch(() => {
        /* keep cached/empty — calendar still renders */
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, updatedAt, data, write]);

  const lookup = useMemo(
    () => (data && Array.isArray(data.holidays) ? toLookup(data) : empty()),
    [data],
  );

  return lookup;
}
