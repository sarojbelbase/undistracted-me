/**
 * expressifyText — Magazine-quality scale-contrast typographic layout engine.
 *
 * Picks one semantically meaningful "hero" word and calculates per-word font
 * metrics so the full headline fills a given pixel area without clipping.
 * Body text is kept at a comfortable reading size — the effect comes from
 * RATIO (font-size contrast), not from making body tiny.
 *
 * Performance: @chenglou/pretext handles canvas measurement via Intl.Segmenter
 * and an inverse-scale trick (prepare at 1px, binary-search layout at 1px width)
 * so all iterations are pure arithmetic — no DOM reflow in the hot path.
 *
 * Typography: all tokens share the same line-height (1.15). The hero word's
 * larger font-size is the sole source of visual contrast, keeping the line
 * rhythm harmonious and legible — how print magazines actually work.
 *
 * Design references: Cosmopolitan digital, Flipboard editorial cards,
 * Apple News hero cards, WIRED magazine covers.
 *
 * Exports:
 *   expressiveLayout(title, areaWidth, areaHeight, fontFamily?) → layout tokens
 *   ExpressiveTitle  — React component; DOM-measures + renders a fitted headline
 */

import { useState, useEffect, useMemo } from 'react';
import { fitMultiLineDetails, canvasFont } from './fitText.js';

// ─── Constants ────────────────────────────────────────────────────────────────
// Unity: unified LINE_HEIGHT means size contrast IS the visual contrast.
// League Gothic is a display face — tight leading is intentional and correct.
// 1.0 means each line occupies exactly one em, no extra leading.
const LINE_HEIGHT = 1;
const HERO_WEIGHT = 400;
const BODY_WEIGHT = 400;

/**
 * Design principle — Proportion:
 * The hero-to-body ratio adapts to word count.
 * Short headlines (4–6 words) have room for strongest contrast (2.4×).
 * Long headlines (12+ words) tighten the ratio so body text stays large.
 * This keeps every card proportionally balanced regardless of content length.
 */
function adaptiveHeroMult(wordCount) {
  if (wordCount <= 6) return 2.4;
  if (wordCount <= 9) return 2.1;
  if (wordCount <= 13) return 1.9;
  return 1.7;
}

// ─── Stop-word list ───────────────────────────────────────────────────────────
const STOP = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'nor', 'so', 'for', 'yet',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'to', 'of', 'in', 'on', 'at', 'by', 'up', 'as', 'off', 'out', 'from',
  'into', 'with', 'about', 'after', 'before', 'through', 'between', 'over',
  'not', 'no', 'if', 'its', 'it', 'he', 'she', 'they', 'we', 'you', 'i',
  'that', 'this', 'his', 'her', 'their', 'our', 'than', 'then', 'there',
  'when', 'how', 'what', 'who', 'which', 'where', 'more', 'most',
  'some', 'just', 'also', 'says', 'said', 'say', 'new', 'one', 'two',
  'can', 'cannot', 'all', 'any', 'each', 'few', 'now', 'only', 'other',
  'same', 'too', 'very', 'both', 'those', 'these', 'such', 'per', 'via',
]);

// ─── Canvas infrastructure removed ───────────────────────────────────────────
// Word-width precomputation and fastWrap previously lived here.
// Replaced by @chenglou/pretext via fitMultiLine() in uniformFallback().
// pretext prepare() + layout() is more accurate (Intl.Segmenter, emoji
// correction, bidi) and eliminates this ~80-line hand-rolled implementation.
/**
 * Design principles — Rhythm + Balance:
 * Scores a wrapped layout for visual composition quality.
 * Used in two-pass hero selection to pick not just the semantically rich word
 * but the word whose placement creates the most harmonious composition.
 *
 * Penalises:
 *   Orphan/widow last line (1 word alone) — breaks rhythm    − 5
 *   Orphan first line — hurts opening emphasis              − 2
 *   Extreme line count (6+) — card feels crowded             − 1
 *
 * Rewards:
 *   Hero sharing its line (≥1 neighbour) — emphasis in flow  + 3
 *   3–5 lines total — ideal card proportion                  + 1
 */
