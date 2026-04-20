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
// Currently supports SoundCloud via its player button CSS classes.
// More media playback sites will be added soon.
try {
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type !== 'MEDIA_ACTION') return;

    const VALID_ACTIONS = new Set(['play', 'pause', 'next', 'previous']);
    if (!VALID_ACTIONS.has(msg.action)) return;

    // Click the SoundCloud player button.
    const buttonSelectors = {
      play: ['.playControl'],
      pause: ['.playControl'],
      next: ['.skipControl__next'],
      previous: ['.skipControl__previous'],
    };
    for (const sel of buttonSelectors[msg.action]) {
      const btn = document.querySelector(sel);
      if (btn) { btn.click(); break; }
    }
  });
} catch (e) {
  if (e.message?.includes('Extension context invalidated')) {
    contextValid = false;
    clearInterval(pollInterval);
  }
}

