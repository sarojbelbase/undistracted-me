import React, { useState, useEffect, useCallback, useRef } from 'react';
import { OrbBackground } from '../ui/OrbBackground';
import bgImage from '../../assets/img/bg.webp';
import {
  useFocusPhoto,
  useFocusTasks,
  useWakeLock,
  useCenterOnDark,
} from './hooks';
import { BackgroundPicker, getCustomBgUrl, setCustomBgUrl as persistCustomUrl, getOrbRgb } from '../ui/BackgroundPicker';
import { getBgSource, setBgSource as persistBgSource } from '../../utilities/unsplash';
import { getGoogleAuthToken, isGoogleAuthAvailable, signOutGoogle } from '../../utilities/googleAuth';
import { useSettingsStore } from '../../store';
import { getFMCardVars, FM_ORB_BG } from './theme';
import { SearchBarDialog } from './dialog/SearchBar';
import { TopZone } from './zones/TopZone';
import { CenterZone } from './zones/CenterZone';
import { BottomZone } from './zones/BottomZone';
import { LeftZone } from './zones/LeftZone';
import { RightZone } from './zones/RightZone';
import { BottomRightZone } from './zones/BottomRightZone';
import { ZONES } from './config';

const FG_MASK = 'linear-gradient(to bottom, transparent 0%, transparent 64%, rgba(0,0,0,0.5) 78%, black 100%)';

