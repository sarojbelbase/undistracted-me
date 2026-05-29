/**
 * Undistracted Me — Extension Popup v3
 * Thin orchestrator: holds all state / data-fetching logic and delegates
 * rendering to components. Styling lives in _popup.scss.
 */

import React, { useState, useEffect } from "react";
import { useSettingsStore } from "../store/useSettingsStore";
import { useLocationStore } from "../store/useLocationStore";
import { useShallow } from "zustand/react/shallow";
import { onClockTick } from "../utilities/sharedClock";
import { applyTheme } from "../theme";
import { getTimeParts } from "../widgets/clock/utils";
import { getGreeting } from "../data/greetings";
import { getDateParts } from "../widgets/dateToday/utils";
import { getSunTimes } from "../utilities/sunTime";
import { useWeather } from "../hooks/useWeather";
import {
  addBookmark,
  loadBookmarks,
  removeBookmark,
  isBookmarked,
  onBookmarksChanged,
} from "../data/sharedBookmarks";
import { capitalize } from "./utils";

import { PopupHero } from "../components/Popup/PopupHero";
import { CurrentTabBookmark } from "../components/Popup/CurrentTabBookmark";
import { BookmarksSection } from "../components/Popup/BookmarksSection";
import { QuickLinksSection } from "../components/Popup/QuickLinksSection";
import { PopupFooter } from "../components/Popup/PopupFooter";

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

/** Returns { type, label, duration } for the next solar event, or null. */
const relSun = (lat, lon) => {
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  const now = new Date();
  const today = getSunTimes(lat, lon, now);
  if (!today) return null;

  let event, label, type;
  if (now < today.sunrise) {
    event = today.sunrise;
    label = "Sunrise in";
    type = "sunrise";
  } else if (now < today.sunset) {
    event = today.sunset;
    label = "Sunset in";
    type = "sunset";
  } else {
    const tmr = new Date(now);
    tmr.setDate(tmr.getDate() + 1);
    const tmrSun = getSunTimes(lat, lon, tmr);
    if (!tmrSun) return null;
    event = tmrSun.sunrise;
    label = "Sunrise in";
    type = "sunrise";
  }

  const diffMin = Math.max(0, Math.round((event - now) / 60000));
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  const duration = h > 0 ? `${h}h ${m}m` : `${m}m`;

  return { type, label, duration };
};

// ═══════════════════════════════════════════════════════════════════════════════
// PopupApp
// ═══════════════════════════════════════════════════════════════════════════════

export const PopupApp = () => {
  const [, setFrame] = useState(0);
  useEffect(() => onClockTick(() => setFrame((n) => n + 1)), []);

  // ── Theme ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = useSettingsStore.getState();
    applyTheme(
      s.accent || "Matte Black",
      s.mode || "light",
      s.cardStyle || "glass",
    );
  }, []);

  const mode = useSettingsStore((s) => s.mode);

  const { lat, lon, city, isDay } = useLocationStore(
    useShallow((s) => ({
      lat: s.lat,
      lon: s.lon,
      city: s.city,
      isDay: s.isDay,
    })),
  );

  // ── Clock + dates ─────────────────────────────────────────────────────────
  const { time: tm } = getTimeParts("24h");
  const greet = getGreeting(new Date().getHours());
  const en = getDateParts("en");
  const ne = getDateParts("ne");

  // ── Weather ───────────────────────────────────────────────────────────────
  const { weather, loading: weatherLoading } = useWeather({
    lat: typeof lat === 'number' ? lat : null,
    lon: typeof lon === 'number' ? lon : null,
    unit: 'metric',
    cityName: city || '',
  });

  const sunEvent = relSun(lat, lon);
  const weatherDesc = weather?.description
    ? capitalize(weather.description)
    : null;

  // ── Current tab ───────────────────────────────────────────────────────────
  const [curTab, setCurTab] = useState(null);
  const [tabSaved, setTabSaved] = useState(false);
  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.tabs?.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs?.[0])
          setCurTab({
            url: tabs[0].url,
            title: tabs[0].title,
            favIconUrl: tabs[0].favIconUrl,
          });
      });
    }
    setTabSaved(false);
  }, []);

  const saveCurTab = () => {
    if (!curTab?.url) return;
    const list = addBookmark({ url: curTab.url, title: curTab.title });
    setBookmarks(list);
    setTabSaved(true);
  };

  // ── Shared bookmarks ──────────────────────────────────────────────────────
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const legacy = JSON.parse(
        localStorage.getItem("um_popup_bookmarks") || "[]",
      );
      legacy.forEach((l) => addBookmark({ url: l.url, title: l.title }));
      localStorage.removeItem("um_popup_bookmarks");
    } catch {
      /* noop */
    }
    return loadBookmarks();
  });

  useEffect(() => onBookmarksChanged(() => setBookmarks(loadBookmarks())), []);

  const removeBm = (url) => {
    const next = removeBookmark(url);
    setBookmarks(next);
  };

  // ── Top sites ─────────────────────────────────────────────────────────────
  const [topSites, setTopSites] = useState([]);
  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.topSites) {
      chrome.topSites.get((sites) => setTopSites((sites || []).slice(0, 6)));
    }
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const isDark =
    mode === "dark" ||
    (mode === "auto" &&
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches);

  const showCurTab =
    curTab &&
    !(
      curTab.url?.startsWith("chrome") ||
      curTab.url?.startsWith("about:") ||
      curTab.url?.startsWith("moz-extension")
    );

  const tabAlreadySaved = curTab ? isBookmarked(curTab.url) : false;

  // ═══════════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="popup-root" data-mode={isDark ? "dark" : "light"}>
      <PopupHero
        tm={tm}
        greet={greet}
        en={en}
        ne={ne}
        weather={weather}
        weatherLoading={weatherLoading}
        city={city}
        isDay={isDay}
        sunEvent={sunEvent}
        weatherDesc={weatherDesc}
      />

      {showCurTab && (
        <CurrentTabBookmark
          curTab={curTab}
          tabSaved={tabSaved}
          tabAlreadySaved={tabAlreadySaved}
          onSave={saveCurTab}
        />
      )}

      <BookmarksSection bookmarks={bookmarks} onRemove={removeBm} />

      <QuickLinksSection topSites={topSites} />

      <PopupFooter />
    </div>
  );
};
