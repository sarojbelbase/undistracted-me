// ─── Shared stocks hook ────────────────────────────────────────────────────────
//
// Used by both Focus Mode (LeftPanel → Stock.jsx) and can be adopted by the
// canvas stock widget. Reads configured symbols from the first stock widget
// instance's settings via Zustand and polls merolagani.com for chart data.
//
// Returns:
//   stocks – [{ sym: string, data: ChartData | null | 'error' }]
//   data === null    → loading
//   data === 'error' → fetch failed / no data

import { useState, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { fetchChart } from './utils';
import { useWidgetInstancesStore } from '../../store';

const isExtension = typeof chrome !== 'undefined' && !!chrome.runtime?.id;
const SW_CACHE_KEY = 'stocks_sw_cache';
const CACHE_TTL_MS = 10 * 60_000; // use SW cache if < 10 min old

export const useStocks = () => {
  const [stocks, setStocks] = useState([]);

  const symbols = useWidgetInstancesStore(useShallow(s => {
    const inst = s.instances.find(i => i.type === 'stock');
    const ws = inst ? (s.widgetSettings[inst.id] ?? s.widgetSettings['stock']) : s.widgetSettings['stock'];
    return ws?.symbols ?? [];
  }));

  // Sync symbols to service worker whenever they change so SW can pre-fetch
  useEffect(() => {
    if (!isExtension || !symbols.length) return;
    chrome.runtime.sendMessage({ type: 'STOCKS_CONFIG_SYNC', symbols }).catch(() => { });
  }, [symbols]);

  useEffect(() => {
    if (!symbols.length) { setStocks([]); return; }

    let cancelled = false;

    const writeCache = (data) => {
      if (!isExtension) return;
      chrome.storage.local.set({ [SW_CACHE_KEY]: { data, fetchedAt: Date.now() } }).catch(() => { });
    };

    const loadFromNetwork = async () => {
      const loadSymbol = (sym) => fetchChart(sym).catch(() => 'error');
      const results = await Promise.all(symbols.map(loadSymbol));
      const data = symbols.map((sym, i) => ({ sym, data: results[i] ?? 'error' }));
      if (!cancelled) {
        setStocks(data);
        writeCache(data);
      }
    };

    const init = async () => {
      // Try SW cache first — avoids loading flash on new tab open
      if (isExtension) {
        try {
          const stored = await chrome.storage.local.get(SW_CACHE_KEY);
          const cached = stored[SW_CACHE_KEY];
          if (
            cached &&
            Date.now() - cached.fetchedAt < CACHE_TTL_MS &&
            Array.isArray(cached.data) &&
            cached.data.length === symbols.length &&
            cached.data.every((row, i) => row.sym === symbols[i])
          ) {
            if (!cancelled) setStocks(cached.data);
            return; // fresh enough — SW alarm will refresh in background
          }
        } catch { /* storage unavailable */ }
      }

      // No fresh cache — show skeleton then fetch
      if (!cancelled) setStocks(symbols.map(sym => ({ sym, data: null })));
      await loadFromNetwork();
    };

    init();

    // Regular in-session refresh every 5 min
    const timerId = setInterval(loadFromNetwork, 5 * 60_000);
    return () => {
      cancelled = true;
      clearInterval(timerId);
    };
  }, [symbols]);

  return stocks;
};