function FocusBgLayer({ bgSource, slotA, slotB, activeSlot, customBgUrl, orbRgb }) {
  const bgStyle = { position: 'absolute', inset: 0, backgroundSize: 'cover', backgroundPosition: 'center' };

  let fgBgImage;
  if (activeSlot === 'a') {
    fgBgImage = slotA ? `url(${slotA})` : undefined;
  } else {
    fgBgImage = slotB ? `url(${slotB})` : undefined;
  }

  let activeBg = null;
  if (bgSource === 'custom') activeBg = customBgUrl || bgImage;
  else if (bgSource === 'default') activeBg = bgImage;

  return (
    <>
      {bgSource === 'curated' && (
        <>
          <div style={{ ...bgStyle, zIndex: 0, backgroundImage: slotA ? `url(${slotA})` : `url(${bgImage})`, opacity: activeSlot === 'a' ? 1 : 0, transition: 'opacity 2.5s ease' }} />
          <div style={{ ...bgStyle, zIndex: 1, backgroundImage: slotB ? `url(${slotB})` : 'none', opacity: activeSlot === 'b' ? 1 : 0, transition: 'opacity 2.5s ease' }} />
        </>
      )}
      {bgSource === 'orb' && <OrbBackground rgb={orbRgb} isDark />}
      {bgSource !== 'curated' && bgSource !== 'orb' && activeBg && (
        <div style={{ ...bgStyle, zIndex: 0, backgroundImage: `url(${activeBg})` }} />
      )}
      {bgSource === 'curated' && (slotA || slotB) && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 15, pointerEvents: 'none',
          backgroundImage: fgBgImage,
          backgroundSize: 'cover', backgroundPosition: 'center',
          WebkitMaskImage: FG_MASK, maskImage: FG_MASK,
          opacity: 0.6,
        }} />
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
  const { clock: clockDark, search: searchDark, greet: greetDark } = useCenterOnDark(slotA, slotB, activeSlot);
  // Non-curated sources are always dark — prevents white-shadow flash.
  const effectiveClockDark = bgSource === 'curated' ? clockDark : true;
  const effectiveSearchDark = bgSource === 'curated' ? searchDark : true;
  const effectiveGreetDark = bgSource === 'curated' ? greetDark : true;
  // Card surface style (glass vs flat) — both are always dark-tinted.
  const cardStyle = useSettingsStore(s => s.cardStyle) || 'glass';

  // ── Fullscreen + UI visiblity ───────────────────────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const hideTimerRef = useRef(null);
  useWakeLock(isFullscreen);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const resetHideTimer = useCallback(() => {
    setUiVisible(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setUiVisible(false), 3000);
  }, []);

  useEffect(() => {
    if (!isFullscreen) { setUiVisible(true); clearTimeout(hideTimerRef.current); return; }
    globalThis.addEventListener('mousemove', resetHideTimer);
    globalThis.addEventListener('mousedown', resetHideTimer);
    resetHideTimer();
    return () => {
      globalThis.removeEventListener('mousemove', resetHideTimer);
      globalThis.removeEventListener('mousedown', resetHideTimer);
      clearTimeout(hideTimerRef.current);
    };
  }, [isFullscreen, resetHideTimer]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
    else document.documentElement.requestFullscreen().catch(() => { });
  }, []);

  // ── Google auth (shared between Tasks panel + Search Drive) ──────────────────
  const taskState = useFocusTasks();
  const [connecting, setConnecting] = useState(false);

  const onConnect = useCallback(async () => {
    if (!isGoogleAuthAvailable()) return;
    setConnecting(true);
    try {
      await getGoogleAuthToken(true);
      taskState.setGtasksConnected(true);
      await taskState.reload();
    } catch (err) {
      console.warn('Google auth failed:', err);
    } finally {
      setConnecting(false);
    }
  }, [taskState]);

  const onDisconnect = useCallback(async () => {
    try { await signOutGoogle(null); } catch { /* best-effort */ }
    taskState.setGtasksConnected(false);
    taskState.setUserProfile(null);
  }, [taskState]);

  // ── Escape key ─────────────────────────────────────────────────────────────
  const [showBgModal, setShowBgModal] = useState(false);
  const [showTasksDialog, setShowTasksDialog] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape' && !showBgModal && !showTasksDialog && !showSearchDialog) onExit(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onExit, showBgModal, showTasksDialog, showSearchDialog]);

  // ── Background source change ────────────────────────────────────────────────
  const handleBgChange = useCallback((source, customUrl) => {
    persistBgSource(source);
    setBgSource(source);
    if (source === 'orb') setOrbRgb(getOrbRgb());
    if (customUrl !== undefined) {
      setCustomBgUrl(customUrl);
      persistCustomUrl(customUrl);
    } else if (source !== 'custom') {
      setCustomBgUrl(null);
      persistCustomUrl(null);
    }
  }, []);

  const photoColor = photo?.color || '#18191b';

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      style={{ backgroundColor: bgSource === 'orb' ? FM_ORB_BG : photoColor, ...getFMCardVars(cardStyle) }}
    >
      <FocusBgLayer bgSource={bgSource} slotA={slotA} slotB={slotB} activeSlot={activeSlot} customBgUrl={customBgUrl} orbRgb={orbRgb} />

      {/* Cinematic vignette */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.5) 100%), linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, transparent 28%, transparent 62%, rgba(0,0,0,0.42) 100%)',
      }} />

      {ZONES.center.enable && <CenterZone clockOnDark={effectiveClockDark} searchOnDark={effectiveSearchDark} greetOnDark={effectiveClockDark} />}
      {ZONES.bottom.enable && <BottomZone greetOnDark={effectiveGreetDark} />}
      {ZONES.right.enable && <RightZone centerOnDark={effectiveClockDark} />}
      {ZONES.left.enable && <LeftZone />}
      {ZONES.bottomRight?.enable && (
        <BottomRightZone
          taskState={taskState}
          connecting={connecting}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
          externalDialogOpen={showTasksDialog}
          onCloseExternalDialog={() => setShowTasksDialog(false)}
        />
      )}
      {ZONES.top.enable && (
        <TopZone
          onExit={onExit}
          isFullscreen={isFullscreen}
          toggleFullscreen={toggleFullscreen}
          uiVisible={uiVisible}
          onOpenBgModal={() => setShowBgModal(true)}
          onOpenTasksDialog={() => setShowTasksDialog(true)}
          onOpenSearchDialog={() => setShowSearchDialog(true)}
        />
      )}

      {showBgModal && (
        <BackgroundPicker
          scope="focus"
          initialSource={bgSource}
          initialCustomUrl={bgSource === 'custom' ? customBgUrl : null}
          initialPhotoUrl={bgSource === 'curated' ? (photo?.regular || photo?.url || null) : null}
          onClose={() => setShowBgModal(false)}
          onApply={(type, opts = {}) => handleBgChange(type, opts.url)}
          onRotatePhoto={rotate}
        />
      )}

      {showSearchDialog && (
        <SearchBarDialog
          onClose={() => setShowSearchDialog(false)}
          connected={taskState.gtasksConnected}
          connecting={connecting}
          userProfile={taskState.userProfile}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
        />
      )}
    </div>
  );
};
