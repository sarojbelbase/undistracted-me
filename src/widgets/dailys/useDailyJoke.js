import { useEffect, useState } from 'react';
import { ICANHAZDADJOKE_API } from '../../constants/urls.js';
import { todayStr } from '../../utilities';

const CACHE_KEY = 'dailys_joke_cache';

/**
 * Fetches one dad joke from icanhazdadjoke.com per day.
 * Caches in localStorage so subsequent page opens are instant.
 */
export const useDailyJoke = () => {
  const [joke, setJoke] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (cached?.date === todayStr() && cached?.joke) {
        setJoke(cached.joke);
        return;
      }
    } catch {
      // ignore malformed cache
    }

    setLoading(true);
    fetch(ICANHAZDADJOKE_API, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Undistracted Me (https://undistractedme.sarojbelbase.com.np)',
      },
      signal: AbortSignal.timeout(6000),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.joke) {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ date: todayStr(), joke: data.joke }));
          setJoke(data.joke);
        } else {
          setError(true);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return { joke, loading, error };
};
