import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from "react";
import { OrbBackground } from "../ui/OrbBackground";
import bgImage from "../../assets/img/bg.webp";
import {
  useFocusPhoto,
  useFocusTasks,
  useWakeLock,
  useCenterOnDark,
} from "./hooks";
import {
  getBgSource,
  setBgSource as persistBgSource,
} from "../../utilities/unsplash";
import { useSettingsStore } from "../../store";
import { getFMCardVars, FM_ORB_BG } from "./theme";
import { getFMAccentVars } from "../../constants/accents";
import { getOrbRgbById } from "../../constants/orbPalettes";
import { TopZone } from "./zones/TopZone";
import { CenterZone } from "./zones/CenterZone";
import { BottomZone } from "./zones/BottomZone";
import { LeftZone } from "./zones/LeftZone";
import { RightZone } from "./zones/RightZone";
import { BottomRightZone } from "./zones/BottomRightZone";
import { ZONES } from "./config";

// Settings panel is only shown on demand — lazy-load to keep the initial chunk small.
const FocusModeSettings = lazy(() =>
  import('./Settings').then((m) => ({ default: m.FocusModeSettings }))
);

// ─── Background localStorage helpers ─────────────────────────────────────────
const CUSTOM_URL_KEY = 'fm_custom_bg_url';
const getCustomBgUrl = () => { try { return localStorage.getItem(CUSTOM_URL_KEY) || null; } catch { return null; } };
const persistCustomUrl = (url) => { try { if (url) localStorage.setItem(CUSTOM_URL_KEY, url); else localStorage.removeItem(CUSTOM_URL_KEY); } catch { } };

const ORB_PALETTE_KEY = 'fm_orb_palette_id';
const getOrbPaletteId = () => { try { return localStorage.getItem(ORB_PALETTE_KEY) || 'blueberry'; } catch { return 'blueberry'; } };
const getOrbRgb = () => getOrbRgbById(getOrbPaletteId());

const FG_MASK =
  "linear-gradient(to bottom, transparent 0%, transparent 64%, rgba(0,0,0,0.5) 78%, black 100%)";

function FocusBgLayer({
  bgSource,
  slotA,
  slotB,
  activeSlot,
  customBgUrl,
  orbRgb,
}) {
  const bgStyle = {
    position: "absolute",
    inset: 0,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };

  let fgBgImage;
  if (activeSlot === "a") {
    fgBgImage = slotA ? `url(${slotA})` : undefined;
  } else {
    fgBgImage = slotB ? `url(${slotB})` : undefined;
  }

  let activeBg = null;
  if (bgSource === "custom") activeBg = customBgUrl || bgImage;
  else if (bgSource === "default") activeBg = bgImage;

  return (
    <>
      {bgSource === "curated" && (
        <>
          <div
            style={{
              ...bgStyle,
              zIndex: 0,
              backgroundImage: slotA ? `url(${slotA})` : `url(${bgImage})`,
              opacity: activeSlot === "a" ? 1 : 0,
              transition: "opacity 2.5s ease",
            }}
          />
          <div
            style={{
              ...bgStyle,
              zIndex: 1,
              backgroundImage: slotB ? `url(${slotB})` : "none",
              opacity: activeSlot === "b" ? 1 : 0,
              transition: "opacity 2.5s ease",
            }}
          />
        </>
      )}
      {bgSource === "orb" && <OrbBackground rgb={orbRgb} isDark />}
      {bgSource !== "curated" && bgSource !== "orb" && activeBg && (
        <div
          style={{ ...bgStyle, zIndex: 0, backgroundImage: `url(${activeBg})` }}
        />
      )}
      {bgSource === "curated" && (slotA || slotB) && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 15,
            pointerEvents: "none",
            backgroundImage: fgBgImage,
            backgroundSize: "cover",
            backgroundPosition: "center",
            WebkitMaskImage: FG_MASK,
            maskImage: FG_MASK,
            opacity: 0.6,
          }}
        />
      )}
    </>
  );
}