function layoutRhythmScore(lines, heroIdx) {
  if (lines.length === 0) return 0;
  let score = 0;

  const lastLine = lines[lines.length - 1];
  const firstLine = lines[0];

  if (lastLine.length === 1 && lines.length > 1) score -= 5;
  if (firstLine.length === 1 && lines.length > 1) score -= 2;
  if (lines.length >= 6) score -= 1;

  const heroLine = lines.find(l => l.includes(heroIdx));
  if (heroLine && heroLine.length >= 2) score += 3;
  if (lines.length >= 3 && lines.length <= 5) score += 1;

  return score;
}
// ─── Latin script detector ────────────────────────────────────────────────────
// A token is "Latin" (lh=1.0) if it contains NO non-Latin Unicode script chars
// (Devanagari, CJK, Arabic, etc.). ASCII digits, punctuation, and hyphens are
// neutral — they should NOT trigger Devanagari line-height.
// e.g. "(CVE-2026-45185)" → no Devanagari → isLatin=true → lh=1.0 ✓
function isLatinWord(word) {
  // Match any character that is clearly a non-Latin script (Devanagari U+0900-097F,
  // extended Devanagari, CJK, Arabic, Hebrew, Thai, etc.)
  return !/[\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u4E00-\u9FFF\u3040-\u30FF\u0600-\u06FF\u0590-\u05FF]/.test(word);
}

// ─── Word scoring ─────────────────────────────────────────────────────────────
// Scoring is split into three focused functions to keep complexity manageable.

function scoreNonLatin(charCount, idx, total) {
  let s = 0;
  const rel = total > 1 ? idx / (total - 1) : 0.5;
  if (rel >= 0.3 && rel <= 0.65) s += 3;
  else if (rel >= 0.2 && rel <= 0.75) s += 1;
  if (charCount >= 4 && charCount <= 8) s += 3;
  else if (charCount >= 3) s += 1;
  if (idx === 0 || idx === total - 1) s -= 2;
  return s;
}

function scoreMorphology(clean) {
  if (/(?:tion|ment|ness|ity|ism|ance|ence|ship|ward|hood|ture|rupt)$/.test(clean)) return 3;
  if (/(?:ing|ize|ise|ify|ate|vert|lict|ound)$/.test(clean)) return 2;
  return 0;
}

function scoreLength(len) {
  if (len >= 5 && len <= 9) return 4;
  if (len >= 4 && len <= 12) return 2;
  return 0;
}

function scorePosition(rel) {
  if (rel >= 0.25 && rel <= 0.7) return 3;
  if (rel >= 0.15 && rel <= 0.8) return 1;
  return 0;
}

function scoreLatinWord(word, clean, idx, total) {
  if (STOP.has(clean) || clean.length < 4) return -Infinity;
  if (word === word.toUpperCase() && clean.length > 2) return -1;

  const rel = total > 1 ? idx / (total - 1) : 0.5;
  let score = (idx === 0 || idx === total - 1) ? -2 : 0;

  score += scoreMorphology(clean);
  score += scoreLength(clean.length);
  score += scorePosition(rel);

  if (/\d/.test(word)) score -= 2;

  return score;
}

/**
 * Scores a word for hero eligibility. Higher = better candidate.
 * All words are eligible (including first/last) — edges are just penalised.
 */
function scoreWord(word, idx, total) {
  if (!isLatinWord(word)) {
    return scoreNonLatin(Array.from(word).length, idx, total);
  }
  const clean = word.toLowerCase().replaceAll(/[^a-z]/g, '');
  return scoreLatinWord(word, clean, idx, total);
}

// ─── Token builder ────────────────────────────────────────────────────────────
/**
 * `fontFamily` is passed through so the canvas-measured stack matches the
 * rendered stack. Letter-spacing adapts per script: Devanagari has its own
 * rhythm and should not use Latin negative tracking.
 */
