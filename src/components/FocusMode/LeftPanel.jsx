import { MusicNoteBeamed, PauseFill, PlayFill, SkipStartFill, SkipEndFill } from 'react-bootstrap-icons';
import { formatTime } from '../../widgets/pomodoro/utils';
import { priceStats, fmtPrice } from '../../widgets/stock/utils';
import { GLASS_CARD, getTimeUntilEvent, formatEventStartTime } from './constants';
import { useSettingsStore } from '../../store';

// ─── Theme tokens driven by light / dark mode ─────────────────────────────────

// Focus Mode is always rendered over a photo — cards always use dark glass
// regardless of the app's light/dark mode preference.
const getTheme = (_mode) => ({
  card: GLASS_CARD,
  label: 'rgba(255,255,255,0.48)',
  text: 'rgba(255,255,255,0.88)',
  sub: 'rgba(255,255,255,0.62)',
  track: 'rgba(255,255,255,0.10)',
  btnBg: 'rgba(255,255,255,0.14)',
  btnBorder: 'rgba(255,255,255,0.14)',
  btnColor: 'rgba(255,255,255,0.88)',
  btnIcon: 'rgba(255,255,255,0.55)',
});

// ─── Card entry animation (spring-in from below, staggered) ──────────────────

const AnimatedCard = ({ delay, children }) => (
  <div style={{ animation: `panelCardIn 0.52s cubic-bezier(0.16,1,0.3,1) ${delay}ms both` }}>
    {children}
  </div>
);

// ─── Pomodoro card ────────────────────────────────────────────────────────────

const PomodoroPanelCard = ({ pomodoro, t }) => {
  const pct = pomodoro.total > 0 ? (pomodoro.remaining / pomodoro.total) * 100 : 0;
  return (
    <div style={{ ...t.card, padding: '14px 16px' }}>
      <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: t.label, fontWeight: 700 }}>
        Focus{pomodoro.preset ? ` · ${pomodoro.preset}` : ''}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: t.text, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em', marginTop: 5 }}>
        {formatTime(pomodoro.remaining)}
      </div>
      <div style={{ marginTop: 10, height: 2, borderRadius: 2, background: t.track }}>
        <div style={{ height: '100%', borderRadius: 2, background: 'var(--w-accent)', width: `${pct.toFixed(1)}%`, transition: 'width 1s linear', opacity: 0.6 }} />
      </div>
    </div>
  );
};

// ─── Event card ───────────────────────────────────────────────────────────────

const EventPanelCard = ({ eventInfo, t }) => {
  const { event, isActive } = eventInfo;
  return (
    <div style={{ ...t.card, padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--w-accent)', opacity: isActive ? 0.9 : 0.45, flexShrink: 0, display: 'inline-block' }} />
        <span style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: t.label, fontWeight: 700 }}>
          {isActive ? 'Now' : 'Upcoming'}
        </span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: t.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
        {event.title}
      </div>
      <div style={{ fontSize: 10, marginTop: 3, color: t.sub }}>
        {isActive ? 'in progress' : getTimeUntilEvent(event)}
        {formatEventStartTime(event) ? ` · ${formatEventStartTime(event)}` : ''}
      </div>
    </div>
  );
};

// ─── Stocks card ──────────────────────────────────────────────────────────────

const StocksPanelCard = ({ stocks, t }) => (
  <div style={{ ...t.card, padding: '12px 16px' }}>
    <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: t.label, fontWeight: 700, marginBottom: 8 }}>
      {stocks.length >= 2 ? 'Watchlist' : 'Stocks'}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {stocks.map(({ sym, data }) => {
        const stats = data ? priceStats(data) : null;
        const clr = !stats
          ? t.sub
          : stats.dir === 'up' ? '#4ade80' : stats.dir === 'down' ? '#f87171' : t.sub;
        return (
          <div key={sym} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            {/* Symbol in accent color */}
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--w-accent)', letterSpacing: '0.08em' }}>{sym}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 11, color: t.sub, fontVariantNumeric: 'tabular-nums' }}>
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

const SpotifyMiniCard = ({ track, onToggle, onNext, onPrev, t }) => (
  <div
    style={{ ...t.card, padding: '10px 12px' }}
    onClick={e => e.stopPropagation()}
  >
    {/* Album art + title + artist */}
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      {track.albumArt
        ? <img src={track.albumArt} alt="" style={{ width: 40, height: 40, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} />
        : (
          <div style={{ width: 40, height: 40, borderRadius: 7, background: t.track, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MusicNoteBeamed size={16} style={{ color: t.sub }} />
          </div>
        )
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title in accent color — wraps up to 2 lines, no ellipsis */}
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--w-accent)',
          letterSpacing: '-0.01em',
          lineHeight: 1.35,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {track.title}
        </div>
        <div style={{ fontSize: 10, marginTop: 3, color: t.sub }}>
          {track.artist}
        </div>
      </div>
    </div>
    {/* Controls: centered below */}
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 }}>
      <button onClick={onPrev} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.btnIcon, padding: 3, display: 'flex' }}>
        <SkipStartFill size={11} />
      </button>
      <button onClick={onToggle} style={{ background: t.btnBg, border: `1px solid ${t.btnBorder}`, cursor: 'pointer', color: t.btnColor, borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {track.isPlaying ? <PauseFill size={10} /> : <PlayFill size={11} />}
      </button>
      <button onClick={onNext} style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.btnIcon, padding: 3, display: 'flex' }}>
        <SkipEndFill size={11} />
      </button>
    </div>
  </div>
);

// ─── Left panel wrapper ───────────────────────────────────────────────────────

export const LeftPanel = ({ pomodoro, eventInfo, stocks, spotifyTrack, onToggle, onNext, onPrev }) => {
  const { mode } = useSettingsStore();
  const t = getTheme(mode);
  const hasContent = pomodoro || eventInfo || stocks.length > 0 || spotifyTrack;
  if (!hasContent) return null;

  return (
    <div
      className="fm-left-panel pointer-events-auto"
      style={{ zIndex: 22 }}
      onClick={e => e.stopPropagation()}
    >
      {pomodoro && (
        <AnimatedCard delay={0}>
          <PomodoroPanelCard pomodoro={pomodoro} t={t} />
        </AnimatedCard>
      )}
      {eventInfo && (
        <AnimatedCard delay={70}>
          <EventPanelCard eventInfo={eventInfo} t={t} />
        </AnimatedCard>
      )}
      {stocks.length > 0 && (
        <AnimatedCard delay={140}>
          <StocksPanelCard stocks={stocks} t={t} />
        </AnimatedCard>
      )}
      {spotifyTrack && (
        <AnimatedCard delay={210}>
          <SpotifyMiniCard
            track={spotifyTrack}
            onToggle={onToggle}
            onNext={onNext}
            onPrev={onPrev}
            t={t}
          />
        </AnimatedCard>
      )}
    </div>
  );
};
