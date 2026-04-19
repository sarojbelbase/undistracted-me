// ─── Left zone ────────────────────────────────────────────────────────────────
//
// Fully self-contained: fetches all panel data internally.
// Add a new panel by:
//   1. Creating panels/MyPanel.jsx
//   2. Adding a key to FOCUS_PANELS / FOCUS_PANEL_ORDER in panels/config.js

import { useState, useEffect, useMemo } from 'react';
import { onClockTick } from '../../../utilities/sharedClock';
import { readPomodoro } from '../../../widgets/pomodoro/utils';
import { useEvents, useGoogleCalendar } from '../../../widgets/useEvents';
import { getNextEventToShow } from '../../../widgets/events/utils';
import { useOccasions } from '../../../widgets/occasions/useOccasions';
import { useFocusStocks, useFocusSpotify, useChromeMedia } from '../hooks';
import { AnimatedCard } from '../theme';
import { ZONES } from '../config';

const LEFT = ZONES.left.items;
import { PomodoroPanel } from '../panels/Pomodoro';
import { EventPanel } from '../panels/Event';
import { StockPanel } from '../panels/Stock';
import { SpotifyPanel } from '../panels/Spotify';
import { OccasionPanel } from '../panels/Occasion';

export const LeftZone = () => {
  const [pomodoro, setPomodoro] = useState(() => readPomodoro());
  useEffect(() => onClockTick(() => setPomodoro(readPomodoro())), []);

  const [localEvents] = useEvents();
  const { gcalEvents } = useGoogleCalendar();
  const eventInfo = useMemo(
    () => getNextEventToShow([...localEvents, ...gcalEvents]),
    [localEvents, gcalEvents],
  );

  const stocks = useFocusStocks();
  const occasions = useOccasions();

  const {
    spotify,
    spotifyProgress,
    handleToggle,
    handleNext,
    handlePrev,
    pending,
    skipPending,
  } = useFocusSpotify();

  // Browser media session (SoundCloud, YouTube Music, Apple Music, etc.)
  // Only shown when Spotify is not actively playing.
  const { track: chromeTrack, sendAction: chromeSendAction, pending: chromePending, skipPending: chromeSkipPending } = useChromeMedia();

  const spotifyTrack = useMemo(
    () => spotify ? { ...spotify, progressMs: spotifyProgress } : null,
    [spotify, spotifyProgress],
  );

  // Show the browser media card only when Spotify has no active track.
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
    pomodoro: pomodoro ? <PomodoroPanel pomodoro={pomodoro} /> : null,
    event: eventInfo ? <EventPanel eventInfo={eventInfo} /> : null,
    occasion: occasions?.length > 0 ? <OccasionPanel occasions={occasions} /> : null,
    stock: stocks?.length > 0 ? <StockPanel stocks={stocks} /> : null,
    spotify: activeMediaPanel,
  };

  const visible = Object.entries(LEFT)
    .filter(([key, cfg]) => cfg.enable && panels[key] != null)
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
