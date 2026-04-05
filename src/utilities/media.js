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
// Uses a layered fallback strategy:
//   1. callActionHandler via injected main-world script (most reliable for sites
//      that use navigator.mediaSession, e.g. YouTube, Spotify Web, Apple Music)
//   2. Direct HTMLMediaElement .play()/.pause() for native video/audio sites
//   3. Synthetic media-key keyboard events on both window and document
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== 'MEDIA_ACTION') return;

  const VALID_ACTIONS = new Set(['play', 'pause', 'next', 'previous']);
  if (!VALID_ACTIONS.has(msg.action)) return;

  const sessionActionMap = {
    play: 'play',
    pause: 'pause',
    next: 'nexttrack',
    previous: 'previoustrack',
  };
  const sessionAction = sessionActionMap[msg.action];

  // Strategy 1: inject into the page's main world so callActionHandler can reach
  // action handlers registered by the page's own JavaScript. Content scripts run
  // in an isolated world and may not share the same MediaSession action handler
  // registry as the page in all browser builds.
  if (sessionAction) {
    try {
      const script = document.createElement('script');
      // The action name is validated against a fixed set above — no injection risk.
      script.textContent = `
        (function() {
          try {
            if (navigator.mediaSession && navigator.mediaSession.callActionHandler) {
              navigator.mediaSession.callActionHandler('${sessionAction}');
            }
          } catch(e) {}
        })();
      `;
      (document.head || document.documentElement).appendChild(script);
      script.remove();
    } catch { /* fall through */ }
  }

  // Strategy 2: directly control HTML5 media elements (works on YouTube, SoundCloud, etc.)
  // This is reliable because .play()/.pause() are accessible from the isolated world.
  if (msg.action === 'play' || msg.action === 'pause') {
    const els = document.querySelectorAll('audio, video');
    for (const el of els) {
      if (el.readyState >= 2) {
        try {
          if (msg.action === 'play' && el.paused) el.play();
          else if (msg.action === 'pause' && !el.paused) el.pause();
        } catch { /* autoplay policy or other error — skip */ }
      }
    }
  }

  // Strategy 3: synthetic media-key events as last resort.
  // Dispatched to both window and document to cover all listener patterns.
  // Note: isTrusted is false on synthetic events, so sites that check it won't respond.
  const keyMap = {
    play: 'MediaPlayPause',
    pause: 'MediaPlayPause',
    next: 'MediaTrackNext',
    previous: 'MediaTrackPrevious',
  };
  const key = keyMap[msg.action];
  if (!key) return;
  const downEvt = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  const upEvt = new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true });
  document.dispatchEvent(downEvt);
  document.dispatchEvent(upEvt);
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  window.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }));
});
