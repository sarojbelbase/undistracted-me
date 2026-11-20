import { useState, useEffect } from 'react';
import { OrbBackground } from './OrbBackground';

/**
 * Renders the canvas background layer. Supported modes:
 *   - Orb animated gradient (bgType === 'orb')
 *   - Photo / custom image (bgType === 'photo' | 'custom') via a two-slot
 *     crossfade that mirrors Focus Mode's curated-photo transition
 *   - Solid accent mesh gradient (bgType === 'solid' — rendered as the page
 *     background colour in App, so nothing needs to be layered here)
 *
 * All data comes from the useCanvasBg hook via spread props.
 */

const IMAGE_STYLE = {
  position: 'absolute',
  inset: 0,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
};

/**
 * Two-slot crossfade for the canvas image background. When `url` changes, the
 * new image fades in over the previous one instead of snapping — same 2.5s
 * ease as Focus Mode's photo crossfade.
 */
function CanvasBgImage({ url, color }) {
  const [slots, setSlots] = useState(() => ({
    a: { url, id: 0 },
    b: { url: null, id: 0 },
    active: 'a',
  }));

  useEffect(() => {
    if (!url) return;
    // Preload before swapping slots: if we flip the slot immediately, the new
    // `background-image` starts downloading mid-crossfade and paints in bands
    // (a CRT "line by line" effect). Waiting for `onload` means the image is
    // fully decoded (and cached) before the 2.5s crossfade starts.
    let alive = true;
    const img = new Image();
    img.onload = () => {
      if (!alive) return;
      setSlots((prev) => {
        if (prev[prev.active].url === url) return prev;
        const next = prev.active === 'a' ? 'b' : 'a';
        return { ...prev, [next]: { url, id: prev[next].id + 1 }, active: next };
      });
    };
    img.src = url;
    return () => {
      alive = false;
      img.onload = null;
    };
  }, [url]);

  const bg = (u) => (u ? `url("${u}")` : 'none');
  const base = color || '#18191b';

  return (
    <>
      <div
        style={{
          ...IMAGE_STYLE,
          zIndex: 0,
          backgroundColor: base,
          backgroundImage: bg(slots.a.url),
          opacity: slots.active === 'a' ? 1 : 0,
          transition: 'opacity 2.5s ease',
        }}
      />
      <div
        style={{
          ...IMAGE_STYLE,
          zIndex: 1,
          backgroundColor: base,
          backgroundImage: bg(slots.b.url),
          opacity: slots.active === 'b' ? 1 : 0,
          transition: 'opacity 2.5s ease',
        }}
      />
    </>
  );
}

export const CanvasBackground = ({
  bgType,
  bgOrbRgb,
  isDark,
  bgUrl,
  bgColor,
}) => (
  <>
    {bgType === 'orb' && <OrbBackground zIndex={0} rgb={bgOrbRgb} isDark={isDark} />}
    {(bgType === 'photo' || bgType === 'custom') && bgUrl && (
      <CanvasBgImage url={bgUrl} color={bgColor} />
    )}
  </>
);
