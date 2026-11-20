/**
 * useFocusWeather — reads the Weather widget's location/unit and fetches current
 * conditions via weather. Shared by Focus Mode's top zone and Note Mode's
 * ambient strip (kept out of FocusMode/hooks.js so importing it doesn't pull in
 * the rest of the Focus Mode module — Spotify, tasks, media, etc.).
 */

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useWeather } from "./useWeather";
import { useWidgetInstancesStore } from "../store";
import { useLocationStore } from "../store/useLocationStore";

export const useFocusWeather = () => {
  // Read from Zustand widgetSettings — reactive to same-tab setting changes.
  // Two-step selector to avoid creating a new reference on every unrelated
  // store mutation (e.g. notes keystrokes, RSS refresh).
  const weatherInstId = useWidgetInstancesStore((s) => {
    const inst = s.instances.find((i) => i.type === "weather");
    return inst?.id ?? "weather";
  });
  const weatherSettings = useWidgetInstancesStore(
    useShallow((s) => s.widgetSettings[weatherInstId] ?? null),
  );

  // Fall back to the centralized location store when no manual location is set.
  const { geoLat, geoLon, geoSource } = useLocationStore(
    useShallow((s) => ({ geoLat: s.lat, geoLon: s.lon, geoSource: s.source })),
  );

  const location = weatherSettings?.location ?? null;
  const unit = weatherSettings?.unit ?? "metric";

  const useGeo = geoSource !== "default";
  const lat = location?.lat ?? (useGeo ? geoLat : null);
  const lon = location?.lon ?? (useGeo ? geoLon : null);
  const city = location?.name || "";

  const { weather } = useWeather({ lat, lon, unit, cityName: city });
  // Stable reference so downstream consumers (e.g. TopZone's InfoStrip) don't
  // get a fresh object on every render.
  return useMemo(() => (weather ? { ...weather, unit } : null), [weather, unit]);
};
