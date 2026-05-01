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
 *
 * YouTube and YouTube Music nest their media element inside Shadow DOM
 * (ytd-player, ytmusic-player). Standard querySelectorAll never crosses shadow
 * boundaries, so we do a targeted one-level traversal of the known shadow hosts.
 */
function isMediaElementPlaying() {
  // Regular DOM — SoundCloud, Bandcamp, and most sites
  for (const el of document.querySelectorAll('audio, video')) {
    if (!el.paused && !el.ended && el.readyState >= 2) return true;
  }
  // YouTube / YouTube Music shadow DOM — walk one level into known player roots
  for (const host of document.querySelectorAll(
    'ytd-player, ytmusic-player, ytm-player-layout'
  )) {
    const root = host.shadowRoot ?? host;
    for (const el of root.querySelectorAll('audio, video')) {
      if (!el.paused && !el.ended && el.readyState >= 2) return true;
    }
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
  // metadata from the page title.  YouTube's title is "Video – YouTube", strip
  // the suffix so the widget shows the clean video/song name.
  const rawTitle = document.title || location.hostname;
  const cleanTitle = rawTitle
    .replace(/ [-–] YouTube Music$/i, '')
    .replace(/ [-–] YouTube$/i, '')
    .trim() || location.hostname;

  const effectiveMeta = meta ?? (
    isMediaElementPlaying()
      ? { title: cleanTitle, artist: null, album: null, artwork: [] }
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
//
// IMPORTANT: YouTube's player JS API (playVideo, pauseVideo, etc.) lives in
// the PAGE world and is NOT accessible from this isolated-world content script.
// We use native element .click() calls instead — those work across worlds
// because click() is a native DOM method, not a page-JS property.
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
    // Controls live inside <ytmusic-player-bar> which uses Shadow DOM.
    // Try the shadow root first, then fall back to light DOM and full document.
    if (host === 'music.youtube.com') {
      const bar = document.querySelector('ytmusic-player-bar');
      const roots = [bar?.shadowRoot, bar, document].filter(Boolean);
      const selMap = {
        play:     ['#play-pause-button', '.play-pause-button'],
        pause:    ['#play-pause-button', '.play-pause-button'],
        next:     ['#next-button', '.next-button'],
        previous: ['#previous-button', '.previous-button'],
      };
      for (const root of roots) {
        for (const sel of selMap[action] ?? []) {
          const btn = root.querySelector(sel);
          if (btn) { btn.click(); return; }
        }
      }
      return;
    }

    // ── YouTube ────────────────────────────────────────────────────────────
    // IMPORTANT: do NOT use player.playVideo() / pauseVideo() — those are
    // page-world JS properties, invisible from this isolated-world script.
    //
    // For play/pause: dispatch the 'k' keyboard shortcut on document.
    //   • 'k' is YouTube's documented play/pause toggle.
    //   • KeyboardEvents created here propagate through the DOM normally and
    //     are handled by YouTube's page-world shortcut listener — crossing the
    //     world boundary is fine for DOM events (only JS property access is isolated).
    //   • This avoids the "wrong element" problem: document.querySelector('.ytp-play-button')
    //     can match ad controls or mini-player overlays; the keyboard route is unambiguous.
    //
    // For next/prev: button clicks are unambiguous so .click() is fine.
    if (host.includes('youtube.com')) {
      if (action === 'play' || action === 'pause') {
        // Primary: keyboard shortcut 'k' handled by YouTube's global listener
        document.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'k', code: 'KeyK', keyCode: 75, which: 75,
          bubbles: true, cancelable: true,
        }));
        return;
      }
      if (action === 'next') {
        document.querySelector('.ytp-next-button:not([disabled])')?.click();
        return;
      }
      if (action === 'previous') {
        const prevBtn = document.querySelector('.ytp-prev-button:not([disabled])');
        if (prevBtn) { prevBtn.click(); return; }
        // No playlist prev-button: restart current video after 3 s
        const player = document.getElementById('movie_player');
        const t = player?.getCurrentTime?.();
        if (typeof t === 'number' && t > 3) player.seekTo?.(0, true);
        return;
      }
    }
  });
} catch (e) {
  if (e.message?.includes('Extension context invalidated')) {
    contextValid = false;
    clearInterval(pollInterval);
  }
}

