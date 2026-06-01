/**
 * expressifyText — Magazine-quality scale-contrast typographic layout engine.
 *
 * Picks one semantically meaningful "hero" word and calculates per-word font
 * metrics so the full headline fills a given pixel area without clipping.
 * Body text is kept at a comfortable reading size — the effect comes from
 * RATIO (font-size contrast), not from making body tiny.
 *
 * Performance: word widths are precomputed at 1px so the binary search loop
 * runs with only multiplications — no canvas calls in the hot path.
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

import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';

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

// ─── Canvas text measurer ─────────────────────────────────────────────────────
let _ctx = null;
function getCtx() {
  if (_ctx) return _ctx;
  if (typeof document === 'undefined') return null;
  _ctx = document.createElement('canvas').getContext('2d');
  return _ctx;
}

function measureWidth(text, fontSize, fontWeight, fontFamily) {
  const c = getCtx();
  if (c) {
    c.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    return c.measureText(text).width;
  }
  return text.length * fontSize * 0.52;
}

// ─── Width precomputation ─────────────────────────────────────────────────────
/**
 * Measure every word at fontSize=1 for both weights once.
 * In the binary search loop we just multiply: wordWidth = factor × fontSize.
 * This eliminates all canvas calls from the hot path — O(n) precompute,
 * O(1) per word per iteration.
 */
function precomputeWidths(words, fontFamily) {
  return words.map(text => ({
    body: measureWidth(text, 1, BODY_WEIGHT, fontFamily),
    hero: measureWidth(text, 1, HERO_WEIGHT, fontFamily),
  }));
}

// ─── Fast word-wrap (uses precomputed width factors) ─────────────────────────
/**
 * `wf` — precomputed width factors from precomputeWidths()
 * `sp` — { body, hero } space width factors at fontSize=1
 * `cw` — container width in px
 */
function computeSpaceWidth(isHero, size, sp) {
  return isHero ? sp.hero * size : sp.body * size;
}

function wordMetrics(i, heroIdx, bodySize, heroSize, wf, sp, lineLen) {
  const isHero = i === heroIdx;
  const size = isHero ? heroSize : bodySize;
  const ww = isHero ? wf[i].hero * size : wf[i].body * size;
  const sw = lineLen > 0 ? computeSpaceWidth(isHero, size, sp) : 0;
  return { ww, sw };
}

function fastWrap(words, heroIdx, bodySize, heroSize, wf, sp, cw) {
  const lines = [];
  let line = [];
  let lineW = 0;

  for (let i = 0; i < words.length; i++) {
    const { ww, sw } = wordMetrics(i, heroIdx, bodySize, heroSize, wf, sp, line.length);

    if (ww > cw) {
      if (line.length > 0) lines.push([...line]);
      lines.push([i]);
      line = [];
      lineW = 0;
    } else if (line.length > 0 && lineW + sw + ww > cw) {
      lines.push([...line]);
      line = [i];
      lineW = ww;
    } else {
      line.push(i);
      lineW += sw + ww;
    }
  }
  if (line.length > 0) lines.push(line);
  return lines;
}

/**
 * Block height using unified LINE_HEIGHT — each line is
 * max(fontSize on that line) × LINE_HEIGHT.
 */
