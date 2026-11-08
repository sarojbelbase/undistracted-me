import { useMemo } from "react";
import { ACCENT_COLORS } from "../theme";
import { getOrbRgbById } from "../constants/orbPalettes";

// ── Pure helpers ───────────────────────────────────────────────────────────────

// Expand a 6-digit hex string to [r, g, b] integers.
function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

const _cl = (v) => Math.max(0, Math.min(255, Math.round(v)));

// ── Film grain tiles ─────────────────────────────────────────────────────────
// SVG feTurbulence fractal-noise encoded as a data-URI CSS background layer.
// When used via url() the SVG is its own document — internal url(#n) resolves
// to <filter id="n"> within that SVG, not the main HTML page.
// The tile is 300×300 and CSS background-repeat tiles it to fill the viewport.
const GRAIN_LIGHT = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.68' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.22'/%3E%3C/svg%3E") 0 0 / 300px 300px`;

const GRAIN_DARK = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.68' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.14'/%3E%3C/svg%3E") 0 0 / 300px 300px`;

/**
 * Computes the solid-mode canvas background.
 *
 * All three card styles use the same mesh-gradient recipe — 5 radial stops
 * derived from the accent colour placed at the 4 viewport corners + centre,
 * with cinematic film-grain SVG tile on top.
 *
 * Per-style base tone sits behind all gradient layers so the overall
 * temperature of the background still reflects the card mode.
 */
function getSolidGradientBg(isDark, accent, cardStyle = "glass") {
  // Use the dark-mode tonal accent when rendering a dark background so the
  // shades are derived from the correct hue variant.
  const colorDef = ACCENT_COLORS.find((a) => a.name === accent);
  const accentHex = isDark
    ? (colorDef?.darkHex ?? colorDef?.hex ?? "#1565C0")
    : (colorDef?.hex ?? "#1565C0");

  const [r, g, b] = hexToRgb(accentHex);
  // Shade helper: offset each channel by dr/dg/db, clamped to 0–255.
  const c = (dr, dg, db) => `rgb(${_cl(r + dr)},${_cl(g + dg)},${_cl(b + db)})`;

  // Per-style base colour — sits as background-color behind all gradient layers.
  const base =
    cardStyle === "comic"
      ? isDark
        ? "#110e09"
        : "#ede0c4"
      : cardStyle === "paper"
        ? isDark
          ? "#111111"
          : "#f0f0f0"
        : isDark
          ? "#12131a"
          : "#e8eaf0"; // glass

  // ── Mesh gradient — shared by all three card styles ──────────────────────
  // 4 corner radials + 1 centre radial + directional wash.
  //
  // Key principle for widget readability:
  //   - Shifts are ~30% of tonal range — the accent whispers, never shouts.
  //   - All stops use low-alpha rgba so blobs blend softly into each other
  //     and into the base paper/card colour behind them.
  //   - Large ellipse radii + early transparency = no hard edges anywhere.
  const mesh = [
    `radial-gradient(ellipse 82% 72% at 16% 18%, rgba(${_cl(r + 22)},${_cl(g + 22)},${_cl(b + 22)},0.38) 0%, transparent 45%)`,
    `radial-gradient(ellipse 65% 55% at 84% 14%, rgba(${_cl(r + 8)},${_cl(g + 5)},${_cl(b - 6)},0.32) 0%, transparent 40%)`,
    `radial-gradient(ellipse 78% 65% at 87% 82%, rgba(${_cl(r - 17)},${_cl(g - 17)},${_cl(b - 17)},0.30) 0%, transparent 42%)`,
    `radial-gradient(ellipse 64% 70% at 14% 86%, rgba(${_cl(r - 6)},${_cl(g + 4)},${_cl(b + 10)},0.28) 0%, transparent 40%)`,
    `radial-gradient(ellipse 58% 52% at 50% 50%, rgba(${r},${g},${b},0.18) 0%, transparent 55%)`,
    `linear-gradient(142deg, rgba(${_cl(r - 13)},${_cl(g - 13)},${_cl(b - 13)},0.16) 0%, transparent 46%, rgba(${_cl(r + 13)},${_cl(g + 13)},${_cl(b + 13)},0.18) 100%)`,
  ].join(", ");

  // ── Glass + Flat + Comic ──────────────────────────────────────────────
  // Cinematic film-grain SVG tile on top of the mesh.
  const grain = isDark ? GRAIN_DARK : GRAIN_LIGHT;
  return [grain, mesh, base].join(", ");
}

function computePageBg(bgType, isDark, accent, cardStyle) {
  if (bgType === "orb") {
    if (isDark) {
      // Give comic mode a warm dark-paper page behind the orb instead of near-black.
      return cardStyle === "comic" ? "#110e09" : "#060608";
    }
    // Light: resolved from --w-page-bg CSS var which is overridden per card style
    // in CARD_STYLE_TOKENS (comic → #ede0c4, glass → #e8eaf0, flat → #f0f0f0).
    return "var(--w-page-bg)";
  }
  return getSolidGradientBg(isDark, accent, cardStyle);
}

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * Canvas background computation for the two supported modes: solid (accent
 * mesh gradient) and orb (animated gradient).
 */
export function useCanvasBg({
  canvasBg,
  isDark,
  accent,
  cardStyle = "glass",
}) {
  const bgType = canvasBg?.type || "solid";
  const bgOrbId = canvasBg?.orbId || "accent";

  const bgOrbRgb = useMemo(
    () => (bgOrbId === "accent" ? null : getOrbRgbById(bgOrbId)),
    [bgOrbId],
  );

  const pageBg = useMemo(
    () => computePageBg(bgType, isDark, accent, cardStyle),
    [bgType, isDark, accent, cardStyle],
  );

  // Return a stable object reference so `<CanvasBackground {...bg}>` (and any
  // memoized consumer of it) doesn't re-render on every App render when the
  // underlying values are unchanged.
  return useMemo(
    () => ({ bgType, bgOrbId, bgOrbRgb, pageBg }),
    [bgType, bgOrbId, bgOrbRgb, pageBg],
  );
}
