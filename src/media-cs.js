/**
 * Media Session content script — injected into every page.
 * Polls navigator.mediaSession each second and reports changes to the background SW.
 * Also listens for MEDIA_ACTION messages from the background and dispatches media keys.
 */

let prevTitle = null;
let prevPlaybackState = null;

function getArtwork() {
  const artwork = navigator.mediaSession?.metadata?.artwork;
  if (!artwork?.length) return null;
  // Prefer the largest artwork entry
  return artwork[artwork.length - 1].src;
}

function poll() {
  const meta = navigator.mediaSession?.metadata;
  const playbackState = navigator.mediaSession?.playbackState ?? 'none';

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

// Dispatch media keyboard events when the background requests a playback action
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== 'MEDIA_ACTION') return;
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