export const FocusMode = ({ onExit }) => {
  // ── Background ──────────────────────────────────────────────────────────────
  const [bgSource, setBgSource] = useState(() => getBgSource());
  const [customBgUrl, setCustomBgUrl] = useState(() => getCustomBgUrl());
  const [orbRgb, setOrbRgb] = useState(getOrbRgb);
  const { photo, slotA, slotB, activeSlot, rotate } = useFocusPhoto();
  const {
    clock: clockDark,
    search: searchDark,
    greet: greetDark,
  } = useCenterOnDark(slotA, slotB, activeSlot);
  // Non-curated sources are always dark — prevents white-shadow flash.
  const effectiveClockDark = bgSource === "curated" ? clockDark : true;
  const effectiveSearchDark = bgSource === "curated" ? searchDark : true;
  const effectiveGreetDark = bgSource === "curated" ? greetDark : true;
  // Card surface style (glass vs flat) — both are always dark-tinted.
  const cardStyle = useSettingsStore((s) => s.cardStyle) || "glass";
  const accent = useSettingsStore((s) => s.accent);

  // ── Fullscreen + UI visiblity ───────────────────────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const hideTimerRef = useRef(null);
  useWakeLock(isFullscreen);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const resetHideTimer = useCallback(() => {
    setUiVisible(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setUiVisible(false), 3000);
  }, []);

  useEffect(() => {
    if (!isFullscreen) {
      setUiVisible(true);
      clearTimeout(hideTimerRef.current);
      return;
    }
    globalThis.addEventListener("mousemove", resetHideTimer);
    globalThis.addEventListener("mousedown", resetHideTimer);
    resetHideTimer();
    return () => {
      globalThis.removeEventListener("mousemove", resetHideTimer);
      globalThis.removeEventListener("mousedown", resetHideTimer);
      clearTimeout(hideTimerRef.current);
    };
  }, [isFullscreen, resetHideTimer]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
    else document.documentElement.requestFullscreen().catch(() => { });
  }, []);

  // ── Google auth (shared state for Tasks panel) ──────────────────
  const taskState = useFocusTasks();

  // ── Escape key ─────────────────────────────────────────────────────────────
  const [settingsTab, setSettingsTab] = useState(null); // null = closed, else tab id
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape" && settingsTab === null)
        onExit();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onExit, settingsTab]);

  // ── Background source change ────────────────────────────────────────────────
  const handleBgChange = useCallback((source, customUrl) => {
    persistBgSource(source);
    setBgSource(source);
    if (source === "orb") setOrbRgb(getOrbRgb());
    if (customUrl !== undefined) {
      setCustomBgUrl(customUrl);
      persistCustomUrl(customUrl);
    } else if (source !== "custom") {
      setCustomBgUrl(null);
      persistCustomUrl(null);
    }
  }, []);

  const photoColor = photo?.color || "#18191b";

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      style={{
        backgroundColor: bgSource === "orb" ? FM_ORB_BG : photoColor,
        ...getFMCardVars(cardStyle),
        ...getFMAccentVars(accent),
      }}
    >
      <FocusBgLayer
        bgSource={bgSource}
        slotA={slotA}
        slotB={slotB}
        activeSlot={activeSlot}
        customBgUrl={customBgUrl}
        orbRgb={orbRgb}
      />

      {/* Cinematic vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.5) 100%), linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, transparent 28%, transparent 62%, rgba(0,0,0,0.42) 100%)",
        }}
      />

      {ZONES.center.enable && (
        <CenterZone
          clockOnDark={effectiveClockDark}
          searchOnDark={effectiveSearchDark}
          greetOnDark={effectiveClockDark}
        />
      )}
      {ZONES.bottom.enable && <BottomZone greetOnDark={effectiveGreetDark} />}
      {ZONES.right.enable && <RightZone centerOnDark={effectiveClockDark} />}
      {ZONES.left.enable && <LeftZone />}
      {ZONES.bottomRight?.enable && (
        <BottomRightZone
          taskState={taskState}
        />
      )}
      {ZONES.top.enable && (
        <TopZone
          onExit={onExit}
          isFullscreen={isFullscreen}
          toggleFullscreen={toggleFullscreen}
          uiVisible={uiVisible}
          onOpenSettings={(tab) => setSettingsTab(tab ?? 'search')}
        />
      )}

      {settingsTab !== null && (
        <Suspense fallback={null}>
          <FocusModeSettings
            onClose={() => setSettingsTab(null)}
            initialTab={settingsTab}
            bgSource={bgSource}
            bgCustomUrl={bgSource === "custom" ? customBgUrl : null}
            bgPhotoUrl={bgSource === "curated" ? photo?.regular || photo?.url || null : null}
            onBgApply={(type, opts = {}) => handleBgChange(type, opts.url)}
            onBgRotate={rotate}
          />
        </Suspense>
      )}
    </div>
  );
};
