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
 */

export const CARD_STYLES = [
  { id: 'flat', label: 'Flat', hint: 'Solid, clean surface' },
  { id: 'glass', label: 'Glass', hint: 'Frosted liquid glass' },
];

export const CARD_STYLE_TOKENS = {
  flat: {
    light: {
      '--card-bg': '#ffffff',
      '--card-border': 'rgba(0,0,0,0.07)',
      '--card-blur': 'none',
      '--card-shadow': '0 1px 4px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
      '--modal-bg': '#ffffff',
      '--modal-shadow': '0 8px 40px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)',
    },
    dark: {
      '--card-bg': '#1c1c1c',
      '--card-border': 'rgba(255,255,255,0.05)',
      '--card-blur': 'none',
      '--card-shadow': '0 2px 10px rgba(0,0,0,0.45)',
      '--modal-bg': '#1c1c1c',
      '--modal-shadow': '0 8px 40px rgba(0,0,0,0.6), 0 2px 8px rgba(0,0,0,0.3)',
    },
  },
  glass: {
    light: {
      '--card-bg': 'rgba(255,255,255,0.44)',
      '--card-border': 'rgba(0,0,0,0.09)',
      '--card-blur': 'blur(28px) saturate(180%)',
      '--card-shadow': 'inset 0 1px 0 rgba(255,255,255,0.90), 0 8px 32px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
      '--modal-bg': '#ffffff',
      '--modal-shadow': '0 8px 40px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.07)',
    },
    dark: {
      '--card-bg': 'rgba(255,255,255,0.10)',
      '--card-border': 'rgba(255,255,255,0.16)',
      '--card-blur': 'blur(28px) saturate(180%)',
      '--card-shadow': 'inset 0 1px 0 rgba(255,255,255,0.18), 0 4px 16px rgba(0,0,0,0.45)',
      '--modal-bg': '#1c1c1e',
      '--modal-shadow': '0 8px 40px rgba(0,0,0,0.65), 0 2px 8px rgba(0,0,0,0.35)',
    },
  },
};
