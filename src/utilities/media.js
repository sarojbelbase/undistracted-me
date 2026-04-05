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

function getArtwork() {
  const artwork = navigator.mediaSession?.metadata?.artwork;
  if (!artwork?.length) return null;
  // Prefer the largest entry; some sites put best quality last
  return artwork[artwork.length - 1].src;
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
  if (meta && playbackState === 'none') {
    playbackState = isMediaElementPlaying() ? 'playing' : 'paused';
  }

  if (!meta || playbackState === 'none') {
    if (prevTitle !== null) {
      prevTitle = null;
      prevPlaybackState = null;
      chrome.runtime.sendMessage({ type: 'MEDIA_SESSION_CLEAR' }).catch(() => { });
    }
    return;
  }

  if (meta.title !== prevTitle || playbackState !== prevPlaybackState) {
    prevTitle = meta.title;
    prevPlaybackState = playbackState;
    chrome.runtime.sendMessage({
      type: 'MEDIA_SESSION_UPDATE',
      data: {
        title: meta.title || null,
        artist: meta.artist || null,
        album: meta.album || null,
        artwork: getArtwork(),
        playbackState,
        host: location.hostname,
      },
    }).catch(() => { });
  }
}

setInterval(poll, 1000);

// Forward playback actions sent from the background SW.
// Tries the Media Session API action handler first (most reliable), then falls back
// to synthetic media-key events that almost all music sites handle.
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== 'MEDIA_ACTION') return;

  const sessionActionMap = {
    play: 'play',
    pause: 'pause',
    next: 'nexttrack',
    previous: 'previoustrack',
  };
  const sessionAction = sessionActionMap[msg.action];
  if (sessionAction) {
    try {
      // navigator.mediaSession.callActionHandler is non-standard but widely supported
      if (navigator.mediaSession?.callActionHandler) {
        navigator.mediaSession.callActionHandler(sessionAction);
        return;
      }
    } catch { /* fall through to keyboard event */ }
  }

  const keyMap = {
    play: 'MediaPlayPause',
    pause: 'MediaPlayPause',
    next: 'MediaTrackNext',
    previous: 'MediaTrackPrevious',
  };
  const key = keyMap[msg.action];
  if (!key) return;
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  document.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }));
});
