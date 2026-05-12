/**
 * fitText — Pixel-accurate text fitting utilities powered by @chenglou/pretext.
 *
 * Two entry points:
 *
 *   fitSingleLine(text, canvasFont, containerWidth, options)
 *     → The largest integer fontSize (px) at which `text` fits on ONE line
 *       within `containerWidth`. Uses pretext's measureNaturalWidth() at 1px
 *       then scales linearly — zero DOM, zero reflow.
 *
 *   fitMultiLine(text, canvasFont, containerWidth, containerHeight, options)
 *     → The largest integer fontSize (px) at which `text` wraps to fit inside
 *       `containerWidth × containerHeight`. Uses a 16-iteration binary search
 *       over pretext's layout() — pure arithmetic, no DOM.
 *
 * Scale-invariance trick: pretext prepare() at 1px gives width factors.
 * At font-size N the natural width is `naturalWidth1px × N`.
 * Similarly, layout(p, containerWidth / N, lineHeight).height × N gives block
 * height at font-size N. This lets us binary-search without re-preparing.
 *
 * Performance: prepare() is O(n words) canvas calls — call once per text string.
 * layout() is ~0.0002 ms pure arithmetic — safe to call per resize.
 *
 * Canvas font shorthand format (same as CanvasRenderingContext2D.font):
 *   '600 1px "Google Sans"'   ← weight + size + family
 *   '400 1px Inter'
 *   '400 1px "League Gothic", "Hind", sans-serif'
 *
 * The size in the shorthand must be '1px' — these utilities handle the scaling.
 */

import {
  prepare,
  prepareWithSegments,
  measureNaturalWidth,
  layout,
} from '@chenglou/pretext';

/**
 * Build the canvas font shorthand for pretext at 1px.
 * @param {number} weight  e.g. 400, 600
 * @param {string} family  e.g. "'Google Sans', sans-serif"
 */
export function canvasFont(weight, family) {
  return `${weight} 1px ${family}`;
}

/**
 * Fit `text` on a single line within `containerWidth`.
 *
 * @param {string} text
 * @param {string} fontSpec  Canvas font shorthand at 1px, e.g. '600 1px "Google Sans"'
 * @param {number} containerWidth  Available px width
 * @param {{ maxSize?: number, minSize?: number }} [opts]
 * @returns {number}  Integer fontSize in px
 */
export function fitSingleLine(text, fontSpec, containerWidth, opts = {}) {
  const { maxSize = 48, minSize = 8 } = opts;

  if (!text || containerWidth <= 0) return minSize;

  const prepared = prepareWithSegments(text, fontSpec);
  // naturalWidth at 1px — the widest line when no container-forced wraps.
  const w1 = measureNaturalWidth(prepared);

  if (w1 <= 0) return maxSize;

  // At fontSize N: rendered width = w1 * N.
  // We want w1 * N <= containerWidth * 0.97 → N <= containerWidth * 0.97 / w1
  const fs = Math.floor((containerWidth * 0.97) / w1);
  return Math.max(minSize, Math.min(maxSize, fs));
}

/**
 * Fit `text` as a wrapped paragraph inside `containerWidth × containerHeight`.
 *
 * @param {string} text
 * @param {string} fontSpec  Canvas font shorthand at 1px
 * @param {number} containerWidth   Available px width
 * @param {number} containerHeight  Available px height
 * @param {{ maxSize?: number, minSize?: number, lineHeight?: number }} [opts]
 * @returns {number}  Integer fontSize in px
 */
export function fitMultiLine(text, fontSpec, containerWidth, containerHeight, opts = {}) {
  const { maxSize = 120, minSize = 8, lineHeight = 1, fillTarget = 0.97 } = opts;

  if (!text || containerWidth <= 0 || containerHeight <= 0) return minSize;

  const prepared = prepare(text, fontSpec);

  // Binary search: at font-size `mid`, scale the container inversely.
  // layout(p, containerWidth/mid, lineHeight).height * mid ≈ block height at mid px.
  let lo = minSize;
  let hi = maxSize;

  for (let iter = 0; iter < 16; iter++) {
    const mid = (lo + hi) / 2;
    if (mid <= 0) break;
    const { height } = layout(prepared, containerWidth / mid, lineHeight);
    if (height * mid <= containerHeight * fillTarget) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return Math.max(minSize, Math.min(maxSize, Math.floor(lo)));
}

/**
 * Like fitMultiLine but also returns the line count at the fitted size.
 * Use this when you need to compute a precise block height (e.g. button
 * height including descender space) without an additional DOM measurement.
 *
 * Extra option:
 *   fillTarget {number}  — fraction of containerHeight to target (default 0.97).
 *     Ultra-condensed fonts (League Gothic) need ~0.78 because canvas advance
 *     widths underestimate the actual browser-rendered widths by ~20%; a tighter
 *     fill target compensates, producing the same result the DOM binary search
 *     found empirically.
 *
 * @returns {{ fontSize: number, lineCount: number }}
 */
export function fitMultiLineDetails(text, fontSpec, containerWidth, containerHeight, opts = {}) {
  const { maxSize = 120, minSize = 8, lineHeight = 1, fillTarget = 0.97 } = opts;

  if (!text || containerWidth <= 0 || containerHeight <= 0) return { fontSize: minSize, lineCount: 1 };

  const prepared = prepare(text, fontSpec);
  let lo = minSize;
  let hi = maxSize;

  for (let iter = 0; iter < 16; iter++) {
    const mid = (lo + hi) / 2;
    if (mid <= 0) break;
    const { height } = layout(prepared, containerWidth / mid, lineHeight);
    if (height * mid <= containerHeight * fillTarget) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const fs = Math.max(minSize, Math.min(maxSize, Math.floor(lo)));
  const { lineCount } = layout(prepared, containerWidth / fs, lineHeight);
  return { fontSize: fs, lineCount };
}
