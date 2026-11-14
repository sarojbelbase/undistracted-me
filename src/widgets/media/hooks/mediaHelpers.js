/**
 * Shared media helpers — dark colour util, track parser, artwork ring,
 * and colour token resolution. Used by Widget, ChromeMediaPlayer, etc.
 */

// Darken an RGB colour for gradient backgrounds
export const dark = (r, g, b, f) => `rgb(${Math.round(r * f)},${Math.round(g * f)},${Math.round(b * f)})`;

export const parseTrack = (data) => {
  if (!data?.item) return null;
  const t = data.item;
  return {
    isPlaying: data.is_playing,
    title: t.name,
    artist: t.artists.map(a => a.name).join(', '),
    albumArt: t.album.images[0]?.url ?? null,
    durationMs: t.duration_ms,
    progressMs: data.progress_ms ?? 0,
  };
};

const SOURCE_META = {
  'music.youtube.com': { color: '#c00c1e', label: 'YouTube Music' },
  'www.youtube.com': { color: '#ff0000', label: 'YouTube' },
  'youtube.com': { color: '#ff0000', label: 'YouTube' },
  'soundcloud.com': { color: '#ff5500', label: 'SoundCloud' },
};

/**
 * Host priority for tie-breaking between multiple media sessions.
 * Lower = higher priority. Used by `selectActiveSession` so the canvas Media
 * widget and Focus Mode both resolve the same "now playing" tab.
 */
export function chromeHostPriority(host) {
  if (!host) return 99;
  if (host === 'music.youtube.com') return 0;
  if (host.includes('youtube.com')) return 1;
  if (host.includes('soundcloud.com')) return 2;
  return 99;
}

/**
 * Picks the single session that best represents "now playing" from the raw
 * session list. Rules, in order:
 *   1. Prefer a session whose playbackState is 'playing' over one that is paused.
 *   2. Among equal playback states, prefer the higher-priority host.
 *
 * This is the single source of truth shared by the canvas Media widget and
 * Focus Mode — previously Focus Mode naively used `sessions[0]`, which could be
 * a stale (most-recently-updated but paused) session and lag behind the widget.
 */
export function selectActiveSession(sessions) {
  if (!sessions?.length) return null;
  return sessions.reduce((best, s) => {
    if (!best) return s;
    const bestPlaying = best.playbackState === 'playing';
    const sPlaying = s.playbackState === 'playing';
    if (sPlaying && !bestPlaying) return s;
    if (!sPlaying && bestPlaying) return best;
    return chromeHostPriority(s.host) <= chromeHostPriority(best.host) ? s : best;
  }, null) ?? null;
}

export function chromeArtworkRing(host) {
  const meta = host ? (SOURCE_META[host] ?? null) : null;
  if (!meta) return {};
  return { outline: `2px solid ${meta.color}`, outlineOffset: '2px' };
}

export function resolveColors(accentColor, hasBg) {
  let bgStyle;
  if (accentColor) {
    bgStyle = { background: `linear-gradient(160deg, ${dark(accentColor.r, accentColor.g, accentColor.b, 0.55)} 0%, ${dark(accentColor.r, accentColor.g, accentColor.b, 0.35)} 100%)` };
  } else if (hasBg) {
    bgStyle = { backgroundColor: '#1a1a1e' };
  } else {
    bgStyle = {};
  }
  return {
    bgStyle,
    ink: hasBg ? 'rgba(255,255,255,0.95)' : 'var(--w-ink-1)',
    mute: hasBg ? 'rgba(255,255,255,0.6)' : 'var(--w-ink-4)',
    btnBg: hasBg ? 'rgba(255,255,255,0.18)' : 'var(--panel-bg)',
    btnBorder: hasBg ? '1px solid rgba(255,255,255,0.25)' : '1px solid var(--card-border)',
  };
}
