// ─── Shared stocks hook ────────────────────────────────────────────────────────
//
// Used by both Focus Mode (LeftPanel → Stock.jsx) and the canvas stock widget.
// Reads configured symbols from the first stock widget instance's settings via
// Zustand, and serves chart data from the shared DataHub (stamped with
// `updatedAt`).  There is NO page-side polling interval — background refreshes
// come from the service worker's UM_STOCKS prefetch alarm, which writes to the
// hub and propagates via chrome.storage.onChanged.
//
// Returns:
//   stocks    – [{ sym: string, data: ChartData | null | 'error' }]
//   refresh   – () => void  force an immediate network re-fetch (writes hub)
//   updatedAt – ms timestamp of the hub entry (null until first data arrives)
//
//   data === null    → loading
//   data === 'error' → fetch failed / no data

import { useEffect, useMemo, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { fetchChart, DEFAULT_SYMBOLS } from "./utils";
import { useWidgetInstancesStore } from "../../store";
import { useDataHub } from "../../hooks/useDataHub";

const isExtension = typeof chrome !== "undefined" && !!chrome.runtime?.id;

export const useStocks = () => {
  // Two-step selector: first find the stock instance id (stable),
  // then read only that instance's symbols — avoids re-rendering on
  // unrelated widget setting changes (e.g. notes keystrokes, RSS refresh).
  const stockInstId = useWidgetInstancesStore((s) => {
    const inst = s.instances.find((i) => i.type === "stock");
    return inst?.id ?? "stock";
  });
  const symbols = useWidgetInstancesStore(
    useShallow((s) => s.widgetSettings[stockInstId]?.symbols ?? DEFAULT_SYMBOLS),
  );

  const symbolsKey = JSON.stringify(symbols);
  const { data, updatedAt, entry, hydrated, write } = useDataHub("stocks");

  // The hub entry is only valid for the exact symbol set that produced it.
  const hasMatching =
    Array.isArray(data) &&
    entry?.symbolsKey === symbolsKey &&
    data.length === symbols.length;

  // Sync symbols to the service worker so it can pre-fetch in the background.
  useEffect(() => {
    if (!isExtension || !symbols.length) return;
    chrome.runtime
      .sendMessage({ type: "STOCKS_CONFIG_SYNC", symbols })
      .catch(() => {});
  }, [symbolsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch only when the hub is hydrated and has no matching data (first ever
  // load for this symbol set). Never re-fetch on a timer.
  useEffect(() => {
    if (!hydrated || !symbols.length || hasMatching) return;
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        symbols.map((s) => fetchChart(s).catch(() => "error")),
      );
      if (cancelled) return;
      const next = symbols.map((sym, i) => ({ sym, data: results[i] ?? "error" }));
      write(next, { symbolsKey });
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated, symbolsKey, hasMatching, symbols, write]);

  const refresh = useCallback(async () => {
    if (!symbols.length) return;
    const results = await Promise.all(
      symbols.map((s) => fetchChart(s).catch(() => "error")),
    );
    const next = symbols.map((sym, i) => ({ sym, data: results[i] ?? "error" }));
    await write(next, { symbolsKey });
  }, [symbolsKey, symbols, write]);

  const stocks = useMemo(() => {
    if (hasMatching) return data;
    return symbols.map((sym) => ({ sym, data: null }));
  }, [hasMatching, data, symbols]);

  return { stocks, refresh, updatedAt };
};
