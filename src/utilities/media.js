/**
 * Media Session content script — injected into every page.
 *
 * Detects active media playback via two mechanisms:
 *   1. navigator.mediaSession (used by YouTube, Apple Music, Spotify Web, Deezer, Tidal, etc.)
 *   2. <audio>/<video> element fallback for sites that set mediaSession metadata but leave
 *      playbackState as 'none' (e.g. SoundCloud, Last.fm, older YouTube Music builds).
 *
 * Reports changes to the background SW and responds to MEDIA_ACTION commands.
 */

let prevTitle = null;
let prevPlaybackState = null;

// Becomes false when the extension is reloaded/updated while this content script is still
// alive. After that, all chrome.runtime calls would throw 'Extension context invalidated'.
let contextValid = true;
const pollInterval = setInterval(() => {
  if (!contextValid) { clearInterval(pollInterval); return; }
  poll();
}, 1000);

function getArtwork() {
  const artwork = navigator.mediaSession?.metadata?.artwork;
  if (!artwork?.length) return null;
  // Prefer the largest entry; some sites put best quality last
  return artwork.at(-1).src;
}

/**
 * Returns true when an <audio> or <video> element on the page is actively playing.
 * Used as a fallback when navigator.mediaSession.playbackState === 'none'.
 */
function isMediaElementPlaying() {
  const els = document.querySelectorAll('audio, video');
  for (const el of els) {
    if (!el.paused && !el.ended && el.readyState >= 2) return true;
  }
  return false;
}

function poll() {
  const session = navigator.mediaSession;
  const meta = session?.metadata;
  let playbackState = session?.playbackState ?? 'none';

  // Many sites (SoundCloud, Last.fm, YouTube in some builds) register metadata but
  // never update playbackState from 'none'. Fall back to DOM element detection.
  if (playbackState === 'none') {
    playbackState = isMediaElementPlaying() ? 'playing' : 'paused';
  }

  // If mediaSession has no metadata but audio is playing, synthesize minimal
  // metadata from the page title so SoundCloud and similar sites still surface.
  const effectiveMeta = meta ?? (
    isMediaElementPlaying()
      ? { title: document.title || location.hostname, artist: null, album: null, artwork: [] }
      : null
  );

  if (!effectiveMeta || playbackState === 'none') {
    if (prevTitle !== null) {
      prevTitle = null;
      prevPlaybackState = null;
      safeSend({ type: 'MEDIA_SESSION_CLEAR' });
    }
    return;
  }

  const title = effectiveMeta.title || null;
  const artist = effectiveMeta.artist || null;
  if (title !== prevTitle || playbackState !== prevPlaybackState) {
    prevTitle = title;
    prevPlaybackState = playbackState;
    safeSend({
      type: 'MEDIA_SESSION_UPDATE',
      data: {
        title,
        artist,
        album: effectiveMeta.album || null,
        artwork: getArtwork(),
        playbackState,
        host: location.hostname,
      },
    });
  }
}

// Sends a message to the background SW, silently handling context invalidation.
function safeSend(msg) {
  if (!contextValid) return;
  try {
    chrome.runtime.sendMessage(msg).catch(() => { });
  } catch (e) {
    if (e.message?.includes('Extension context invalidated')) {
      contextValid = false;
      clearInterval(pollInterval);
    }
  }
}

// Forward playback actions sent from the background SW.
// Platform-aware dispatch: each site uses its own stable button selectors.
try {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type !== 'MEDIA_ACTION') return;

    const VALID_ACTIONS = new Set(['play', 'pause', 'next', 'previous']);
    if (!VALID_ACTIONS.has(msg.action)) return;

    const host = location.hostname;
    const action = msg.action;

    // ── SoundCloud ─────────────────────────────────────────────────────────
    if (host.includes('soundcloud.com')) {
      const selectors = {
        play:     ['.playControl'],
        pause:    ['.playControl'],
        next:     ['.skipControl__next'],
        previous: ['.skipControl__previous'],
      };
      for (const sel of selectors[action] ?? []) {
        const btn = document.querySelector(sel);
        if (btn) { btn.click(); return; }
      }
      return;
    }

    // ── YouTube Music ──────────────────────────────────────────────────────
    // music.youtube.com uses a custom player bar (<ytmusic-player-bar>) with
    // stable IDs and class names for its transport controls.
    if (host === 'music.youtube.com') {
      const selectors = {
        play:     ['ytmusic-player-bar #play-pause-button'],
        pause:    ['ytmusic-player-bar #play-pause-button'],
        next:     ['ytmusic-player-bar .next-button'],
        previous: ['ytmusic-player-bar .previous-button'],
      };
      for (const sel of selectors[action] ?? []) {
        const btn = document.querySelector(sel);
        if (btn) { btn.click(); return; }
      }
      return;
    }

    // ── YouTube ────────────────────────────────────────────────────────────
    // www.youtube.com exposes a JS player API on the #movie_player element.
    // Use it directly for the most reliable control; fall back to button
    // clicks for environments where the API is not yet available.
    if (host.includes('youtube.com')) {
      const player = document.getElementById('movie_player');
      if (player) {
        if (action === 'play')  { player.playVideo?.();  return; }
        if (action === 'pause') { player.pauseVideo?.(); return; }
        if (action === 'next') {
          // .ytp-next-button exists in playlist/autoplay queue; disabled otherwise.
          const nextBtn = document.querySelector('.ytp-next-button:not([disabled])');
          if (nextBtn) { nextBtn.click(); return; }
          player.nextVideo?.();
          return;
        }
        if (action === 'previous') {
          const prevBtn = document.querySelector('.ytp-prev-button:not([disabled])');
          if (prevBtn) { prevBtn.click(); return; }
          // No previous track in the queue: restart current video if more than
          // 3 s in, otherwise go to the previous queue entry.
          const time = player.getCurrentTime?.() ?? 0;
          if (time > 3) player.seekTo?.(0, true);
          else player.previousVideo?.();
          return;
        }
      }

      // Fallback when the player element or its API is not yet available
      const fallback = {
        play:     ['.ytp-play-button'],
        pause:    ['.ytp-play-button'],
        next:     ['.ytp-next-button'],
        previous: ['.ytp-prev-button'],
      };
      for (const sel of fallback[action] ?? []) {
        const btn = document.querySelector(sel);
        if (btn) { btn.click(); return; }
      }
    }
  });
} catch (e) {
  if (e.message?.includes('Extension context invalidated')) {
    contextValid = false;
    clearInterval(pollInterval);
  }
}

