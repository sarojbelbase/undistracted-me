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

export const useStocks = () => {
  const [stocks, setStocks] = useState([]);

  const symbols = useWidgetInstancesStore(useShallow(s => {
    const inst = s.instances.find(i => i.type === 'stock');
    const ws = inst ? (s.widgetSettings[inst.id] ?? s.widgetSettings['stock']) : s.widgetSettings['stock'];
    return ws?.symbols ?? [];
  }));

  useEffect(() => {
    if (!symbols.length) { setStocks([]); return; }
    // Emit loading rows immediately so StockPanel can show skeletons
    setStocks(symbols.map(sym => ({ sym, data: null })));
    const loadSymbol = (sym) => fetchChart(sym).catch(() => 'error');
    const load = async () => {
      const results = await Promise.all(symbols.map(loadSymbol));
      setStocks(symbols.map((sym, i) => ({ sym, data: results[i] ?? 'error' })));
    };
    load();
    const timerId = setInterval(load, 5 * 60_000);
    return () => clearInterval(timerId);
  }, [symbols]);

  return stocks;
};
