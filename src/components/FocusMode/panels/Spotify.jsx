import { useRef, useState, useEffect } from 'react';
import { MusicNoteBeamed, PauseFill, PlayFill, SkipStartFill, SkipEndFill } from 'react-bootstrap-icons';
import { FOCUS_THEME, FM_SPINNER_RING, FM_SPINNER_ACTIVE } from '../theme';

export const SpotifyPanel = ({ track, onToggle, onNext, onPrev, pending, skipPending }) => {
  const t = FOCUS_THEME;

  // Animate when the track changes
  const prevIdRef = useRef(track.title + track.artist);
  const [animKey, setAnimKey] = useState(0);
  useEffect(() => {
    const id = track.title + track.artist;
    if (id !== prevIdRef.current) {
      prevIdRef.current = id;
      setAnimKey(k => k + 1);
    }
  }, [track.title, track.artist]);

  return (
    <div role="none" style={{ ...t.card, padding: '10px 12px' }} onClick={e => e.stopPropagation()}>
      {/* Album art + title + artist */}
      <div key={animKey} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', animation: animKey > 0 ? 'spotifyTrackIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both' : undefined }}>
        {track.albumArt
          ? <img src={track.albumArt} alt="" decoding="async" style={{ width: 40, height: 40, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} />
          : (
            <div style={{ width: 40, height: 40, borderRadius: 7, background: t.track, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <MusicNoteBeamed size={20} style={{ color: t.sub }} />
            </div>
          )
        }
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 12, fontWeight: 600, color: 'var(--w-accent)',
            letterSpacing: '-0.01em', lineHeight: 1.35,
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {track.title}
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, marginTop: 3, color: t.sub }}>
            {track.artist}
          </div>
        </div>
      </div>

      {/* Playback controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 }}>
        <button
          onClick={onPrev}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.btnIcon, padding: 3, display: 'flex', opacity: skipPending === 'prev' ? 0.5 : 1, transition: 'opacity 0.2s' }}
        >
          <SkipStartFill size={14} />
        </button>
        <div style={{ position: 'relative' }}>
          {pending && (
            <div
              className="animate-spin"
              style={{ position: 'absolute', inset: -2, borderRadius: '50%', border: `1.5px solid ${FM_SPINNER_RING}`, borderTopColor: FM_SPINNER_ACTIVE, pointerEvents: 'none' }}
              aria-hidden="true"
            />
          )}
          <button
            onClick={onToggle}
            style={{ background: t.btnBg, border: `1px solid ${t.btnBorder}`, cursor: 'pointer', color: t.btnColor, borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: pending ? 0.75 : 1, transition: 'opacity 0.2s' }}
          >
            {track.isPlaying ? <PauseFill size={13} /> : <PlayFill size={13} />}
          </button>
        </div>
        <button
          onClick={onNext}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: t.btnIcon, padding: 3, display: 'flex', opacity: skipPending === 'next' ? 0.5 : 1, transition: 'opacity 0.2s' }}
        >
          <SkipEndFill size={14} />
        </button>
      </div>
    </div>
  );
};
