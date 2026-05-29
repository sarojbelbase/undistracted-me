// ─── Shared stocks hook ────────────────────────────────────────────────────────
//
// Used by both Focus Mode (LeftPanel → Stock.jsx) and the canvas stock widget.
// Reads configured symbols from the first stock widget instance's settings via
// Zustand and polls merolagani.com for chart data.  Reads from the SW background
// cache (stocks_sw_cache) first for instant display on new-tab open.
//
// Returns:
//   stocks  – [{ sym: string, data: ChartData | null | 'error' }]
//   refresh – () => void  force an immediate network re-fetch
//
//   data === null    → loading
//   data === 'error' → fetch failed / no data

import { useState, useEffect, useReducer, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { fetchChart } from "./utils";
import { useWidgetInstancesStore } from "../../store";

const isExtension = typeof chrome !== "undefined" && !!chrome.runtime?.id;
const SW_CACHE_KEY = "stocks_sw_cache";
const CACHE_TTL_MS = 10 * 60_000; // use SW cache if < 10 min old

export const useStocks = () => {
  const [stocks, setStocks] = useState([]);
  // Increment this to force an immediate network re-fetch (bypasses SW cache)
  const [refreshKey, bumpRefresh] = useReducer((c) => c + 1, 0);
  // Track previous LTPs to skip re-renders when data hasn't changed
  const prevLtpRef = useRef(null);

  /**
   * Only update state if the data actually changed — prevents re-renders
   * when the 5-min interval fires but prices are identical (market closed,
   * stale cache re-read, etc.).
   */
  const stableSetStocks = (next) => {
    const nextKey = next.map((s) => (s.data && s.data !== 'error' ? s.data.ltp : null)).join(',');
    if (nextKey === prevLtpRef.current) return; // no change — skip re-render
    prevLtpRef.current = nextKey;
    setStocks(next);
  };

  // Two-step selector: first find the stock instance id (stable),
  // then read only that instance's symbols — avoids re-rendering on
  // unrelated widget setting changes (e.g. notes keystrokes, RSS refresh).
  const stockInstId = useWidgetInstancesStore(
    useShallow((s) => {
      const inst = s.instances.find((i) => i.type === "stock");
      return inst?.id ?? "stock";
    }),
  );
  const symbols = useWidgetInstancesStore(
    useShallow((s) => (s.widgetSettings[stockInstId]?.symbols) ?? []),
  );

  // Sync symbols to service worker whenever they change so SW can pre-fetch.
  // Use JSON-stringified key to avoid spurious sends when symbols is a new array
  // with the same contents (e.g. inline defaults from useWidgetSettings).
  const symbolsKey = JSON.stringify(symbols);
  useEffect(() => {
    if (!isExtension || !symbols.length) return;
    chrome.runtime
      .sendMessage({ type: "STOCKS_CONFIG_SYNC", symbols })
      .catch(() => { });
  }, [symbolsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!symbols.length) {
      prevLtpRef.current = null; // reset on symbol change
      setStocks([]);
      return;
    }

    let cancelled = false;
    // Reset comparison key when symbols change — always render new symbol set
    prevLtpRef.current = null;

    const writeCache = (data) => {
      if (!isExtension) return;
      chrome.storage.local
        .set({ [SW_CACHE_KEY]: { data, fetchedAt: Date.now() } })
        .catch(() => { });
    };

    const loadFromNetwork = async () => {
      const loadSymbol = (sym) => fetchChart(sym).catch(() => "error");
      const results = await Promise.all(symbols.map(loadSymbol));
      const data = symbols.map((sym, i) => ({
        sym,
        data: results[i] ?? "error",
      }));
      if (!cancelled) {
        stableSetStocks(data);
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
            if (!cancelled) stableSetStocks(cached.data);
            return; // fresh enough — SW alarm will refresh in background
          }
        } catch {
          /* storage unavailable */
        }
      }

      // No fresh cache — show skeleton then fetch
      if (!cancelled) stableSetStocks(symbols.map((sym) => ({ sym, data: null })));
      await loadFromNetwork();
    };

    init();

    // Regular in-session refresh every 5 min
    const timerId = setInterval(loadFromNetwork, 5 * 60_000);
    return () => {
      cancelled = true;
      clearInterval(timerId);
    };
  }, [symbols, refreshKey]);

  return { stocks, refresh: bumpRefresh };
};
