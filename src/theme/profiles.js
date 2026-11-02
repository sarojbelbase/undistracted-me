/**
 * ─── Theme Profiles — Single Source of Truth ─────────────────────────────────
 *
 * Every styling dimension of the app lives here, as a complete self-contained
 * map per theme (paper / glass / comic) × context:
 *
 *   light  — canvas (dashboard) mode, light
 *   dark   — canvas (dashboard) mode, dark
 *   focus  — Focus Mode (ALWAYS renders over a dark photo/orb backdrop)
 *
 * Each map is a flat set of CSS custom-property values (`--w-*`, `--card-*`,
 * `--fm-*`). Components reference the vars, never the raw values — so switching
 * theme (or mode) swaps the whole profile at once with no component churn and
 * no `[style*="rgba(...)"]` CSS override hacks.
 *
 * applyTheme() (theme.js) applies `[theme][mode]` to :root.
 * FocusMode/theme.jsx reads `[theme].focus` onto the .fm-root div.
 * theme/canvas.js and every component read the resulting CSS vars.
 *
 * SEMANTIC colors (success / danger / sunrise / sunset) are shared across
 * themes — a "success" is green regardless of surface style — but their
 * tinted bg/border alphas are per-theme where the surface demands it.
 */

// ─── Shared semantic tokens ──────────────────────────────────────────────────
const SEMANTIC = {
  light: {
    "--w-danger": "#ef4444",
    "--w-danger-bg": "rgba(239,68,68,0.08)",
    "--w-danger-border": "rgba(239,68,68,0.22)",
    "--w-success": "#22c55e",
    "--w-success-bg": "rgba(34,197,94,0.12)",
    "--w-success-border": "rgba(34,197,94,0.28)",
    "--w-sunrise": "#f59e0b",
    "--w-sunset": "#8b5cf6",
  },
  dark: {
    "--w-danger": "#f87171",
    "--w-danger-bg": "rgba(239,68,68,0.09)",
    "--w-danger-border": "rgba(239,68,68,0.22)",
    "--w-success": "#4ade80",
    "--w-success-bg": "rgba(34,197,94,0.12)",
    "--w-success-border": "rgba(34,197,94,0.28)",
    "--w-sunrise": "#fbbf24",
    "--w-sunset": "#a78bfa",
  },
};

// ─── Base ink / surface scale (glass = neutral baseline) ─────────────────────
const BASE_LIGHT = {
  "--w-ink-1": "#111111",
  "--w-ink-2": "#222222",
  "--w-ink-3": "#3d3d3d",
  "--w-ink-4": "#4d4d4d",
  "--w-ink-5": "#666666",
  "--w-ink-6": "#8a8a8a",
  "--w-surface": "#f5f5f5",
  "--w-surface-2": "#f0f0f0",
  "--w-surface-3": "#e8e8e8",
  "--w-border": "#e0e0e0",
  "--w-divider": "rgba(0,0,0,0.1)",
  "--w-page-bg": "#ebebeb",
};

const BASE_DARK = {
  "--w-ink-1": "#f2f2f2",
  "--w-ink-2": "#e0e0e0",
  "--w-ink-3": "#c4c4c4",
  "--w-ink-4": "#a0a0a0",
  "--w-ink-5": "#888888",
  "--w-ink-6": "#6e6e6e",
  "--w-surface": "#1c1c1c",
  "--w-surface-2": "#252525",
  "--w-surface-3": "#2a2a2a",
  "--w-border": "#333333",
  "--w-divider": "rgba(255,255,255,0.12)",
  "--w-page-bg": "#141414",
};

