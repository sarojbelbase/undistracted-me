import { useEffect, useState } from "react";
import { ICANHAZDADJOKE_API } from "../../constants/urls.js";
import { todayStr } from "../../utilities";
import { useDataHub } from "../../hooks/useDataHub";

/**
 * Fetches one dad joke from icanhazdadjoke.com per day.
 * Caches in the shared DataHub (stamped with `updatedAt`) so subsequent page
 * opens are instant. No polling interval — it only fetches when today's joke
 * isn't already in the hub.
 */
export const useDailyJoke = () => {
  const { data, hydrated, write } = useDataHub("joke");
  const today = todayStr();
  const hasTodayJoke = data?.date === today && !!data?.joke;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (hasTodayJoke) {
      setError(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);
    fetch(ICANHAZDADJOKE_API, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Undistracted Me (https://undistracted.me)",
      },
      signal: AbortSignal.timeout(6000),
    })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json?.joke) write({ date: today, joke: json.joke });
        else setError(true);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, hasTodayJoke, today, write]);

  return { joke: hasTodayJoke ? data.joke : null, loading, error };
};
