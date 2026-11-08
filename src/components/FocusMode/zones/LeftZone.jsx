// ─── Left zone ────────────────────────────────────────────────────────────────
//
// Fully self-contained: fetches all panel data internally.
// Add a new panel by:
//   1. Creating panels/MyPanel.jsx
//   2. Adding a key to FOCUS_PANELS / FOCUS_PANEL_ORDER in panels/config.js

import { useState, useEffect, useMemo, useRef } from 'react';
import { onClockTick } from '../../../utilities/sharedClock';
import { readPomodoro, firePomodoroComplete, saveSession, persistBreakTimer } from '../../../widgets/pomodoro/utils';
import { useEvents, useGoogleCalendar } from '../../../hooks/useEvents';
import { getNextEventToShow } from '../../../widgets/events/utils';
import { useOccasions } from '../../../widgets/occasions/useOccasions';
import { useFocusStocks, useFocusSpotify, useChromeMedia } from '../hooks';
import { AnimatedCard } from '../theme';
import { ZONES } from '../config';
import { useSettingsStore } from '../../../store';
import { STORAGE_KEYS } from '../../../constants/storageKeys';

const LEFT = ZONES.left.items;
import { PomodoroPanel } from '../panels/Pomodoro';
import { EventPanel } from '../panels/Event';
import { StockPanel } from '../panels/Stock';
import { SpotifyPanel } from '../panels/Spotify';
import { OccasionPanel } from '../panels/Occasion';

// Isolated ticker — owns its own 1-second state so LeftZone itself does not
// re-render every second, preventing unnecessary cascading into sibling panels.
// Also detects timer completion (the canvas widget is unmounted in Focus Mode,
// so its own setInterval can't fire the chime/notification) and finishes the
// session here so a running pomodoro completes correctly regardless of view.
const TickingPomodoro = () => {
  const [pomodoro, setPomodoro] = useState(() => readPomodoro());
  const lastRef = useRef(null);

  useEffect(() => onClockTick(() => {
    const next = readPomodoro();
    setPomodoro(next);

    const prev = lastRef.current;
    // Detect the moment a running timer reaches zero (readPomodoro flips from a
    // positive remaining to null) and fire completion exactly once.
    if (prev && prev.remaining > 0 && (!next || next.remaining <= 0)) {
      firePomodoroComplete(prev);
      // Record the finished session (empty note — there's no "Done" button here).
      saveSession({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        preset: prev.preset || 'Custom',
        duration: prev.total,
        completedAt: Date.now(),
        type: prev.sessionType,
        note: '',
      });
      // Auto-break: start the break directly in the shared datahub (the canvas
      // widget is unmounted here, so it can't). Otherwise clear the timer so the
      // canvas widget doesn't re-fire completion on remount.
      if (prev.sessionType === 'focus' && prev.autoBreak) {
        persistBreakTimer({
          breakDuration: prev.breakDuration || 5,
          soundEnabled: prev.soundEnabled,
        });
      } else {
        localStorage.removeItem(STORAGE_KEYS.POMODORO);
        localStorage.removeItem(STORAGE_KEYS.pomodoroTimerState('pomodoro'));
      }
    }
    lastRef.current = next;
  }), []);

  return pomodoro ? <PomodoroPanel pomodoro={pomodoro} /> : null;
};

export const LeftZone = () => {
  const focusPanels = useSettingsStore(s => s.focusPanels ?? {});

  const [localEvents] = useEvents();
  const { gcalEvents } = useGoogleCalendar();
  const eventInfo = useMemo(
    () => getNextEventToShow([...localEvents, ...gcalEvents]),
    [localEvents, gcalEvents],
  );

  const { stocks } = useFocusStocks();
  const occasions = useOccasions();

  const {
    spotify,
    progress,
    handleToggle,
    handleNext,
    handlePrev,
    pending,
    skipPending,
  } = useFocusSpotify();

  // Browser media session (SoundCloud, YouTube Music, Apple Music, etc.)
  // Only shown when Spotify is not actively playing.
  const { track: chromeTrack, sendAction: chromeSendAction, pending: chromePending, skipPending: chromeSkipPending } = useChromeMedia();

  // Only treat Spotify as "active" when it is actually playing. Spotify's
  // /me/player returns the last-played track (is_playing: false) even when
  // idle, which would otherwise mask live browser media (SoundCloud, YouTube).
  const spotifyTrack = useMemo(
    () => (spotify?.isPlaying ? { ...spotify, progressMs: progress } : null),
    [spotify, progress],
  );

  // Show the browser media card only when Spotify isn't actively playing.
  const mediaTrack = spotifyTrack ? null : chromeTrack;

  const activeMediaPanel = (() => {
    if (spotifyTrack) {
      return (
        <SpotifyPanel
          track={spotifyTrack}
          onToggle={handleToggle}
          onNext={handleNext}
          onPrev={handlePrev}
          pending={pending}
          skipPending={skipPending}
        />
      );
    }
    if (mediaTrack) {
      return (
        <SpotifyPanel
          track={mediaTrack}
          onToggle={() => chromeSendAction(mediaTrack.isPlaying ? 'pause' : 'play')}
          onNext={() => chromeSendAction('next')}
          onPrev={() => chromeSendAction('previous')}
          pending={chromePending}
          skipPending={chromeSkipPending}
        />
      );
    }
    return null;
  })();

  const panels = {
    pomodoro: <TickingPomodoro />,
    event: eventInfo ? <EventPanel eventInfo={eventInfo} /> : null,
    occasion: occasions?.length > 0 ? <OccasionPanel occasions={occasions} /> : null,
    stock: stocks?.length > 0 ? <StockPanel stocks={stocks} /> : null,
    spotify: activeMediaPanel,
  };

  const visible = Object.entries(LEFT)
    .filter(([key, cfg]) => cfg.enable && (focusPanels[key] ?? true) && panels[key] != null)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([key]) => key);

  if (visible.length === 0) return null;

  return (
    <div
      role="none"
      className="fm-left-panel pointer-events-auto"
      style={{ zIndex: 22 }}
      onClick={e => e.stopPropagation()}
    >
      {visible.map((key, i) => (
        <AnimatedCard key={key} delay={i * 70}>
          {panels[key]}
        </AnimatedCard>
      ))}
    </div>
  );
};

// Backward-compat alias used by tests
export { LeftZone as LeftPanel };
