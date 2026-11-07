import React from 'react';
import { OrbBackground } from './OrbBackground';

/**
 * Renders the canvas background layer. Only two modes are supported:
 *   - Orb animated gradient (bgType === 'orb')
 *   - Solid accent mesh gradient (bgType === 'solid' — rendered as the page
 *     background colour in App, so nothing needs to be layered here)
 *
 * All data comes from the useCanvasBg hook via spread props.
 */
export const CanvasBackground = ({
  bgType,
  bgOrbRgb,
  isDark,
}) => (
  <>
    {bgType === 'orb' && <OrbBackground zIndex={0} rgb={bgOrbRgb} isDark={isDark} />}
  </>
);
