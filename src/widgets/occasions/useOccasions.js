// ─── Shared occasions hook ────────────────────────────────────────────────────
//
// Reads upcoming birthdays/anniversaries from localStorage (manual entries +
// cached Google Contacts). Shared between Focus Mode and future canvas widgets.
//
// Returns:
//   occasions – up to 3 upcoming { name, type, nextDate, daysAway } entries

import { useState, useEffect } from 'react';
import {
  loadCachedContacts,
  loadManualBirthdays,
} from '../../utilities/googleContacts';
import { computeUpcoming } from '../../widgets/occasions/utils';

export const useOccasions = () => {
  const [occasions, setOccasions] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const contacts = await loadCachedContacts(); // reads chrome.storage cache, no API call
        const manual = loadManualBirthdays();
        const all = [...contacts, ...manual];
        if (!cancelled) setOccasions(computeUpcoming(all));
      } catch {
        if (!cancelled) setOccasions([]);
      }
    };
    load();
    // Refresh every hour — occasions don't change mid-session
    const timerId = setInterval(load, 60 * 60_000);
    return () => { cancelled = true; clearInterval(timerId); };
  }, []);

  return occasions;
};