function fastBlockH(lines, heroIdx, bodySize, heroSize) {
  return lines.reduce((sum, line) => {
    const size = line.includes(heroIdx) ? heroSize : bodySize;
    return sum + size * LINE_HEIGHT;
  }, 0);
}
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
  return !/[\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0E00-\u0E7F\u0E80-\u0EFF\u4E00-\u9FFF\u3040-\u30FF\u0600-\u06FF\u0590-\u05FF]/.test(word); // NOSONAR
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
function uniformFallback(words, areaWidth, areaHeight, fontFamily, textLineHeight, fontWeight = 400) {
  // Devanagari (Hind) needs 1.3 line-height at both canvas-estimate and DOM stages.
  // Using 1.0 here caused the canvas binary search to oversize the font, making the
  // DOM measurement have to correct downward on every render.
  const isDevanagariContent = words.some(w => !isLatinWord(w));
  const lh = isDevanagariContent ? 1.3 : (textLineHeight ?? LINE_HEIGHT);

  const wf = precomputeWidths(words, fontFamily);
  const spW = measureWidth(' ', 1, 800, fontFamily) || 0.28;
  const sp = { body: spW, hero: spW };

  // Uniform case: all words same size, no hero (heroIdx = -1)
  function uHeight(size) {
    const lines = fastWrap(words, -1, size, size, wf, sp, areaWidth);
    return lines.length * size * lh;
  }

  // 82% fill target — conservative margin guards against canvas/browser
  // measurement discrepancy (especially with ultra-condensed fonts like
  // League Gothic where per-character width is measured but browser line
  // wrapping may differ by a word or two).
  let lo = 10, hi = Math.min(areaHeight * 0.6, areaWidth * 0.4);
  for (let iter = 0; iter < 16; iter++) {
    const mid = (lo + hi) / 2;
    if (uHeight(mid) <= areaHeight * 0.82) lo = mid;
    else hi = mid;
  }

  // Safety shrink — extra guard for font-load measurement drift.
  // Runs after binary search; shrinks by 5% until height fits with margin.
  let fontSize = Math.round(lo);
  for (let i = 0; i < 10; i++) {
    if (uHeight(fontSize) <= areaHeight * 0.85) break;
    fontSize = Math.round(fontSize * 0.95);
  }
  // Width clamp: ensure no single indivisible word overflows the container.
  // Without this, ultra-condensed fonts (League Gothic) render a long single word
  // at a size that fits in height but physically overflows width — clipped by overflow:hidden.
  const maxWordFactor = wf.reduce((m, w) => Math.max(m, w.body), 0);
  if (maxWordFactor > 0) {
    fontSize = Math.min(fontSize, Math.floor(areaWidth * 0.97 / maxWordFactor));
  }
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
    estimatedHeight: uHeight(lo),
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
  textLineHeight,
  fontFamily = '"League Gothic", "Hind", ui-sans-serif, sans-serif',
  fontWeight = 400,
) {
  const words = title.split(/\s+/).filter(w => w && !PUNCT_ONLY.test(w));
  if (words.length === 0) return uniformFallback(['…'], areaWidth, areaHeight, fontFamily, textLineHeight, fontWeight);
  return uniformFallback(words, areaWidth, areaHeight, fontFamily, textLineHeight, fontWeight);
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
  const [domFit, setDomFit] = useState(null);
  const measureRef = useRef(null);

  useEffect(() => {
    document.fonts.ready.then(() => setFontsReady(true));
  }, []);

  // expressiveLayout for token metadata (font-family / weight / letter-spacing).
  // DOM binary search overrides the fontSize below.
  const layout = useMemo(
    () => expressiveLayout(title, areaWidth, areaHeight, textLineHeight, fontFamily, fontWeight),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [title, areaWidth, areaHeight, fontsReady, textLineHeight, fontFamily, fontWeight],
  );

  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el || !title || !layout.words.length) return;

    const w0 = layout.words[0];
    el.style.fontFamily = w0.fontFamily;
    el.style.fontWeight = String(w0.fontWeight);
    el.style.letterSpacing = w0.letterSpacing;
    el.style.lineHeight = String(w0.lineHeight);

    // Descent factor per script:
    // League Gothic (lh=1.0): descenders extend ~28% below the em-square.
    // Google Sans / similar (lh ~1.1–1.2): line-height absorbs most of it.
    // Devanagari / Hind (lh≥1.25): leading already covers matras.
    // We bake the descent into the binary search condition so the found
    // font-size guarantees textH + descentPx ≤ areaHeight — no overflow clipping.
    const lineH = w0.lineHeight;
    const descentFactor = lineH >= 1.25 ? 0.08 : lineH > 1 ? 0.12 : 0.28; // NOSONAR

    let lo = 10, hi = Math.min(areaHeight * 0.6, areaWidth * 0.4);
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      el.style.fontSize = mid + 'px';
      const h = el.getBoundingClientRect().height;
      if (h + Math.ceil(mid * descentFactor) <= areaHeight) lo = mid;
      else hi = mid;
    }

    let fs = Math.floor(lo);
    el.style.fontSize = fs + 'px';
    // Width safety: if any single token overflows the container (e.g. a long
    // indivisible word in a condensed font), shrink 1px at a time until it fits.
    // NOTE: scrollWidth is always an integer but areaWidth can be fractional
    // (e.g. 219.797). Adding a 1px tolerance prevents false positives from
    // ceiling rounding (scrollWidth=220 > areaWidth=219.797 → true incorrectly).
    while (fs > 10 && el.scrollWidth > Math.ceil(areaWidth)) {
      fs -= 1;
      el.style.fontSize = fs + 'px';
    }
    const textH = el.getBoundingClientRect().height;
    const descentPx = Math.ceil(fs * descentFactor);
    // min() is a safety net only — the binary search already guarantees fit.
    const buttonH = Math.min(Math.ceil(textH) + descentPx, areaHeight);

    setDomFit({ fontSize: fs, buttonHeight: buttonH });
  }, [title, areaWidth, areaHeight, fontsReady, layout]);

  const fontSize = domFit?.fontSize ?? layout.words[0]?.fontSize ?? 16;
  const buttonHeight = domFit?.buttonHeight ?? undefined;
  const lineHeight = layout.words[0]?.lineHeight ?? 1;

  return (
    <>
      {/* Off-screen measurement node — position:fixed keeps it out of all flow. */}
      <div
        ref={measureRef}
        aria-hidden="true"
        style={{
          position: 'fixed', top: -9999, left: -9999,
          width: areaWidth, lineHeight,
          whiteSpace: 'normal', pointerEvents: 'none', userSelect: 'none',
        }}
      >
        {title}
      </div>
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
    </>
  );
};