// ─── Focus Mode shared semantic (always dark context) ────────────────────────
const FM_SEMANTIC = {
  "--fm-success": "#4ade80",
  "--fm-success-bg": "rgba(74,222,128,0.14)",
  "--fm-success-border": "rgba(74,222,128,0.30)",
  "--fm-success-dot": "#22c55e",
  "--fm-sync-bg": "rgba(34,197,94,0.12)",
  "--fm-sync-border": "rgba(34,197,94,0.28)",
  "--fm-danger": "#f87171",
  "--fm-danger-bg": "rgba(239,68,68,0.09)",
  "--fm-danger-border": "rgba(239,68,68,0.22)",
  "--fm-danger-hover-bg": "rgba(239,68,68,0.16)",
  "--fm-stock-up": "#4ade80",
  "--fm-stock-up-bg": "rgba(74,222,128,0.12)",
  "--fm-stock-down": "#f87171",
  "--fm-stock-down-bg": "rgba(248,113,113,0.12)",
};

// ─── The profiles ─────────────────────────────────────────────────────────────
export const THEME_PROFILES = {
  // ═══ GLASS — frosted, translucent, cinematic ═══════════════════════════════
  glass: {
    light: {
      ...BASE_LIGHT,
      ...SEMANTIC.light,
      "--card-bg": "rgba(255,255,255,0.65)",
      "--card-border": "rgba(255,255,255,0.50)",
      "--card-border-width": "1px",
      "--card-radius": "1rem",
      "--card-blur": "blur(28px) saturate(180%) brightness(1.1) contrast(0.95)",
      "--card-shadow":
        "inset 0 1px 0 rgba(255,255,255,0.85), 0 8px 32px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
      "--card-texture":
        'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.035\'/%3E%3C/svg%3E")',
      "--card-texture-size": "256px",
      "--panel-bg": "rgba(255,255,255,0.70)",
      "--modal-bg": "rgba(255,255,255,0.92)",
      "--modal-shadow":
        "0 8px 40px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.05)",
      "--modal-overlay-bg": "rgba(0,0,0,0.08)",
      "--modal-overlay-blur": "blur(12px) saturate(150%) brightness(1.05) contrast(0.95)",
    },
    dark: {
      ...BASE_DARK,
      ...SEMANTIC.dark,
      "--card-bg": "rgba(255,255,255,0.12)",
      "--card-border": "rgba(255,255,255,0.16)",
      "--card-border-width": "1px",
      "--card-radius": "1rem",
      "--card-blur": "blur(28px) saturate(150%)",
      "--card-shadow":
        "inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 16px rgba(0,0,0,0.45)",
      "--card-texture":
        'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.045\'/%3E%3C/svg%3E")',
      "--card-texture-size": "256px",
      "--panel-bg": "rgba(255,255,255,0.07)",
      "--modal-bg": "#1c1c1e",
      "--modal-shadow":
        "0 8px 40px rgba(0,0,0,0.65), 0 2px 8px rgba(0,0,0,0.35)",
      "--modal-overlay-bg": "rgba(0,0,0,0.22)",
      "--modal-overlay-blur": "blur(10px) saturate(150%)",
      // Ink override — glass dark is translucent (~#2e2e effective bg), needs brighter muted tiers
      "--w-ink-4": "#c8c8c8",
      "--w-ink-5": "#c2c2c2",
      "--w-ink-6": "#b8b8b8",
    },
    focus: {
      ...FM_SEMANTIC,
      "--fm-card-bg": "rgba(0,0,0,0.38)",
      "--fm-card-border": "rgba(255,255,255,0.18)",
      "--fm-card-blur": "blur(28px) saturate(180%)",
      "--fm-card-shadow": "0 2px 16px rgba(0,0,0,0.28)",
      "--fm-card-border-width": "1px",
      "--fm-card-radius": "14px",
      "--fm-card-texture": "none",
      "--fm-surface": "rgba(255,255,255,0.08)",
      "--fm-surface-2": "rgba(255,255,255,0.14)",
      "--fm-border": "rgba(255,255,255,0.12)",
      "--fm-divider": "rgba(255,255,255,0.07)",
      "--fm-section-bg": "rgba(255,255,255,0.06)",
      "--fm-section-border": "rgba(255,255,255,0.09)",
      "--fm-ink-1": "rgba(255,255,255,0.96)",
      "--fm-ink-2": "rgba(255,255,255,0.82)",
      "--fm-ink-3": "rgba(255,255,255,0.55)",
      "--fm-ink-4": "rgba(255,255,255,0.32)",
      "--fm-toggle-thumb": "#ffffff",
      "--fm-toggle-shadow": "0 1px 3px rgba(0,0,0,0.4)",
      "--fm-toggle-off-bg": "rgba(255,255,255,0.14)",
      "--fm-close-bg": "rgba(255,255,255,0.08)",
      "--fm-close-bg-hover": "rgba(255,255,255,0.14)",
      "--fm-close-border": "rgba(255,255,255,0.12)",
      "--fm-close-color": "rgba(255,255,255,0.55)",
      "--fm-spinner-ring": "rgba(255,255,255,0.10)",
      "--fm-spinner-active": "rgba(255,255,255,0.60)",
      "--fm-icon-stroke": "rgba(255,255,255,0.75)",
      "--fm-icon-stroke-muted": "rgba(255,255,255,0.65)",
      "--fm-popover-bg": "rgba(12,12,16,0.86)",
      "--fm-popover-border": "rgba(255,255,255,0.11)",
      "--fm-popover-shadow":
        "0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
      "--fm-orb-bg": "#060608",
    },
  },

  // ═══ PAPER — reMarkable-inspired, warm, tactile, calm ══════════════════════
  paper: {
    light: {
      ...BASE_LIGHT,
      ...SEMANTIC.light,
      // Cream paper — warmer ink tiers read as deliberate ink, not faded grey.
      "--w-ink-5": "#5a5a5a",
      "--w-ink-6": "#767676",
      "--w-divider": "rgba(0,0,0,0.07)",
      "--w-page-bg": "#ede2cc",
      "--card-bg": "#f7f2e8",
      "--card-border": "rgba(0,0,0,0.05)",
      "--card-border-width": "1px",
      "--card-radius": "12px 11px 13px 12px",
      "--card-blur": "none",
      "--card-shadow":
        "0 1px 2px rgba(0,0,0,0.03), 0 3px 8px rgba(0,0,0,0.05), 0 6px 20px rgba(0,0,0,0.04)",
      // 3-layer paper grain: fine fiber + coarse variation + horizontal lines
      "--card-texture":
        'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'f\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.7 0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23f)\' opacity=\'0.055\'/%3E%3C/svg%3E"), url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'c\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.08 0.12\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23c)\' opacity=\'0.04\'/%3E%3C/svg%3E"), repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.008) 3px, rgba(0,0,0,0.008) 4px)',
      "--card-texture-size": "200px, 400px, auto",
      "--panel-bg": "#f2ede0",
      "--modal-bg": "#f7f2e8",
      "--modal-shadow":
        "0 2px 8px rgba(0,0,0,0.05), 0 8px 32px rgba(0,0,0,0.08)",
      "--modal-overlay-bg": "rgba(0,0,0,0.28)",
      "--modal-overlay-blur": "none",
    },
    dark: {
      ...BASE_DARK,
      ...SEMANTIC.dark,
      // Warm dark paper + parchment-adjacent ink tones.
      "--w-ink-5": "#a6a6a6",
      "--w-ink-6": "#8c8c8c",
      "--w-divider": "rgba(255,255,255,0.09)",
      "--w-page-bg": "#110f0b",
      "--card-bg": "#1c1914",
      "--card-border": "rgba(255,255,255,0.05)",
      "--card-border-width": "1px",
      "--card-radius": "12px 11px 13px 12px",
      "--card-blur": "none",
      "--card-shadow": "0 2px 8px rgba(0,0,0,0.45)",
      "--card-texture":
        'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'f\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.7 0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23f)\' opacity=\'0.06\'/%3E%3C/svg%3E"), url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'c\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.08 0.12\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23c)\' opacity=\'0.05\'/%3E%3C/svg%3E"), repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 4px)',
      "--card-texture-size": "200px, 400px, auto",
      "--panel-bg": "#242118",
      "--modal-bg": "#1c1914",
      "--modal-shadow":
        "0 4px 16px rgba(0,0,0,0.5), 0 8px 40px rgba(0,0,0,0.55)",
      "--modal-overlay-bg": "rgba(0,0,0,0.5)",
      "--modal-overlay-blur": "none",
    },
    focus: {
      ...FM_SEMANTIC,
      // Paper over a dark photo: opaque warm dark paper, soft ambient shadow,
      // warm parchment ink. Calmer than comic (no hard offset shadow).
      "--fm-card-bg": "#1c1914",
      "--fm-card-border": "rgba(255,255,255,0.06)",
      "--fm-card-blur": "none",
      "--fm-card-shadow": "0 2px 16px rgba(0,0,0,0.40)",
      "--fm-card-border-width": "1px",
      "--fm-card-radius": "12px 11px 13px 12px",
      "--fm-card-texture":
        'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'f\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.7 0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23f)\' opacity=\'0.06\'/%3E%3C/svg%3E")',
      "--fm-surface": "rgba(255,255,255,0.06)",
      "--fm-surface-2": "rgba(255,255,255,0.10)",
      "--fm-border": "rgba(255,255,255,0.10)",
      "--fm-divider": "rgba(255,255,255,0.06)",
      "--fm-section-bg": "rgba(255,255,255,0.04)",
      "--fm-section-border": "rgba(255,255,255,0.07)",
      "--fm-ink-1": "#f5efe4",
      "--fm-ink-2": "#e6dfd2",
      "--fm-ink-3": "#b8b0a2",
      "--fm-ink-4": "#8a8377",
      "--fm-toggle-thumb": "#ffffff",
      "--fm-toggle-shadow": "0 1px 3px rgba(0,0,0,0.4)",
      "--fm-toggle-off-bg": "rgba(255,255,255,0.10)",
      "--fm-close-bg": "rgba(255,255,255,0.06)",
      "--fm-close-bg-hover": "rgba(255,255,255,0.10)",
      "--fm-close-border": "rgba(255,255,255,0.10)",
      "--fm-close-color": "rgba(255,255,255,0.55)",
      "--fm-spinner-ring": "rgba(255,255,255,0.10)",
      "--fm-spinner-active": "rgba(255,255,255,0.60)",
      "--fm-icon-stroke": "rgba(255,255,255,0.75)",
      "--fm-icon-stroke-muted": "rgba(255,255,255,0.65)",
      "--fm-popover-bg": "rgba(20,18,14,0.90)",
      "--fm-popover-border": "rgba(255,255,255,0.09)",
      "--fm-popover-shadow":
        "0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
      "--fm-orb-bg": "#0a0806",
    },
  },

  // ═══ COMIC — newsprint, thick ink, hard offset shadows ═════════════════════
  comic: {
    light: {
      ...BASE_LIGHT,
      ...SEMANTIC.light,
      "--w-ink-5": "#525252",
      "--w-ink-6": "#6e6e6e",
      "--w-divider": "rgba(0,0,0,0.12)",
      "--w-page-bg": "#ede0c4",
      "--card-bg": "#faf5ec",
      "--card-border": "#111111",
      "--card-border-width": "2px",
      "--card-radius": "14px 13px 15px 14px",
      "--card-blur": "none",
      "--card-shadow": "4px 4px 0 0 #111111",
      "--card-texture":
        'repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, rgba(0,0,0,0.018) 2px, rgba(0,0,0,0.018) 3px), repeating-linear-gradient(45deg, transparent 0px, transparent 5px, rgba(0,0,0,0.013) 5px, rgba(0,0,0,0.013) 6px), radial-gradient(circle, rgba(var(--w-accent-rgb), 0.05) 1.5px, transparent 1.5px)',
      "--card-texture-size": "auto, auto, 8px 8px",
      "--panel-bg": "#f2eada",
      "--modal-bg": "#faf5ec",
      "--modal-shadow": "5px 5px 0 0 #111111",
      "--modal-overlay-bg": "rgba(0,0,0,0.45)",
      "--modal-overlay-blur": "none",
    },
    dark: {
      ...BASE_DARK,
      ...SEMANTIC.dark,
      "--w-ink-5": "#9e9e9e",
      "--w-ink-6": "#838383",
      "--w-divider": "rgba(255,255,255,0.12)",
      "--w-page-bg": "#110e09",
      "--card-bg": "#1c1710",
      "--card-border": "#d4c9a8",
      "--card-border-width": "2px",
      "--card-radius": "14px 13px 15px 14px",
      "--card-blur": "none",
      "--card-shadow": "4px 4px 0 0 rgba(212,201,168,0.55)",
      "--card-texture":
        'repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, rgba(255,255,255,0.022) 2px, rgba(255,255,255,0.022) 3px), repeating-linear-gradient(45deg, transparent 0px, transparent 5px, rgba(255,255,255,0.016) 5px, rgba(255,255,255,0.016) 6px), radial-gradient(circle, rgba(var(--w-accent-rgb), 0.05) 1.5px, transparent 1.5px)',
      "--card-texture-size": "auto, auto, 8px 8px",
      "--panel-bg": "#241e15",
      "--modal-bg": "#1c1710",
      "--modal-shadow": "5px 5px 0 0 #d4c9a8",
      "--modal-overlay-bg": "rgba(0,0,0,0.62)",
      "--modal-overlay-blur": "none",
    },
    focus: {
      ...FM_SEMANTIC,
      "--fm-card-bg": "#1c1710",
      "--fm-card-border": "#c8bc9c",
      "--fm-card-blur": "none",
      "--fm-card-shadow": "4px 4px 0 0 rgba(200,188,156,0.55)",
      "--fm-card-border-width": "2px",
      "--fm-card-radius": "14px 13px 15px 14px",
      "--fm-card-texture":
        'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.72\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.09\'/%3E%3C/svg%3E")',
      "--fm-surface": "rgba(200,188,156,0.08)",
      "--fm-surface-2": "rgba(200,188,156,0.14)",
      "--fm-border": "rgba(200,188,156,0.20)",
      "--fm-divider": "rgba(200,188,156,0.10)",
      "--fm-section-bg": "rgba(200,188,156,0.06)",
      "--fm-section-border": "rgba(200,188,156,0.12)",
      "--fm-ink-1": "#f2e8d5",
      "--fm-ink-2": "#e0d4b8",
      "--fm-ink-3": "#c4b898",
      "--fm-ink-4": "#a09878",
      "--fm-toggle-thumb": "#f2e8d5",
      "--fm-toggle-shadow": "0 1px 3px rgba(0,0,0,0.4)",
      "--fm-toggle-off-bg": "rgba(200,188,156,0.16)",
      "--fm-close-bg": "rgba(200,188,156,0.12)",
      "--fm-close-bg-hover": "rgba(200,188,156,0.18)",
      "--fm-close-border": "#c8bc9c",
      "--fm-close-color": "rgba(200,188,156,0.55)",
      "--fm-spinner-ring": "rgba(200,188,156,0.14)",
      "--fm-spinner-active": "rgba(200,188,156,0.65)",
      "--fm-icon-stroke": "rgba(200,188,156,0.80)",
      "--fm-icon-stroke-muted": "rgba(200,188,156,0.65)",
      "--fm-popover-bg": "#1c1710",
      "--fm-popover-border": "#c8bc9c",
      "--fm-popover-shadow": "4px 4px 0 0 rgba(200,188,156,0.55)",
      "--fm-orb-bg": "#0a0806",
    },
  },
};

// ─── The UI-facing list (labels shown in Settings → Appearance) ───────────────
export const CARD_STYLES = [
  { id: "paper", label: "Paper", hint: "Warm paper grain" },
  { id: "glass", label: "Glass", hint: "Frosted glass with depth" },
  { id: "comic", label: "Comic", hint: "Pop-art panel style" },
];
