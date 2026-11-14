// ─── Shared occasions hook ────────────────────────────────────────────────────
//
// Reads upcoming birthdays/anniversaries from local caches (manual entries +
// cached Google Contacts). Shared between Focus Mode and the canvas widget.
//
// There is no polling interval — it reacts to the underlying cache changes
// (chrome.storage.onChanged for the contacts/occasions caches, plus the
// localStorage `storage` event for manual birthdays), mirroring the DataHub's
// reactive no-polling pattern for non-API data.
//
// Returns:
//   occasions – up to 3 upcoming { name, type, nextDate, daysAway } entries

import { useState, useEffect } from 'react';
import {
  loadCachedContacts,
  invalidateContactsCache,
  loadManualBirthdays,
} from '../../utilities/googleContacts';
import { computeUpcoming } from '../../widgets/occasions/utils';

const CONTACTS_CACHE_KEY = 'contacts_birthdays_cache';
const OCCASIONS_MANUAL_KEY = 'occasions_manual';
const MANUAL_LOCAL_KEY = 'birthdays_manual';

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

    // React to underlying data changes instead of re-reading on a timer.
    const onStorageChanged = (changes, area) => {
      if (area !== 'local') return;
      if (changes[CONTACTS_CACHE_KEY] || changes[OCCASIONS_MANUAL_KEY]) {
        if (changes[CONTACTS_CACHE_KEY]) invalidateContactsCache();
        load();
      }
    };
    const onStorage = (e) => {
      if (e.key === MANUAL_LOCAL_KEY) load();
    };

    globalThis.chrome?.storage?.onChanged?.addListener?.(onStorageChanged);
    globalThis.addEventListener('storage', onStorage);

    return () => {
      cancelled = true;
      globalThis.chrome?.storage?.onChanged?.removeListener?.(onStorageChanged);
      globalThis.removeEventListener('storage', onStorage);
    };
  }, []);

  return occasions;
};
