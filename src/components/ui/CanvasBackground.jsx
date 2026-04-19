import React from 'react';
import { OrbBackground } from './OrbBackground';

/**
 * Renders all canvas background layers:
 *   - Orb animated gradient (bgType === 'orb')
 *   - Blurry thumbnail placeholder that also drives colour extraction (curated)
 *   - Sharp full-resolution image (curated / custom / default)
 *
 * All data comes from the useCanvasBg hook via spread props.
 */
export const CanvasBackground = ({
  bgType,
  bgOrbRgb,
  bgImageUrl,
  bgThumbUrl,
  thumbReady,
  fullReady,
  onThumbLoad,
  onFullLoad,
  isDark,
}) => (
  <>
    {bgType === 'orb' && <OrbBackground zIndex={0} rgb={bgOrbRgb} isDark={isDark} />}

    {bgType === 'curated' && bgThumbUrl && (
      <img
        key={bgThumbUrl}
        src={bgThumbUrl}
        alt=""
        aria-hidden
        crossOrigin="anonymous"
        onLoad={onThumbLoad}
        style={{
          position: 'absolute', inset: 0, zIndex: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          filter: 'blur(18px)',
          transform: 'scale(1.08)', // hide blur edges
          opacity: thumbReady ? 1 : 0,
          transition: 'opacity 0.4s ease',
          pointerEvents: 'none',
        }}
      />
    )}

    {(bgType === 'curated' || bgType === 'custom' || bgType === 'default') && bgImageUrl && (
      <img
        key={bgImageUrl}
        src={bgImageUrl}
        alt=""
        aria-hidden
        onLoad={onFullLoad}
        style={{
          position: 'absolute', inset: 0, zIndex: 1,
          width: '100%', height: '100%',
          objectFit: 'cover',
          opacity: fullReady ? 1 : 0,
          transition: 'opacity 0.6s ease',
          pointerEvents: 'none',
        }}
      />
    )}
  </>
);
