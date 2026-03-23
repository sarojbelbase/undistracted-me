import React from 'react';
import { MusicNoteBeamed, PauseFill, PlayFill, SkipStartFill, SkipEndFill } from 'react-bootstrap-icons';
import { formatTime } from '../../widgets/pomodoro/utils';
import { priceStats, fmtPrice } from '../../widgets/stock/utils';
import { GLASS_CARD, getTimeUntilEvent, formatEventStartTime } from './constants';

// ─── Pomodoro card ────────────────────────────────────────────────────────────

const PomodoroPanelCard = ({ pomodoro }) => {
  const pct = pomodoro.total > 0 ? (pomodoro.remaining / pomodoro.total) * 100 : 0;
  return (
    <div style={{ ...GLASS_CARD, padding: '14px 16px' }}>
      <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontWeight: 700 }}>
        Focus{pomodoro.preset ? ` · ${pomodoro.preset}` : ''}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: 'rgba(255,255,255,0.82)', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em', marginTop: 5 }}>
        {formatTime(pomodoro.remaining)}
      </div>
      <div style={{ marginTop: 10, height: 2, borderRadius: 2, background: 'rgba(255,255,255,0.07)' }}>
        <div style={{ height: '100%', borderRadius: 2, background: 'var(--w-accent)', width: `${pct.toFixed(1)}%`, transition: 'width 1s linear', opacity: 0.6 }} />
      </div>
    </div>
  );
};

// ─── Event card ───────────────────────────────────────────────────────────────

const EventPanelCard = ({ eventInfo }) => {
  const { event, isActive } = eventInfo;
  return (
    <div style={{ ...GLASS_CARD, padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--w-accent)', opacity: isActive ? 0.9 : 0.45, flexShrink: 0, display: 'inline-block' }} />
        <span style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontWeight: 700 }}>
          {isActive ? 'Now' : 'Upcoming'}
        </span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.78)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
        {event.title}
      </div>
      <div style={{ fontSize: 10, marginTop: 3, color: 'rgba(255,255,255,0.28)' }}>
        {isActive ? 'in progress' : getTimeUntilEvent(event)}
        {formatEventStartTime(event) ? ` · ${formatEventStartTime(event)}` : ''}
      </div>
    </div>
  );
};

// ─── Stocks card ──────────────────────────────────────────────────────────────

const StocksPanelCard = ({ stocks }) => (
  <div style={{ ...GLASS_CARD, padding: '12px 16px' }}>
    <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontWeight: 700, marginBottom: 8 }}>
      Stocks
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {stocks.map(({ sym, data }) => {
        const stats = data ? priceStats(data) : null;
        const clr = !stats ? 'rgba(255,255,255,0.3)' : stats.dir === 'up' ? '#4ade80' : stats.dir === 'down' ? '#f87171' : 'rgba(255,255,255,0.4)';
        return (
          <div key={sym} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.58)', letterSpacing: '0.08em' }}>{sym}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.48)', fontVariantNumeric: 'tabular-nums' }}>
                {data ? fmtPrice(data.ltp) : '—'}
              </span>
              {stats && (
                <span style={{ fontSize: 10, color: clr, fontWeight: 600 }}>
                  {stats.dir === 'up' ? '▲' : stats.dir === 'down' ? '▼' : '—'} {Math.abs(stats.pct).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// ─── Spotify mini card ────────────────────────────────────────────────────────

const SpotifyMiniCard = ({ track, onToggle, onNext, onPrev }) => (
  <div
    style={{ ...GLASS_CARD, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}
    onClick={e => e.stopPropagation()}
  >
    {track.albumArt
      ? <img src={track.albumArt} alt="" style={{ width: 44, height: 44, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} />
      : (
        <div style={{ width: 44, height: 44, borderRadius: 7, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <MusicNoteBeamed size={16} style={{ color: 'rgba(255,255,255,0.2)' }} />
        </div>
      )}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.82)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
        {track.title}
      </div>
      <div style={{ fontSize: 10, marginTop: 2, color: 'rgba(255,255,255,0.32)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {track.artist}
      </div>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
      <button onClick={onPrev} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.32)', padding: 3, display: 'flex' }}>
        <SkipStartFill size={11} />
      </button>
      <button onClick={onToggle} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: 'rgba(255,255,255,0.82)', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {track.isPlaying ? <PauseFill size={10} /> : <PlayFill size={11} />}
      </button>
      <button onClick={onNext} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.32)', padding: 3, display: 'flex' }}>
        <SkipEndFill size={11} />
      </button>
    </div>
  </div>
);

// ─── Left panel wrapper ───────────────────────────────────────────────────────

export const LeftPanel = ({ pomodoro, eventInfo, stocks, spotifyTrack, onToggle, onNext, onPrev }) => {
  const hasContent = pomodoro || eventInfo || stocks.length > 0 || spotifyTrack;
  if (!hasContent) return null;
  return (
    <div
      className="absolute flex flex-col gap-2.5 pointer-events-auto"
      style={{ left: 32, top: '50%', transform: 'translateY(-50%)', zIndex: 22, width: 216 }}
      onClick={e => e.stopPropagation()}
    >
      {pomodoro && <PomodoroPanelCard pomodoro={pomodoro} />}
      {eventInfo && <EventPanelCard eventInfo={eventInfo} />}
      {stocks.length > 0 && <StocksPanelCard stocks={stocks} />}
      {spotifyTrack && (
        <SpotifyMiniCard
          track={spotifyTrack}
          onToggle={onToggle}
          onNext={onNext}
          onPrev={onPrev}
        />
      )}
    </div>
  );
};