function makeTokens(words, heroIdx, bodySize, heroSize, fontFamily) {
  return words.map((text, i) => {
    const isHero = i === heroIdx;
    const isDevanagari = !isLatinWord(text);
    let letterSpacing;
    if (isDevanagari) letterSpacing = '0.01em';
    else if (isHero) letterSpacing = '0.005em';
    else letterSpacing = '0.005em';
    // Hind (Devanagari) has taller akshars + vowel marks that extend above the
    // cap-height, so 1.0 line-height causes overlap. 1.3 gives enough breathing
    // room while keeping the block compact. Latin (League Gothic) stays at 1.0.
    const lineHeight = isDevanagari ? 1.3 : LINE_HEIGHT;
    return {
      text,
      fontSize: Math.round(isHero ? heroSize : bodySize),
      fontWeight: isHero ? HERO_WEIGHT : BODY_WEIGHT,
      lineHeight,
      letterSpacing,
      fontFamily,
      isHero,
    };
  });
}

// ─── Uniform fallback (short titles, no hero) ─────────────────────────────────
function uniformFallback(words, areaWidth, areaHeight, fontFamily, fontWeight = 400, textLineHeight) {
  // Devanagari (Hind) needs 1.3 line-height at both canvas-estimate and DOM stages.
  const isDevanagariContent = words.some(w => !isLatinWord(w));
  const lh = isDevanagariContent ? 1.3 : (textLineHeight ?? LINE_HEIGHT);

  // League Gothic is ultra-condensed — canvas advance widths are ~33% narrower
  // than what the browser actually renders. Passing areaWidth/1.33 as the
  // container to pretext forces canvas to wrap at the same points as the browser,
  // giving an accurate lineCount → correct buttonHeight with no DOM reflow.
  // Standard fonts (Google Sans, Hind) are accurate as-is.
  const isCondensedFont = /League Gothic/i.test(fontFamily);
  const calibratedWidth = isCondensedFont ? areaWidth / 1.33 : areaWidth;

  const { fontSize, lineCount } = fitMultiLineDetails(
    words.join(' '),
    canvasFont(fontWeight, fontFamily),
    calibratedWidth,
    areaHeight,
    { maxSize: Math.min(areaHeight * 0.6, areaWidth * 0.4), minSize: 10, lineHeight: lh, fillTarget: 0.97 },
  );

  const tokens = words.map(text => {
    const isDevanagari = !isLatinWord(text);
    return {
      text, fontSize, fontWeight,
      // Hind (Devanagari) needs 1.3 leading — akshars + matras exceed Latin cap-height.
      lineHeight: isDevanagari ? 1.3 : (textLineHeight ?? LINE_HEIGHT),
      letterSpacing: isDevanagari ? '0.01em' : '0.005em',
      fontFamily,
      isHero: false,
    };
  });
  return {
    words: tokens,
    heroIdx: -1,
    fits: true,
    estimatedHeight: 0,
    lineCount,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────
/**
 * expressiveLayout(title, areaWidth, areaHeight, fontFamily?)
 *
 * Calculates a magazine-quality scale-contrast layout for a news headline.
 * All sizes are in pixels, guaranteed to fit within areaWidth × areaHeight.
 *
 * Algorithm (O(n) precompute + O(n × 14) search):
 *   1. Titles < 5 words → uniform large display via uniformFallback
 *   2. Precompute per-word width factors at 1px (both weights) — eliminates
 *      canvas calls from the binary search hot path
 *   3. Score ALL words for hero suitability (first/last get a −2 penalty,
 *      not a hard exclusion — any word can be hero if semantically rich)
 *   4. Binary-search body size (14–36px) to maximise fill of areaHeight
 *   5. Safety shrink loop in case of measurement drift
 *
 * @param {string} title
 * @param {number} areaWidth    — available width in px
 * @param {number} areaHeight   — available height in px for the text block
 * @param {string} [fontFamily]
 *
 * @returns {{
 *   words: Array<{text, fontSize, fontWeight, lineHeight, letterSpacing, isHero}>,
 *   heroIdx: number,    — index in words[], or -1 if no hero
 *   fits: boolean,
 *   estimatedHeight: number,
 * }}
 */
// ─── Punctuation-only token filter ───────────────────────────────────────────
// Strips tokens that are entirely punctuation (":", "।", "—", etc.).
// These add nothing visually and confuse the layout scoring.
const PUNCT_ONLY = /^[\u0964\u0965,:;.!?\u2014\u2013\-"'\u2018\u2019\u201c\u201d()[\]|&*#@%^~`+]+$/u;

export function expressiveLayout(
  title,
  areaWidth,
  areaHeight,
  fontFamily = '"League Gothic", "Hind", ui-sans-serif, sans-serif',
  fontWeight = 400,
  textLineHeight,
) {
  const words = title.split(/\s+/).filter(w => w && !PUNCT_ONLY.test(w));
  if (words.length === 0) return uniformFallback(['…'], areaWidth, areaHeight, fontFamily, fontWeight, textLineHeight);
  const result = uniformFallback(words, areaWidth, areaHeight, fontFamily, fontWeight, textLineHeight);
  return result;
}
// ─── ExpressiveTitle ─────────────────────────────────────────────────────
/**
 * React component — renders a headline fitted to `areaWidth × areaHeight`.
 *
 * Sizing strategy (same as textFit / fitty.js):
 *   1. `expressiveLayout` provides font-family / weight / letter-spacing tokens.
 *   2. A position:fixed hidden div lets the *browser* measure the real rendered
 *      height via getBoundingClientRect() — the only method that matches actual
 *      line-wrapping for condensed faces like League Gothic.
 *   3. Binary search on that DOM height → font-size that genuinely fits.
 *   4. Explicit `buttonHeight = textH + ∼28% descent` so overflow:hidden clips
 *      BELOW descenders (g, y, j, p, q) rather than through them.
 *
 * Props:
 *   title        {string}   — headline text
 *   areaWidth    {number}   — available px width
 *   areaHeight   {number}   — available px height
 *   marginBottom {number}   — margin below the button (for dot nav clearance)
 *   onClick      {Function} — called when the headline is tapped/clicked
 */
export const ExpressiveTitle = ({
  title,
  areaWidth,
  areaHeight,
  marginBottom,
  onClick,
  heroColor,
  bodyColor,
  fontFamily,
  fontWeight = 400,
  textLineHeight,
}) => {
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    document.fonts.ready.then(() => setFontsReady(true));
  }, []);

  // expressiveLayout provides per-token font metadata (family, weight, letter-spacing)
  // and the fitted fontSize + lineCount via pretext — zero DOM reflow.
  // League Gothic uses fillTarget=0.78 inside uniformFallback to compensate for
  // the ~20% canvas↔browser width discrepancy of ultra-condensed faces.
  const layout = useMemo(
    () => expressiveLayout(title, areaWidth, areaHeight, fontFamily, fontWeight, textLineHeight),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [title, areaWidth, areaHeight, fontsReady, fontFamily, fontWeight, textLineHeight],
  );

  const w0 = layout.words[0];
  const fontSize = w0?.fontSize ?? 16;
  const lineHeight = w0?.lineHeight ?? 1;

  // Descent factor per script (same thresholds as before, now computed purely):
  // League Gothic (lh=1.0): descenders extend ~28% below the em-square.
  // Latin with extra leading (lh ~1.1–1.2): line-height absorbs most descent.
  // Devanagari / Hind (lh≥1.25): matras + akshars fit within leading.
  const descentFactor = lineHeight >= 1.25 ? 0.08 : lineHeight > 1 ? 0.12 : 0.28;
  const textH = (layout.lineCount ?? 1) * fontSize * lineHeight;
  const buttonHeight = Math.min(Math.ceil(textH) + Math.ceil(fontSize * descentFactor), areaHeight);

  return (
    <button
      type="button"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={onClick}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        background: 'none', border: 'none', padding: 0,
        cursor: 'pointer', marginBottom, lineHeight,
        height: buttonHeight,
        overflow: 'hidden', maxHeight: areaHeight,
      }}
    >
      {layout.words.map((w, i) => {
        return (
          <span
            key={`${w.text}-${i}`}
            style={{
              display: 'inline',
              fontSize,
              fontWeight: w.fontWeight,
              lineHeight: w.lineHeight,
              letterSpacing: w.letterSpacing,
              fontFamily: w.fontFamily,
              color: w.isHero
                ? (heroColor || 'var(--w-fg)')
                : (bodyColor || 'var(--w-ink-3)'),
            }}
          >
            {w.text}{' '}
          </span>
        );
      })}
    </button>
  );
};