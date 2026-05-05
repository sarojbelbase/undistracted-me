/**
 * useSearchCore — shared search logic for CommandPalette and FocusMode SearchBar.
 *
 * Manages: engine selection, debounced autocomplete suggestions, URL detection,
 * open-tab results, and navigation/search actions.
 *
 * Options:
 *   debounceMs      number   — debounce delay for suggestion fetching (default 220)
 *   withHistory     boolean  — include localStorage history in suggestions
 *   fetchSuggestions boolean — whether to hit the suggest API (default true)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { ENGINES, SEARCH_ENGINE_KEY, cycleEngine, detectUrl } from '../utilities/searchEngines';

const HISTORY_KEY = 'fm_search_history';
const MAX_HISTORY = 12;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getStoredEngine = () => {
  try {
    const id = localStorage.getItem(SEARCH_ENGINE_KEY);
    return ENGINES.find(e => e.id === id) ?? ENGINES[0];
  } catch {
    return ENGINES[0];
  }
};

const getHistory = () => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
};

const pushHistory = (query) => {
  if (!query?.trim()) return;
  try {
    const prev = getHistory().filter(h => h !== query);
    localStorage.setItem(HISTORY_KEY, JSON.stringify([query, ...prev].slice(0, MAX_HISTORY)));
  } catch { }
};

async function fetchSuggestionsFor(engine, query) {
  if (!engine.suggest || !query.trim()) return [];
  try {
    const url = `${engine.suggest}${encodeURIComponent(query)}`;
    const res = await fetch(url);
    const json = await res.json();
    // Google/DDG/YouTube: [query, [suggestions]]
    return Array.isArray(json[1]) ? json[1].slice(0, 6) : [];
  } catch {
    return [];
  }
};

async function getOpenTabs(query) {
  const api = globalThis.chrome?.tabs;
  if (!api) return [];
  try {
    const tabs = await new Promise(resolve => api.query({}, resolve));
    const q = query.toLowerCase();
    return (tabs ?? [])
      .filter(t => t.title?.toLowerCase().includes(q) || t.url?.toLowerCase().includes(q))
      .slice(0, 5);
  } catch {
    return [];
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSearchCore({
  debounceMs = 220,
  withHistory = false,
  fetchSuggestions: doFetchSuggestions = true,
} = {}) {
  const [engine, setEngine] = useState(getStoredEngine);
  const [engineId, setEngineId] = useState(() => getStoredEngine().id);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [tabResults, setTabResults] = useState([]);
  const [urlTarget, setUrlTarget] = useState(null);
  const [hasQuery, setHasQuery] = useState(false);

  const skipRef = useRef(false);
  const timerRef = useRef(null);

  // Detect URL and mark hasQuery on every query change
  useEffect(() => {
    const q = query.trim();
    setHasQuery(!!q);
    setUrlTarget(detectUrl(q));
  }, [query]);

  // Debounced suggestions + tab fetch
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const q = query.trim();

    if (!q) {
      // Empty query: show history (if enabled) and clear tabs
      setTabResults([]);
      if (withHistory) {
        setSuggestions(getHistory());
      } else {
        setSuggestions([]);
      }
      return;
    }

    if (skipRef.current) {
      skipRef.current = false;
      return;
    }

    timerRef.current = setTimeout(async () => {
      const [suggs, tabs] = await Promise.all([
        doFetchSuggestions ? fetchSuggestionsFor(engine, q) : Promise.resolve([]),
        getOpenTabs(q),
      ]);

      let finalSuggs = suggs;
      if (withHistory) {
        const hist = getHistory().filter(h => h.toLowerCase().includes(q.toLowerCase()) && h !== q);
        finalSuggs = [...hist, ...suggs.filter(s => !hist.includes(s))].slice(0, 6);
      }

      setSuggestions(finalSuggs);
      setTabResults(tabs);
    }, debounceMs);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, engine, debounceMs, withHistory, doFetchSuggestions]);

  const handleCycleEngine = useCallback(() => {
    const nextId = cycleEngine(engineId);
    const nextEngine = ENGINES.find(e => e.id === nextId) ?? ENGINES[0];
    setEngineId(nextId);
    setEngine(nextEngine);
  }, [engineId]);

  const navigate = useCallback((url) => {
    globalThis.open(url, '_self');
  }, []);

  const search = useCallback((q) => {
    const term = (q ?? query).trim();
    if (!term) return;
    pushHistory(term);
    globalThis.open(engine.url + encodeURIComponent(term), '_self');
  }, [query, engine]);

  /** Call before manually setting query via arrow nav to skip the debounce fetch. */
  const skipNextFetch = useCallback(() => {
    skipRef.current = true;
  }, []);

  return {
    query,
    setQuery,
    engineId,
    engine,
    handleCycleEngine,
    suggestions,
    setSuggestions,
    tabResults,
    urlTarget,
    hasQuery,
    navigate,
    search,
    skipNextFetch,
  };
}
