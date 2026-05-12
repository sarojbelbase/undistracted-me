/**
 * FitText — React component for pixel-accurate single-line text fitting.
 *
 * Instead of CSS `truncate` (which clips with "…"), FitText shrinks the font
 * size so the full text always fits in the available space. No ellipsis, no
 * clipping — the text is always completely readable.
 *
 * Uses @chenglou/pretext via fitSingleLine() for canvas-accurate width
 * measurement without any DOM reflow.
 *
 * Props:
 *   text        {string}   — text to display
 *   maxSize     {number}   — upper font-size bound (px); used as initial size
 *   minSize     {number}   — lower font-size bound (px); default 8
 *   weight      {number}   — font-weight; default 400
 *   fontFamily  {string}   — font family string (CSS format); defaults to
 *                            Google Sans (global app default)
 *   className   {string}   — additional CSS classes
 *   style       {object}   — additional inline styles (merged on the span)
 *
 * The rendered element is a block-level div with `overflow: hidden` and
 * `white-space: nowrap` — if measurement is wrong for any reason the text
 * is clipped rather than breaking layout.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { fitSingleLine, canvasFont } from '../../utilities/fitText.js';

export function FitText({
  text,
  maxSize,
  minSize = 8,
  weight = 400,
  fontFamily = "'Google Sans', sans-serif",
  className,
  style,
}) {
  const containerRef = useRef(null);
  const [fontSize, setFontSize] = useState(maxSize);
  const [fontsReady, setFontsReady] = useState(false);

  // Gate on fonts being loaded — canvas measureText is inaccurate before fonts load.
  useEffect(() => {
    if (document.fonts.status === 'loaded') {
      setFontsReady(true);
    } else {
      document.fonts.ready.then(() => setFontsReady(true));
    }
  }, []);

  const measure = useCallback(
    (width) => {
      if (!text || width <= 0) {
        setFontSize(maxSize);
        return;
      }
      const spec = canvasFont(weight, fontFamily);
      const fs = fitSingleLine(text, spec, width, { maxSize, minSize });
      setFontSize(fs);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [text, maxSize, minSize, weight, fontFamily, fontsReady],
  );

  // ResizeObserver: re-measure whenever the container width changes.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Initial measurement
    const { width } = el.getBoundingClientRect();
    measure(width);

    const ro = new ResizeObserver(([entry]) => {
      measure(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        fontSize,
        fontWeight: weight,
        fontFamily,
        ...style,
      }}
    >
      {text}
    </div>
  );
}
