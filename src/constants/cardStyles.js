/**
 * Widget surface / card style definitions.
 *
 * Each style resolves to a set of CSS custom properties applied to
 * `document.documentElement` by `applyTheme()`. All "shell" UI surfaces
 * (widget cards, settings panels, modals, popups) read `--card-*` so the
 * entire UI switches style at once.
 *
 * Token semantics:
 *   --card-bg      background (rgba or hex)
 *   --card-border  border-color (rgba)
 *   --card-blur    backdropFilter value, or 'none'
 *   --card-shadow  box-shadow value, or 'none'
 *   --panel-bg     inner sub-panel / section background —
 *                  translucent in glass (preserves frosted look),
 *                  solid surface-2 equivalent in flat
 */

export const CARD_STYLES = [
  { id: "paper", label: "Paper", hint: "Warm paper grain" },
  { id: "glass", label: "Glass", hint: "Frosted glass with depth" },
  { id: "comic", label: "Comic", hint: "Pop-art panel style" },
];

export const CARD_STYLE_TOKENS = {
  // ── Paper ──────────────────────────────────────────────────────────────────
  // Inspired by reMarkable's paper-like texture: warm off-white tones,
  // multi-layer grain (fine fiber + coarse variation + directional lines),
  // and soft shadows. Distraction-free, tactile, calm.
  paper: {
    light: {
      "--card-bg": "#f7f2e8",
      "--card-border": "rgba(0,0,0,0.05)",
      "--card-border-width": "1px",
      "--card-radius": "12px 11px 13px 12px",
      "--card-blur": "none",
      // Paper on desk — slightly lifted, soft ambient shadow
      "--card-shadow": "0 1px 2px rgba(0,0,0,0.03), 0 3px 8px rgba(0,0,0,0.05), 0 6px 20px rgba(0,0,0,0.04)",
      // 3-layer paper grain stack:
      //   Layer 1 — fine fiber: high-freq noise at 5.5%, mimics paper fiber weave
      //   Layer 2 — coarse variation: low-freq noise at 4%, natural paper unevenness
      //   Layer 3 — horizontal lines: 1px every 4px at 0.8%, paper manufacturing grain
      "--card-texture": [
        "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='f'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7 0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23f)' opacity='0.055'/%3E%3C/svg%3E\")",
        "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='c'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.08 0.12' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23c)' opacity='0.04'/%3E%3C/svg%3E\")",
        "repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.008) 3px, rgba(0,0,0,0.008) 4px)",
      ].join(", "),
      "--card-texture-size": "200px, 400px, auto",
      "--panel-bg": "#f2ede0",
      "--modal-bg": "#f7f2e8",
      "--modal-shadow": "0 2px 8px rgba(0,0,0,0.05), 0 8px 32px rgba(0,0,0,0.08)",
      "--modal-overlay-bg": "rgba(0,0,0,0.28)",
      "--modal-overlay-blur": "none",
      "--w-page-bg": "#ede2cc",
      "--w-ink-5": "#5a5a5a",
      "--w-ink-6": "#767676",
    },
    dark: {
      "--card-bg": "#1c1914",
      "--card-border": "rgba(255,255,255,0.05)",
      "--card-border-width": "1px",
      "--card-radius": "12px 11px 13px 12px",
      "--card-blur": "none",
      "--card-shadow": "0 2px 8px rgba(0,0,0,0.45)",
      // Dark paper: same 3-layer stack with light fibers (inverted)
      "--card-texture": [
        "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='f'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7 0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23f)' opacity='0.06'/%3E%3C/svg%3E\")",
        "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='c'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.08 0.12' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23c)' opacity='0.05'/%3E%3C/svg%3E\")",
        "repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(255,255,255,0.012) 3px, rgba(255,255,255,0.012) 4px)",
      ].join(", "),
      "--card-texture-size": "200px, 400px, auto",
      "--panel-bg": "#242118",
      "--modal-bg": "#1c1914",
      "--modal-shadow": "0 4px 16px rgba(0,0,0,0.5), 0 8px 40px rgba(0,0,0,0.55)",
      "--modal-overlay-bg": "rgba(0,0,0,0.5)",
      "--modal-overlay-blur": "none",
      "--w-page-bg": "#110f0b",
      "--w-ink-5": "#a6a6a6",
      "--w-ink-6": "#8c8c8c",
    },
  },
  glass: {
    light: {
      "--card-bg": "rgba(255,255,255,0.65)",
      "--card-border": "rgba(255,255,255,0.50)",
      "--card-border-width": "1px",
      "--card-radius": "1rem",
      "--card-blur": "blur(28px) saturate(180%) brightness(1.1) contrast(0.95)",
      "--card-shadow":
        "inset 0 1px 0 rgba(255,255,255,0.85), 0 8px 32px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
      "--card-texture":
        "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E\")",
      "--card-texture-size": "256px",
      "--modal-bg": "rgba(255,255,255,0.92)",
      "--modal-shadow":
        "0 8px 40px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.05)",
      "--modal-overlay-bg": "rgba(0,0,0,0.08)",
      "--modal-overlay-blur": "blur(12px) saturate(150%) brightness(1.05) contrast(0.95)",
      "--panel-bg": "rgba(255,255,255,0.70)",
    },
    dark: {
      "--card-bg": "rgba(255,255,255,0.12)",
      "--card-border": "rgba(255,255,255,0.16)",
      "--card-border-width": "1px",
      "--card-radius": "1rem",
      "--card-blur": "blur(28px) saturate(150%)",
      "--card-shadow":
        "inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 16px rgba(0,0,0,0.45)",
      "--card-texture":
        "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.045'/%3E%3C/svg%3E\")",
      "--card-texture-size": "256px",
      "--modal-bg": "#1c1c1e",
      "--modal-shadow":
        "0 8px 40px rgba(0,0,0,0.65), 0 2px 8px rgba(0,0,0,0.35)",
      "--modal-overlay-bg": "rgba(0,0,0,0.22)",
      "--modal-overlay-blur": "blur(10px) saturate(150%)",
      "--panel-bg": "rgba(255,255,255,0.07)",
      // Ink scale override — glass dark is translucent (effective bg ~#2e2e),
      // so muted labels need significantly brighter values than flat dark.
      "--w-ink-4": "#c8c8c8", // was #a0a0a0 — captions, connector text
      "--w-ink-5": "#c2c2c2", // was #888888 — muted labels, mode pill  7.5:1 AAA
      "--w-ink-6": "#b8b8b8", // was #6e6e6e — metadata row, inactive    7.0:1 AAA
    },
  },

  // ── Comic ──────────────────────────────────────────────────────────────────
  // Hand-drawn pop-art aesthetic: warm paper tones, heavy 2px ink borders,
  // hard 4px offset box-shadow (no blur), and a Ben-Day dot halftone texture.
  comic: {
    light: {
      "--card-bg": "#faf5ec",
      "--card-border": "#111111",
      "--card-border-width": "2px",
      // Slightly irregular per-corner radius gives the "hand-drawn" illusion.
      "--card-radius": "14px 13px 15px 14px",
      "--card-blur": "none",
      // Hard offset shadow — no spread, no blur. Classic comic panel border.
      "--card-shadow": "4px 4px 0 0 #111111",
      // Card surface: 3-layer paper grain stack.
      //   Layer 1 — horizontal scan lines (1px every 3px at 1.8%):
      //             mimics newsprint paper weave running left-to-right.
      //   Layer 2 — 45° crosshatch (1px every 6px at 1.3%):
      //             adds paper-depth, like the second axis of the weave.
      //   Layer 3 — accent-tinted dot grain (1.5px on 8px grid at 5%):
      //             ties the card texture to the global accent colour.
      // Total visual coverage ≈ 4-6% — well below readability threshold.
      "--card-texture": [
        "repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, rgba(0,0,0,0.018) 2px, rgba(0,0,0,0.018) 3px)",
        "repeating-linear-gradient(45deg, transparent 0px, transparent 5px, rgba(0,0,0,0.013) 5px, rgba(0,0,0,0.013) 6px)",
        "radial-gradient(circle, rgba(var(--w-accent-rgb), 0.05) 1.5px, transparent 1.5px)",
      ].join(", "),
      "--card-texture-size": "auto, auto, 8px 8px",
      "--panel-bg": "#f2eada",
      "--modal-bg": "#faf5ec",
      "--modal-shadow": "5px 5px 0 0 #111111",
      "--modal-overlay-bg": "rgba(0,0,0,0.45)",
      "--modal-overlay-blur": "none",
      // Override base page-bg so the orb canvas mode also gets the warm paper tone.
      "--w-page-bg": "#ede0c4",
      // Ink scale override: cream paper is lighter than glass/flat backgrounds,
      // so muted tiers lose contrast. Shift them 1-2 stops darker so secondary
      // text reads as deliberate ink rather than faded grey.
      "--w-ink-5": "#525252", // was #666 — body-weight ink for sub labels
      "--w-ink-6": "#6e6e6e", // was #8a8a — decorative/inactive, still readable
    },
    dark: {
      "--card-bg": "#1c1710",
      "--card-border": "#d4c9a8",
      "--card-border-width": "2px",
      "--card-radius": "14px 13px 15px 14px",
      "--card-blur": "none",
      "--card-shadow": "4px 4px 0 0 rgba(212,201,168,0.55)",
      // Dark paper: invert the scan-line and crosshatch opacity (light lines on dark).
      // Accent dots stay at 5% — they are more vivid on dark so they need no increase.
      "--card-texture": [
        "repeating-linear-gradient(to bottom, transparent 0px, transparent 2px, rgba(255,255,255,0.022) 2px, rgba(255,255,255,0.022) 3px)",
        "repeating-linear-gradient(45deg, transparent 0px, transparent 5px, rgba(255,255,255,0.016) 5px, rgba(255,255,255,0.016) 6px)",
        "radial-gradient(circle, rgba(var(--w-accent-rgb), 0.05) 1.5px, transparent 1.5px)",
      ].join(", "),
      "--card-texture-size": "auto, auto, 8px 8px",
      "--panel-bg": "#241e15",
      "--modal-bg": "#1c1710",
      "--modal-shadow": "5px 5px 0 0 #d4c9a8",
      "--modal-overlay-bg": "rgba(0,0,0,0.62)",
      "--modal-overlay-blur": "none",
      "--w-page-bg": "#110e09",
      // Dark paper is warmer and slightly muted; bump both tiers up so
      // secondary labels don’t vanish against the aged paper background.
      "--w-ink-5": "#9e9e9e", // was #888
      "--w-ink-6": "#838383", // was #6e6e6e
    },
  },
};
